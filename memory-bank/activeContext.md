# activeContext.md

## Aktueller Fokus

- Refactoring: Extraktion der Element-Interaktionslogik (Dragging, Resizing, Connection Creation) aus BpmnEditor.svelte in einen dedizierten Service (ElementInteractionManager) zur Verbesserung von Wartbarkeit, Testbarkeit und Separation of Concerns.
- Weiterentwicklung des BPMN-Editors: Ausbau der BPMN-Elemente, Verbindungen und Interaktionen.
- Verbesserung der Toolbar und der Benutzerinteraktion (Drag & Drop, Dialoge).
- Planung und Implementierung des Properties Panels für die Bearbeitung von Element-Eigenschaften.
- Serialisierung und Deserialisierung von BPMN-XML (Import/Export).

## Zuletzt umgesetzt

- Start des Refactorings: Vorbereitung zur Auslagerung der Interaktionslogik in ElementInteractionManager.ts.
- Svelte-Projektstruktur mit src/lib/components, models, stores, utils, styles, routes aufgebaut.
- Zentrale BPMN-Editor-Komponente (BpmnEditor.svelte) und Toolbar mit Elementauswahl und -erstellung implementiert.
- BPMN-Elemente (Nodes, Connections, Labels, Handles) als Svelte-Komponenten angelegt.
- State-Management über Svelte-Stores etabliert.
- tasks.md als Aufgaben- und Fortschrittsdokumentation eingeführt.

## Nächste Schritte

- Refactoring abschließen: ElementInteractionManager implementieren, Interaktionslogik aus BpmnEditor.svelte extrahieren und Integration testen.
- Properties Panel für BPMN-Elemente umsetzen.
- Undo/Redo-Mechanismus im Store ausbauen.
- Validierung und Fehlerfeedback im UI integrieren.
- BPMN-XML-Export und -Import weiterentwickeln.
- Usability-Verbesserungen (Kontextmenüs, Shortcuts, Tooltips).

## Wichtige Überlegungen

- Refactoring ist ein zentraler Schritt für bessere Wartbarkeit und zukünftige Erweiterbarkeit (z.B. für komplexere Interaktionen, Tests, Custom-Features).
- Unabhängigkeit von bpmn-js und Camunda-Lizenz.
- MVP-Fokus: Kernfunktionalität vor Erweiterungen.
- Klare Trennung von UI, Modell und Serialisierung.
- Erweiterbarkeit für spätere Features (z.B. Kollaboration, Simulation).

## Projektpräferenzen

- Klare, modulare Komponentenstruktur.
- State-Management über Svelte-Stores.
- Einfache Erweiterbarkeit und Wartbarkeit.
- Dokumentation des Fortschritts in tasks.md und memory-bank/.
