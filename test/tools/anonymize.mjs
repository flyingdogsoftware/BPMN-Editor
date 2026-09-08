#!/usr/bin/env node
/**
 * Erzeugt aus einer BPMN-Datei eine strukturgleiche, inhaltlich neutrale
 * Fassung: gleiche Elemente, gleiche Verweise, gleiche Geometrie - aber alle
 * Ids, Namen und Dokumentationstexte ersetzt.
 *
 *   node test/tools/anonymize.mjs quelle.bpmn ziel.bpmn [Praefix]
 *
 * Gedacht fuer Fehlerbilder aus Kundendateien: die Struktur, die den Fehler
 * ausloest, bleibt erhalten, die Inhalte des Kunden bleiben draussen.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [, , src, dst, prefix = 'E'] = process.argv;
if (!src || !dst) {
  console.error('Aufruf: node test/tools/anonymize.mjs quelle.bpmn ziel.bpmn [Praefix]');
  process.exit(2);
}

let xml = readFileSync(src, 'utf8');

/* --- 1. Alle Ids einsammeln und auf neutrale Namen abbilden ---------------- */

const ids = new Set();
for (const m of xml.matchAll(/\bid="([^"]+)"/g)) ids.add(m[1]);

// Nach Laenge absteigend ersetzen, damit keine Id Teil einer anderen ueberschreibt.
const ordered = [...ids].sort((a, b) => b.length - a.length);
const map = new Map();
let n = 0;
for (const id of ordered) {
  n += 1;
  map.set(id, `${prefix}${String(n).padStart(3, '0')}`);
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
for (const [from, to] of map) {
  // Nur in Attributwerten ersetzen, nie in Fliesstext.
  xml = xml.replace(new RegExp(`(="|\\s)${escapeRe(from)}(")`, 'g'), (_, a, b) => `${a}${to}${b}`);
  // flowNodeRef und aehnliche Verweise stehen als Elementinhalt.
  xml = xml.replace(new RegExp(`>${escapeRe(from)}<`, 'g'), `>${to}<`);
}

/* --- 2. Namen und Texte neutralisieren ------------------------------------ */

const WORDS = [
  'Vorgang anlegen', 'Antrag pruefen', 'Freigabe erteilen', 'Unterlagen ergaenzen',
  'Stellungnahme einholen', 'Entscheidung treffen', 'Ergebnis erfassen', 'Abschluss',
  'Weiterleiten', 'Zurueckgeben', 'Erinnerung', 'Frist abgelaufen', 'Naechste Stufe?',
  'Beteiligung A', 'Beteiligung B', 'Beteiligung C', 'Bereich 1', 'Bereich 2',
  'Bereich 3', 'Bereich 4', 'Rolle A', 'Rolle B', 'Rolle C', 'System',
];
let w = 0;
const nextWord = () => WORDS[w++ % WORDS.length];

xml = xml.replace(/\bname="([^"]*)"/g, (_, v) => (v.trim() === '' ? 'name=""' : `name="${nextWord()}"`));

xml = xml.replace(
  /<([A-Za-z0-9]*:?)documentation>[\s\S]*?<\/\1documentation>/g,
  (_, p) => `<${p}documentation>Beispieltext zur Beschreibung dieses Elements.</${p}documentation>`
);

xml = xml.replace(
  /<([A-Za-z0-9]*:?)conditionExpression([^>]*)>[\s\S]*?<\/\1conditionExpression>/g,
  (_, p, a) => `<${p}conditionExpression${a}>Bedingung erfuellt</${p}conditionExpression>`
);

// Beschreibende Attribute des Wurzelelements
xml = xml.replace(/\bexporter="[^"]*"/g, 'exporter="Testfixture"');
xml = xml.replace(/\btargetNamespace="[^"]*"/g, 'targetNamespace="http://example.org/bpmn/test"');

writeFileSync(dst, xml);
console.log(`${dst}: ${map.size} Ids ersetzt, Namen und Texte neutralisiert.`);
