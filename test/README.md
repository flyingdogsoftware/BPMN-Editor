# Prueflaeufe

Drei Laeufe, alle ohne Browser. `npm test` fuehrt sie nacheinander aus.

```
npm run test:import      # laedt jede Fixture und vergleicht mit dem Dateiinhalt
npm run test:roundtrip   # importieren -> exportieren -> importieren, ohne Verlust
npm run test:schema      # das erzeugte XML gegen das OMG-Schema
```

Alle drei laden den echten Importpfad ueber Vites SSR-Loader — also genau den
Code, den auch der Browser bekommt.

## Warum headless

Der Editor meldete Fehler frueher mit `window.alert`. Das blockiert den
Browser, und jede Automatisierung laeuft in einen Zeitablauf, weil niemand da
ist, der auf „OK" klickt. Die Alerts sind ersetzt (siehe
`src/lib/stores/notificationStore.js`), und die Pruefung braucht ohnehin keine
Oberflaeche: sie prueft das Modell, nicht die Pixel.

## Was `runImport.mjs` prueft

`oracle.mjs` liest die Datei ein zweites Mal, unabhaengig vom Importer des
Editors und namensraum-agnostisch. Der Lauf vergleicht beides und meldet als
Fehler:

| Pruefung | Fehlerbild, das sie findet |
|---|---|
| Jeder Flussknoten kommt an | Elemente verschwinden still (frueher: alle Aufrufaktivitaeten und Unterprozesse) |
| Jede Kante kommt an | Verbindungen fallen weg, weil ihre Enden fehlen |
| Pools und Lanes vollstaendig | Kollaborationen werden nur teilweise gelesen |
| Geometrie stimmt mit dem DI ueberein | der Importer rechnet Positionen neu, statt der Datei zu folgen |
| Kanten haben ihre Wegpunkte | Kantenverlauf geht verloren, alles wird gerade Linie |
| Randereignisse kennen ihre Aktivitaet | `attachedToRef` faellt weg, das Ereignis schwebt frei |
| Keine doppelten oder fehlenden Ids | |
| Konsolenausgabe bleibt klein | ein Import schrieb frueher ueber 140 000 Zeichen ins Log |

Dateien, deren Name mit `invalid-` beginnt, muessen **zurueckgewiesen** werden,
und zwar mit einer Meldung, die man einem Anwender zeigen kann. Der Lauf prueft
das mit: keine `TypeError`-Texte, kein doppelt eingewickeltes „Failed to import
BPMN XML: Failed to import BPMN XML: …", nicht zu knapp.

Elemente in einem Unterprozess **ohne** eigenes BPMNShape duerfen fehlen — sie
gehoeren zu einer zugeklappten Darstellung und sind auf dieser Ebene nicht
sichtbar.

## Fixtures

| Datei | wofuer |
|---|---|
| `gross-defaultns.bpmn` | Kollaboration mit vier Pools, sechs Lanes, Randereignissen, Aufrufaktivitaeten, Ereignis-Unterprozessen, Nachrichtenfluessen — im **Default-Namensraum**, ohne Praefix |
| `gross-praefix.bpmn` | dasselbe Modell mit `bpmn:`-Praefix |
| `gross-exotische-praefixe.bpmn` | dasselbe Modell mit `ns0:`, `zz:`, `q1:`, `q2:` |
| `gross-ohne-di.bpmn` | dasselbe Modell ohne jedes Diagram Interchange |
| `klein-lanes.bpmn` | ein Pool, fuenf Lanes, ein Unterprozess |
| `nur-prozess.bpmn` | ein Prozess ohne Kollaboration, `bpmn2:`-Praefix, Randereignis mit Frist |
| `invalid-kein-xml.bpmn` | nicht wohlgeformt |
| `invalid-kein-bpmn.bpmn` | wohlgeformtes XML, aber SVG |
| `invalid-falscher-namensraum.bpmn` | `<definitions>` in einem fremden Namensraum |

Die drei ersten Dateien sind **dasselbe Modell in drei Schreibweisen**. Genau
daran zeigte sich der urspruengliche Fehler: der Importer war auf das Literal
`bpmn:` verdrahtet und wies alles andere mit „Missing bpmn:definitions in parsed
XML" ab, obwohl es dieselbe Datei war.

### Kundendateien

`test/fixtures/local/` ist in `.gitignore` und fuer echte Dateien gedacht, die
nicht ins oeffentliche Repo gehoeren. Der Lauf nimmt sie auf Zuruf:

```
node test/headless/runImport.mjs test/fixtures/local/*.bpmn
```

Die Fixtures im Repo sind mit `test/tools/anonymize.mjs` aus solchen Dateien
entstanden: gleiche Struktur, gleiche Geometrie, gleiche Verweise — Ids, Namen
und Texte ersetzt.

```
node test/tools/anonymize.mjs kunde.bpmn test/fixtures/neu.bpmn X
```

## Schema

`test/schema/` enthaelt die fuenf offiziellen XSD der OMG, damit der Lauf ohne
Netzzugang arbeitet. Geprueft wird das XML, das der **Exporter** erzeugt: eine
Datei, die dieser Editor geschrieben hat, muss in jedem anderen Werkzeug zu
oeffnen sein. Der Lauf braucht `xmllint` (Paket `libxml2-utils`); fehlt es,
wird die Pruefung uebersprungen und das gemeldet.
