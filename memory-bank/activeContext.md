# activeContext.md

## Aktueller Fokus

- Weiterentwicklung des BPMN-Editors: Ausbau der BPMN-Elemente, Verbindungen und Interaktionen.
- Verbesserung der Toolbar und der Benutzerinteraktion (Drag & Drop, Dialoge).
- Planung und Implementierung des Properties Panels für die Bearbeitung von Element-Eigenschaften.
- Serialisierung und Deserialisierung von BPMN-XML (Import/Export).

## Zuletzt umgesetzt

- Svelte-Projektstruktur mit src/lib/components, models, stores, utils, styles, routes aufgebaut.
- Zentrale BPMN-Editor-Komponente (BpmnEditor.svelte) und Toolbar mit Elementauswahl und -erstellung implementiert.
- BPMN-Elemente (Nodes, Connections, Labels, Handles) als Svelte-Komponenten angelegt.
- State-Management über Svelte-Stores etabliert.
- tasks.md als Aufgaben- und Fortschrittsdokumentation eingeführt.

## Nächste Schritte

- Properties Panel für BPMN-Elemente umsetzen.
- Undo/Redo-Mechanismus im Store ausbauen.
- Validierung und Fehlerfeedback im UI integrieren.
- BPMN-XML-Export und -Import weiterentwickeln.
- Usability-Verbesserungen (Kontextmenüs, Shortcuts, Tooltips).

## Wichtige Überlegungen

- Unabhängigkeit von bpmn-js und Camunda-Lizenz.
- MVP-Fokus: Kernfunktionalität vor Erweiterungen.
- Klare Trennung von UI, Modell und Serialisierung.
- Erweiterbarkeit für spätere Features (z.B. Kollaboration, Simulation).

## Projektpräferenzen

- Klare, modulare Komponentenstruktur.
- State-Management über Svelte-Stores.
- Einfache Erweiterbarkeit und Wartbarkeit.
- Dokumentation des Fortschritts in tasks.md und memory-bank/.
