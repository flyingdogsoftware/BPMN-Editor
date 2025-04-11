# projectbrief.md

## Projektname
BPMN Editor (Svelte-basiert)

## Ziel
Entwicklung eines modernen, browserbasierten BPMN-Editors mit Svelte und einer generischen Zeichenflächen-Library (z.B. Konva.js oder SVG.js), unabhängig von bpmn-js/Camunda-Lizenz.

## Hintergrund
Bestehende BPMN-Editoren wie bpmn-js sind lizenzrechtlich eingeschränkt oder schwer erweiterbar. Ziel ist ein flexibler, leichtgewichtiger Editor mit voller Kontrolle über Datenmodell, UI und Export/Import (BPMN-XML).

## Kernanforderungen
- Zeichenfläche für BPMN-Elemente (Drag & Drop, Zoom, Pan)
- BPMN-Elemente: Start-/End-Event, Task, Gateway, Sequence Flow, Pool/Lane
- Palette und Properties Panel
- Verbindungen zwischen Elementen
- Modellverwaltung (Undo/Redo, Speichern/Laden)
- Import/Export von BPMN-XML
- Validierung des Modells
- Erweiterbarkeit und Unabhängigkeit von Camunda/bpmn-js

## Aktueller Stand (April 2025)
- Svelte-Projekt mit vollständiger src/-Struktur
- BPMN-Editor, Toolbar, Modelle, Stores, Utils und Styles als Svelte-Komponenten vorhanden
- tasks.md dokumentiert Aufgaben und Fortschritt

## Zielgruppe
Entwickler:innen und Unternehmen, die einen anpassbaren, lizenzfreien BPMN-Editor benötigen.

## Abgrenzung
Kein Fokus auf Kollaboration oder Simulation in der ersten Version. MVP-Ansatz mit späterer Erweiterbarkeit.
