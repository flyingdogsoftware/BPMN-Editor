# progress.md

## Was funktioniert bereits?

- Svelte-Projekt mit vollständiger src/-Struktur ist aufgesetzt.
- BPMN-Editor-Komponente (BpmnEditor.svelte) und Toolbar mit Elementauswahl und -erstellung sind implementiert.
- BPMN-Elemente (Nodes, Connections, Labels, Handles) als Svelte-Komponenten vorhanden.
- Verbindungsroutinglogik für orthogonale Pfade ist implementiert.
- Drag-and-Drop-Funktionalität für Verbindungs-Handles und Segmente ist vorhanden.
- State-Management über Svelte-Stores funktioniert.
- tasks.md dokumentiert Aufgaben und Fortschritt.

## Was ist noch zu bauen?

- Verbindungsroutingprobleme beheben:
  - Optimierung des Algorithmus zur Erkennung und Zusammenführung kollinearer Segmente
  - Verbesserung des Verhaltens beim Ziehen von Handles
  - Entfernung von Debug-Visualisierungen
- Refactoring: ElementInteractionManager-Service implementieren und Interaktionslogik aus BpmnEditor.svelte extrahieren (in Arbeit).
- Properties Panel für BPMN-Elemente.
- Undo/Redo-Mechanismus im Store.
- Validierung und Fehlerfeedback im UI.
- BPMN-XML-Export und -Import (Serialisierung/Deserialisierung).
- Usability-Verbesserungen (Kontextmenüs, Shortcuts, Tooltips).
- Erweiterbarkeit für neue BPMN-Elemente und Custom-Features.

## Aktueller Status

- Probleme mit der Verbindungsoptimierung: Kollineare Segmente werden nicht korrekt zusammengeführt, was zu mehreren Handles auf einer geraden Linie führt. Beim Ziehen von Handles entstehen manchmal Knicke oder Brüche in den Verbindungen.
- Debug-Visualisierungen (orange Punkte) müssen aus den Verbindungen entfernt werden.
- Refactoring zur Auslagerung der Interaktionslogik in einen dedizierten Service (ElementInteractionManager) läuft. Ziel: bessere Wartbarkeit, Testbarkeit und klare Trennung von UI und Logik.
- Projekt befindet sich in der aktiven Entwicklungsphase.
- Fokus liegt auf Ausbau der Kernfunktionalität und Verbesserung der User Experience.

## Bekannte Probleme / Herausforderungen

- Verbindungsroutingprobleme:
  - Die optimizeWaypoints-Funktion erkennt kollineare Segmente nicht zuverlässig, was zu unnötigen Handles führt.
  - Beim Ziehen von Handles entstehen manchmal Knicke oder Brüche in den Verbindungen.
  - Debug-Visualisierungen (orange Punkte) sind noch sichtbar und müssen entfernt werden.
- BPMN-XML-Support muss komplett selbst entwickelt werden (kein fertiges Modul).
- Mapping zwischen BPMN-JSON-Modell und Zeichenfläche erfordert saubere Architektur.
- Validierung und Fehlerfeedback müssen individuell implementiert werden.
- Undo/Redo-Logik für komplexe Modelländerungen.

## Entwicklung der Projektentscheidungen

- Entscheidung für Unabhängigkeit von bpmn-js/Camunda.
- MVP-Ansatz: Erst Kernfunktionalität, dann Erweiterungen.
- Modularität und Erweiterbarkeit als zentrale Prinzipien.
- Dokumentation und Aufgabenverwaltung über memory-bank/ und tasks.md.
