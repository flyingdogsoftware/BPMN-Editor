/**
 * BPMN XML Exporter
 *
 * Schreibt das interne Modell des Editors als BPMN 2.0 XML.
 *
 * Leitgedanken - dieselben wie beim Import, nur in die andere Richtung:
 *
 * 1. Jedes Element wird GENAU EINMAL geschrieben. Frueher bekam jeder Prozess
 *    saemtliche Flusselemente; bei vier Pools stand jedes Element viermal in
 *    der Datei, mit vierfach vergebener Id. Das ist kein gueltiges BPMN.
 * 2. Elemente werden ihrem Pool zugeordnet - ueber die flowNodeRef-Liste der
 *    Lane, sonst ueber die Lage im Diagramm.
 * 3. Unterprozesse und Aufrufaktivitaeten werden geschrieben, ihre Kinder
 *    darin verschachtelt.
 * 4. Was der Import gelesen hat, kommt wieder heraus: Aufgabentypen,
 *    Ereignisdefinitionen, Bedingungen, Standardfluesse, Dokumentation und die
 *    Position der Beschriftungen.
 * 5. Ids, auf die verwiesen wird (Nachrichten, Signale, Fehler), werden als
 *    Wurzelelemente ergaenzt, damit die Datei in sich geschlossen bleibt.
 */

/* ------------------------------------------------------------------------ */
/* Textwerkzeuge                                                              */
/* ------------------------------------------------------------------------ */

/** Zeilenumbrueche als XML-Entitaet schreiben. */
function processTextForXml(text) {
  if (!text) return '';
  return String(text).replace(/\n/g, '&#10;');
}

