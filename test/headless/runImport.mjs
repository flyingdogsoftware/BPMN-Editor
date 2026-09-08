#!/usr/bin/env node
/**
 * Headless-Prueflauf fuer den BPMN-Import.
 *
 *   node test/headless/runImport.mjs [datei.bpmn ...]
 *
 * Ohne Argumente laufen alle Dateien in test/fixtures.
 *
 * Der Lauf laedt den echten Importpfad des Editors ueber Vites SSR-Loader -
 * also genau den Code, den auch der Browser bekommt - und vergleicht das
 * Ergebnis mit dem unabhaengig gelesenen Inhalt der Datei (oracle.mjs).
 * Alles, was der Editor verliert, wird als Fehler gemeldet statt still zu
 * verschwinden.
 *
 * Rueckgabewert: 0 wenn alle Dateien fehlerfrei sind, sonst 1.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { readGroundTruth } from './oracle.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const FIXTURES = join(ROOT, 'test/fixtures');

const C = process.stdout.isTTY
  ? { red: '\x1b[31m', yellow: '\x1b[33m', green: '\x1b[32m', dim: '\x1b[2m', bold: '\x1b[1m', off: '\x1b[0m' }
  : { red: '', yellow: '', green: '', dim: '', bold: '', off: '' };

/** Meldungen, die der Importlauf abgesetzt hat. */
function captureConsole() {
  const orig = { log: console.log, warn: console.warn, error: console.error };
  const rec = { log: [], warn: [], error: [] };
  console.log = (...a) => rec.log.push(a.map(String).join(' '));
  console.warn = (...a) => rec.warn.push(a.map(String).join(' '));
  console.error = (...a) => rec.error.push(a.map(String).join(' '));
  return {
    rec,
    restore() {
      console.log = orig.log;
      console.warn = orig.warn;
      console.error = orig.error;
    },
  };
}

