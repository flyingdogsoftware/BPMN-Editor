#!/usr/bin/env node
/**
 * Prueflauf fuer die Verschachtelung: was bewegt sich mit?
 *
 *   node test/headless/runContainment.mjs
 *
 * Zieht Elemente wirklich - ueber denselben ElementManager, den auch die
 * Oberflaeche benutzt - und sieht nach, was sich mitbewegt hat. Ohne Browser:
 * der Store und die Zieh-Logik sind reines JavaScript.
 *
 * Geprueft werden die drei Beziehungen, die vorher nur teilweise galten:
 *   - ein Randereignis folgt seiner Aktivitaet
 *   - der Inhalt eines aufgeklappten Unterprozesses folgt dem Unterprozess
 *   - ein Pool nimmt Lanes und Inhalt mit
 * und die Gegenprobe: eine einzelne Aufgabe nimmt nichts Fremdes mit.
 */
import { readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const FIXTURES = join(ROOT, 'test/fixtures');

const C = process.stdout.isTTY
  ? { red: '\x1b[31m', green: '\x1b[32m', dim: '\x1b[2m', bold: '\x1b[1m', off: '\x1b[0m' }
  : { red: '', green: '', dim: '', bold: '', off: '' };

const quiet = () => {
  const orig = { log: console.log, warn: console.warn, error: console.error };
  console.log = () => {}; console.warn = () => {}; console.error = () => {};
  return () => Object.assign(console, orig);
};

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });

