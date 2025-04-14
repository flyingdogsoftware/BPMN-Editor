import { writable, derived } from 'svelte/store';

/**
 * CanvasInteractionManager
 *
 * Verwaltet die Interaktionen mit dem Canvas wie Panning, Zooming und Viewport-Management.
 */
export class CanvasInteractionManager {
  // Stores für den Zustand des Canvas
  private viewportStore = writable({
    x: 0,
    y: 0,
    width: 800,
    height: 600
  });

  // Abgeleiteter Store für die transformierte Ansicht
  public viewport = derived(this.viewportStore, $viewport => $viewport);

  // Zustand für das Canvas-Dragging
  private isDraggingCanvas = writable(false);
  private dragStartPosition = writable({ x: 0, y: 0 });

  constructor() {}

  /**
   * Initialisiert die Canvas-Größe basierend auf dem Fenster
   */
  public initializeCanvas() {
    if (typeof window !== 'undefined') {
      console.log('Initializing canvas with window size:', { width: window.innerWidth, height: window.innerHeight });

      // Setze die Canvas-Größe direkt auf die Fenstergröße
      this.viewportStore.update(viewport => ({
        ...viewport,
        width: window.innerWidth,
        height: window.innerHeight
      }));

      // Aktualisiere die Canvas-Größe
      this.updateCanvasSize();

      // Füge einen Event-Listener für Fenster-Größenänderungen hinzu
      window.addEventListener('resize', () => {
        console.log('Window resized to:', { width: window.innerWidth, height: window.innerHeight });
        this.updateCanvasSize();
      });
    }
  }

  /**
   * Aktualisiert die Canvas-Größe basierend auf der Fenstergröße
   */
  public updateCanvasSize() {
    if (typeof window !== 'undefined') {
      // Setze die Canvas-Größe mindestens auf die Fenstergröße
      // Verwende window.innerWidth und window.innerHeight für die volle Fenstergröße
      this.viewportStore.update(viewport => ({
        ...viewport,
        width: Math.max(viewport.width, window.innerWidth),
        height: Math.max(viewport.height, window.innerHeight)
      }));

      console.log('Canvas size updated:', this.getViewport());
    }
  }

  /**
   * Aktualisiert die Canvas-Größe basierend auf den Elementpositionen
   * @param elements Die BPMN-Elemente
   */
  public updateCanvasSizeBasedOnElements(elements) {
    let minWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    let minHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

    // Finde das am weitesten entfernte Element
    elements.forEach(element => {
      if (element.type !== 'connection') {
        const rightEdge = element.x + element.width + 200; // Füge Padding hinzu
        const bottomEdge = element.y + element.height + 200; // Füge Padding hinzu

        minWidth = Math.max(minWidth, rightEdge);
        minHeight = Math.max(minHeight, bottomEdge);
      }
    });

    // Aktualisiere die Canvas-Dimensionen
    this.viewportStore.update(viewport => ({
      ...viewport,
      width: Math.max(viewport.width, minWidth),
      height: Math.max(viewport.height, minHeight)
    }));
  }

  /**
   * Zentriert den Viewport auf die Elemente
   * @param elements Die BPMN-Elemente
   */
  public centerViewportOnElements(elements) {
    // Setze den Viewport immer auf 0,0 zurück
    this.viewportStore.update(viewport => ({
      ...viewport,
      x: 0,
      y: 0
    }));

    // Wenn keine Elemente vorhanden sind, behalte den Viewport bei 0,0
    if (elements.length === 0) return;

    // Finde die Bounding Box aller Elemente
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    elements.forEach(element => {
      if (element.type !== 'connection' && 'x' in element && 'y' in element) {
        minX = Math.min(minX, element.x);
        minY = Math.min(minY, element.y);
        maxX = Math.max(maxX, element.x + (element.width || 0));
        maxY = Math.max(maxY, element.y + (element.height || 0));
      }
    });

    // Wenn wir Elemente gefunden haben, prüfe, ob sie bereits sichtbar sind
    if (minX !== Infinity && minY !== Infinity) {
      // Hole die sichtbaren Bereichsdimensionen
      const visibleWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
      const visibleHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

      // Wenn alle Elemente bereits im Viewport bei Position 0,0 sichtbar sind,
      // dann müssen wir den Viewport nicht anpassen
      if (maxX <= visibleWidth && maxY <= visibleHeight) {
        // Alle Elemente sind sichtbar, behalte Viewport bei 0,0
        return;
      }

      // Wenn wir hier ankommen, sind einige Elemente außerhalb des sichtbaren Bereichs
      // Wir passen den Viewport nur an, wenn es absolut notwendig ist
      // und versuchen, so viele Elemente wie möglich sichtbar zu halten

      // Füge einen kleinen Rand hinzu, um sicherzustellen, dass Elemente nicht direkt am Rand sind
      const margin = 20;

      // Wenn Elemente über den rechten oder unteren Rand hinausgehen, aber immer noch
      // nahe am Ursprung sind, müssen wir den Viewport möglicherweise nicht anpassen
      if (minX < margin && minY < margin &&
          maxX < visibleWidth * 1.5 && maxY < visibleHeight * 1.5) {
        // Elemente sind noch relativ nahe am Ursprung, behalte Viewport bei 0,0
        return;
      }

      // An diesem Punkt müssen wir den Viewport anpassen, um die Elemente anzuzeigen
      // Wir versuchen, die obere linke Ecke der Elemente sichtbar zu halten
      this.viewportStore.update(viewport => ({
        ...viewport,
        x: Math.max(0, minX - margin),
        y: Math.max(0, minY - margin)
      }));
    }
  }

