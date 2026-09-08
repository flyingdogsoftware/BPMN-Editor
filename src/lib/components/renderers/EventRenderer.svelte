<script>
  /**
   * Zeichnet Ereignisse.
   *
   * Notation nach BPMN 2.0 - der Rahmen sagt, WANN das Ereignis eintritt,
   * das Symbol WAS es ist, und ob das Symbol gefuellt ist, sagt, ob das
   * Ereignis geworfen oder gefangen wird:
   *
   *   Start                    einfacher duenner Kreis
   *   Start, nicht-unterbrechend (Ereignis-Unterprozess)   gestrichelt
   *   Zwischenereignis         doppelter Kreis
   *   Randereignis             doppelter Kreis
   *   Randereignis, nicht-unterbrechend                    gestrichelt
   *   Ende                     einfacher dicker Kreis
   */

  // Props
  export let element;
  export let isDragging = false;
  export let isSelected = false;

  $: centerX = element.x + element.width / 2;
  $: centerY = element.y + element.height / 2;
  $: radius = Math.min(element.width, element.height) / 2;

  $: strokeColor = isSelected ? '#007bff' : 'black';

  $: isBoundary = element.eventType === 'boundary';
  $: isIntermediate =
    element.eventType === 'intermediate-throw' ||
    element.eventType === 'intermediate-catch' ||
    element.eventType === 'intermediate';
  $: isEnd = element.eventType === 'end';

  // Zwei Ringe bei Zwischen- und Randereignissen.
  $: hasDoubleRing = isBoundary || isIntermediate;

  // Gestrichelt, wenn das Ereignis den Ablauf nicht unterbricht.
  // Fehlt die Angabe, gilt nach BPMN "unterbrechend".
  $: isNonInterrupting =
    (isBoundary && element.cancelActivity === false) ||
    (element.eventType === 'start' && element.isInterrupting === false);
  $: dash = isNonInterrupting ? '4,3' : 'none';

  // Ein geworfenes Ereignis traegt ein gefuelltes Symbol.
  $: isThrowing =
    element.eventType === 'intermediate-throw' || element.eventType === 'end';
  $: iconFill = isThrowing ? strokeColor : 'none';
  $: iconStroke = isThrowing ? 'none' : strokeColor;

  $: outerStrokeWidth = isDragging || isSelected ? 2 : isEnd ? 3 : 1.5;
  $: labelLines = String(element.label || '').split('\n').filter((l) => l !== '');
</script>

<!-- Aeusserer Ring -->
<circle
  cx={centerX}
  cy={centerY}
  r={radius}
  fill="white"
  stroke={strokeColor}
  stroke-width={outerStrokeWidth}
  stroke-dasharray={dash}
  class="event-element {isSelected ? 'selected' : ''}"
/>

