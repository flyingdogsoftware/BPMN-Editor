/**
 * Namensraum-Aufloesung fuer BPMN 2.0
 *
 * Hintergrund: In XML ist ein Praefix ein frei waehlbarer Kurzname fuer eine
 * Namensraum-URI. `<bpmn:definitions xmlns:bpmn="...MODEL">`,
 * `<definitions xmlns="...MODEL">` und `<ns0:definitions xmlns:ns0="...MODEL">`
 * bezeichnen dasselbe Element. Werkzeuge exportieren durchaus unterschiedlich:
 * Camunda und bpmn.io schreiben `bpmn:`, andere Erzeuger den Default-Namensraum,
 * ein paar aeltere Werkzeuge `semantic:` oder `ns0:`.
 *
 * fast-xml-parser loest Namensraeume nicht auf - das Praefix bleibt Teil des
 * Schluessels. Dieses Modul stellt den Zustand her, den der Rest des Importers
 * erwartet: alle Schluessel tragen das kanonische Praefix ihrer Namensraum-URI.
 * Elemente aus unbekannten Namensraeumen bleiben unangetastet, damit
 * herstellerspezifische Erweiterungen nicht mit BPMN-Elementen kollidieren.
 */

/** Namensraum-URI -> kanonisches Praefix, das der Importer erwartet. */
export const CANONICAL_PREFIX_BY_URI = {
  'http://www.omg.org/spec/BPMN/20100524/MODEL': 'bpmn',
  'http://www.omg.org/spec/BPMN/20100524/DI': 'bpmndi',
  'http://www.omg.org/spec/DD/20100524/DI': 'di',
  'http://www.omg.org/spec/DD/20100524/DC': 'dc',
  // BPMN 2.0 wurde vor der Verabschiedung unter diesen URIs verteilt; einige
  // aeltere Werkzeuge schreiben sie bis heute.
  'http://www.omg.org/spec/BPMN/20100524/MODEL-XMI': 'bpmn',
  'http://www.omg.org/bpmn20': 'bpmn',
  'http://schema.omg.org/spec/BPMN/2.0': 'bpmn',
};

/** Praefixe, die wir am Ende sehen wollen. */
export const CANONICAL_PREFIXES = ['bpmn', 'bpmndi', 'di', 'dc'];

/**
 * Sammelt alle Namensraum-Deklarationen aus dem geparsten Baum.
 *
 * XML erlaubt, einen Namensraum auf jedem Element neu zu binden. fast-xml-parser
 * gibt uns keinen Baum mit Gueltigkeitsbereichen, deshalb bilden wir die
 * Vereinigung aller Deklarationen. Fuer BPMN-Dateien ist das unkritisch: sie
 * deklarieren praktisch ausnahmslos alles am Wurzelelement, und ein Praefix
 * innerhalb einer Datei zweimal verschieden zu binden kommt nicht vor.
 *
 * @param {object} node geparster Teilbaum
 * @param {Map<string,string>} [into] Praefix ('' = Default) -> URI
 * @returns {Map<string,string>}
 */
export function collectNamespaceDeclarations(node, into = new Map()) {
  if (!node || typeof node !== 'object') return into;
  if (Array.isArray(node)) {
    for (const item of node) collectNamespaceDeclarations(item, into);
    return into;
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === '@_xmlns') {
      if (typeof value === 'string' && !into.has('')) into.set('', value);
      continue;
    }
    if (key.startsWith('@_xmlns:')) {
      const prefix = key.slice('@_xmlns:'.length);
      if (typeof value === 'string' && !into.has(prefix)) into.set(prefix, value);
      continue;
    }
    if (key.startsWith('@_') || key === '#text') continue;
    collectNamespaceDeclarations(value, into);
  }
  return into;
}

/**
 * Baut die Umschreibetabelle: gefundenes Praefix -> kanonisches Praefix.
 *
 * @param {Map<string,string>} declarations aus collectNamespaceDeclarations
 * @returns {{ rename: Map<string,string>, defaultPrefix: string|null, uris: Map<string,string> }}
 *   rename         Praefix im Dokument -> kanonisches Praefix ('' = unpraefixiert)
 *   defaultPrefix  kanonisches Praefix fuer unpraefixierte Elemente, sonst null
 */
export function buildPrefixRewriteMap(declarations) {
  const rename = new Map();
  let defaultPrefix = null;
  for (const [prefix, uri] of declarations) {
    const canonical = CANONICAL_PREFIX_BY_URI[uri];
    if (!canonical) continue;
    if (prefix === '') defaultPrefix = canonical;
    else rename.set(prefix, canonical);
  }
  return { rename, defaultPrefix, uris: declarations };
}

/**
 * Schreibt einen geparsten Baum so um, dass alle bekannten BPMN-Elemente ihr
 * kanonisches Praefix tragen.
 *
 * Nur Elementnamen werden umgeschrieben, keine Attributnamen: Attribute stehen
 * ohne Praefix im Namensraum ihres Elements, und die wenigen praefixierten
 * (`xsi:type`) wertet der Importer nicht aus.
 *
 * @param {object} parsed Ergebnis von XMLParser.parse
 * @returns {{ xml: object, defaultPrefix: string|null, declarations: Map<string,string> }}
 */
export function normalizeNamespaces(parsed) {
  const declarations = collectNamespaceDeclarations(parsed);
  const { rename, defaultPrefix } = buildPrefixRewriteMap(declarations);

  // Nichts zu tun, wenn ohnehin schon alles kanonisch ist.
  const needsWork =
    defaultPrefix !== null || [...rename].some(([from, to]) => from !== to);

  const rewriteKey = (key) => {
    const colon = key.indexOf(':');
    if (colon === -1) {
      // Unpraefixiert: gehoert in den Default-Namensraum, falls einer gilt.
      return defaultPrefix ? `${defaultPrefix}:${key}` : key;
    }
    const prefix = key.slice(0, colon);
    const local = key.slice(colon + 1);
    const canonical = rename.get(prefix);
    return canonical ? `${canonical}:${local}` : key;
  };

  const walk = (node) => {
    if (Array.isArray(node)) return node.map(walk);
    if (!node || typeof node !== 'object') return node;
    const out = {};
    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith('@_') || key === '#text') {
        out[key] = value;
        continue;
      }
      out[rewriteKey(key)] = walk(value);
    }
    return out;
  };

  return {
    xml: needsWork ? walk(parsed) : parsed,
    defaultPrefix,
    declarations,
  };
}

/**
 * Lokaler Name eines moeglicherweise praefixierten Tag-Namens.
 * @param {string} name
 * @returns {string}
 */
export function localName(name) {
  const colon = name.indexOf(':');
  return colon === -1 ? name : name.slice(colon + 1);
}
