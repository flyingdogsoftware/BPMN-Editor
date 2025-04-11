# productContext.md

## Warum dieses Projekt?

Viele Unternehmen und Entwickler:innen benötigen einen BPMN-Editor, der lizenzfrei, flexibel und anpassbar ist. Bestehende Lösungen wie bpmn-js sind entweder lizenzrechtlich eingeschränkt oder schwer zu erweitern. Ein eigener Editor auf Basis moderner Webtechnologien (Svelte, Konva.js/SVG.js) bietet maximale Kontrolle und Unabhängigkeit.

## Welche Probleme werden gelöst?

- Lizenzprobleme und Abhängigkeit von Camunda/bpmn-js werden vermieden.
- Der Editor kann exakt an die eigenen Anforderungen und Workflows angepasst werden.
- Volle Kontrolle über das Datenmodell, die UI und die Export-/Import-Logik.
- Leichtgewichtige, performante Lösung ohne unnötigen Overhead.

## Wie soll das Produkt funktionieren?

- Intuitive Drag & Drop-Modellierung von BPMN-Prozessen im Browser.
- Klar strukturierte Benutzeroberfläche mit Toolbar, Zeichenfläche und Eigenschaften-Panel.
- Unterstützung aller wesentlichen BPMN-Elemente (Start-/End-Event, Task, Gateway, Verbindungen, Pools/Lanes).
- Import und Export von BPMN-XML zur Integration in andere Tools.
- Validierung und visuelles Feedback für fehlerhafte Modelle.

## User Experience Ziele

- Schnelle, reibungslose Interaktion (keine Lags, sofortiges Feedback).
- Übersichtliche, aufgeräumte UI.
- Einfache Erweiterbarkeit für eigene BPMN-Elemente oder Custom-Features.
- Fokus auf die Kernfunktionalität (MVP), später ausbaubar.