<!-- Innerer Ring bei Zwischen- und Randereignissen -->
{#if hasDoubleRing}
  <circle
    cx={centerX}
    cy={centerY}
    r={Math.max(1, radius - 3)}
    fill="none"
    stroke={strokeColor}
    stroke-width="1.5"
    stroke-dasharray={dash}
  />
{/if}

<!-- Symbol der Ereignisdefinition -->
{#if element.eventDefinition === 'message'}
  <!-- Umschlag -->
  <path
    d={`M${centerX - radius / 2},${centerY - radius / 4}
        h${radius} v${radius / 2} h-${radius} z`}
    fill={iconFill}
    stroke={isThrowing ? 'none' : strokeColor}
    stroke-width="1"
  />
  <path
    d={`M${centerX - radius / 2},${centerY - radius / 4}
        l${radius / 2},${radius / 4} l${radius / 2},-${radius / 4}`}
    fill="none"
    stroke={isThrowing ? 'white' : strokeColor}
    stroke-width="1"
  />
{:else if element.eventDefinition === 'timer'}
  <!-- Uhr -->
  <circle
    cx={centerX}
    cy={centerY}
    r={radius * 0.6}
    fill="none"
    stroke={strokeColor}
    stroke-width="1"
  />
  <path
    d={`M${centerX},${centerY - radius * 0.6} v${radius * 0.6}
        M${centerX},${centerY} l${radius * 0.4},${radius * 0.4}`}
    fill="none"
    stroke={strokeColor}
    stroke-width="1"
  />
{:else if element.eventDefinition === 'error'}
  <!-- Blitz -->
  <path
    d={`M${centerX - radius / 3},${centerY - radius / 2}
        l${radius / 3},${radius / 2}
        l-${radius / 4},${radius / 4}
        l${radius / 2},${radius / 4}
        l-${radius / 3},-${radius / 2}
        l${radius / 4},-${radius / 4}
        z`}
    fill={isThrowing ? strokeColor : 'none'}
    stroke={strokeColor}
    stroke-width="1"
  />
{:else if element.eventDefinition === 'signal'}
  <!-- Dreieck -->
  <path
    d={`M${centerX},${centerY - radius / 2}
        l${radius / 2},${radius}
        h-${radius}
        z`}
    fill={iconFill}
    stroke={iconStroke === 'none' ? strokeColor : strokeColor}
    stroke-width="1"
  />
{:else if element.eventDefinition === 'escalation'}
  <!-- Pfeilspitze -->
  <path
    d={`M${centerX},${centerY - radius / 2}
        l${radius / 2},${radius}
        l-${radius / 2},-${radius / 2}
        l-${radius / 2},${radius / 2}
        z`}
    fill={iconFill}
    stroke={strokeColor}
    stroke-width="1"
  />
{:else if element.eventDefinition === 'terminate'}
  <!-- Gefuellter Kreis -->
  <circle cx={centerX} cy={centerY} r={radius * 0.55} fill={strokeColor} />
{:else if element.eventDefinition === 'link'}
  <!-- Pfeil -->
  <path
    d={`M${centerX - radius / 2},${centerY - radius / 5}
        h${radius * 0.6} v-${radius / 5}
        l${radius / 2},${radius * 0.4}
        l-${radius / 2},${radius * 0.4}
        v-${radius / 5} h-${radius * 0.6} z`}
    fill={iconFill}
    stroke={strokeColor}
    stroke-width="1"
  />
{:else if element.eventDefinition === 'conditional'}
  <!-- Liste -->
  <g stroke={strokeColor} stroke-width="1" fill="none">
    <rect
      x={centerX - radius * 0.45}
      y={centerY - radius * 0.5}
      width={radius * 0.9}
      height={radius}
    />
    <line x1={centerX - radius * 0.3} y1={centerY - radius * 0.22} x2={centerX + radius * 0.3} y2={centerY - radius * 0.22} />
    <line x1={centerX - radius * 0.3} y1={centerY + radius * 0.03} x2={centerX + radius * 0.3} y2={centerY + radius * 0.03} />
    <line x1={centerX - radius * 0.3} y1={centerY + radius * 0.28} x2={centerX + radius * 0.3} y2={centerY + radius * 0.28} />
  </g>
{:else if element.eventDefinition === 'compensate'}
  <!-- Zwei Dreiecke -->
  <path
    d={`M${centerX},${centerY - radius * 0.4} v${radius * 0.8} l-${radius * 0.45},-${radius * 0.4} z
        M${centerX + radius * 0.45},${centerY - radius * 0.4} v${radius * 0.8} l-${radius * 0.45},-${radius * 0.4} z`}
    fill={iconFill}
    stroke={strokeColor}
    stroke-width="1"
  />
{:else if element.eventDefinition === 'cancel'}
  <!-- Andreaskreuz -->
  <path
    d={`M${centerX - radius * 0.4},${centerY - radius * 0.4} l${radius * 0.8},${radius * 0.8}
        M${centerX + radius * 0.4},${centerY - radius * 0.4} l-${radius * 0.8},${radius * 0.8}`}
    fill="none"
    stroke={strokeColor}
    stroke-width="2"
  />
{/if}

<!-- Beschriftung -->
{#if labelLines.length}
  <text x={centerX} y={centerY + radius + 15} text-anchor="middle" class="event-label">
    {#each labelLines as line, i}
      <tspan x={centerX} dy={i === 0 ? 0 : 16} font-size="12px">{line}</tspan>
    {/each}
  </text>
{/if}

<style>
  .event-element {
    transition: stroke-width 0.2s;
  }

  .event-label {
    font-family: Arial, sans-serif;
    font-size: 12px;
    pointer-events: none;
  }
</style>
