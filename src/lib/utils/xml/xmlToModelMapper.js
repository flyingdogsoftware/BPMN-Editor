/**
 * XML to Model Mapper fuer BPMN 2.0
 *
 * Uebersetzt den geparsten (und namensraum-normalisierten) BPMN-Baum in das
 * interne Modell des Editors.
 *
 * Leitgedanken:
 *
 * 1. Nichts geht still verloren. Jeder Flussknoten und jede Kante der Datei
 *    landet im Modell oder erzeugt einen Hinweis im Bericht.
 * 2. Flusselemente werden REKURSIV eingesammelt. BPMN erlaubt Aktivitaeten in
 *    Unterprozessen, Transaktionen und Ereignis-Unterprozessen; wer nur die
 *    oberste Ebene liest, verliert sie.
 * 3. Das Diagram Interchange ist massgeblich. Liegt fuer ein Element ein
 *    BPMNShape vor, gelten dessen Bounds - auch fuer Lanes. Nur wo die Datei
 *    nichts sagt, wird gerechnet.
 * 4. Der Typ eines Elements ergibt sich aus seinem XML-Namen, nicht aus seiner
 *    Id. Frueher galt jedes Element, dessen Id "Lane" enthielt, als Lane.
 */
import { calculateConnectionPoints } from '../connectionUtils';
import { localName } from './bpmnNamespaces';

/* ------------------------------------------------------------------------ */
/* Typtabellen                                                                */
/* ------------------------------------------------------------------------ */

/** XML-Element -> internes Modell. */
const ACTIVITY_TYPES = {
  task: { type: 'task', taskType: 'task' },
  userTask: { type: 'task', taskType: 'user' },
  serviceTask: { type: 'task', taskType: 'service' },
  sendTask: { type: 'task', taskType: 'send' },
  receiveTask: { type: 'task', taskType: 'receive' },
  manualTask: { type: 'task', taskType: 'manual' },
  businessRuleTask: { type: 'task', taskType: 'business-rule' },
  scriptTask: { type: 'task', taskType: 'script' },
  // Eine Aufrufaktivitaet ist notationell eine Aktivitaet mit dickem Rand.
  // Der Subprozess-Renderer bringt die Form mit; der Untertyp steuert den Rand.
  callActivity: { type: 'subprocess', subProcessType: 'call' },
  subProcess: { type: 'subprocess', subProcessType: 'embedded' },
  transaction: { type: 'subprocess', subProcessType: 'transaction' },
  adHocSubProcess: { type: 'subprocess', subProcessType: 'adhoc' },
};

const EVENT_TYPES = {
  startEvent: 'start',
  endEvent: 'end',
  intermediateThrowEvent: 'intermediate-throw',
  intermediateCatchEvent: 'intermediate-catch',
  boundaryEvent: 'boundary',
};

const GATEWAY_TYPES = {
  exclusiveGateway: 'exclusive',
  inclusiveGateway: 'inclusive',
  parallelGateway: 'parallel',
  complexGateway: 'complex',
  eventBasedGateway: 'event-based',
};

/**
 * Daten und Artefakte.
 *
 * Wichtig: gezeichnet wird die REFERENZ (dataObjectReference), nicht die Daten
 * selbst (dataObject). Wir bilden beides ab, verwerfen aber alles ohne eigenes
 * BPMNShape - ein dataObject ohne Darstellung ist eine Datendefinition, kein
 * Kaestchen im Diagramm.
 */
const ARTIFACT_TYPES = {
  dataObject: 'dataobject',
  dataObjectReference: 'dataobject',
  dataStore: 'datastore',
  dataStoreReference: 'datastore',
  textAnnotation: 'textannotation',
  group: 'group',
};

/** Elemente, die selbst wieder Flusselemente enthalten koennen. */
const FLOW_CONTAINERS = new Set(['subProcess', 'transaction', 'adHocSubProcess']);

/** Ereignisdefinitionen: XML-Element -> Kurzname im Modell. */
const EVENT_DEFINITIONS = [
  'messageEventDefinition', 'timerEventDefinition', 'escalationEventDefinition',
  'conditionalEventDefinition', 'linkEventDefinition', 'errorEventDefinition',
  'cancelEventDefinition', 'compensateEventDefinition', 'signalEventDefinition',
  'terminateEventDefinition',
];

const EDGE_TYPES = {
  sequenceFlow: 'sequence',
  messageFlow: 'message',
  association: 'association',
};

/* ------------------------------------------------------------------------ */
/* Kleine Helfer                                                              */
/* ------------------------------------------------------------------------ */

const NULL_REPORT = {
  warn() {},
  debug() {},
  stats: {},
};

const attr = (node, name) => {
  const v = node ? node[`@_${name}`] : undefined;
  return v === undefined || v === null ? undefined : String(v);
};

