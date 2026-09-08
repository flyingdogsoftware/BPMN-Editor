#!/usr/bin/env node
/**
 * Rundlauf-Prueflauf: importieren -> exportieren -> erneut importieren.
 *
 *   node test/headless/runRoundTrip.mjs [datei.bpmn ...]
 *
 * Ein Editor, der eine Datei oeffnet und wieder speichert, darf dabei nichts
 * verlieren. Dieser Lauf vergleicht das Modell vor und nach der Runde durch den
 * Exporter und benennt jede Abweichung.
 *
 * Rueckgabewert: 0 wenn alle Dateien den Rundlauf unveraendert ueberstehen.
 */
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const FIXTURES = join(ROOT, 'test/fixtures');
const OUT = join(ROOT, 'test/.roundtrip');

const C = process.stdout.isTTY
  ? { red: '\x1b[31m', yellow: '\x1b[33m', green: '\x1b[32m', dim: '\x1b[2m', bold: '\x1b[1m', off: '\x1b[0m' }
  : { red: '', yellow: '', green: '', dim: '', bold: '', off: '' };

const quiet = () => {
  const orig = { log: console.log, warn: console.warn, error: console.error };
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
  return () => Object.assign(console, orig);
};

/** Vergleichbare Kurzfassung eines Elements. */
function digest(el) {
  const base = { id: String(el.id), type: el.type };
  if (el.type === 'connection') {
    return {
      ...base,
      connectionType: el.connectionType,
      sourceId: String(el.sourceId),
      targetId: String(el.targetId),
      waypoints: (el.waypoints || []).length,
      label: el.label || '',
      condition: el.condition || '',
      messageRef: el.messageRef || '',
      messageName: el.messageName || '',
    };
  }
  return {
    ...base,
    subtype: el.taskType || el.eventType || el.gatewayType || el.subProcessType || '',
    eventDefinition: el.eventDefinition || '',
    eventDefinitionRef: el.eventDefinitionRef || '',
    eventDefinitionName: el.eventDefinitionName || '',
    timerDefinition: el.timerDefinition ? `${el.timerDefinition.type}:${el.timerDefinition.value}` : '',
    attachedToRef: el.attachedToRef || '',
    cancelActivity: el.cancelActivity === undefined ? '' : String(el.cancelActivity),
    calledElement: el.calledElement || '',
    documentation: (el.documentation || '').length,
    x: el.x, y: el.y, width: el.width, height: el.height,
    label: el.label || '',
  };
}

function diffModels(before, after) {
  const a = new Map(before.map((e) => [String(e.id), digest(e)]));
  const b = new Map(after.map((e) => [String(e.id), digest(e)]));
  const lost = [];
  const gained = [];
  const changed = [];
  for (const [id, da] of a) {
    const db = b.get(id);
    if (!db) {
      lost.push(`${id} (${da.type}${da.subtype ? '/' + da.subtype : ''})`);
      continue;
    }
    const fields = [];
    for (const key of Object.keys(da)) {
      if (JSON.stringify(da[key]) !== JSON.stringify(db[key])) {
        fields.push(`${key}: ${JSON.stringify(da[key])} -> ${JSON.stringify(db[key])}`);
      }
    }
    if (fields.length) changed.push(`${id}: ${fields.join(', ')}`);
  }
  for (const id of b.keys()) if (!a.has(id)) gained.push(id);
  return { lost, gained, changed };
}

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const files = args.length
    ? args
    : readdirSync(FIXTURES)
        .filter((f) => (f.endsWith('.bpmn') || f.endsWith('.xml')) && !f.startsWith('invalid-'))
        .sort()
        .map((f) => join(FIXTURES, f));

  const server = await createServer({
    root: ROOT, server: { middlewareMode: true }, logLevel: 'error', appType: 'custom',
  });
  const parser = await server.ssrLoadModule('/src/lib/utils/xml/bpmnXmlParser.js');
  const exporter = await server.ssrLoadModule('/src/lib/utils/xml/bpmnXmlExporter.js');

  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

  let failed = 0;
  console.log('');
  for (const file of files) {
    const name = basename(file);
    const restore = quiet();
    let before = null;
    let xmlOut = null;
    let after = null;
    let err = null;
    try {
      before = parser.importBpmnXml(readFileSync(file, 'utf8'));
      xmlOut = exporter.exportBpmnXml(before);
      after = parser.importBpmnXml(xmlOut);
    } catch (e) {
      err = e;
    }
    restore();

    if (err) {
      console.log(`${C.bold}${name}${C.off}  ${C.red}FEHLGESCHLAGEN${C.off}`);
      console.log(`  ${C.red}FEHLER${C.off} ${err.message}`);
      if (xmlOut) {
        const p = join(OUT, name);
        writeFileSync(p, xmlOut);
        console.log(`  ${C.dim}Erzeugtes XML zur Ansicht: ${p}${C.off}`);
      }
      console.log('');
      failed++;
      continue;
    }

    const { lost, gained, changed } = diffModels(before, after);
    const ok = !lost.length && !gained.length && !changed.length;
    console.log(`${C.bold}${name}${C.off}  ${ok ? C.green + 'BESTANDEN' + C.off : C.red + 'FEHLGESCHLAGEN' + C.off}`);
    console.log(`  ${C.dim}${before.length} Elemente hinein, ${after.length} heraus${C.off}`);
    const show = (title, list) => {
      if (!list.length) return;
      console.log(`  ${C.red}${title} (${list.length})${C.off}`);
      for (const s of list.slice(0, 12)) console.log(`      - ${s}`);
      if (list.length > 12) console.log(`      ... und ${list.length - 12} weitere`);
    };
    show('im Export verloren', lost);
    show('nach dem Export zusaetzlich', gained);
    show('nach dem Export veraendert', changed);
    if (!ok) {
      failed++;
      const p = join(OUT, name);
      writeFileSync(p, xmlOut);
      console.log(`  ${C.dim}Erzeugtes XML zur Ansicht: ${p}${C.off}`);
    }
    console.log('');
  }
  await server.close();

  console.log(`${files.length - failed}/${files.length} Dateien ueberstehen den Rundlauf unveraendert.`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
