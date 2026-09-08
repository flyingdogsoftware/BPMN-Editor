/**
 * Meldungen und Rueckfragen des Editors.
 *
 * Ersetzt window.alert und window.confirm. Beide blockieren den Browser,
 * lassen sich nicht gestalten, sind nicht barrierefrei zu bedienen und - der
 * Grund, aus dem es hier auffiel - haengen jede automatisierte Pruefung auf,
 * weil niemand da ist, der auf "OK" klickt.
 *
 * Verwendung:
 *
 *   import { notifications, notifyError, confirmAction } from '.../notificationStore';
 *
 *   notifyError('Import fehlgeschlagen', err.message);
 *   if (await confirmAction({ title: '...', message: '...' })) { ... }
 */
import { writable, get } from 'svelte/store';

/** @typedef {'info'|'success'|'warning'|'error'} Level */

let nextId = 0;

/** Sichtbare Meldungen, neueste zuerst. */
export const notifications = writable([]);

/** Offene Rueckfrage oder null. */
export const pendingConfirm = writable(null);

/** Standard-Anzeigedauer je Dringlichkeit, in Millisekunden. 0 = bleibt stehen. */
const DEFAULT_TIMEOUT = {
  success: 4000,
  info: 6000,
  warning: 0,
  error: 0,
};

/**
 * Eine Meldung anzeigen.
 *
 * @param {object} options
 * @param {Level} [options.level='info']
 * @param {string} options.title kurze Ueberschrift
 * @param {string} [options.message] ein bis zwei Saetze
 * @param {string[]} [options.details] Einzelpunkte, aufklappbar
 * @param {number} [options.timeout] Millisekunden bis zum Ausblenden, 0 = bleibt
 * @returns {number} Id der Meldung
 */
export function notify({ level = 'info', title, message = '', details = [], timeout } = {}) {
  const id = ++nextId;
  const entry = {
    id,
    level,
    title: title || '',
    message,
    details: Array.isArray(details) ? details : [],
    createdAt: Date.now(),
  };
  notifications.update((list) => [entry, ...list]);

  const ms = timeout === undefined ? DEFAULT_TIMEOUT[level] ?? 0 : timeout;
  if (ms > 0 && typeof setTimeout === 'function') {
    setTimeout(() => dismiss(id), ms);
  }
  return id;
}

export const notifyInfo = (title, message, details) => notify({ level: 'info', title, message, details });
export const notifySuccess = (title, message, details) => notify({ level: 'success', title, message, details });
export const notifyWarning = (title, message, details) => notify({ level: 'warning', title, message, details });
export const notifyError = (title, message, details) => notify({ level: 'error', title, message, details });

/** Eine Meldung schliessen. */
export function dismiss(id) {
  notifications.update((list) => list.filter((n) => n.id !== id));
}

/** Alle Meldungen schliessen. */
export function dismissAll() {
  notifications.set([]);
}

/**
 * Rueckfrage stellen. Liefert ein Promise, das true oder false ergibt.
 *
 * @param {object} options
 * @param {string} options.title
 * @param {string} [options.message]
 * @param {string} [options.confirmLabel='OK']
 * @param {string} [options.cancelLabel='Abbrechen']
 * @param {boolean} [options.destructive=false] faerbt die Bestaetigung als Warnung
 * @returns {Promise<boolean>}
 */
export function confirmAction({
  title,
  message = '',
  confirmLabel = 'OK',
  cancelLabel = 'Abbrechen',
  destructive = false,
} = {}) {
  // Eine bereits offene Rueckfrage wird abgelehnt, damit nichts haengen bleibt.
  const open = get(pendingConfirm);
  if (open) open.resolve(false);

  return new Promise((resolve) => {
    pendingConfirm.set({
      title: title || '',
      message,
      confirmLabel,
      cancelLabel,
      destructive,
      resolve: (value) => {
        pendingConfirm.set(null);
        resolve(value);
      },
    });
  });
}

/**
 * Den Bericht eines Imports als Meldung ausgeben.
 *
 * @param {{ elements: object[], warnings: Array<{code:string,message:string}> }} result
 * @param {string} [source] Name der Datei
 */
export function notifyImportResult(result, source = '') {
  const count = result.elements.length;
  const warnings = result.warnings || [];
  const what = source ? `${source}: ` : '';

  if (!warnings.length) {
    notifySuccess(`${what}${count} Elemente geladen`);
    return;
  }
  // Gleichartige Hinweise buendeln, damit aus 40 Zeilen nicht 40 Meldungen werden.
  const byCode = new Map();
  for (const w of warnings) {
    if (!byCode.has(w.code)) byCode.set(w.code, []);
    byCode.get(w.code).push(w.message);
  }
  const details = [];
  for (const [, messages] of byCode) {
    details.push(...messages.slice(0, 5));
    if (messages.length > 5) details.push(`... und ${messages.length - 5} weitere derselben Art`);
  }
  notifyWarning(
    `${what}${count} Elemente geladen`,
    `${warnings.length} Hinweis${warnings.length === 1 ? '' : 'e'} beim Lesen der Datei.`,
    details
  );
}
