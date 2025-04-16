# systemPatterns.md

## Systemarchitektur

- **Frontend:** Svelte als Framework für UI-Komponenten und State-Management.
- **Zeichenfläche:** Eigene BPMN-Editor-Komponente, Rendering von BPMN-Elementen als Svelte-Komponenten (z.B. Node, Connection, Label, Handle).
- **Verbindungsrouting:** Orthogonale Pfadberechnung und Wegpunktoptimierung für Verbindungen zwischen Elementen.
- **State-Management:** Svelte-Stores für BPMN-Modelldaten, Selektion, Undo/Redo, UI-Zustand.
- **Import/Export:** Eigene Serialisierung/Deserialisierung für BPMN-XML (z.B. mit fast-xml-parser).
- **Modularität:** Komponentenstruktur für Toolbar, Canvas, Properties Panel, Modellverwaltung, BPMN-Elemente.

## Wichtige Design Patterns

- **Komponentenbasiertes UI:** Jede BPMN-Entität (Node, Connection, Label, Handle) als eigene Svelte-Komponente.
- **Store-basiertes State-Management:** Zentrale Verwaltung des BPMN-Modells und UI-Zustands über Svelte-Stores.
- **Command Pattern:** Undo/Redo-Mechanismus für Modelländerungen.
- **Factory Pattern:** Erzeugung von BPMN-Elementen als Komponenten/Shapes.
- **Separation of Concerns:** Trennung von Rendering, Modell, Logik und Serialisierung.
- **Service Layer für Interaktionen:** ElementInteractionManager als dedizierter Service für Dragging, Resizing und Connection-Logik. Ziel: bessere Testbarkeit, Wartbarkeit und Wiederverwendbarkeit der Interaktionslogik.
- **Orthogonales Routing:** Algorithmus zur Berechnung von orthogonalen Pfaden zwischen Elementen mit Wegpunktoptimierung.

## Komponentenbeziehungen

- Die Zeichenfläche (BpmnEditor.svelte) rendert BPMN-Elemente basierend auf dem Modell.
- Die Toolbar (Toolbar.svelte) erzeugt neue BPMN-Elemente per Dialog/Drag & Drop.
- Das Properties Panel (in Planung) zeigt und editiert die Eigenschaften des selektierten Elements.
- Verbindungskomponenten (ConnectionRenderer, ConnectionSegment, ConnectionHandle) verwalten die Darstellung und Interaktion mit Verbindungen.
- Die Verbindungsroutinglogik (connectionRouting.ts) berechnet Pfade und optimiert Wegpunkte.
- Modelländerungen werden zentral im Store verwaltet und an die UI propagiert.

## Kritische Implementierungspfade

- Verbindungsrouting und Wegpunktoptimierung für intuitive und visuell ansprechende Verbindungen.
- Mapping zwischen BPMN-JSON-Modell und Zeichenfläche (Rendering, Interaktion).
- Serialisierung/Deserialisierung zu BPMN-XML.
- Validierung und Fehlerfeedback im UI.
- Erweiterbarkeit für neue BPMN-Elemente und Custom-Features.
