<script>
  /**
   * Zeichnet Unterprozesse, Transaktionen, Ad-hoc-Unterprozesse und
   * Aufrufaktivitaeten.
   *
   * Notation nach BPMN 2.0:
   *  - eingebetteter Unterprozess: einfacher Rahmen
   *  - Ereignis-Unterprozess:      gepunkteter Rahmen
   *  - Transaktion:                doppelter Rahmen
   *  - Aufrufaktivitaet:           dicker Rahmen
   *  - zugeklappt:                 Pluszeichen am unteren Rand
   */

  // Props
  export let element;
  export let isDragging = false;
  export let isSelected = false;

  function getSubProcessStyling(subProcessType) {
    switch (subProcessType) {
      case 'event':
        // Ereignis-Unterprozess: gepunkteter Rahmen
        return { strokeDasharray: '3,3', rx: 10, ry: 10 };
      case 'transaction':
        return { strokeWidth: 2, secondBorder: true, rx: 5, ry: 5 };
      case 'adhoc':
        return { rx: 5, ry: 5, showAdhocMarker: true };
      case 'call':
        // Aufrufaktivitaet: dicker Rahmen. Das ist ihr einziges
        // Unterscheidungsmerkmal in der Notation.
        return { strokeWidth: 4, rx: 5, ry: 5 };
      default: // embedded
        return { rx: 5, ry: 5 };
    }
  }

  $: styling = getSubProcessStyling(element.subProcessType);

  // Ein zugeklappter Unterprozess traegt ein Pluszeichen; ein aufgeklappter
  // zeigt seinen Inhalt und braucht keins.
  $: isCollapsed = element.isExpanded === false;

  // Beim aufgeklappten Unterprozess liegen die Kindelemente in der Flaeche -
  // die Beschriftung gehoert dann nach oben, sonst ueberdeckt sie den Inhalt.
  $: labelLines = String(element.label || '').split('\n').filter((l) => l !== '');
  $: labelAnchorY = isCollapsed
    ? element.y + element.height / 2 - ((labelLines.length - 1) * 16) / 2
    : element.y + 16;

  $: strokeColor = isSelected ? '#007bff' : 'black';
  $: baseStrokeWidth = isDragging || isSelected
    ? Math.max(2, styling.strokeWidth || 1.5)
    : styling.strokeWidth || 1.5;
</script>

<!-- Grundform -->
<rect
  x={element.x}
  y={element.y}
  width={element.width}
  height={element.height}
  rx={styling.rx}
  ry={styling.ry}
  fill="white"
  stroke={strokeColor}
  stroke-width={baseStrokeWidth}
  stroke-dasharray={styling.strokeDasharray || 'none'}
  class="subprocess-element {isSelected ? 'selected' : ''}"
/>

<!-- Zweiter Rahmen der Transaktion -->
{#if styling.secondBorder}
  <rect
    x={element.x + 3}
    y={element.y + 3}
    width={Math.max(0, element.width - 6)}
    height={Math.max(0, element.height - 6)}
    rx={Math.max(0, styling.rx - 1)}
    ry={Math.max(0, styling.ry - 1)}
    fill="none"
    stroke={strokeColor}
    stroke-width="1"
    class="subprocess-inner-border"
  />
{/if}

<!-- Wellenlinie des Ad-hoc-Unterprozesses -->
{#if styling.showAdhocMarker}
  <path
    d={`M${element.x + element.width / 4},${element.y + element.height - 15}
        c5,-7 10,0 15,-7 s10,0 15,-7`}
    fill="none"
    stroke={strokeColor}
    stroke-width="1.5"
    class="adhoc-marker"
  />
{/if}

<!-- Pluszeichen fuer den zugeklappten Unterprozess -->
{#if isCollapsed}
  <g class="collapsed-marker">
    <rect
      x={element.x + element.width / 2 - 7}
      y={element.y + element.height - 18}
      width="14"
      height="14"
      fill="white"
      stroke={strokeColor}
      stroke-width="1"
    />
    <line
      x1={element.x + element.width / 2 - 4}
      y1={element.y + element.height - 11}
      x2={element.x + element.width / 2 + 4}
      y2={element.y + element.height - 11}
      stroke={strokeColor}
      stroke-width="1"
    />
    <line
      x1={element.x + element.width / 2}
      y1={element.y + element.height - 15}
      x2={element.x + element.width / 2}
      y2={element.y + element.height - 7}
      stroke={strokeColor}
      stroke-width="1"
    />
  </g>
{/if}

<!-- Beschriftung -->
{#if labelLines.length}
  <text
    x={element.x + element.width / 2}
    y={labelAnchorY}
    text-anchor="middle"
    dominant-baseline="middle"
    class="subprocess-label"
  >
    {#each labelLines as line, i}
      <tspan x={element.x + element.width / 2} dy={i === 0 ? 0 : 16} font-size="12px">
        {line}
      </tspan>
    {/each}
  </text>
{/if}
