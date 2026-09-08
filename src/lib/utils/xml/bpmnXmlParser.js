/**
 * BPMN XML Parser
 *
 * Liest eine BPMN-2.0-Datei ein und uebersetzt sie in das interne Datenmodell
 * des Editors.
 *
 * Der Parser ist namensraum-tolerant: `<bpmn:definitions>`, `<definitions>` mit
 * Default-Namensraum und `<ns0:definitions>` werden gleich behandelt, solange
 * die Namensraum-URI stimmt. Siehe bpmnNamespaces.js.
 */
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { mapXmlToModel } from './xmlToModelMapper';
import { normalizeNamespaces, localName } from './bpmnNamespaces';

/**
 * Elemente, die auch bei nur einem Vorkommen als Array geliefert werden sollen.
 * Verglichen wird der LOKALE Name - das Praefix ist zu diesem Zeitpunkt noch
 * das der Datei und damit unbekannt.
 */
const ALWAYS_ARRAY = new Set([
  // Aktivitaeten
  'task', 'userTask', 'serviceTask', 'sendTask', 'receiveTask', 'manualTask',
  'businessRuleTask', 'scriptTask', 'callActivity', 'subProcess', 'transaction',
  'adHocSubProcess',
  // Ereignisse
  'startEvent', 'endEvent', 'intermediateThrowEvent', 'intermediateCatchEvent',
  'boundaryEvent',
  // Gateways
  'exclusiveGateway', 'inclusiveGateway', 'parallelGateway', 'complexGateway',
  'eventBasedGateway',
  // Kanten und Struktur
  'sequenceFlow', 'messageFlow', 'association', 'dataAssociation',
  'process', 'collaboration', 'choreography', 'participant', 'laneSet', 'lane',
  'flowNodeRef', 'subProcessRef',
  // Daten und Artefakte
  'dataObject', 'dataObjectReference', 'dataStore', 'dataStoreReference',
  'textAnnotation', 'group',
  // Diagram Interchange
  'BPMNDiagram', 'BPMNShape', 'BPMNEdge', 'waypoint',
]);

const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  // Attributwerte NICHT automatisch in Zahlen/Booleans wandeln: XML-Ids sind
  // Zeichenketten, und eine Id wie "0123" oder "1e5" wuerde sonst still zur
  // Zahl. Wo Zahlen gebraucht werden (Bounds, Wegpunkte), wandelt der Mapper
  // ausdruecklich um.
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
  allowBooleanAttributes: true,
  isArray: (name) => ALWAYS_ARRAY.has(localName(name)),
  textNodeName: '#text',
};

/* ------------------------------------------------------------------------ */
/* Diagnose                                                                   */
/* ------------------------------------------------------------------------ */

let debugEnabled = false;

/**
 * Ausfuehrliche Protokollierung des Imports ein- oder ausschalten.
 *
 * Standard ist aus. Der Import eines mittelgrossen Diagramms erzeugte frueher
 * ueber 140 000 Zeichen Konsolenausgabe, was den Browser sichtbar ausbremst.
 * @param {boolean} on
 */
export function setBpmnImportDebug(on) {
  debugEnabled = Boolean(on);
}

/** @returns {boolean} */
export function isBpmnImportDebug() {
  return debugEnabled;
}

/** Sammelt Hinweise waehrend eines Importlaufs. */
export class ImportReport {
  constructor() {
    this.warnings = [];
    this.stats = {};
  }
  warn(code, message, detail) {
    this.warnings.push({ code, message, detail });
    if (debugEnabled) console.warn(`[bpmn-import] ${code}: ${message}`, detail ?? '');
  }
  debug(...args) {
    if (debugEnabled) console.log('[bpmn-import]', ...args);
  }
}

/* ------------------------------------------------------------------------ */
/* Parsen                                                                     */
/* ------------------------------------------------------------------------ */

/**
 * Parst eine BPMN-XML-Zeichenkette und loest die Namensraeume auf.
 *
 * @param {string} xmlString
 * @returns {object} geparster Baum mit kanonischen Praefixen (bpmn:, bpmndi:, di:, dc:)
 * @throws {Error} wenn das XML nicht wohlgeformt ist
 */
