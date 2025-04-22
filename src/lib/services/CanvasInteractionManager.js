import { writable, derived } from 'svelte/store';
/**
 * CanvasInteractionManager
 *
 * Verwaltet die Interaktionen mit dem Canvas wie Panning, Zooming und Viewport-Management.
 */
export class CanvasInteractionManager {
    constructor() {
        // Stores für den Zustand des Canvas
        this.viewportStore = writable({
            x: 0,
            y: 0,
            width: 800,
            height: 600,
            zoomLevel: 1.0 // 100% zoom by default
        });
        // Abgeleiteter Store für die transformierte Ansicht
        this.viewport = derived(this.viewportStore, $viewport => $viewport);
        // Zustand für das Canvas-Dragging
        this.isDraggingCanvas = writable(false);
        this.dragStartPosition = writable({ x: 0, y: 0 });
    }
    /**
     * Initialisiert die Canvas-Größe basierend auf dem Fenster
     */
    initializeCanvas() {
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
    updateCanvasSize() {
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
    updateCanvasSizeBasedOnElements(elements) {
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
    centerViewportOnElements(elements) {
        // Setze den Viewport immer auf 0,0 zurück
        this.viewportStore.update(viewport => ({
            ...viewport,
            x: 0,
            y: 0
        }));
        // Wenn keine Elemente vorhanden sind, behalte den Viewport bei 0,0
        if (elements.length === 0)
            return;
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
    startCanvasDrag(event) {
        console.log('DEBUG: startCanvasDrag called', { clientX: event.clientX, clientY: event.clientY });
        this.isDraggingCanvas.set(true);
        this.viewportStore.update(viewport => {
            const startPos = {
                x: event.clientX - viewport.x,
                y: event.clientY - viewport.y
            };
            console.log('DEBUG: Setting dragStartPosition', startPos, 'current viewport:', viewport);
            this.dragStartPosition.set(startPos);
            return viewport;
        });
    }
    /**
     * Bewegt den Canvas während des Ziehens
     * @param event Das Mausereignis
     */
    dragCanvas(event) {
        console.log('DEBUG: dragCanvas called', { clientX: event.clientX, clientY: event.clientY });
        // Verwende get-Methoden statt direkter Store-Subscription
        const isDragging = this.getIsDraggingCanvas();
        console.log('DEBUG: isDragging =', isDragging);
        if (!isDragging)
            return;
        // Hole den aktuellen Viewport und die Startposition
        let dragStart = { x: 0, y: 0 };
        const unsubscribe = this.dragStartPosition.subscribe(value => {
            dragStart = value;
        });
        unsubscribe();
        console.log('DEBUG: dragStart =', dragStart);
        // Berechne neue Viewport-Position
        const newViewportX = event.clientX - dragStart.x;
        const newViewportY = event.clientY - dragStart.y;
        console.log('DEBUG: Calculated new viewport position:', { newViewportX, newViewportY });
        // Erlaube Panning in alle Richtungen, aber mit Grenzen
        // Verhindere zu starkes Panning nach rechts/unten, erlaube aber etwas Spielraum
        const viewport = this.getViewport();
        console.log('DEBUG: Current viewport =', viewport);
        const minX = Math.min(0, -viewport.width * 0.2); // Erlaube etwas Panning nach rechts
        const minY = Math.min(0, -viewport.height * 0.2); // Erlaube etwas Panning nach unten
        const maxX = viewport.width * 0.2; // Maximales Panning nach rechts
        const maxY = viewport.height * 0.2; // Maximales Panning nach unten
        console.log('DEBUG: Panning limits:', { minX, minY, maxX, maxY });
        // Berechne die finalen Werte mit Begrenzungen
        const finalX = Math.max(minX, Math.min(maxX, newViewportX));
        const finalY = Math.max(minY, Math.min(maxY, newViewportY));
        console.log('DEBUG: Final viewport position after limits:', { finalX, finalY });
        this.viewportStore.update(viewport => {
            console.log('DEBUG: Updating viewport from', viewport, 'to', { ...viewport, x: finalX, y: finalY });
            return {
                ...viewport,
                x: finalX,
                y: finalY
            };
        });
    }
    /**
     * Beendet das Ziehen des Canvas
     */
    endCanvasDrag() {
        console.log('DEBUG: endCanvasDrag called');
        this.isDraggingCanvas.set(false);
    }
    /**
     * Behandelt Mausrad-Ereignisse für Scrolling
     * @param event Das Mausrad-Ereignis
     */
    handleCanvasWheel(event) {
        // Verhindere Standard-Scrollverhalten
        event.preventDefault();
        // Hole den aktuellen Viewport
        const viewport = this.getViewport();
        const scrollStep = 50; // Scrollgeschwindigkeit
        // Berechne Grenzen für das Panning
        const minX = Math.min(0, -viewport.width * 0.2); // Erlaube etwas Panning nach rechts
        const minY = Math.min(0, -viewport.height * 0.2); // Erlaube etwas Panning nach unten
        const maxX = viewport.width * 0.2; // Maximales Panning nach rechts
        const maxY = viewport.height * 0.2; // Maximales Panning nach unten
        // Berechne neue Viewport-Position
        let newX = viewport.x;
        let newY = viewport.y;
        if (event.deltaY < 0) {
            // Scroll nach oben - bewege Viewport nach unten
            newY = Math.min(maxY, viewport.y + scrollStep);
        }
        else {
            // Scroll nach unten - bewege Viewport nach oben
            newY = Math.max(minY, viewport.y - scrollStep);
        }
        // Horizontales Scrollen mit Umschalttaste
        if (event.shiftKey) {
            if (event.deltaY < 0) {
                // Scroll nach rechts - bewege Viewport nach links
                newX = Math.max(minX, viewport.x - scrollStep);
            }
            else {
                // Scroll nach links - bewege Viewport nach rechts
                newX = Math.min(maxX, viewport.x + scrollStep);
            }
        }
        // Aktualisiere den Viewport
        this.viewportStore.update(viewport => ({
            ...viewport,
            x: newX,
            y: newY
        }));
    }
    /**
     * Gibt zurück, ob der Canvas gerade gezogen wird
     */
    getIsDraggingCanvas() {
        let isDragging = false;
        // Korrekte Verwendung von subscribe ohne sofortigen Aufruf
        const unsubscribe = this.isDraggingCanvas.subscribe(value => {
            isDragging = value;
        });
        // Unsubscribe um Memory-Leaks zu vermeiden
        unsubscribe();
        return isDragging;
    }
    /**
     * Gibt die aktuelle Viewport-Position zurück
     */
    getViewport() {
        let viewport = { x: 0, y: 0, width: 800, height: 600 };
        // Korrekte Verwendung von subscribe ohne sofortigen Aufruf
        const unsubscribe = this.viewport.subscribe(value => {
            viewport = value;
        });
        // Unsubscribe um Memory-Leaks zu vermeiden
        unsubscribe();
        return viewport;
    }
    /**
     * Bereinigt Event-Listener
     */
    cleanup() {
        if (typeof window !== 'undefined') {
            window.removeEventListener('resize', () => this.updateCanvasSize());
        }
    }
    /**
     * Verringert den Zoom-Level (Zoom Out)
     * @param step Die Schrittgröße für die Zoom-Änderung
     */
    zoomOut(step = 0.1) {
        this.viewportStore.update(viewport => {
            // Berechne neuen Zoom-Level, aber nicht unter 0.2 (20%)
            const newZoomLevel = Math.max(0.2, viewport.zoomLevel - step);
            // Nur Werte kleiner als 1.0 (100%) erlauben
            if (newZoomLevel > 1.0) {
                return viewport; // Keine Änderung, wenn über 100%
            }
            console.log('DEBUG: Zooming out to', newZoomLevel);
            return {
                ...viewport,
                zoomLevel: newZoomLevel
            };
        });
    }
    /**
     * Erhöht den Zoom-Level (Zoom In)
     * @param step Die Schrittgröße für die Zoom-Änderung
     */
    zoomIn(step = 0.1) {
        this.viewportStore.update(viewport => {
            // Berechne neuen Zoom-Level
            const newZoomLevel = viewport.zoomLevel + step;
            // Nur Werte kleiner oder gleich 1.0 (100%) erlauben
            if (newZoomLevel > 1.0) {
                // Setze auf genau 1.0, wenn wir darüber gehen würden
                return {
                    ...viewport,
                    zoomLevel: 1.0
                };
            }
            console.log('DEBUG: Zooming in to', newZoomLevel);
            return {
                ...viewport,
                zoomLevel: newZoomLevel
            };
        });
    }
    /**
     * Setzt den Zoom-Level auf einen bestimmten Wert
     * @param zoomLevel Der neue Zoom-Level
     */
    setZoomLevel(zoomLevel) {
        // Begrenze den Zoom-Level auf den Bereich [0.2, 1.0]
        const newZoomLevel = Math.min(1.0, Math.max(0.2, zoomLevel));
        this.viewportStore.update(viewport => ({
            ...viewport,
            zoomLevel: newZoomLevel
        }));
    }
}
// Singleton-Instanz
export const canvasInteractionManager = new CanvasInteractionManager();
