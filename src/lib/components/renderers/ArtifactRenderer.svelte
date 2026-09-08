<script>
  /**
   * Zeichnet Datenobjekte, Datenspeicher, Textanmerkungen und Gruppen.
   *
   * Diese vier Typen bietet die Werkzeugleiste seit jeher an, gezeichnet
   * wurden sie bis dahin als weisses Rechteck mit dem Typnamen darin.
   *
   * Notation nach BPMN 2.0:
   *   Datenobjekt    Blatt mit umgeknickter Ecke; Pfeil oben links fuer
   *                  Ein- und Ausgabe (Eingabe hohl, Ausgabe gefuellt);
   *                  drei Striche unten fuer eine Sammlung
   *   Datenspeicher  Zylinder
   *   Textanmerkung  offene eckige Klammer links, Text daneben
   *   Gruppe         gestricheltes Rechteck mit abgerundeten Ecken
   */

  export let element;
  export let isDragging = false;
  export let isSelected = false;

  $: strokeColor = isSelected ? '#007bff' : 'black';
  $: strokeWidth = isDragging || isSelected ? 2 : 1.5;

  $: labelLines = String(
    element.type === 'textannotation' ? (element.text || element.label || '') : (element.label || '')
  ).split('\n').filter((l) => l !== '');

  // Datenobjekt: Groesse der umgeknickten Ecke
  $: fold = Math.min(12, element.width * 0.3, element.height * 0.3);

  // Datenspeicher: Hoehe der Ellipse oben und unten
  $: ry = Math.min(10, element.height * 0.18);
</script>

{#if element.type === 'dataobject'}
  <!-- Blatt mit umgeknickter Ecke -->
  <path
    d={`M${element.x},${element.y}
        h${element.width - fold}
        l${fold},${fold}
        v${element.height - fold}
        h-${element.width}
        z`}
    fill="white"
    stroke={strokeColor}
    stroke-width={strokeWidth}
  />
  <path
    d={`M${element.x + element.width - fold},${element.y}
        v${fold} h${fold}`}
    fill="none"
    stroke={strokeColor}
    stroke-width={strokeWidth}
  />

  {#if element.isInput || element.isOutput}
    <!-- Pfeil oben links: hohl = Eingabe, gefuellt = Ausgabe -->
    <path
      d={`M${element.x + 5},${element.y + 9}
          h7 v-3 l5,5 l-5,5 v-3 h-7 z`}
      fill={element.isOutput ? strokeColor : 'white'}
      stroke={strokeColor}
      stroke-width="1"
    />
  {/if}

  {#if element.isCollection}
    <!-- Drei Striche unten: Sammlung -->
    <g stroke={strokeColor} stroke-width="1.5">
      {#each [-4, 0, 4] as dx}
        <line
          x1={element.x + element.width / 2 + dx}
          y1={element.y + element.height - 12}
          x2={element.x + element.width / 2 + dx}
          y2={element.y + element.height - 3}
        />
      {/each}
    </g>
  {/if}

{:else if element.type === 'datastore'}
  <!-- Zylinder -->
  <path
    d={`M${element.x},${element.y + ry}
        a${element.width / 2},${ry} 0 0 1 ${element.width},0
        v${element.height - 2 * ry}
        a${element.width / 2},${ry} 0 0 1 -${element.width},0
        z`}
    fill="white"
    stroke={strokeColor}
    stroke-width={strokeWidth}
  />
  <!-- Zwei Rillen als Deckel -->
  <path
    d={`M${element.x},${element.y + ry}
        a${element.width / 2},${ry} 0 0 0 ${element.width},0
        M${element.x},${element.y + ry * 2.2}
        a${element.width / 2},${ry} 0 0 0 ${element.width},0`}
    fill="none"
    stroke={strokeColor}
    stroke-width="1"
  />

{:else if element.type === 'textannotation'}
  <!-- Offene eckige Klammer links -->
  <path
    d={`M${element.x + 10},${element.y}
        h-10 v${element.height} h10`}
    fill="none"
    stroke={strokeColor}
    stroke-width={strokeWidth}
  />

{:else if element.type === 'group'}
  <!-- Gestricheltes Rechteck -->
  <rect
    x={element.x}
    y={element.y}
    width={element.width}
    height={element.height}
    rx="8"
    ry="8"
    fill="none"
    stroke={strokeColor}
    stroke-width={strokeWidth}
    stroke-dasharray="10,4,2,4"
  />
{/if}

<!-- Beschriftung -->
{#if labelLines.length}
  {#if element.type === 'textannotation'}
    <!-- Text steht neben der Klammer, linksbuendig -->
    <text x={element.x + 16} y={element.y + 16} class="artifact-label" text-anchor="start">
      {#each labelLines as line, i}
        <tspan x={element.x + 16} dy={i === 0 ? 0 : 15} font-size="12px">{line}</tspan>
      {/each}
    </text>
  {:else if element.type === 'group'}
    <!-- Gruppenname oben links im Rahmen -->
    <text x={element.x + 10} y={element.y + 16} class="artifact-label" text-anchor="start">
      {#each labelLines as line, i}
        <tspan x={element.x + 10} dy={i === 0 ? 0 : 15} font-size="12px">{line}</tspan>
      {/each}
    </text>
  {:else}
    <!-- Datenobjekt und Datenspeicher: Beschriftung unter der Form -->
    <text
      x={element.x + element.width / 2}
      y={element.y + element.height + 14}
      class="artifact-label"
      text-anchor="middle"
    >
      {#each labelLines as line, i}
        <tspan x={element.x + element.width / 2} dy={i === 0 ? 0 : 15} font-size="12px">{line}</tspan>
      {/each}
    </text>
  {/if}
{/if}

<style>
  .artifact-label {
    font-family: Arial, sans-serif;
    font-size: 12px;
    pointer-events: none;
  }
</style>