async function main() {
  const server = await createServer({
    root: ROOT, server: { middlewareMode: true }, logLevel: 'error', appType: 'custom',
  });
  const parser = await server.ssrLoadModule('/src/lib/utils/xml/bpmnXmlParser.js');
  const storeMod = await server.ssrLoadModule('/src/lib/stores/bpmnStore.js');
  const managerMod = await server.ssrLoadModule('/src/lib/services/ElementManager.js');
  const containment = await server.ssrLoadModule('/src/lib/utils/containment.js');
  const { bpmnStore } = storeMod;
  const elementManager = managerMod.elementManager || managerMod.default;

  const load = (file) => {
    const restore = quiet();
    const elements = parser.importBpmnXml(readFileSync(join(FIXTURES, file), 'utf8'));
    bpmnStore.reset();
    elements.forEach((el) => bpmnStore.addElement(el));
    restore();
    return elements;
  };

  const snapshot = () => {
    let out = [];
    const un = bpmnStore.subscribe((v) => { out = v.map((e) => ({ ...e })); });
    un();
    return out;
  };

  /** Ein Element um dx/dy ziehen, so wie es die Oberflaeche tut. */
  const drag = (id, dx, dy) => {
    const before = snapshot();
    const el = before.find((e) => e.id === id);
    if (!el) throw new Error(`Element ${id} nicht im Diagramm`);
    const moving = containment.getMovingWith(el, before);
    const positions = { [id]: { x: el.x, y: el.y } };
    for (const mid of moving) {
      const m = before.find((e) => e.id === mid);
      if (m && 'x' in m) positions[mid] = { x: m.x, y: m.y };
    }
    for (const c of containment.getInternalConnections(new Set([...moving, String(id)]), before)) {
      if (c.waypoints?.length) positions[`waypoints:${c.id}`] = c.waypoints.map((p) => ({ ...p }));
    }
    const restore = quiet();
    elementManager.handleElementDrag(id, dx, dy, positions);
    restore();
    return { before, after: snapshot(), moving };
  };

  const movedBy = (before, after, id, dx, dy) => {
    const b = before.find((e) => e.id === id);
    const a = after.find((e) => e.id === id);
    if (!b || !a) return false;
    return Math.abs((a.x - b.x) - dx) < 0.001 && Math.abs((a.y - b.y) - dy) < 0.001;
  };
  const didNotMove = (before, after, id) => movedBy(before, after, id, 0, 0);

  /* ---- 1. Randereignis folgt seiner Aktivitaet ------------------------- */
  {
    load('nur-prozess.bpmn');
    const { before, after } = drag('Activity_1', 120, 60);
    check('Randereignis folgt seiner Aktivitaet',
      movedBy(before, after, 'Boundary_1', 120, 60),
      'Boundary_1 haengt an Activity_1');
    check('Ein unbeteiligtes Ereignis bleibt liegen',
      didNotMove(before, after, 'End_1'));
  }

  /* ---- 2. Unterprozess nimmt seinen Inhalt mit ------------------------- */
  {
    const elements = load('gross-defaultns.bpmn');
    const sub = elements.find((e) => e.type === 'subprocess' && e.subProcessType === 'event');
    const children = elements.filter((e) => String(e.containerRef) === String(sub.id));
    const { before, after } = drag(sub.id, -80, 40);
    check('Unterprozess nimmt seine Kinder mit',
      children.length > 0 && children.every((c) => movedBy(before, after, c.id, -80, 40)),
      `${children.length} Kinder von ${sub.id}`);

    const outside = elements.find(
      (e) => e.type === 'task' && String(e.containerRef) !== String(sub.id)
    );
    check('Eine Aufgabe ausserhalb bleibt liegen',
      didNotMove(before, after, outside.id), outside.id);
  }

  /* ---- 3. Pool nimmt Lanes und Inhalt mit ------------------------------ */
  {
    const elements = load('klein-lanes.bpmn');
    const pool = elements.find((e) => e.type === 'pool');
    const lanes = elements.filter((e) => e.type === 'lane' && e.parentRef === pool.id);
    const inside = elements.filter(
      (e) => e.type !== 'pool' && e.type !== 'lane' && e.type !== 'connection'
    );
    const { before, after } = drag(pool.id, 50, 50);
    check('Pool nimmt seine Lanes mit',
      lanes.length > 0 && lanes.every((l) => movedBy(before, after, l.id, 50, 50)),
      `${lanes.length} Lanes`);
    check('Pool nimmt die Elemente darin mit',
      inside.length > 0 && inside.every((e) => movedBy(before, after, e.id, 50, 50)),
      `${inside.length} Elemente`);
  }

  /* ---- 4. Eine einzelne Aufgabe nimmt nichts Fremdes mit --------------- */
  {
    const elements = load('gross-defaultns.bpmn');
    const task = elements.find((e) => e.type === 'task' && !e.containerRef);
    const { before, after, moving } = drag(task.id, 30, 30);
    const unexpected = [...moving].filter((id) => {
      const el = elements.find((e) => e.id === id);
      return !el || el.type !== 'event' || el.eventType !== 'boundary';
    });
    check('Eine Aufgabe bewegt nur ihre Randereignisse',
      unexpected.length === 0,
      unexpected.length ? `unerwartet: ${unexpected.join(', ')}` : `${moving.size} Randereignisse`);
    check('Der Pool bleibt liegen, wenn eine Aufgabe darin gezogen wird',
      didNotMove(before, after, elements.find((e) => e.type === 'pool').id));
  }

  /* ---- 5. Verschachtelung: Pool nimmt Unterprozess-Kinder mit ---------- */
  {
    const elements = load('gross-defaultns.bpmn');
    const pool = elements.find((e) => e.type === 'pool');
    const sub = elements.find(
      (e) => e.type === 'subprocess' && e.subProcessType === 'event'
        && e.x > pool.x && e.x < pool.x + pool.width
    );
    const { before, after } = drag(pool.id, 20, 20);
    if (sub) {
      const children = elements.filter((e) => String(e.containerRef) === String(sub.id));
      check('Ein Pool nimmt auch die Kinder eines Unterprozesses darin mit',
        children.length > 0 && children.every((c) => movedBy(before, after, c.id, 20, 20)),
        `${children.length} Kinder ueber zwei Ebenen`);
    } else {
      check('Ein Pool nimmt auch die Kinder eines Unterprozesses darin mit', true,
        'kein Unterprozess im ersten Pool - uebersprungen');
    }
  }

  await server.close();

  console.log('');
  let failed = 0;
  for (const r of results) {
    const mark = r.ok ? `${C.green}ok${C.off}  ` : `${C.red}FEHLER${C.off}`;
    if (!r.ok) failed++;
    console.log(`  ${mark} ${r.name}${r.detail ? `  ${C.dim}(${r.detail})${C.off}` : ''}`);
  }
  console.log('');
  console.log(`${results.length - failed}/${results.length} Pruefungen zur Verschachtelung bestanden.`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