export function parseBpmnXml(xmlString) {
  if (typeof xmlString !== 'string' || xmlString.trim() === '') {
    throw new Error('Leere Eingabe: es wurde keine XML-Zeichenkette uebergeben.');
  }

  const validationResult = XMLValidator.validate(xmlString);
  if (validationResult !== true) {
    const err = validationResult.err || {};
    const where = err.line ? ` (Zeile ${err.line}${err.col ? `, Spalte ${err.col}` : ''})` : '';
    throw new Error(`Die Datei ist kein wohlgeformtes XML${where}: ${err.msg || 'unbekannter Fehler'}`);
  }

  const parser = new XMLParser(parserOptions);
  const raw = parser.parse(xmlString);
  const { xml } = normalizeNamespaces(raw);
  return xml;
}

/**
 * Sucht das definitions-Element und erklaert verstaendlich, was fehlt.
 * @param {object} parsedXml
 * @returns {object}
 */
export function requireDefinitions(parsedXml) {
  if (!parsedXml || typeof parsedXml !== 'object') {
    throw new Error('Die Datei enthaelt keine auswertbare XML-Struktur.');
  }
  const definitions = parsedXml['bpmn:definitions'];
  if (definitions) return definitions;

  // Kein definitions-Element im BPMN-Namensraum. Herausfinden, was es
  // stattdessen ist, damit die Meldung dem Anwender etwas nuetzt.
  const topLevel = Object.keys(parsedXml).filter((k) => !k.startsWith('?') && k !== '#text');
  const looksLikeDefinitions = topLevel.find((k) => localName(k) === 'definitions');

  if (looksLikeDefinitions) {
    throw new Error(
      `Die Datei enthaelt zwar ein <${looksLikeDefinitions}>-Element, aber nicht im ` +
        'BPMN-2.0-Namensraum "http://www.omg.org/spec/BPMN/20100524/MODEL". ' +
        'Bitte die xmlns-Deklaration der Datei pruefen.'
    );
  }
  throw new Error(
    'Kein <definitions>-Element gefunden - die Datei ist wohl kein BPMN 2.0. ' +
      `Gefundene Elemente auf oberster Ebene: ${topLevel.length ? topLevel.join(', ') : '(keine)'}.`
  );
}

/* ------------------------------------------------------------------------ */
/* Oeffentliche Schnittstelle                                                 */
/* ------------------------------------------------------------------------ */

/**
 * Importiert eine BPMN-Datei und liefert Elemente samt Bericht.
 *
 * @param {string} xmlString
 * @returns {{ elements: object[], warnings: Array<{code:string,message:string,detail?:any}>, stats: object }}
 */
export function importBpmnDiagram(xmlString) {
  const report = new ImportReport();
  const parsedXml = parseBpmnXml(xmlString);
  requireDefinitions(parsedXml);
  const elements = mapXmlToModel(parsedXml, report);
  return { elements, warnings: report.warnings, stats: report.stats };
}

/**
 * Importiert eine BPMN-Datei.
 *
 * Beibehaltene Schnittstelle: liefert das Elementarray. Hinweise aus dem Lauf
 * sind ueber importBpmnDiagram zugaenglich.
 *
 * @param {string} xmlString
 * @returns {object[]}
 * @throws {Error} mit einer Meldung, die man einem Anwender zeigen kann
 */
export function importBpmnXml(xmlString) {
  try {
    return importBpmnDiagram(xmlString).elements;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (debugEnabled) console.error('[bpmn-import] fehlgeschlagen:', error);
    // Meldung nicht noch einmal einwickeln - sie ist bereits erklaerend.
    throw new Error(message);
  }
}

/**
 * Liefert die Prozessdefinitionen der Datei.
 * @param {object} parsedXml
 * @returns {object[]}
 */
export function extractProcessDefinitions(parsedXml) {
  const definitions = requireDefinitions(parsedXml);
  const processes = definitions['bpmn:process'] || [];
  const collaborations = definitions['bpmn:collaboration'] || [];
  if (!processes.length && !collaborations.length) {
    throw new Error('Die Datei enthaelt weder einen Prozess noch eine Kollaboration.');
  }
  return processes;
}

/**
 * Liefert die Diagrammangaben (BPMNDiagram) der Datei.
 * @param {object} parsedXml
 * @returns {object[]}
 */
export function extractDiagrams(parsedXml) {
  const definitions = requireDefinitions(parsedXml);
  return definitions['bpmndi:BPMNDiagram'] || [];
}
