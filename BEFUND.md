# Befund und Änderungen: Import, Export, Darstellung

Ausgelöst durch eine Datei, die der Editor mit
**„Failed to import BPMN XML: Missing bpmn:definitions in parsed XML"**
abgewiesen hat. Die Datei war gültig — schemakonform gegen das OMG-Schema und
in bpmn-js ohne Warnung ladbar.

Der Namensraum war nur der erste von acht Fehlern. Alle folgenden sind
**gemessen**, nicht vermutet: `npm test` zeigt jeden einzeln.

---

## Die Fehler

### 1. Der Parser war auf ein Präfix verdrahtet

`bpmnXmlParser.js` und `xmlToModelMapper.js` haben durchgängig auf die Literale
`bpmn:`, `bpmndi:`, `dc:` und `di:` geprüft. In XML ist ein Präfix aber ein
frei wählbarer Kurzname für eine Namensraum-URI. Diese drei Dateien sind
dasselbe Dokument:

```xml
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
<definitions    xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL">
<ns0:definitions xmlns:ns0="http://www.omg.org/spec/BPMN/20100524/MODEL">
```

Der Editor konnte nur die erste lesen. Camunda und bpmn.io schreiben `bpmn:`,
weshalb es lange nicht auffiel.

**Behoben** durch `src/lib/utils/xml/bpmnNamespaces.js`: die Namensraum-
Deklarationen der Datei werden gelesen und alle Elementnamen auf kanonische
Präfixe umgeschrieben. Elemente aus fremden Namensräumen bleiben unangetastet,
damit herstellerspezifische Erweiterungen nicht mit BPMN-Elementen kollidieren.

### 2. Aufrufaktivitäten und Unterprozesse fielen unter den Tisch

Der Mapper hatte keine Behandlung für `callActivity`, `subProcess`,
`transaction` und `adHocSubProcess`. Er las außerdem **nur die oberste Ebene**
eines Prozesses — alles in einem Unterprozess war unerreichbar.

Gemessen an der Auslösedatei, schon mit richtigem Präfix: **15 Flussknoten und
10 Verbindungen fehlten** im Modell. Verbindungen verschwanden dabei
stillschweigend, weil ihre Enden fehlten.

**Behoben:** rekursives Einsammeln, vollständige Typtabelle.

### 3. Randereignisse verloren ihre Aktivität

`attachedToRef` wurde nie gelesen. Alle sechs Randereignisse der Datei wurden
zu frei schwebenden Ereignissen.

### 4. Pools und Lanes wurden an der Id erkannt

```js
const isPoolOrLane = bpmnElement.includes('Participant')
                  || bpmnElement.includes('Lane') || ...
```

Eine Aufgabe mit der Id `Task_LaneChange` galt damit als Lane. Dazu kamen rund
120 Zeilen Sonderfälle, die Ids in `Participant_1`/`Participant1` umschrieben
und durchprobierten.

**Behoben:** der Typ ergibt sich aus dem XML-Elementnamen.

### 5. Gültige Geometrie wurde überschrieben

Lane-Positionen aus dem Diagram Interchange wurden verworfen und aus der
Pool-Höhe neu gerechnet. Das ging gut, solange die Lanes den Pool lückenlos
füllten, und sonst nicht.

**Behoben:** liegt ein BPMNShape vor, gilt es. Gerechnet wird nur, wo die Datei
schweigt.

### 6. `Boolean("false")` ist `true`

```js
isHorizontal: shape['@_isHorizontal'] !== undefined
  ? Boolean(shape['@_isHorizontal']) : true
```

Ein senkrechter Pool wurde damit waagerecht. **Behoben** durch eine
`bool()`-Hilfsfunktion, die `"false"`, `"0"` und `"no"` erkennt.

### 7. Der Export war spiegelbildlich kaputt — und erzeugte ungültiges XML

Am schwersten wiegt: `createProcessSection` schrieb **alle** Flusselemente in
**jeden** Prozess. Bei vier Pools stand jedes Element viermal in der Datei, mit
vierfach vergebener Id.

Dazu:

- Unterprozesse und Aufrufaktivitäten wurden gar nicht geschrieben
- jede Aufgabe wurde `bpmn:task`, unabhängig vom Typ
- **keine einzige Ereignisdefinition** wurde geschrieben: aus jeder Frist wurde
  ein leeres Ereignis
- `event.eventType === 'intermediate'` traf nie zu (das Modell führt
  `intermediate-throw`/`-catch`), also wurden Zwischenereignisse als
  **Startereignisse** exportiert
- die BPMNPlane verwies auf eine Collaboration-Id, die nirgends vergeben wurde
- `isDefault="true"` am Sequenzfluss — das Attribut gibt es in BPMN nicht
- Randereignisse bekamen `<incoming>`, was BPMN verbietet
- Beschriftungspositionen, Bedingungen und Dokumentation gingen verloren