const num = (value, fallback = undefined) => {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Boolesches Attribut lesen. Wichtig: String("false") ist wahrheitswertig,
 * ein blosses Boolean(...) war hier frueher falsch.
 */
const bool = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  const s = String(value).trim().toLowerCase();
  if (s === 'true' || s === '1' || s === 'yes') return true;
  if (s === 'false' || s === '0' || s === 'no') return false;
  return fallback;
};

/** Immer ein Array liefern. */
const arr = (value) => (Array.isArray(value) ? value : value === undefined || value === null ? [] : [value]);

/** Text eines Kindelements, das sowohl String als auch Objekt sein kann. */
const textOf = (value) => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (value && typeof value === 'object') {
    if (value['#text'] !== undefined) return String(value['#text']);
    const firstString = Object.values(value).find((v) => typeof v === 'string');
    if (firstString !== undefined) return firstString;
  }
  return undefined;
};

/* ------------------------------------------------------------------------ */
/* Beschriftungen                                                             */
/* ------------------------------------------------------------------------ */

/** Text an Wortgrenzen umbrechen. */
function wrapLabelText(text, maxCharsPerLine = 20) {
  if (!text) return '';
  if (text.includes('\n')) return text;
  const words = String(text).split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    if (current.length + word.length + 1 > maxCharsPerLine && current.length > 0) {
      lines.push(current);
      current = word;
    } else {
      current = current.length === 0 ? word : `${current} ${word}`;
    }
  }
  if (current.length > 0) lines.push(current);
  return lines.join('\n');
}

const DEFAULT_WRAP = { task: 20, subprocess: 22, event: 15, gateway: 15, pool: 25, lane: 25, connection: 18 };