/** Negativfall: der Import muss scheitern, aber verstaendlich. */
function checkRejected(file, xml, importBpmnXml) {
  const errors = [];
  const notes = [];
  const cap = captureConsole();
  let thrown = null;
  try {
    importBpmnXml(xml);
  } catch (err) {
    thrown = err;
  }
  cap.restore();

  if (!thrown) {
    errors.push('Die Datei wurde angenommen, obwohl sie zurueckgewiesen werden muss.');
    return { file, errors, warnings: [], notes, ms: 0, truth: null, elements: null, log: cap.rec };
  }
  const msg = String(thrown.message || '');
  notes.push(`abgewiesen mit: "${msg}"`);
  if (msg.length < 25) {
    errors.push(`Die Fehlermeldung ist zu knapp, um zu helfen: "${msg}"`);
  }
  if (/undefined|\[object|TypeError|Cannot read/i.test(msg)) {
    errors.push(`Die Fehlermeldung ist ein Programmierfehler, keine Erklaerung: "${msg}"`);
  }
  if (/^Failed to import BPMN XML: Failed to import/i.test(msg)) {
    errors.push('Die Fehlermeldung ist doppelt eingewickelt.');
  }
  return { file, errors, warnings: [], notes, ms: 0, truth: null, elements: null, log: cap.rec };
}

function checkFile(file, importBpmnXml) {
  const xml = readFileSync(file, 'utf8');
  // Dateien mit dem Namensteil "invalid-" MUESSEN abgewiesen werden, und zwar
  // mit einer Meldung, die man einem Anwender zeigen kann.
  if (basename(file).startsWith('invalid-')) {
    return checkRejected(file, xml, importBpmnXml);
  }
  const truth = readGroundTruth(xml);
  const errors = [];
  const warnings = [];
  const notes = [];

  const cap = captureConsole();
  let elements = null;
  let thrown = null;
  const t0 = Date.now();
  try {
    elements = importBpmnXml(xml);
  } catch (err) {
    thrown = err;
  }
  const ms = Date.now() - t0;
  cap.restore();

  if (thrown) {
    errors.push(`Import wirft: ${thrown.message}`);
    return { file, errors, warnings, notes, ms, truth, elements: null, log: cap.rec };
  }
  if (!Array.isArray(elements)) {
    errors.push(`Import liefert kein Array, sondern ${typeof elements}`);
    return { file, errors, warnings, notes, ms, truth, elements: null, log: cap.rec };
  }

  const byId = new Map(elements.map((e) => [String(e.id), e]));

  // --- 1. Jeder Flussknoten der Datei muss im Modell ankommen ------------
  const missingNodes = [];
  const skippedByDesign = [];
  for (const [id, meta] of truth.nodes) {
    if (byId.has(id)) continue;
    // Ein Element in einem Unterprozess OHNE eigenes BPMNShape gehoert zu einer
    // zugeklappten Darstellung und darf fehlen. Alles andere nicht.
    if (meta.inSubProcess && !truth.shapes.has(id)) {
      skippedByDesign.push(`${id} (${meta.localName})`);
      continue;
    }
    missingNodes.push(`${id} (${meta.localName})`);
  }
  if (skippedByDesign.length) {
    notes.push(`${skippedByDesign.length} Elemente in zugeklappten Unterprozessen uebergangen (in Ordnung)`);
  }
  if (missingNodes.length) {
    errors.push(
      `${missingNodes.length} Flussknoten fehlen im Modell:\n` +
        missingNodes.map((s) => `      - ${s}`).join('\n')
    );
  }

  // --- 2. Jede Kante muss ankommen ---------------------------------------
  const missingEdges = [];
  for (const [id, meta] of truth.edges) {
    if (byId.has(id)) continue;
    const endsPresent = byId.has(meta.sourceRef) && byId.has(meta.targetRef);
    if (!endsPresent) continue; // Enden fehlen zu Recht -> Kante darf fehlen
    missingEdges.push(`${id} (${meta.localName}: ${meta.sourceRef} -> ${meta.targetRef})`);
  }
  if (missingEdges.length) {
    errors.push(
      `${missingEdges.length} Verbindungen fehlen im Modell:\n` +
        missingEdges.map((s) => `      - ${s}`).join('\n')
    );
  }

  // --- 3. Pools und Lanes -------------------------------------------------
  const missingPools = [...truth.pools.keys()].filter((id) => !byId.has(id));
  if (missingPools.length) errors.push(`Pools fehlen: ${missingPools.join(', ')}`);
  const missingLanes = [...truth.lanes.keys()].filter((id) => !byId.has(id));
  if (missingLanes.length) errors.push(`Lanes fehlen: ${missingLanes.join(', ')}`);

  // --- 4. Geometrie aus dem DI muss uebernommen sein ----------------------
  const wrongGeom = [];
  for (const [id, b] of truth.shapes) {
    const el = byId.get(id);
    if (!el || !b) continue;
    if (el.type === 'connection') continue;
    const same = el.x === b.x && el.y === b.y && el.width === b.width && el.height === b.height;
    if (!same) {
      wrongGeom.push(
        `${id}: Modell (${el.x},${el.y} ${el.width}x${el.height}) ` +
        `weicht vom DI ab (${b.x},${b.y} ${b.width}x${b.height})`
      );
    }
  }
  if (wrongGeom.length) {
    errors.push(
      `${wrongGeom.length} Elemente mit abweichender Geometrie:\n` +
        wrongGeom.slice(0, 15).map((s) => `      - ${s}`).join('\n') +
        (wrongGeom.length > 15 ? `\n      ... und ${wrongGeom.length - 15} weitere` : '')
    );
  }

  // --- 5. Wegpunkte der Kanten -------------------------------------------
  const noWaypoints = [];
  for (const id of truth.diEdges) {
    const el = byId.get(id);
    if (!el) continue;
    if (!el.waypoints || el.waypoints.length < 2) {
      noWaypoints.push(id);
    }
  }
  if (noWaypoints.length) {
    errors.push(
      `${noWaypoints.length} Verbindungen ohne Wegpunkte, obwohl die Datei welche liefert:\n` +
        noWaypoints.slice(0, 15).map((s) => `      - ${s}`).join('\n')
    );
  }

  // --- 6. Randereignisse muessen ihren Host kennen ------------------------
  const looseBoundary = [];
  for (const [id, meta] of truth.nodes) {
    if (meta.localName !== 'boundaryEvent') continue;
    const el = byId.get(id);
    if (!el) continue;
    if (!el.attachedToRef) looseBoundary.push(`${id} -> ${meta.attachedTo}`);
  }
  if (looseBoundary.length) {
    errors.push(
      `${looseBoundary.length} Randereignisse ohne Bezug zu ihrer Aktivitaet:\n` +
        looseBoundary.map((s) => `      - ${s}`).join('\n')
    );
  }

  // --- 7. Verbindungstypen ------------------------------------------------
  const wrongKind = [];
  for (const [id, meta] of truth.edges) {
    const el = byId.get(id);
    if (!el) continue;
    const want = meta.localName === 'messageFlow' ? 'message' : 'sequence';
    if (el.connectionType !== want) {
      wrongKind.push(`${id}: ist "${el.connectionType}", erwartet "${want}"`);
    }
  }
  if (wrongKind.length) {
    warnings.push(
      `${wrongKind.length} Verbindungen mit abweichendem Typ:\n` +
        wrongKind.slice(0, 10).map((s) => `      - ${s}`).join('\n')
    );
  }

  // --- 8. Keine Elemente ohne id, keine Dubletten -------------------------
  const seen = new Set();
  for (const el of elements) {
    if (el.id === undefined || el.id === null || el.id === '') {
      errors.push(`Element ohne id: ${JSON.stringify(el).slice(0, 120)}`);
    } else if (seen.has(String(el.id))) {
      errors.push(`Doppelte id im Modell: ${el.id}`);
    }
    seen.add(String(el.id));
  }

  // --- Kennzahlen ---------------------------------------------------------
  const modelCounts = {};
  for (const el of elements) modelCounts[el.type] = (modelCounts[el.type] || 0) + 1;
  notes.push(
    `Datei: ${truth.nodes.size} Flussknoten, ${truth.edges.size} Kanten, ` +
      `${truth.pools.size} Pools, ${truth.lanes.size} Lanes, ` +
      `${truth.shapes.size} Shapes, ${truth.diEdges.size} DI-Kanten`
  );
  notes.push(
    `Modell: ${elements.length} Elemente (` +
      Object.entries(modelCounts).map(([k, v]) => `${k}=${v}`).join(', ') + ')'
  );
  const logVolume = cap.rec.log.reduce((n, s) => n + s.length, 0);
  notes.push(`Laufzeit ${ms} ms, Konsolenausgabe ${cap.rec.log.length} Zeilen / ${logVolume} Zeichen`);
  if (logVolume > 200000) {
    warnings.push(`Konsolenausgabe von ${logVolume} Zeichen - das bremst den Browser sichtbar`);
  }
  if (cap.rec.error.length) {
    warnings.push(
      `${cap.rec.error.length} console.error waehrend des Imports:\n` +
        [...new Set(cap.rec.error)].slice(0, 8).map((s) => `      - ${s.slice(0, 160)}`).join('\n')
    );
  }

  return { file, errors, warnings, notes, ms, truth, elements, log: cap.rec };
}

async function main() {
  const args = process.argv.slice(2);
  let files = args.filter((a) => !a.startsWith('-'));
  if (!files.length) {
    if (!existsSync(FIXTURES)) {
      console.error(`Kein Verzeichnis ${FIXTURES}`);
      process.exit(2);
    }
    files = readdirSync(FIXTURES)
      .filter((f) => f.endsWith('.bpmn') || f.endsWith('.xml'))
      .sort()
      .map((f) => join(FIXTURES, f));
  }
  if (!files.length) {
    console.error('Keine Dateien zu pruefen.');
    process.exit(2);
  }

  const server = await createServer({
    root: ROOT,
    server: { middlewareMode: true },
    logLevel: 'error',
    appType: 'custom',
  });
  let mod;
  try {
    mod = await server.ssrLoadModule('/src/lib/utils/xml/bpmnXmlParser.js');
  } finally {
    // Server bleibt bis zum Ende offen, wird unten geschlossen
  }

  let failed = 0;
  const results = [];
  for (const f of files) {
    const r = checkFile(f, mod.importBpmnXml);
    results.push(r);
    if (r.errors.length) failed++;
  }
  await server.close();

  console.log('');
  for (const r of results) {
    const ok = r.errors.length === 0;
    const head = ok ? `${C.green}BESTANDEN${C.off}` : `${C.red}FEHLGESCHLAGEN${C.off}`;
    console.log(`${C.bold}${basename(r.file)}${C.off}  ${head}`);
    for (const n of r.notes) console.log(`  ${C.dim}${n}${C.off}`);
    for (const e of r.errors) console.log(`  ${C.red}FEHLER${C.off} ${e}`);
    for (const w of r.warnings) console.log(`  ${C.yellow}HINWEIS${C.off} ${w}`);
    console.log('');
  }
  const total = results.length;
  console.log(
    `${total - failed}/${total} Dateien fehlerfrei importiert.` +
      (failed ? `  ${C.red}${failed} fehlgeschlagen.${C.off}` : '')
  );
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