  /**
   * Startet das Ziehen des Canvas
   * @param event Das Mausereignis
   */
  public startCanvasDrag(event) {
    this.isDraggingCanvas.set(true);

    this.viewportStore.update(viewport => {
      this.dragStartPosition.set({
        x: event.clientX - viewport.x,
        y: event.clientY - viewport.y
      });
      return viewport;
    });
  }

  /**
   * Bewegt den Canvas während des Ziehens
   * @param event Das Mausereignis
   */
  public dragCanvas(event) {
    let isDragging;
    this.isDraggingCanvas.subscribe(value => {
      isDragging = value;
    })();

    if (!isDragging) return;

    let dragStart;
    this.dragStartPosition.subscribe(value => {
      dragStart = value;
    })();

    // Berechne neue Viewport-Position
    const newViewportX = event.clientX - dragStart.x;
    const newViewportY = event.clientY - dragStart.y;

    // Erlaube nur Panning nach links und oben (negative Werte)
    // Dies verhindert Panning nach rechts und unten (positive Werte)
    this.viewportStore.update(viewport => ({
      ...viewport,
      x: Math.min(0, newViewportX),
      y: Math.min(0, newViewportY)
    }));
  }

  /**
   * Beendet das Ziehen des Canvas
   */
  public endCanvasDrag() {
    this.isDraggingCanvas.set(false);
  }

  /**
   * Behandelt Mausrad-Ereignisse für Scrolling
   * @param event Das Mausrad-Ereignis
   */
  public handleCanvasWheel(event) {
    // Verhindere Standard-Scrollverhalten
    event.preventDefault();

    // Berechne Scrollrichtung und passe Viewport an
    this.viewportStore.update(viewport => {
      let newX = viewport.x;
      let newY = viewport.y;

      if (event.deltaY < 0) {
        // Scroll nach oben - bewege Viewport nach unten
        newY = Math.min(0, viewport.y + 50);
      } else {
        // Scroll nach unten - bewege Viewport nach oben
        newY = Math.min(0, viewport.y - 50);
      }

      // Horizontales Scrollen mit Umschalttaste
      if (event.shiftKey) {
        if (event.deltaY < 0) {
          // Scroll nach rechts
          newX = Math.min(0, viewport.x - 50);
        } else {
          // Scroll nach links
          newX = Math.min(0, viewport.x + 50);
        }
      }

      return {
        ...viewport,
        x: newX,
        y: newY
      };
    });
  }

  /**
   * Gibt zurück, ob der Canvas gerade gezogen wird
   */
  public getIsDraggingCanvas() {
    let isDragging;
    this.isDraggingCanvas.subscribe(value => {
      isDragging = value;
    })();
    return isDragging;
  }

  /**
   * Gibt die aktuelle Viewport-Position zurück
   */
  public getViewport() {
    let viewport;
    this.viewport.subscribe(value => {
      viewport = value;
    })();
    return viewport;
  }

  /**
   * Bereinigt Event-Listener
   */
  public cleanup() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', () => this.updateCanvasSize());
    }
  }
}

// Singleton-Instanz
export const canvasInteractionManager = new CanvasInteractionManager();
