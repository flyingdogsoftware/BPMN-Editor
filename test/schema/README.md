# BPMN-2.0-Schema

Die fuenf offiziellen XSD der OMG, unveraendert von
`https://www.omg.org/spec/BPMN/20100501/` bzw. den dort verlinkten
DD-Schemata geholt. Sie liegen hier im Baum, damit der Prueflauf ohne
Netzzugang arbeitet.

`test/headless/runSchema.mjs` prueft damit das XML, das der Exporter erzeugt.
Verwendet wird `xmllint`; fehlt es, wird die Pruefung uebersprungen und das
gemeldet - sie schlaegt dann nicht faelschlich fehl.
