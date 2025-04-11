# progress.md

## Was funktioniert bereits?

- Svelte-Projekt mit vollständiger src/-Struktur ist aufgesetzt.
- BPMN-Editor-Komponente (BpmnEditor.svelte) und Toolbar mit Elementauswahl und -erstellung sind implementiert.
- BPMN-Elemente (Nodes, Connections, Labels, Handles) als Svelte-Komponenten vorhanden.
- State-Management über Svelte-Stores funktioniert.
- tasks.md dokumentiert Aufgaben und Fortschritt.

## Was ist noch zu bauen?

- Properties Panel für BPMN-Elemente.
- Undo/Redo-Mechanismus im Store.
- Validierung und Fehlerfeedback im UI.
- BPMN-XML-Export und -Import (Serialisierung/Deserialisierung).
- Usability-Verbesserungen (Kontextmenüs, Shortcuts, Tooltips).
- Erweiterbarkeit für neue BPMN-Elemente und Custom-Features.

## Aktueller Status

- Projekt befindet sich in der aktiven Entwicklungsphase.
- Fokus liegt auf Ausbau der Kernfunktionalität und Verbesserung der User Experience.

## Bekannte Probleme / Herausforderungen

- BPMN-XML-Support muss komplett selbst entwickelt werden (kein fertiges Modul).
- Mapping zwischen BPMN-JSON-Modell und Zeichenfläche erfordert saubere Architektur.
- Validierung und Fehlerfeedback müssen individuell implementiert werden.
- Undo/Redo-Logik für komplexe Modelländerungen.

## Entwicklung der Projektentscheidungen

- Entscheidung für Unabhängigkeit von bpmn-js/Camunda.
- MVP-Ansatz: Erst Kernfunktionalität, dann Erweiterungen.
- Modularität und Erweiterbarkeit als zentrale Prinzipien.
- Dokumentation und Aufgabenverwaltung über memory-bank/ und tasks.md.