Wer eine Datei öffnete und speicherte, verlor ein Sechstel des Diagramms —
schlimmer als ein fehlgeschlagener Import, weil es unbemerkt bleibt.

**Behoben:** Exporter neu geschrieben. Jedes Element genau einmal, Zuordnung zum
Pool über `flowNodeRef` bzw. die Lage im Diagramm, Kinder in ihrem Unterprozess
verschachtelt. Das erzeugte XML ist gegen das OMG-Schema geprüft.

### 8. Die Darstellung folgte der Notation nicht

- Zwischenereignisse bekamen den einfachen Ring des Startereignisses
  (derselbe `'intermediate'`-Vergleich wie im Exporter)
- Randereignisse waren dem Renderer unbekannt: einfacher Ring statt doppeltem
- nicht-unterbrechende Ereignisse wurden nicht gestrichelt
- Aufrufaktivitäten hatten keinen dicken Rand
- zugeklappte Unterprozesse trugen kein Pluszeichen

---

## Was sonst noch geändert wurde

**Keine `alert()` und `confirm()` mehr.** Sie blockieren den Browser, lassen
sich nicht gestalten und halten jede Automatisierung an. Ersetzt durch
`src/lib/stores/notificationStore.js` und `NotificationCenter.svelte`:
Meldungen mit aufklappbaren Einzelheiten, ein Rückfrage-Dialog mit Tastatur-
bedienung. Die Hinweise, die der Import unterwegs sammelt, sind damit
**erstmals sichtbar** — vorher landeten sie im Nichts.

**Vier tote Funktionen entfernt.** `importTestPoolsFile`,
`importTestSwimlanesFile`, `importTestMessageFlowFile` und
`importFortbildungsanmeldungFile` waren nirgends verdrahtet und holten Dateien
aus `static/`, die es nicht gibt. Sie enthielten vier der sechs `alert()`.

**Konsolenausgabe.** Ein Import schrieb über 140 000 Zeichen ins Log, unter
anderem `JSON.stringify` des kompletten Elementarrays — zweimal. Dazu feuerten
zwei reaktive `console.log` bei jeder Viewport-Änderung, also im 50-ms-Takt.
Jetzt: null Zeichen im Normalfall, ausführlich nur nach
`setBpmnImportDebug(true)`.

**Einpassen.** `centerViewportOnElements` hat nur verschoben und den Zoom nie
verändert — ein Diagramm, das breiter ist als das Fenster, konnte damit
grundsätzlich nicht ganz sichtbar werden. Neu: `fitToElements` rechnet Zoom und
Verschiebung, ein Knopf **Fit** in der Werkzeugleiste, und nach jedem Import
wird automatisch eingepasst. Die Zoom-Untergrenze liegt jetzt bei 10 % statt
20 %; bei 20 % passt eine Kollaboration mit vier Pools nicht auf den Schirm.

**`npm run dev` funktioniert.** Es gab keine `index.html`; der
Entwicklungsserver lieferte nichts. `static/` ist jetzt in Entwicklung und Bau
dasselbe Verzeichnis.

**Fehlermeldungen erklären.** Statt „Failed to import BPMN XML: Failed to
import BPMN XML: Missing bpmn:definitions in parsed XML" jetzt zum Beispiel:

> Die Datei enthält zwar ein `<definitions>`-Element, aber nicht im
> BPMN-2.0-Namensraum „http://www.omg.org/spec/BPMN/20100524/MODEL".
> Bitte die xmlns-Deklaration der Datei prüfen.

---

## Prüfung

`npm test` — drei Läufe, kein Browser nötig. Einzelheiten in
[test/README.md](test/README.md).

```
9/9 Dateien fehlerfrei importiert.
6/6 Dateien überstehen den Rundlauf unverändert.
6/6 erzeugte Dateien sind schemakonform.
```

Der Rundlauf importiert, exportiert und importiert erneut und vergleicht das
Modell davor und danach — Id, Typ, Untertyp, Ereignisdefinition, Geometrie,
Beschriftung, Wegpunktzahl, Randereignis-Bindung. Vor der Änderung überstand
**keine** Datei diesen Lauf.

---

## Offen

- **Verschachtelte Darstellung.** Kinder eines aufgeklappten Unterprozesses
  werden an ihrer DI-Position gezeichnet, sind aber keine Kinder im Modell:
  wer den Unterprozess verschiebt, verschiebt sie nicht mit.
- **Namen von Nachrichten und Signalen** überstehen den Rundlauf nur, wenn das
  Wurzelelement gelesen wurde; der Exporter baut sie sonst aus der Id neu auf.
- **Assoziationen und Textanmerkungen** werden importiert, aber nicht
  gezeichnet — dafür fehlt der Renderer.
- **`main.js`** exportiert weiterhin Default und benannte Exporte zusammen;
  Rollup weist bei jedem Bau darauf hin.
