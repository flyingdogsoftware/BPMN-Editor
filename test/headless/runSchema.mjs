#!/usr/bin/env node
/**
 * Prueft das XML, das der Exporter erzeugt, gegen das offizielle
 * BPMN-2.0-Schema der OMG (test/schema).
 *
 *   node test/headless/runSchema.mjs
 *
 * Jede Fixture wird importiert, exportiert und das Ergebnis validiert. Eine
 * Datei, die der Editor selbst geschrieben hat, muss in jedem anderen Werkzeug
 * zu oeffnen sein - das ist der eigentliche Sinn eines Austauschformats.
 *
 * Braucht `xmllint`. Fehlt es, wird die Pruefung uebersprungen und das
 * gemeldet, statt faelschlich fehlzuschlagen.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, execSync } from 'node:child_process';
import { createServer } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const FIXTURES = join(ROOT, 'test/fixtures');
const SCHEMA = join(ROOT, 'test/schema/BPMN20.xsd');
const OUT = join(ROOT, 'test/.schema-out');

const C = process.stdout.isTTY
  ? { red: '\x1b[31m', yellow: '\x1b[33m', green: '\x1b[32m', dim: '\x1b[2m', bold: '\x1b[1m', off: '\x1b[0m' }
  : { red: '', yellow: '', green: '', dim: '', bold: '', off: '' };

function haveXmllint() {
  try {
    execSync('command -v xmllint', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!existsSync(SCHEMA)) {
    console.log(`${C.yellow}Uebersprungen:${C.off} ${SCHEMA} fehlt.`);
    process.exit(0);
  }
  if (!haveXmllint()) {
    console.log(`${C.yellow}Uebersprungen:${C.off} xmllint ist nicht installiert (Paket libxml2-utils).`);
    process.exit(0);
  }

  const files = readdirSync(FIXTURES)
    .filter((f) => f.endsWith('.bpmn') && !f.startsWith('invalid-'))
    .sort();

  const server = await createServer({
    root: ROOT, server: { middlewareMode: true }, logLevel: 'error', appType: 'custom',
  });
  const parser = await server.ssrLoadModule('/src/lib/utils/xml/bpmnXmlParser.js');
  const exporter = await server.ssrLoadModule('/src/lib/utils/xml/bpmnXmlExporter.js');

  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  const origLog = console.log;
  let failed = 0;
  origLog('');
  for (const name of files) {
    console.log = () => {};
    let xml = null;
    let err = null;
    try {
      const elements = parser.importBpmnXml(readFileSync(join(FIXTURES, name), 'utf8'));
      xml = exporter.exportBpmnXml(elements);
    } catch (e) {
      err = e;
    }
    console.log = origLog;

    if (err) {
      console.log(`${C.bold}${name}${C.off}  ${C.red}FEHLGESCHLAGEN${C.off} beim Erzeugen: ${err.message}`);
      failed++;
      continue;
    }

    const target = join(OUT, name);
    writeFileSync(target, xml);
    try {
      execFileSync('xmllint', ['--noout', '--schema', SCHEMA, target], { stdio: 'pipe' });
      console.log(`${C.bold}${name}${C.off}  ${C.green}SCHEMAKONFORM${C.off}`);
    } catch (e) {
      failed++;
      const msg = String(e.stderr || e.stdout || e.message);
      const lines = msg.split('\n').filter(Boolean).slice(0, 8);
      console.log(`${C.bold}${name}${C.off}  ${C.red}SCHEMAFEHLER${C.off}`);
      for (const l of lines) console.log(`      ${l}`);
      console.log(`      ${C.dim}Erzeugtes XML: ${target}${C.off}`);
    }
  }
  await server.close();

  console.log('');
  console.log(`${files.length - failed}/${files.length} erzeugte Dateien sind schemakonform.`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