/** Beschriftung aufbereiten: Zeilenumbrueche und automatischer Umbruch. */
function processLabelText(text, elementType = '', elementWidth = 0) {
  if (text === undefined || text === null || text === '') return '';
  const processed = String(text).replace(/&#10;/g, '\n');
  if (processed.includes('\n')) return processed;
  const maxChars = elementWidth > 0
    ? Math.max(10, Math.floor(elementWidth / 8))
    : DEFAULT_WRAP[elementType] ?? 20;
  return wrapLabelText(processed, maxChars);
}

/* ------------------------------------------------------------------------ */
/* Diagram Interchange                                                        */
/* ------------------------------------------------------------------------ */

/**
 * Baut die Nachschlagetabellen aus allen BPMNDiagram/BPMNPlane der Datei.
 * @returns {{ shapes: Map<string,object>, edges: Map<string,object[]>, planeElements: Set<string> }}
 */
function buildDiIndex(definitions, report) {
  const shapes = new Map();
  const edges = new Map();

  for (const diagram of arr(definitions['bpmndi:BPMNDiagram'])) {
    for (const plane of arr(diagram['bpmndi:BPMNPlane'])) {
      for (const shape of arr(plane['bpmndi:BPMNShape'])) {
        const ref = attr(shape, 'bpmnElement');
        if (!ref) {
          report.warn('di.shape.noRef', 'BPMNShape ohne bpmnElement wird uebergangen.');
          continue;
        }
        const bounds = shape['dc:Bounds'];
        if (!bounds) {
          report.warn('di.shape.noBounds', `BPMNShape fuer "${ref}" hat keine dc:Bounds.`);
          continue;
        }
        const labelShape = shape['bpmndi:BPMNLabel'];
        const labelBounds = labelShape && labelShape['dc:Bounds'];
        if (shapes.has(ref)) {
          report.warn('di.shape.duplicate', `Mehrere BPMNShape fuer "${ref}"; das erste gilt.`);
          continue;
        }
        shapes.set(ref, {
          x: num(attr(bounds, 'x'), 0),
          y: num(attr(bounds, 'y'), 0),
          width: num(attr(bounds, 'width'), 0),
          height: num(attr(bounds, 'height'), 0),
          isHorizontal: bool(attr(shape, 'isHorizontal'), true),
          isExpanded: bool(attr(shape, 'isExpanded'), true),
          isMarkerVisible: bool(attr(shape, 'isMarkerVisible'), false),
          labelBounds: labelBounds
            ? {
                x: num(attr(labelBounds, 'x'), 0),
                y: num(attr(labelBounds, 'y'), 0),
                width: num(attr(labelBounds, 'width'), 0),
                height: num(attr(labelBounds, 'height'), 0),
              }
            : undefined,
        });
      }

      for (const edge of arr(plane['bpmndi:BPMNEdge'])) {
        const ref = attr(edge, 'bpmnElement');
        if (!ref) {
          report.warn('di.edge.noRef', 'BPMNEdge ohne bpmnElement wird uebergangen.');
          continue;
        }
        const waypoints = arr(edge['di:waypoint'])
          .map((wp) => ({ x: num(attr(wp, 'x')), y: num(attr(wp, 'y')) }))
          .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
        if (waypoints.length < 2) {
          report.warn('di.edge.fewWaypoints', `BPMNEdge fuer "${ref}" hat weniger als zwei Wegpunkte.`);
        }
        const edgeLabel = edge['bpmndi:BPMNLabel'];
        const edgeLabelBounds = edgeLabel && edgeLabel['dc:Bounds'];
        if (waypoints.length) {
          edges.set(ref, {
            waypoints,
            labelBounds: edgeLabelBounds
              ? {
                  x: num(attr(edgeLabelBounds, 'x'), 0),
                  y: num(attr(edgeLabelBounds, 'y'), 0),
                  width: num(attr(edgeLabelBounds, 'width'), 0),
                  height: num(attr(edgeLabelBounds, 'height'), 0),
                }
              : undefined,
          });
        }
      }
    }
  }
  return { shapes, edges };
}

/* ------------------------------------------------------------------------ */
/* Flusselemente einsammeln                                                   */
/* ------------------------------------------------------------------------ */

/**
 * Sammelt rekursiv alle Flussknoten und Kanten eines Containers
 * (Prozess, Unterprozess, Transaktion, Ad-hoc-Unterprozess).
 *
 * @param {object} container geparstes Container-Element
 * @param {object} ctx { processId, containerId, depth }
 * @param {object} sink { nodes: [], edges: [] }
 */
function collectFlowElements(container, ctx, sink) {
  for (const [key, value] of Object.entries(container)) {
    if (key.startsWith('@_') || key === '#text') continue;
    const local = localName(key);

    const isActivity = Object.prototype.hasOwnProperty.call(ACTIVITY_TYPES, local);
    const isEvent = Object.prototype.hasOwnProperty.call(EVENT_TYPES, local);
    const isGateway = Object.prototype.hasOwnProperty.call(GATEWAY_TYPES, local);
    const isEdge = Object.prototype.hasOwnProperty.call(EDGE_TYPES, local);
    const isArtifact = Object.prototype.hasOwnProperty.call(ARTIFACT_TYPES, local);

    if (isActivity || isEvent || isGateway || isArtifact) {
      for (const node of arr(value)) {
        if (!node || typeof node !== 'object') continue;
        sink.nodes.push({ local, node, ctx });
        if (FLOW_CONTAINERS.has(local)) {
          const id = attr(node, 'id');
          collectFlowElements(node, {
            processId: ctx.processId,
            containerId: id,
            depth: ctx.depth + 1,
            rootNames: ctx.rootNames,
            dataDefs: ctx.dataDefs,
          }, sink);
        }
      }
      continue;
    }

    if (isEdge) {
      for (const edge of arr(value)) {
        if (!edge || typeof edge !== 'object') continue;
        sink.edges.push({ local, edge, ctx });
      }
      continue;
    }
  }
}

/** Lanes rekursiv einsammeln (laneSet kann childLaneSet enthalten). */
function collectLanes(laneSetOwner, processId, sink, parentLaneId = undefined) {
  for (const laneSet of arr(laneSetOwner['bpmn:laneSet'])) {
    for (const lane of arr(laneSet['bpmn:lane'])) {
      if (!lane || typeof lane !== 'object') continue;
      const id = attr(lane, 'id');
      const flowNodeRefs = arr(lane['bpmn:flowNodeRef'])
        .map(textOf)
        .filter((v) => v !== undefined && v !== '');
      sink.push({ id, lane, processId, parentLaneId, flowNodeRefs });
      // Verschachtelte Lanes
      collectLanes(lane, processId, sink, id);
    }
  }
}

/* ------------------------------------------------------------------------ */
/* Hauptabbildung                                                             */
/* ------------------------------------------------------------------------ */

/**
 * Bildet den geparsten BPMN-Baum auf das interne Modell ab.
 *
 * @param {object} parsedXml namensraum-normalisierter Baum
 * @param {object} [report] Berichtsobjekt mit warn()/debug()
 * @returns {object[]} Elemente des internen Modells
 */
export function mapXmlToModel(parsedXml, report = NULL_REPORT) {
  const definitions = parsedXml['bpmn:definitions'];
  if (!definitions) {
    throw new Error(
      'Kein <definitions>-Element im BPMN-Namensraum gefunden. ' +
        'Die Datei ist entweder kein BPMN 2.0 oder deklariert einen anderen Namensraum.'
    );
  }

  const elements = [];
  const { shapes, edges } = buildDiIndex(definitions, report);
  const hasAnyDi = shapes.size > 0;

  const processes = arr(definitions['bpmn:process']);
  const collaborations = arr(definitions['bpmn:collaboration']);

  /* ---- 1. Pools aus den Teilnehmern der Kollaborationen ------------------ */

  const processToPool = new Map();
  const poolById = new Map();
  let poolFallbackY = 40;

  for (const collaboration of collaborations) {
    for (const participant of arr(collaboration['bpmn:participant'])) {
      const poolId = attr(participant, 'id');
      if (!poolId) {
        report.warn('pool.noId', 'Teilnehmer ohne id wird uebergangen.');
        continue;
      }
      const processRef = attr(participant, 'processRef');
      const shape = shapes.get(poolId);
      if (!shape) {
        report.warn(
          'pool.noShape',
          `Fuer den Pool "${poolId}" gibt es kein BPMNShape; er wird ersatzweise platziert.`
        );
      }
      const width = shape ? shape.width : 900;
      const pool = {
        id: poolId,
        type: 'pool',
        label: processLabelText(attr(participant, 'name'), 'pool', width) || 'Pool',
        x: shape ? shape.x : 60,
        y: shape ? shape.y : poolFallbackY,
        width,
        height: shape ? shape.height : 240,
        isHorizontal: shape ? shape.isHorizontal : true,
        lanes: [],
        processRef: processRef || '',
      };
      if (shape && shape.labelBounds) pool.labelBounds = shape.labelBounds;
      if (!shape) poolFallbackY += 280;
      elements.push(pool);
      poolById.set(poolId, pool);
      if (processRef) processToPool.set(processRef, poolId);
    }
  }

  /* ---- 2. Lanes ---------------------------------------------------------- */

  for (const process of processes) {
    const processId = attr(process, 'id');
    const laneEntries = [];
    collectLanes(process, processId, laneEntries);
    if (!laneEntries.length) continue;

    const poolId = processId ? processToPool.get(processId) : undefined;
    const pool = poolId ? poolById.get(poolId) : undefined;
    if (!pool) {
      report.warn(
        'lane.noPool',
        `Der Prozess "${processId}" hat Lanes, wird aber von keinem Pool referenziert. ` +
          'Die Lanes werden ohne Pool angelegt.'
      );
    }

    const created = [];
    for (const entry of laneEntries) {
      const { id: laneId, lane, flowNodeRefs, parentLaneId } = entry;
      if (!laneId) {
        report.warn('lane.noId', 'Lane ohne id wird uebergangen.');
        continue;
      }
      const shape = shapes.get(laneId);
      if (!shape) {
        report.warn('lane.noShape', `Fuer die Lane "${laneId}" gibt es kein BPMNShape.`);
      }
      const width = shape ? shape.width : pool ? pool.width - 30 : 600;
      const mappedLane = {
        id: laneId,
        type: 'lane',
        label: processLabelText(attr(lane, 'name'), 'lane', width) || 'Lane',
        x: shape ? shape.x : pool ? pool.x + 30 : 90,
        y: shape ? shape.y : pool ? pool.y + created.length * 120 : 40 + created.length * 120,
        width,
        height: shape ? shape.height : 120,
        isHorizontal: pool ? pool.isHorizontal : true,
        parentRef: poolId || '',
        parentLaneRef: parentLaneId || '',
        flowNodeRefs,
        hasDi: Boolean(shape),
      };
      elements.push(mappedLane);
      created.push(mappedLane);
      if (pool) pool.lanes.push(laneId);
    }

    // Nur wenn die Datei KEINE Geometrie fuer die Lanes liefert, wird sie
    // gerechnet. Liegt DI vor, ist sie massgeblich - fruehere Fassungen haben
    // gueltige Angaben ueberschrieben.
    if (pool && created.length && created.every((l) => !l.hasDi)) {
      layoutLanesInPool(pool, created);
    }
    for (const lane of created) {
      const primary = pool && !pool.isHorizontal ? lane.width : lane.height;
      const poolPrimary = pool ? (pool.isHorizontal ? pool.height : pool.width) : 0;
      const share = poolPrimary > 0 ? (primary / poolPrimary) * 100 : 100 / created.length;
      if (pool && pool.isHorizontal) lane.heightPercentage = share;
      else lane.widthPercentage = share;
      delete lane.hasDi;
    }
  }

  /* ---- 3. Flussknoten ---------------------------------------------------- */

  const rootNames = collectRootDefinitionNames(definitions);
  const dataDefs = collectDataDefinitions(definitions);
  const sink = { nodes: [], edges: [] };
  // dataStore steht nach BPMN auf definitions-Ebene, nicht im Prozess.
  for (const store of arr(definitions['bpmn:dataStore'])) {
    if (store && typeof store === 'object') {
      sink.nodes.push({ local: 'dataStore', node: store, ctx: { processId: undefined, containerId: undefined, depth: 0, rootNames, dataDefs } });
    }
  }
  for (const process of processes) {
    collectFlowElements(process, { processId: attr(process, 'id'), containerId: undefined, depth: 0, rootNames, dataDefs }, sink);
  }
  for (const collaboration of collaborations) {
    // Nachrichtenfluesse liegen in der Kollaboration, nicht im Prozess.
    for (const [key, value] of Object.entries(collaboration)) {
      if (localName(key) !== 'messageFlow') continue;
      for (const edge of arr(value)) {
        if (edge && typeof edge === 'object') {
          sink.edges.push({ local: 'messageFlow', edge, ctx: { processId: undefined, containerId: undefined, depth: 0 } });
        }
      }
    }
  }

  const seenNodeIds = new Set();
  let fallbackSlot = 0;

  for (const { local, node, ctx } of sink.nodes) {
    const id = attr(node, 'id');
    if (!id) {
      report.warn('node.noId', `Ein <${local}> ohne id wurde uebergangen.`);
      continue;
    }
    if (seenNodeIds.has(id)) {
      report.warn('node.duplicateId', `Die Id "${id}" kommt mehrfach vor; nur das erste Vorkommen wird uebernommen.`);
      continue;
    }

    const shape = shapes.get(id);
    if (!shape && Object.prototype.hasOwnProperty.call(ARTIFACT_TYPES, local)) {
      // Datendefinition ohne Darstellung - gehoert nicht auf diese Ebene.
      report.debug(`"${id}" (<${local}>) hat keine Darstellung und wird nicht gezeichnet.`);
      continue;
    }
    if (!shape && hasAnyDi && ctx.depth > 0) {
      // Kein Shape und in einem Unterprozess: das Element gehoert zu einer
      // zugeklappten Darstellung und ist auf dieser Ebene nicht sichtbar.
      report.warn(
        'node.collapsedChild',
        `"${id}" (<${local}>) liegt in einem Unterprozess ohne eigene Darstellung und wird nicht gezeichnet.`
      );
      continue;
    }
    if (!shape) {
      report.warn('node.noShape', `Fuer "${id}" (<${local}>) gibt es kein BPMNShape; es wird ersatzweise platziert.`);
    }

    const mapped = mapFlowNode(local, node, shape, ctx, fallbackSlot, report);
    if (!mapped) {
      report.warn('node.unsupported', `<${local}> ("${id}") wird vom Editor nicht unterstuetzt.`);
      continue;
    }
    if (!shape) fallbackSlot += 1;
    seenNodeIds.add(id);
    elements.push(mapped);
  }

  /* ---- 4. Kanten --------------------------------------------------------- */

  const nodeIndex = new Map(elements.map((e) => [e.id, e]));
  const seenEdgeIds = new Set();

  for (const { local, edge } of sink.edges) {
    const id = attr(edge, 'id');
    if (!id) {
      report.warn('edge.noId', `Ein <${local}> ohne id wurde uebergangen.`);
      continue;
    }
    if (seenEdgeIds.has(id)) {
      report.warn('edge.duplicateId', `Die Verbindungs-Id "${id}" kommt mehrfach vor.`);
      continue;
    }
    const sourceId = attr(edge, 'sourceRef');
    const targetId = attr(edge, 'targetRef');
    const source = nodeIndex.get(sourceId);
    const target = nodeIndex.get(targetId);
    if (!source || !target) {
      report.warn(
        'edge.danglingEndpoint',
        `Die Verbindung "${id}" wird nicht gezeichnet: ` +
          `${!source ? `Quelle "${sourceId}" ` : ''}${!source && !target ? 'und ' : ''}` +
          `${!target ? `Ziel "${targetId}" ` : ''}nicht im Diagramm.`
      );
      continue;
    }

    const di = edges.get(id);
    const waypoints = di ? di.waypoints : [];
    if (!waypoints.length) {
      report.warn('edge.noWaypoints', `Fuer die Verbindung "${id}" liefert die Datei keine Wegpunkte.`);
    }

    const conditionNode = edge['bpmn:conditionExpression'];
    const condition = conditionNode !== undefined ? textOf(conditionNode) : undefined;

    const connection = {
      id,
      type: 'connection',
      connectionType: EDGE_TYPES[local] || 'sequence',
      sourceId,
      targetId,
      sourcePointId: '',
      targetPointId: '',
      waypoints,
      label: processLabelText(attr(edge, 'name'), 'connection') || '',
    };
    if (condition !== undefined && condition !== '') connection.condition = condition;
    if (di && di.labelBounds) connection.labelBounds = di.labelBounds;
    const msgRef = attr(edge, 'messageRef');
    if (msgRef) {
      connection.messageRef = msgRef;
      const msgName = rootNames.get(msgRef);
      if (msgName) connection.messageName = msgName;
    }
    const doc = documentationOf(edge);
    if (doc) connection.documentation = doc;

    seenEdgeIds.add(id);
    elements.push(connection);
  }

  /* ---- 5. Nachbereitung -------------------------------------------------- */

  validatePoolLaneRelationships(elements, report);
  assignConnectionPoints(elements);

  report.stats = {
    pools: elements.filter((e) => e.type === 'pool').length,
    lanes: elements.filter((e) => e.type === 'lane').length,
    tasks: elements.filter((e) => e.type === 'task').length,
    subprocesses: elements.filter((e) => e.type === 'subprocess').length,
    events: elements.filter((e) => e.type === 'event').length,
    gateways: elements.filter((e) => e.type === 'gateway').length,
    connections: elements.filter((e) => e.type === 'connection').length,
    shapesInFile: shapes.size,
    edgesInFile: edges.size,
  };
  report.debug('Import abgeschlossen', report.stats);

  return elements;
}

/* ------------------------------------------------------------------------ */
/* Einzelne Knoten abbilden                                                   */
/* ------------------------------------------------------------------------ */

function documentationOf(node) {
  const doc = node['bpmn:documentation'];
  if (doc === undefined) return undefined;
  const texts = arr(doc).map(textOf).filter(Boolean);
  return texts.length ? texts.join('\n\n') : undefined;
}

/**
 * Ereignisdefinition auslesen: Art, verwiesene Id und - bei Zeitereignissen -
 * der Wert. Ohne diese Angaben verliert ein Export die Bedeutung des
 * Ereignisses und macht aus jeder Frist ein leeres Zwischenereignis.
 */
function eventDefinitionOf(node) {
  for (const def of EVENT_DEFINITIONS) {
    const raw = node[`bpmn:${def}`];
    if (raw === undefined) continue;
    const first = arr(raw)[0];
    const kind = def.replace('EventDefinition', '');
    const out = { kind, ref: undefined, timer: undefined };
    if (first && typeof first === 'object') {
      out.ref =
        attr(first, 'messageRef') || attr(first, 'signalRef') ||
        attr(first, 'errorRef') || attr(first, 'escalationRef');
      if (kind === 'timer') {
        for (const [tag, type] of [['timeDuration', 'duration'], ['timeDate', 'date'], ['timeCycle', 'cycle']]) {
          const v = first[`bpmn:${tag}`];
          if (v !== undefined) {
            const text = textOf(arr(v)[0]);
            if (text) out.timer = { type, value: text };
            break;
          }
        }
      }
    }
    return out;
  }
  return { kind: 'none', ref: undefined, timer: undefined };
}

/**
 * Eigenschaften der dataObject- und dataStore-Definitionen je Id.
 *
 * Die Referenz traegt die Darstellung, die Definition die Eigenschaften:
 * isCollection steht nach dem Schema am dataObject, nicht an der Referenz.
 */
function collectDataDefinitions(root, into = new Map()) {
  if (!root || typeof root !== 'object') return into;
  for (const [key, value] of Object.entries(root)) {
    if (key.startsWith('@_') || key === '#text') continue;
    const local = localName(key);
    for (const item of arr(value)) {
      if (!item || typeof item !== 'object') continue;
      if (local === 'dataObject' || local === 'dataStore') {
        const id = attr(item, 'id');
        if (id) {
          into.set(id, {
            name: attr(item, 'name'),
            isCollection: bool(attr(item, 'isCollection'), false),
          });
        }
      }
      collectDataDefinitions(item, into);
    }
  }
  return into;
}

/** Namen der Wurzelelemente (message, signal, error, escalation) je Id. */
function collectRootDefinitionNames(definitions) {
  const names = new Map();
  for (const tag of ['bpmn:message', 'bpmn:signal', 'bpmn:error', 'bpmn:escalation']) {
    for (const item of arr(definitions[tag])) {
      const id = attr(item, 'id');
      if (id) names.set(id, attr(item, 'name'));
    }
  }
  return names;
}

/** Ersatzposition fuer Elemente, zu denen die Datei keine Geometrie liefert. */
function fallbackBounds(slot, defaultWidth, defaultHeight) {
  const perRow = 8;
  return {
    x: 60 + (slot % perRow) * 160,
    y: 60 + Math.floor(slot / perRow) * 120,
    width: defaultWidth,
    height: defaultHeight,
  };
}

function mapFlowNode(local, node, shape, ctx, fallbackSlot, report) {
  const id = attr(node, 'id');
  const name = attr(node, 'name');

  if (Object.prototype.hasOwnProperty.call(ACTIVITY_TYPES, local)) {
    const spec = ACTIVITY_TYPES[local];
    const box = shape || fallbackBounds(fallbackSlot, 120, 80);
    const el = {
      id,
      type: spec.type,
      label: processLabelText(name, spec.type, box.width) || '',
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
    };
    if (spec.taskType) el.taskType = spec.taskType;
    if (spec.subProcessType) {
      el.subProcessType = local === 'subProcess' && bool(attr(node, 'triggeredByEvent'))
        ? 'event'
        : spec.subProcessType;
    }
    if (local === 'callActivity') {
      const called = attr(node, 'calledElement');
      if (called) el.calledElement = called;
    }
    if (shape) {
      el.isExpanded = shape.isExpanded;
      if (shape.labelBounds) el.labelBounds = shape.labelBounds;
    }
    const doc = documentationOf(node);
    if (doc) el.documentation = doc;
    if (ctx.containerId) el.containerRef = ctx.containerId;
    return el;
  }

  if (Object.prototype.hasOwnProperty.call(EVENT_TYPES, local)) {
    const box = shape || fallbackBounds(fallbackSlot, 36, 36);
    const evDef = eventDefinitionOf(node);
    const el = {
      id,
      type: 'event',
      eventType: EVENT_TYPES[local],
      eventDefinition: evDef.kind,
      label: processLabelText(name, 'event', box.width) || '',
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
    };
    if (shape && shape.labelBounds) el.labelBounds = shape.labelBounds;
    if (local === 'boundaryEvent') {
      const host = attr(node, 'attachedToRef');
      if (host) el.attachedToRef = host;
      else report.warn('boundary.noHost', `Das Randereignis "${id}" nennt kein attachedToRef.`);
      // Ohne cancelActivity gilt nach BPMN "true", also unterbrechend.
      el.cancelActivity = bool(attr(node, 'cancelActivity'), true);
    }
    if (local === 'startEvent') {
      el.isInterrupting = bool(attr(node, 'isInterrupting'), true);
    }
    if (evDef.ref) {
      el.eventDefinitionRef = evDef.ref;
      const refName = ctx.rootNames && ctx.rootNames.get(evDef.ref);
      if (refName) el.eventDefinitionName = refName;
    }
    if (evDef.timer) el.timerDefinition = evDef.timer;
    const doc = documentationOf(node);
    if (doc) el.documentation = doc;
    if (ctx.containerId) el.containerRef = ctx.containerId;
    return el;
  }

  if (Object.prototype.hasOwnProperty.call(ARTIFACT_TYPES, local)) {
    // Ohne eigene Darstellung nicht zeichnen - siehe ARTIFACT_TYPES.
    if (!shape) return null;
    const type = ARTIFACT_TYPES[local];
    const el = {
      id,
      type,
      label: processLabelText(name, type, shape.width) || '',
      x: shape.x,
      y: shape.y,
      width: shape.width,
      height: shape.height,
    };
    if (type === 'dataobject') {
      el.isInput = false;
      el.isOutput = false;
      const ref = attr(node, 'dataObjectRef');
      if (ref) el.dataObjectRef = ref;
      const def = ref && ctx.dataDefs ? ctx.dataDefs.get(ref) : undefined;
      el.isCollection = def ? def.isCollection : bool(attr(node, 'isCollection'), false);
      if (!el.label && def && def.name) {
        el.label = processLabelText(def.name, type, shape.width) || '';
      }
    }
    if (type === 'datastore') {
      el.isCollection = false;
      const ref = attr(node, 'dataStoreRef');
      if (ref) el.dataStoreRef = ref;
      const def = ref && ctx.dataDefs ? ctx.dataDefs.get(ref) : undefined;
      if (!el.label && def && def.name) {
        el.label = processLabelText(def.name, type, shape.width) || '';
      }
    }
    if (type === 'textannotation') {
      const text = textOf(arr(node['bpmn:text'])[0]);
      el.text = text !== undefined ? text : (name || '');
      // Die Anmerkung zeigt ihren Text, nicht das name-Attribut.
      if (!el.label) el.label = el.text;
    }
    if (shape.labelBounds) el.labelBounds = shape.labelBounds;
    const doc = documentationOf(node);
    if (doc) el.documentation = doc;
    if (ctx.containerId) el.containerRef = ctx.containerId;
    return el;
  }

  if (Object.prototype.hasOwnProperty.call(GATEWAY_TYPES, local)) {
    const box = shape || fallbackBounds(fallbackSlot, 50, 50);
    const el = {
      id,
      type: 'gateway',
      gatewayType: GATEWAY_TYPES[local],
      label: processLabelText(name, 'gateway', box.width) || '',
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
    };
    if (shape && shape.labelBounds) el.labelBounds = shape.labelBounds;
    const def = attr(node, 'default');
    if (def) el.defaultFlow = def;
    const doc = documentationOf(node);
    if (doc) el.documentation = doc;
    if (ctx.containerId) el.containerRef = ctx.containerId;
    return el;
  }

  return null;
}

/* ------------------------------------------------------------------------ */
/* Lanes ohne Geometrie im Pool verteilen                                     */
/* ------------------------------------------------------------------------ */

function layoutLanesInPool(pool, lanes) {
  const band = 30; // Beschriftungsstreifen des Pools
  if (pool.isHorizontal) {
    const height = pool.height / lanes.length;
    lanes.forEach((lane, i) => {
      lane.x = pool.x + band;
      lane.y = pool.y + i * height;
      lane.width = pool.width - band;
      lane.height = height;
    });
  } else {
    const width = pool.width / lanes.length;
    lanes.forEach((lane, i) => {
      lane.x = pool.x + i * width;
      lane.y = pool.y + band;
      lane.width = width;
      lane.height = pool.height - band;
    });
  }
}

/* ------------------------------------------------------------------------ */
/* Nachbereitung                                                              */
/* ------------------------------------------------------------------------ */

/** Beziehungen zwischen Pools und Lanes pruefen und in Ordnung bringen. */
function validatePoolLaneRelationships(elements, report) {
  const pools = elements.filter((el) => el.type === 'pool');
  const lanes = elements.filter((el) => el.type === 'lane');
  const laneById = new Map(lanes.map((l) => [l.id, l]));

  for (const pool of pools) {
    if (!Array.isArray(pool.lanes)) pool.lanes = [];
    const missing = pool.lanes.filter((laneId) => !laneById.has(laneId));
    if (missing.length) {
      report.warn('pool.missingLane', `Der Pool "${pool.id}" verweist auf unbekannte Lanes: ${missing.join(', ')}.`);
      pool.lanes = pool.lanes.filter((laneId) => laneById.has(laneId));
    }
    for (const lane of lanes) {
      if (lane.parentRef === pool.id && !pool.lanes.includes(lane.id)) pool.lanes.push(lane.id);
    }
  }

  for (const lane of lanes) {
    if (!lane.parentRef) {
      const owner = pools.find((p) => p.lanes.includes(lane.id));
      if (owner) lane.parentRef = owner.id;
      else report.warn('lane.orphan', `Die Lane "${lane.id}" gehoert zu keinem Pool.`);
    }
    if (!Array.isArray(lane.flowNodeRefs)) lane.flowNodeRefs = [];
  }
}

/**
 * Verbindungspunkte an Quelle und Ziel bestimmen.
 * Die Richtung ergibt sich aus den Wegpunkten der Datei, sonst aus der Lage
 * der beiden Elemente zueinander.
 */
function assignConnectionPoints(elements) {
  const byId = new Map(elements.map((el) => [el.id, el]));

  for (const element of elements) {
    if (element.type !== 'connection') continue;
    const source = byId.get(element.sourceId);
    const target = byId.get(element.targetId);
    if (!source || !target) continue;
    if (source.type === 'connection' || target.type === 'connection') continue;

    const sourcePoints = calculateConnectionPoints(source);
    const targetPoints = calculateConnectionPoints(target);
    if (!sourcePoints.length || !targetPoints.length) continue;

    let towardsTarget;
    let towardsSource;
    if (element.waypoints && element.waypoints.length > 1) {
      // Der zweite bzw. vorletzte Wegpunkt gibt die Richtung besser wieder als
      // der erste bzw. letzte, der meist direkt auf dem Element liegt.
      towardsTarget = element.waypoints[1];
      towardsSource = element.waypoints[element.waypoints.length - 2];
    } else {
      towardsTarget = { x: target.x + target.width / 2, y: target.y + target.height / 2 };
      towardsSource = { x: source.x + source.width / 2, y: source.y + source.height / 2 };
    }

    element.sourcePointId = findBestConnectionPoint(sourcePoints, towardsTarget).id;
    element.targetPointId = findBestConnectionPoint(targetPoints, towardsSource).id;
  }
}

/** Den Verbindungspunkt waehlen, der in Richtung des Ziels zeigt. */
function findBestConnectionPoint(points, targetPosition) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const center = {
    x: Math.min(...xs) + (Math.max(...xs) - Math.min(...xs)) / 2,
    y: Math.min(...ys) + (Math.max(...ys) - Math.min(...ys)) / 2,
  };

  const dx = targetPosition.x - center.x;
  const dy = targetPosition.y - center.y;
  const side = Math.abs(dx) > Math.abs(dy)
    ? (dx > 0 ? 'right' : 'left')
    : (dy > 0 ? 'bottom' : 'top');

  const preferred = points.filter((p) => p.position === side);
  const candidates = preferred.length ? preferred : points;

  let best = candidates[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const point of candidates) {
    const d = (point.x - targetPosition.x) ** 2 + (point.y - targetPosition.y) ** 2;
    if (d < bestDistance) {
      bestDistance = d;
      best = point;
    }
  }
  return best;
}