/** Sonderzeichen in XML maskieren. */
function escapeXml(text) {
  if (text === undefined || text === null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Text fuer ein Attribut.
 *
 * Reihenfolge ist entscheidend: erst maskieren, dann den Zeilenumbruch als
 * Entitaet setzen. Andersherum maskiert escapeXml das & der eben gesetzten
 * Entitaet gleich wieder mit, und im Attribut steht sichtbar "&#10;".
 */
const attrText = (text) => processTextForXml(escapeXml(text));

let idCounter = 0;
function generateId(prefix = 'id_') {
  idCounter += 1;
  return `${prefix}${Date.now().toString(36)}_${idCounter}`;
}

/** Eine Zahl so schreiben, dass sie beim Wiedereinlesen dieselbe ist. */
const numAttr = (v) => (Number.isFinite(v) ? String(Math.round(v * 1000) / 1000) : '0');

/* ------------------------------------------------------------------------ */
/* Typtabellen (Gegenstueck zum Mapper)                                       */
/* ------------------------------------------------------------------------ */

const TASK_TAG_BY_TYPE = {
  task: 'bpmn:task',
  user: 'bpmn:userTask',
  service: 'bpmn:serviceTask',
  send: 'bpmn:sendTask',
  receive: 'bpmn:receiveTask',
  manual: 'bpmn:manualTask',
  'business-rule': 'bpmn:businessRuleTask',
  script: 'bpmn:scriptTask',
};

const EVENT_TAG_BY_TYPE = {
  start: 'bpmn:startEvent',
  end: 'bpmn:endEvent',
  'intermediate-throw': 'bpmn:intermediateThrowEvent',
  'intermediate-catch': 'bpmn:intermediateCatchEvent',
  boundary: 'bpmn:boundaryEvent',
};

const GATEWAY_TAG_BY_TYPE = {
  exclusive: 'bpmn:exclusiveGateway',
  inclusive: 'bpmn:inclusiveGateway',
  parallel: 'bpmn:parallelGateway',
  complex: 'bpmn:complexGateway',
  'event-based': 'bpmn:eventBasedGateway',
};

/** Ereignisdefinition -> Elementname und Name des Verweisattributs. */
const EVENT_DEFINITION_TAG = {
  message: { tag: 'bpmn:messageEventDefinition', ref: 'messageRef', root: 'bpmn:message' },
  timer: { tag: 'bpmn:timerEventDefinition' },
  escalation: { tag: 'bpmn:escalationEventDefinition', ref: 'escalationRef', root: 'bpmn:escalation' },
  conditional: { tag: 'bpmn:conditionalEventDefinition' },
  link: { tag: 'bpmn:linkEventDefinition' },
  error: { tag: 'bpmn:errorEventDefinition', ref: 'errorRef', root: 'bpmn:error' },
  cancel: { tag: 'bpmn:cancelEventDefinition' },
  compensate: { tag: 'bpmn:compensateEventDefinition' },
  signal: { tag: 'bpmn:signalEventDefinition', ref: 'signalRef', root: 'bpmn:signal' },
  terminate: { tag: 'bpmn:terminateEventDefinition' },
};

/** Untertyp einer Aktivitaet -> Elementname. */
function activityTag(element) {
  if (element.type === 'task') return TASK_TAG_BY_TYPE[element.taskType] || 'bpmn:task';
  if (element.subProcessType === 'call') return 'bpmn:callActivity';
  if (element.subProcessType === 'transaction') return 'bpmn:transaction';
  if (element.subProcessType === 'adhoc') return 'bpmn:adHocSubProcess';
  return 'bpmn:subProcess';
}

const isActivity = (el) => el.type === 'task' || el.type === 'subprocess';
const isFlowNode = (el) => isActivity(el) || el.type === 'event' || el.type === 'gateway';

/**
 * Daten und Artefakte.
 *
 * Nach dem Schema stehen Artefakte im Prozess NACH den Flusselementen, und
 * eine Assoziation ist ein Artefakt, kein Sequenzfluss. Fruehere Fassungen
 * schrieben sie als <bpmn:sequenceFlow> - das ist inhaltlich falsch und
 * verwandelt eine Anmerkung in einen Kontrollfluss.
 */
const DATA_TYPES = new Set(['dataobject', 'datastore']);
const ARTIFACT_TYPES = new Set(['textannotation', 'group']);
const isDataElement = (el) => DATA_TYPES.has(el.type);
const isArtifact = (el) => ARTIFACT_TYPES.has(el.type);
const isDrawable = (el) => isFlowNode(el) || isDataElement(el) || isArtifact(el);

/** Id des dataObject, auf das eine Referenz zeigt. */
const dataObjectRefOf = (element) => element.dataObjectRef || `${element.id}_dataObject`;

/**
 * Datenelement schreiben.
 *
 * Gezeichnet wird immer die REFERENZ. Die Eigenschaft isCollection sitzt nach
 * dem Schema aber am dataObject, nicht an der Referenz - deshalb werden beide
 * geschrieben, damit die Datei in sich geschlossen und schemakonform ist.
 * Ein dataStore ist ein Wurzelelement und steht ausserhalb des Prozesses.
 */
function dataElementXml(element, depth) {
  const ind = '  '.repeat(depth);

  if (element.type === 'datastore') {
    let xml = `${ind}<bpmn:dataStoreReference id="${escapeXml(element.id)}"`;
    if (element.label) xml += ` name="${attrText(element.label)}"`;
    if (element.dataStoreRef) xml += ` dataStoreRef="${escapeXml(element.dataStoreRef)}"`;
    if (!element.documentation) return `${xml}/>\n`;
    xml += '>\n';
    xml += documentationXml(element, `${ind}  `);
    xml += `${ind}</bpmn:dataStoreReference>\n`;
    return xml;
  }

  const ref = dataObjectRefOf(element);
  let xml = `${ind}<bpmn:dataObject id="${escapeXml(ref)}"`;
  if (element.label) xml += ` name="${attrText(element.label)}"`;
  if (element.isCollection) xml += ' isCollection="true"';
  xml += '/>\n';

  xml += `${ind}<bpmn:dataObjectReference id="${escapeXml(element.id)}"`;
  if (element.label) xml += ` name="${attrText(element.label)}"`;
  xml += ` dataObjectRef="${escapeXml(ref)}"`;
  if (!element.documentation) return `${xml}/>\n`;
  xml += '>\n';
  xml += documentationXml(element, `${ind}  `);
  xml += `${ind}</bpmn:dataObjectReference>\n`;
  return xml;
}

/** Wurzelelemente fuer die Datenspeicher, auf die Referenzen zeigen. */
function createDataStoreRootElements(elements) {
  const seen = new Map();
  for (const el of elements) {
    if (el.type !== 'datastore' || !el.dataStoreRef) continue;
    if (!seen.has(el.dataStoreRef)) seen.set(el.dataStoreRef, el.label || el.dataStoreRef);
  }
  let xml = '';
  for (const [id, name] of seen) {
    xml += `  <bpmn:dataStore id="${escapeXml(id)}" name="${attrText(name)}"/>\n`;
  }
  return xml;
}

/** Textanmerkung oder Gruppe. */
function artifactXml(element, depth) {
  const ind = '  '.repeat(depth);
  if (element.type === 'group') {
    // Ein Gruppenname haengt in BPMN an einer categoryValue; ohne Namen
    // braucht die Gruppe keine.
    return `${ind}<bpmn:group id="${escapeXml(element.id)}"/>\n`;
  }
  const text = element.text || element.label || '';
  let xml = `${ind}<bpmn:textAnnotation id="${escapeXml(element.id)}">\n`;
  xml += `${ind}  <bpmn:text>${escapeXml(text)}</bpmn:text>\n`;
  xml += `${ind}</bpmn:textAnnotation>\n`;
  return xml;
}

/** Assoziation zwischen einem Element und einer Anmerkung. */
function associationXml(connection, depth) {
  const ind = '  '.repeat(depth);
  return `${ind}<bpmn:association id="${escapeXml(connection.id)}"` +
         ` sourceRef="${escapeXml(connection.sourceId)}"` +
         ` targetRef="${escapeXml(connection.targetId)}"/>\n`;
}

/* ------------------------------------------------------------------------ */
/* Zuordnung der Elemente zu Pools und Unterprozessen                         */
/* ------------------------------------------------------------------------ */

function boxContains(container, el) {
  if (!container || !el) return false;
  const c = [container.x, container.y, container.width, container.height];
  const e = [el.x, el.y, el.width, el.height];
  if (c.some((v) => !Number.isFinite(v)) || e.some((v) => !Number.isFinite(v))) return false;
  // Ein Randereignis sitzt auf der Kante seiner Aktivitaet und ragt hinaus;
  // deshalb wird der Mittelpunkt geprueft, nicht die vollstaendige Ueberdeckung.
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  return cx >= container.x && cx <= container.x + container.width &&
         cy >= container.y && cy <= container.y + container.height;
}

const area = (el) => (Number.isFinite(el.width) && Number.isFinite(el.height) ? el.width * el.height : Infinity);

/**
 * Ordnet jedem Flussknoten seinen Pool zu.
 * @returns {Map<string,string|null>} Element-Id -> Pool-Id (null = keinem Pool)
 */
function assignNodesToPools(elements, pools, lanes) {
  const owner = new Map();
  if (!pools.length) return owner;

  const laneByNodeRef = new Map();
  for (const lane of lanes) {
    for (const ref of lane.flowNodeRefs || []) laneByNodeRef.set(String(ref), lane);
  }

  // Auch Datenobjekte und Anmerkungen liegen in einem Pool, nicht nur
  // Flussknoten - sonst landen sie im Sammelprozess.
  const nodes = elements.filter(isDrawable);
  for (const node of nodes) {
    // 1. Ausdrueckliche Zuordnung durch die Lane
    const lane = laneByNodeRef.get(String(node.id));
    if (lane && lane.parentRef) {
      owner.set(node.id, lane.parentRef);
      continue;
    }
    // 2. Kleinste Lane, in der das Element liegt
    const containingLanes = lanes.filter((l) => boxContains(l, node)).sort((a, b) => area(a) - area(b));
    if (containingLanes.length && containingLanes[0].parentRef) {
      owner.set(node.id, containingLanes[0].parentRef);
      continue;
    }
    // 3. Kleinster Pool, in dem das Element liegt
    const containingPools = pools.filter((p) => boxContains(p, node)).sort((a, b) => area(a) - area(b));
    owner.set(node.id, containingPools.length ? containingPools[0].id : null);
  }

  // Ein Randereignis gehoert immer dorthin, wo seine Aktivitaet liegt.
  const byId = new Map(elements.map((e) => [String(e.id), e]));
  for (const node of nodes) {
    if (node.type === 'event' && node.eventType === 'boundary' && node.attachedToRef) {
      const host = byId.get(String(node.attachedToRef));
      if (host && owner.has(host.id)) owner.set(node.id, owner.get(host.id));
    }
  }
  // Ein Kind gehoert dorthin, wo sein Unterprozess liegt.
  for (const node of nodes) {
    if (node.containerRef) {
      const parent = byId.get(String(node.containerRef));
      if (parent && owner.has(parent.id)) owner.set(node.id, owner.get(parent.id));
    }
  }
  return owner;
}

/** Prozess-Id eines Pools. */
function processIdOf(pool) {
  return pool.processRef || `Process_${String(pool.id).replace(/^Participant_?/, '')}`;
}

/* ------------------------------------------------------------------------ */
/* Flusselemente schreiben                                                    */
/* ------------------------------------------------------------------------ */

function documentationXml(element, indent) {
  if (!element.documentation) return '';
  return `${indent}<bpmn:documentation>${escapeXml(element.documentation)}</bpmn:documentation>\n`;
}

function flowRefsXml(element, flows, indent) {
  let xml = '';
  const isBoundary = element.type === 'event' && element.eventType === 'boundary';
  const isStart = element.type === 'event' && element.eventType === 'start';
  const isEnd = element.type === 'event' && element.eventType === 'end';
  // Ein Randereignis und ein Startereignis haben keine eingehenden Fluesse,
  // ein Endereignis keine ausgehenden.
  if (!isBoundary && !isStart) {
    for (const f of flows) if (String(f.targetId) === String(element.id)) xml += `${indent}<bpmn:incoming>${escapeXml(f.id)}</bpmn:incoming>\n`;
  }
  if (!isEnd) {
    for (const f of flows) if (String(f.sourceId) === String(element.id)) xml += `${indent}<bpmn:outgoing>${escapeXml(f.id)}</bpmn:outgoing>\n`;
  }
  return xml;
}

function eventDefinitionXml(element, indent) {
  const kind = element.eventDefinition;
  if (!kind || kind === 'none') return '';
  const spec = EVENT_DEFINITION_TAG[kind];
  if (!spec) return '';

  if (kind === 'timer' && element.timerDefinition && element.timerDefinition.value) {
    const t = element.timerDefinition;
    const tag = t.type === 'date' ? 'timeDate' : t.type === 'cycle' ? 'timeCycle' : 'timeDuration';
    return `${indent}<${spec.tag}>\n` +
           `${indent}  <bpmn:${tag} xsi:type="bpmn:tFormalExpression">${escapeXml(t.value)}</bpmn:${tag}>\n` +
           `${indent}</${spec.tag}>\n`;
  }
  if (spec.ref && element.eventDefinitionRef) {
    return `${indent}<${spec.tag} ${spec.ref}="${escapeXml(element.eventDefinitionRef)}"/>\n`;
  }
  return `${indent}<${spec.tag}/>\n`;
}

/**
 * Schreibt einen Flussknoten samt Kindern (bei Unterprozessen).
 * @param {object} element
 * @param {object} ctx { flows, childrenByParent, depth }
 */
function flowNodeXml(element, ctx, depth) {
  const ind = '  '.repeat(depth);
  const inner = '  '.repeat(depth + 1);
  const { flows, childrenByParent } = ctx;

  if (isActivity(element)) {
    const tag = activityTag(element);
    let xml = `${ind}<${tag} id="${escapeXml(element.id)}"`;
    if (element.label) xml += ` name="${attrText(element.label)}"`;
    if (tag === 'bpmn:callActivity' && element.calledElement) {
      xml += ` calledElement="${escapeXml(element.calledElement)}"`;
    }
    if (tag === 'bpmn:subProcess' && element.subProcessType === 'event') {
      xml += ' triggeredByEvent="true"';
    }
    xml += '>\n';
    xml += documentationXml(element, inner);
    xml += flowRefsXml(element, flows, inner);
    // Kinder eines Unterprozesses verschachteln
    const children = childrenByParent.get(String(element.id)) || [];
    for (const child of children) xml += flowNodeXml(child, ctx, depth + 1);
    const childFlows = (ctx.flowsByParent.get(String(element.id)) || []);
    for (const flow of childFlows) xml += sequenceFlowXml(flow, depth + 1);
    xml += `${ind}</${tag}>\n`;
    return xml;
  }

  if (element.type === 'event') {
    const tag = EVENT_TAG_BY_TYPE[element.eventType] || 'bpmn:startEvent';
    let xml = `${ind}<${tag} id="${escapeXml(element.id)}"`;
    if (element.label) xml += ` name="${attrText(element.label)}"`;
    if (element.eventType === 'boundary') {
      if (element.attachedToRef) xml += ` attachedToRef="${escapeXml(element.attachedToRef)}"`;
      xml += ` cancelActivity="${element.cancelActivity === false ? 'false' : 'true'}"`;
    }
    if (element.eventType === 'start' && element.isInterrupting === false) {
      xml += ' isInterrupting="false"';
    }
    xml += '>\n';
    xml += documentationXml(element, inner);
    xml += flowRefsXml(element, flows, inner);
    xml += eventDefinitionXml(element, inner);
    xml += `${ind}</${tag}>\n`;
    return xml;
  }

  if (element.type === 'gateway') {
    const tag = GATEWAY_TAG_BY_TYPE[element.gatewayType] || 'bpmn:exclusiveGateway';
    let xml = `${ind}<${tag} id="${escapeXml(element.id)}"`;
    if (element.label) xml += ` name="${attrText(element.label)}"`;
    if (element.defaultFlow) xml += ` default="${escapeXml(element.defaultFlow)}"`;
    xml += '>\n';
    xml += documentationXml(element, inner);
    xml += flowRefsXml(element, flows, inner);
    xml += `${ind}</${tag}>\n`;
    return xml;
  }

  return '';
}

function sequenceFlowXml(flow, depth) {
  const ind = '  '.repeat(depth);
  let xml = `${ind}<bpmn:sequenceFlow id="${escapeXml(flow.id)}"`;
  if (flow.label) xml += ` name="${attrText(flow.label)}"`;
  xml += ` sourceRef="${escapeXml(flow.sourceId)}" targetRef="${escapeXml(flow.targetId)}"`;
  const hasBody = Boolean(flow.condition) || Boolean(flow.documentation);
  if (!hasBody) return `${xml}/>\n`;
  xml += '>\n';
  xml += documentationXml(flow, `${ind}  `);
  if (flow.condition) {
    xml += `${ind}  <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">${escapeXml(flow.condition)}</bpmn:conditionExpression>\n`;
  }
  xml += `${ind}</bpmn:sequenceFlow>\n`;
  return xml;
}

/* ------------------------------------------------------------------------ */
/* Abschnitte                                                                 */
/* ------------------------------------------------------------------------ */

function createXmlHeader(definitionsId) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  id="${escapeXml(definitionsId)}"
  exporter="flyingdog BPMN Editor"
  targetNamespace="http://bpmn.io/schema/bpmn">
`;
}

/**
 * Wurzelelemente fuer Verweise aus Ereignisdefinitionen ergaenzen, damit die
 * Datei in sich geschlossen ist.
 */
function createReferencedRootElements(elements) {
  const needed = new Map(); // Elementname -> Map<id, name>
  const add = (tag, id, name) => {
    if (!tag || !id) return;
    if (!needed.has(tag)) needed.set(tag, new Map());
    const entries = needed.get(tag);
    // Ein echter Name gewinnt gegen einen, der nur aus der Id abgeleitet ist.
    const existing = entries.get(id);
    const better = name || (existing && existing !== id ? existing : undefined) || id;
    entries.set(id, better);
  };
  for (const el of elements) {
    if (el.type === 'event' && el.eventDefinitionRef) {
      const spec = EVENT_DEFINITION_TAG[el.eventDefinition];
      if (spec && spec.root) add(spec.root, el.eventDefinitionRef, el.eventDefinitionName);
    }
    // Ein Nachrichtenfluss darf auf dieselbe Nachricht verweisen wie das
    // Ereignis, das sie faengt - deshalb dieselbe Sammlung.
    if (el.type === 'connection' && el.messageRef) {
      add('bpmn:message', el.messageRef, el.messageName);
    }
  }
  let xml = '';
  for (const [tag, entries] of needed) {
    for (const [id, name] of entries) {
      xml += `  <${tag} id="${escapeXml(id)}" name="${attrText(name)}"/>\n`;
    }
  }
  return xml;
}

function createCollaborationSection(collaborationId, pools, messageFlows, elements) {
  let xml = `  <bpmn:collaboration id="${escapeXml(collaborationId)}">\n`;
  for (const pool of pools) {
    xml += `    <bpmn:participant id="${escapeXml(pool.id)}" name="${attrText(pool.label)}" processRef="${escapeXml(processIdOf(pool))}"/>\n`;
  }
  const known = new Set(elements.map((e) => String(e.id)));
  for (const flow of messageFlows) {
    if (!known.has(String(flow.sourceId)) || !known.has(String(flow.targetId))) continue;
    xml += `    <bpmn:messageFlow id="${escapeXml(flow.id)}"`;
    if (flow.label) xml += ` name="${attrText(flow.label)}"`;
    xml += ` sourceRef="${escapeXml(flow.sourceId)}" targetRef="${escapeXml(flow.targetId)}"`;
    if (flow.messageRef) xml += ` messageRef="${escapeXml(flow.messageRef)}"`;
    xml += '/>\n';
  }
  xml += '  </bpmn:collaboration>\n';
  return xml;
}

/**
 * Ein Prozess mit seinen Lanes und Flusselementen.
 * @param {object} args
 */
function createProcessSection({
  processId, lanes, nodes, flows, childrenByParent, flowsByParent,
  dataElements = [], artifacts = [], associations = [],
}) {
  let xml = `  <bpmn:process id="${escapeXml(processId)}" isExecutable="false">\n`;

  if (lanes.length) {
    xml += `    <bpmn:laneSet id="LaneSet_${escapeXml(processId)}">\n`;
    for (const lane of lanes) {
      xml += `      <bpmn:lane id="${escapeXml(lane.id)}" name="${attrText(lane.label)}">\n`;
      for (const ref of lane.flowNodeRefs || []) {
        xml += `        <bpmn:flowNodeRef>${escapeXml(ref)}</bpmn:flowNodeRef>\n`;
      }
      xml += '      </bpmn:lane>\n';
    }
    xml += '    </bpmn:laneSet>\n';
  }

  // Reihenfolge nach Schema: erst alle Flusselemente, dann die Artefakte.
  for (const node of nodes) xml += flowNodeXml(node, { flows, childrenByParent, flowsByParent }, 2);
  for (const data of dataElements) xml += dataElementXml(data, 2);
  for (const flow of flows) xml += sequenceFlowXml(flow, 2);
  for (const artifact of artifacts) xml += artifactXml(artifact, 2);
  for (const assoc of associations) xml += associationXml(assoc, 2);

  xml += '  </bpmn:process>\n';
  return xml;
}

function createDiagramSection(elements, planeElementId) {
  const diagramId = `BPMNDiagram_${generateId()}`;
  const planeId = `BPMNPlane_${generateId()}`;

  let xml = `  <bpmndi:BPMNDiagram id="${diagramId}">\n`;
  xml += `    <bpmndi:BPMNPlane id="${planeId}" bpmnElement="${escapeXml(planeElementId)}">\n`;

  for (const element of elements) {
    if (element.type === 'connection') continue;
    if (![element.x, element.y, element.width, element.height].every(Number.isFinite)) continue;

    const attrs = [];
    if (element.type === 'pool' || element.type === 'lane') {
      attrs.push(` isHorizontal="${element.isHorizontal === false ? 'false' : 'true'}"`);
    }
    if (element.type === 'gateway') attrs.push(' isMarkerVisible="true"');
    if (element.type === 'subprocess' && element.isExpanded !== undefined) {
      attrs.push(` isExpanded="${element.isExpanded ? 'true' : 'false'}"`);
    }

    xml += `      <bpmndi:BPMNShape id="Shape_${escapeXml(element.id)}" bpmnElement="${escapeXml(element.id)}"${attrs.join('')}>\n`;
    xml += `        <dc:Bounds x="${numAttr(element.x)}" y="${numAttr(element.y)}" width="${numAttr(element.width)}" height="${numAttr(element.height)}"/>\n`;
    const lb = element.labelBounds;
    if (lb && [lb.x, lb.y, lb.width, lb.height].every(Number.isFinite)) {
      xml += '        <bpmndi:BPMNLabel>\n';
      xml += `          <dc:Bounds x="${numAttr(lb.x)}" y="${numAttr(lb.y)}" width="${numAttr(lb.width)}" height="${numAttr(lb.height)}"/>\n`;
      xml += '        </bpmndi:BPMNLabel>\n';
    }
    xml += '      </bpmndi:BPMNShape>\n';
  }

  for (const element of elements) {
    if (element.type !== 'connection') continue;
    const waypoints = element.waypoints || [];
    if (waypoints.length < 2) continue; // ohne zwei Punkte ist die Kante nicht darstellbar
    xml += `      <bpmndi:BPMNEdge id="Edge_${escapeXml(element.id)}" bpmnElement="${escapeXml(element.id)}">\n`;
    for (const wp of waypoints) {
      xml += `        <di:waypoint x="${numAttr(wp.x)}" y="${numAttr(wp.y)}"/>\n`;
    }
    const lb = element.labelBounds;
    if (lb && [lb.x, lb.y, lb.width, lb.height].every(Number.isFinite)) {
      xml += '        <bpmndi:BPMNLabel>\n';
      xml += `          <dc:Bounds x="${numAttr(lb.x)}" y="${numAttr(lb.y)}" width="${numAttr(lb.width)}" height="${numAttr(lb.height)}"/>\n`;
      xml += '        </bpmndi:BPMNLabel>\n';
    }
    xml += '      </bpmndi:BPMNEdge>\n';
  }

  xml += '    </bpmndi:BPMNPlane>\n';
  xml += '  </bpmndi:BPMNDiagram>\n';
  return xml;
}

/* ------------------------------------------------------------------------ */
/* Oeffentliche Schnittstelle                                                 */
/* ------------------------------------------------------------------------ */

/**
 * Schreibt das interne Modell als BPMN 2.0 XML.
 *
 * @param {Array<object>} elements
 * @returns {string}
 */
export function exportBpmnXml(elements) {
  const all = Array.isArray(elements) ? elements : [];
  const pools = all.filter((el) => el.type === 'pool');
  const lanes = all.filter((el) => el.type === 'lane');
  const connections = all.filter((el) => el.type === 'connection');
  const messageFlows = connections.filter((c) => c.connectionType === 'message');
  const associations = connections.filter((c) => c.connectionType === 'association');
  const sequenceFlows = connections.filter(
    (c) => c.connectionType !== 'message' && c.connectionType !== 'association'
  );
  const nodes = all.filter(isFlowNode);
  const dataElements = all.filter(isDataElement);
  const artifacts = all.filter(isArtifact);
  const byId = new Map(all.map((e) => [String(e.id), e]));

  // Kinder von Unterprozessen: werden dort verschachtelt, nicht oben.
  const childrenByParent = new Map();
  for (const node of nodes) {
    if (!node.containerRef) continue;
    const parent = byId.get(String(node.containerRef));
    if (!parent || parent.type !== 'subprocess') continue;
    if (!childrenByParent.has(String(parent.id))) childrenByParent.set(String(parent.id), []);
    childrenByParent.get(String(parent.id)).push(node);
  }
  const nestedIds = new Set([...childrenByParent.values()].flat().map((n) => String(n.id)));

  // Sequenzfluesse, deren beide Enden in demselben Unterprozess liegen,
  // gehoeren in diesen Unterprozess.
  const flowsByParent = new Map();
  const topLevelFlows = [];
  for (const flow of sequenceFlows) {
    const s = byId.get(String(flow.sourceId));
    const t = byId.get(String(flow.targetId));
    if (!s || !t) continue; // Kante ins Leere wird nicht geschrieben
    const sc = s.containerRef ? String(s.containerRef) : null;
    const tc = t.containerRef ? String(t.containerRef) : null;
    if (sc && sc === tc && byId.get(sc)?.type === 'subprocess') {
      if (!flowsByParent.has(sc)) flowsByParent.set(sc, []);
      flowsByParent.get(sc).push(flow);
    } else {
      topLevelFlows.push(flow);
    }
  }

  const definitionsId = `Definitions_${generateId()}`;
  let xml = createXmlHeader(definitionsId);
  xml += createReferencedRootElements(all);
  xml += createDataStoreRootElements(all);

  let planeElementId;

  if (pools.length) {
    const collaborationId = `Collaboration_${generateId()}`;
    planeElementId = collaborationId;
    xml += createCollaborationSection(collaborationId, pools, messageFlows, all);

    // Zugeordnet wird alles Zeichenbare, nicht nur die Flussknoten:
    // ein Datenobjekt oder eine Anmerkung liegt genauso in einem Pool.
    const owner = assignNodesToPools(all, pools, lanes);

    const takenNodes = new Set();
    const takenFlows = new Set();

    for (const pool of pools) {
      const inPool = (el) => owner.get(el.id) === pool.id;
      const poolMemberIds = new Set(all.filter(isDrawable).filter(inPool).map((e) => String(e.id)));
      const poolNodes = nodes.filter((n) => inPool(n) && !nestedIds.has(String(n.id)));
      const poolFlows = topLevelFlows.filter(
        (f) => poolMemberIds.has(String(f.sourceId)) && poolMemberIds.has(String(f.targetId))
      );
      const poolAssociations = associations.filter(
        (a) => poolMemberIds.has(String(a.sourceId)) && poolMemberIds.has(String(a.targetId))
      );
      poolNodes.forEach((n) => takenNodes.add(String(n.id)));
      dataElements.filter(inPool).forEach((n) => takenNodes.add(String(n.id)));
      artifacts.filter(inPool).forEach((n) => takenNodes.add(String(n.id)));
      poolFlows.forEach((f) => takenFlows.add(String(f.id)));
      poolAssociations.forEach((a) => takenFlows.add(String(a.id)));

      xml += createProcessSection({
        processId: processIdOf(pool),
        lanes: lanes.filter((l) => l.parentRef === pool.id),
        nodes: poolNodes,
        flows: poolFlows,
        childrenByParent,
        flowsByParent,
        dataElements: dataElements.filter(inPool),
        artifacts: artifacts.filter(inPool),
        associations: poolAssociations,
      });
    }

    // Alles, was in keinem Pool liegt, bekommt einen eigenen Prozess -
    // verlieren ist keine Option.
    const leftoverNodes = nodes.filter(
      (n) => !takenNodes.has(String(n.id)) && !nestedIds.has(String(n.id))
    );
    const leftoverData = dataElements.filter((n) => !takenNodes.has(String(n.id)));
    const leftoverArtifacts = artifacts.filter((n) => !takenNodes.has(String(n.id)));
    const leftoverFlows = topLevelFlows.filter((f) => !takenFlows.has(String(f.id)));
    const leftoverAssociations = associations.filter((a) => !takenFlows.has(String(a.id)));

    if (leftoverNodes.length || leftoverData.length || leftoverArtifacts.length
        || leftoverFlows.length || leftoverAssociations.length) {
      xml += createProcessSection({
        processId: `Process_Ohne_Pool_${generateId()}`,
        lanes: [],
        nodes: leftoverNodes,
        flows: leftoverFlows,
        childrenByParent,
        flowsByParent,
        dataElements: leftoverData,
        artifacts: leftoverArtifacts,
        associations: leftoverAssociations,
      });
    }
  } else {
    const processId = 'Process_1';
    planeElementId = processId;
    xml += createProcessSection({
      processId,
      lanes: [],
      nodes: nodes.filter((n) => !nestedIds.has(String(n.id))),
      flows: topLevelFlows,
      childrenByParent,
      flowsByParent,
      dataElements,
      artifacts,
      associations,
    });
  }

  xml += createDiagramSection(all, planeElementId);
  xml += '</bpmn:definitions>\n';
  return xml;
}

/**
 * Bietet das XML als Datei zum Herunterladen an.
 * @param {string} xml
 * @param {string} filename
 */
export function downloadBpmnXml(xml, filename = 'diagram.bpmn') {
  const blob = new Blob([xml], { type: 'application/xml' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
