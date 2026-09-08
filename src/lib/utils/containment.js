/**
 * Was gehoert zu was - und was bewegt sich mit.
 *
 * Bis dahin kannte der Editor nur eine Beziehung dieser Art: ein Pool nimmt
 * seine Lanes und die Elemente darin mit. Zwei andere fehlten, und beide
 * fallen sofort auf, sobald man eine importierte Datei anfasst:
 *
 *   - Ein Randereignis sitzt auf der Kante seiner Aktivitaet. Wird die
 *     Aktivitaet verschoben, blieb das Ereignis liegen - der Bezug ist im
 *     Modell da (attachedToRef), wurde beim Ziehen aber nicht beachtet.
 *   - Ein aufgeklappter Unterprozess zeigt seinen Inhalt. Beim Verschieben
 *     blieb der Inhalt stehen.
 *
 * Dieses Modul beantwortet die Frage an einer Stelle, damit Ziehen,
 * Groessenaenderung und Loeschen dieselbe Antwort bekommen.
 */

/** Typen, die einen Bereich aufspannen, in dem andere Elemente liegen. */
const CONTAINER_TYPES = new Set(['pool', 'lane', 'subprocess', 'group']);

/** Typen, die nie mitgenommen werden, wenn ein Bereich verschoben wird. */
const NEVER_CONTAINED = new Set(['pool', 'lane', 'connection']);

/**
 * Liegt das Element im Bereich des Containers?
 *
 * Geprueft wird der Mittelpunkt, nicht die vollstaendige Ueberdeckung: ein
 * Randereignis ragt ueber die Kante seiner Aktivitaet hinaus, und eine
 * Beschriftung darf ebenfalls herausstehen.
 *
 * @param {object} element
 * @param {object} container
 * @returns {boolean}
 */
export function isInsideBox(element, container) {
  if (!element || !container || element === container) return false;
  if (element.id === container.id) return false;
  const vals = [
    element.x, element.y, element.width, element.height,
    container.x, container.y, container.width, container.height,
  ];
  if (vals.some((v) => !Number.isFinite(v))) return false;
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  return cx > container.x && cx < container.x + container.width
      && cy > container.y && cy < container.y + container.height;
}

/** Ist das ein Element, das einen Bereich aufspannt? */
export const isContainer = (element) => Boolean(element) && CONTAINER_TYPES.has(element.type);

/**
 * Alle Elemente, die sich mitbewegen, wenn das gegebene Element verschoben
 * wird - ohne das Element selbst.
 *
 * Beruecksichtigt wird, in dieser Reihenfolge:
 *   1. Randereignisse an einer bewegten Aktivitaet (ueber attachedToRef)
 *   2. Kinder eines Unterprozesses (ueber containerRef aus dem Import)
 *   3. Lanes eines Pools
 *   4. alles, was raeumlich in einem bewegten Bereich liegt
 *
 * Verschachtelung wird aufgeloest: ein Unterprozess in einem Pool nimmt seine
 * eigenen Kinder mit, wenn der Pool bewegt wird.
 *
 * @param {object} element das gezogene Element
 * @param {Array<object>} elements alle Elemente des Diagramms
 * @returns {Set<string>} Ids der mitzubewegenden Elemente
 */
export function getMovingWith(element, elements) {
  const moving = new Set();
  if (!element || !Array.isArray(elements)) return moving;

  const nodes = elements.filter((el) => el && el.type !== 'connection');
  const boundaryByHost = new Map();
  const childrenByContainer = new Map();
  for (const el of nodes) {
    if (el.type === 'event' && el.eventType === 'boundary' && el.attachedToRef) {
      const key = String(el.attachedToRef);
      if (!boundaryByHost.has(key)) boundaryByHost.set(key, []);
      boundaryByHost.get(key).push(el);
    }
    if (el.containerRef) {
      const key = String(el.containerRef);
      if (!childrenByContainer.has(key)) childrenByContainer.set(key, []);
      childrenByContainer.get(key).push(el);
    }
  }

  const queue = [element];
  const seen = new Set([String(element.id)]);

  while (queue.length) {
    const current = queue.pop();
    const add = (el) => {
      if (!el) return;
      const id = String(el.id);
      if (seen.has(id)) return;
      seen.add(id);
      moving.add(id);
      queue.push(el);
    };

    // 1. Randereignisse folgen ihrer Aktivitaet
    for (const boundary of boundaryByHost.get(String(current.id)) || []) add(boundary);

    // 2. Kinder eines Unterprozesses
    for (const child of childrenByContainer.get(String(current.id)) || []) add(child);

    if (!isContainer(current)) continue;

    // 3. Lanes eines Pools
    if (current.type === 'pool' && Array.isArray(current.lanes)) {
      for (const laneId of current.lanes) {
        add(nodes.find((el) => el.id === laneId && el.type === 'lane'));
      }
    }

    // 4. Alles, was raeumlich darin liegt
    for (const el of nodes) {
      if (NEVER_CONTAINED.has(el.type) && current.type !== 'pool') continue;
      if (el.type === 'pool') continue; // ein Pool bewegt sich nie als Inhalt
      if (el.type === 'lane' && current.type !== 'pool') continue;
      if (isInsideBox(el, current)) add(el);
    }
  }

  return moving;
}

/**
 * Verbindungen, deren beide Enden sich mitbewegen. Nur diese duerfen ihre
 * Wegpunkte mitnehmen - bei einer Verbindung nach draussen muss der Verlauf
 * neu bestimmt werden.
 *
 * @param {Set<string>} movingIds Ergebnis von getMovingWith, ergaenzt um das
 *   gezogene Element selbst
 * @param {Array<object>} elements
 * @returns {Array<object>} die betroffenen Verbindungen
 */
export function getInternalConnections(movingIds, elements) {
  if (!Array.isArray(elements)) return [];
  return elements.filter((el) =>
    el && el.type === 'connection'
    && movingIds.has(String(el.sourceId))
    && movingIds.has(String(el.targetId)));
}
