# techContext.md

## Verwendete Technologien

- **Svelte:** UI-Framework für komponentenbasiertes, reaktives Frontend.
- **Eigene Svelte-Komponenten:** Für BPMN-Elemente, Verbindungen, Toolbar, Dialoge, etc.
- **TypeScript/JavaScript:** Programmiersprache für Logik, Modell und Serialisierung.
- **SVG:** Für Zeichenfläche und Rendering von BPMN-Elementen und Verbindungen.
- **Orthogonales Routing:** Eigene Implementierung für Verbindungspfade mit Wegpunktoptimierung.
- **fast-xml-parser / xmlbuilder2:** Für BPMN-XML-Import/Export.
- **Vite:** Build-Tool für schnelles Svelte-Setup und Hot Reloading.
- **ESLint, Prettier:** Code-Qualität und Formatierung.

## Entwicklungs-Setup

- Node.js und npm als Basis für das Projekt.
- Svelte-Projektstruktur mit src/lib/components, src/lib/models, src/lib/stores, src/lib/utils, src/styles, src/routes.
- Modularisierung der BPMN-Elemente als Svelte-Komponenten.
- Verbindungskomponenten in src/lib/components/connections/ mit:
  - ConnectionRenderer.svelte: Hauptkomponente für Verbindungsdarstellung
  - ConnectionSegment.svelte: Rendering von Verbindungssegmenten
  - ConnectionHandle.svelte: Interaktive Handles für Segmente
  - OptimizeConnectionButton.svelte: Debug-Funktionalität zur Wegpunktoptimierung
- Verbindungsroutinglogik in src/lib/utils/connectionRouting.ts mit Funktionen wie:
  - calculateOrthogonalPath: Berechnung orthogonaler Pfade
  - optimizeWaypoints: Optimierung von Wegpunkten durch Entfernung unnötiger Punkte
  - adjustWaypoint: Anpassung von Wegpunkten beim Ziehen
- Nutzung von Svelte-Stores für State-Management (Modelldaten, Selektion, Undo/Redo).

## Technische Constraints

- Keine Abhängigkeit von bpmn-js oder Camunda-Komponenten.
- Fokus auf Browser-Kompatibilität (keine Server-Komponenten im MVP).
- Export/Import muss BPMN-XML-Standard erfüllen (mindestens für Kern-Elemente).
- Verbindungen müssen orthogonal sein (horizontale und vertikale Segmente, keine diagonalen Linien).
- Verbindungsoptimierung muss kollineare Segmente zuverlässig erkennen und zusammenführen.

## Tool Usage Patterns

- Komponentenbasierte Entwicklung für UI und BPMN-Elemente.
- State-Management zentral über Svelte-Stores.
- Utility-Module für Serialisierung, Validierung und Modell-Operationen.
- Verbindungsrouting mit Wegpunktoptimierung für saubere, orthogonale Pfade.
- Interaktive Handles für Benutzerinteraktion mit Verbindungen.
- tasks.md als Aufgaben- und Fortschrittsdokumentation.

## Aktuelle technische Herausforderungen

- Optimierung von kollinearen Segmenten: Der aktuelle Algorithmus in optimizeWaypoints() erkennt nicht zuverlässig alle kollinearen Segmente, was zu unnötigen Handles führt.
- Verhalten beim Ziehen von Handles: Beim Ziehen von Verbindungs-Handles entstehen manchmal Knicke oder Brüche statt glatter Linien.
- Debug-Visualisierungen: Orange Punkte, die für Debug-Zwecke angezeigt werden, müssen aus der Produktionsversion entfernt werden.
