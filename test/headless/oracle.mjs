/**
 * Unabhaengiges Auslesen einer BPMN-Datei ("Orakel").
 *
 * Bewusst NICHT der Parser des Editors: dieses Modul sagt, was in der Datei
 * steht, damit der Prueflauf feststellen kann, was der Editor davon verliert.
 * Es arbeitet namensraum-agnostisch ueber die lokalen Namen.
 */
import { XMLParser } from 'fast-xml-parser';

/** Flussknoten nach BPMN 2.0 (lokale Namen, ohne Praefix). */
export const FLOW_NODES = new Set([
  'task', 'userTask', 'serviceTask', 'sendTask', 'receiveTask', 'manualTask',
  'businessRuleTask', 'scriptTask', 'callActivity', 'subProcess', 'transaction',
  'adHocSubProcess',
  'startEvent', 'endEvent', 'intermediateThrowEvent', 'intermediateCatchEvent',
  'boundaryEvent',
  'exclusiveGateway', 'inclusiveGateway', 'parallelGateway', 'complexGateway',
  'eventBasedGateway',
]);

export const EDGES = new Set(['sequenceFlow', 'messageFlow', 'association']);

const CONTAINERS = new Set([
  'process', 'subProcess', 'transaction', 'adHocSubProcess', 'collaboration',
]);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: false,
  parseTagValue: false,
  allowBooleanAttributes: true,
  removeNSPrefix: true,
  textNodeName: '#text',
  isArray: () => true, // alles als Array: macht das Durchlaufen gleichfoermig
});

/**
 * Liest die Datei und liefert die Grundwahrheit:
 *   nodes     Map id -> { localName, name, parent, attachedTo }
 *   edges     Map id -> { localName, sourceRef, targetRef }
 *   shapes    Set der bpmnElement-Ids mit BPMNShape
 *   diEdges   Set der bpmnElement-Ids mit BPMNEdge
 *   pools     Map id -> processRef
 *   lanes     Map id -> { process, flowNodeRefs[] }
 */
export function readGroundTruth(xml) {
  const doc = parser.parse(xml);
  const nodes = new Map();
  const edges = new Map();
  const shapes = new Map();
  const diEdges = new Set();
  const pools = new Map();
  const lanes = new Map();
  const processes = new Map();

  const attr = (o, n) => (o && o[`@_${n}`] !== undefined ? String(o[`@_${n}`]) : undefined);

  function walk(obj, ctx) {
    if (!obj || typeof obj !== 'object') return;
    for (const [key, val] of Object.entries(obj)) {
      if (key.startsWith('@_') || key === '#text') continue;
      const list = Array.isArray(val) ? val : [val];
      for (const item of list) {
        if (!item || typeof item !== 'object') continue;
        const id = attr(item, 'id');

        if (key === 'process' && id) {
          processes.set(id, { id, name: attr(item, 'name') });
        }
        if (key === 'participant' && id) {
          pools.set(id, attr(item, 'processRef'));
        }
        if (key === 'lane' && id) {
          const refs = [];
          const raw = item.flowNodeRef;
          for (const r of Array.isArray(raw) ? raw : raw ? [raw] : []) {
            if (typeof r === 'string') refs.push(r);
            else if (r && r['#text']) refs.push(String(r['#text']));
          }
          lanes.set(id, { process: ctx.process, flowNodeRefs: refs });
        }
        if (FLOW_NODES.has(key) && id) {
          nodes.set(id, {
            localName: key,
            name: attr(item, 'name'),
            parent: ctx.process,
            container: ctx.container,
            attachedTo: attr(item, 'attachedToRef'),
            inSubProcess: ctx.inSubProcess === true,
            calledElement: attr(item, 'calledElement'),
            triggeredByEvent: attr(item, 'triggeredByEvent') === 'true',
          });
        }
        if (EDGES.has(key) && id) {
          edges.set(id, {
            localName: key,
            sourceRef: attr(item, 'sourceRef'),
            targetRef: attr(item, 'targetRef'),
            parent: ctx.process,
          });
        }
        if (key === 'BPMNShape') {
          const be = attr(item, 'bpmnElement');
          if (be) {
            const b = Array.isArray(item.Bounds) ? item.Bounds[0] : item.Bounds;
            shapes.set(be, b ? {
              x: Number(attr(b, 'x')), y: Number(attr(b, 'y')),
              width: Number(attr(b, 'width')), height: Number(attr(b, 'height')),
            } : null);
          }
        }
        if (key === 'BPMNEdge') {
          const be = attr(item, 'bpmnElement');
          if (be) diEdges.add(be);
        }

        const nextCtx = CONTAINERS.has(key)
          ? {
              process: key === 'process' ? id : ctx.process,
              container: id || ctx.container,
              inSubProcess: key !== 'process' && key !== 'collaboration',
            }
          : ctx;
        walk(item, nextCtx);
      }
    }
  }

  walk(doc, { process: undefined, container: undefined, inSubProcess: false });
  return { nodes, edges, shapes, diEdges, pools, lanes, processes };
}
