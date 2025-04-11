# techContext.md

## Verwendete Technologien

- **Svelte:** UI-Framework für komponentenbasiertes, reaktives Frontend.
- **Eigene Svelte-Komponenten:** Für BPMN-Elemente, Verbindungen, Toolbar, Dialoge, etc.
- **JavaScript/TypeScript:** Programmiersprache für Logik, Modell und Serialisierung.
- **(Optional) Konva.js / svelte-konva oder SVG.js:** Für Zeichenfläche und Interaktion (je nach Implementierung).
- **fast-xml-parser / xmlbuilder2:** Für BPMN-XML-Import/Export.
- **Vite:** Build-Tool für schnelles Svelte-Setup und Hot Reloading.
- **ESLint, Prettier:** Code-Qualität und Formatierung.

## Entwicklungs-Setup

- Node.js und npm als Basis für das Projekt.
- Svelte-Projektstruktur mit src/lib/components, src/lib/models, src/lib/stores, src/lib/utils, src/styles, src/routes.
- Modularisierung der BPMN-Elemente als Svelte-Komponenten.
- Nutzung von Svelte-Stores für State-Management (Modelldaten, Selektion, Undo/Redo).

## Technische Constraints

- Keine Abhängigkeit von bpmn-js oder Camunda-Komponenten.
- Fokus auf Browser-Kompatibilität (keine Server-Komponenten im MVP).
- Export/Import muss BPMN-XML-Standard erfüllen (mindestens für Kern-Elemente).

## Tool Usage Patterns

- Komponentenbasierte Entwicklung für UI und BPMN-Elemente.
- State-Management zentral über Svelte-Stores.
- Utility-Module für Serialisierung, Validierung und Modell-Operationen.
- tasks.md als Aufgaben- und Fortschrittsdokumentation.
