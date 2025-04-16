<script>
  // Props
  export let element;
  export let isDragging = false;
  export let isSelected = false;

  // Computed properties
  $: centerX = element.x + element.width / 2;
  $: centerY = element.y + element.height / 2;
  $: radius = Math.min(element.width, element.height) / 2;
</script>

<!-- Base event circle -->
<circle
  cx={centerX}
  cy={centerY}
  r={radius}
  fill="white"
  stroke={isSelected ? "#007bff" : "black"}
  stroke-width={isDragging || isSelected ? "2" : "1.5"}
  class="event-element {isSelected ? 'selected' : ''}"
/>

<!-- Event type specific styling -->
{#if element.eventType === 'start'}
  <!-- Start Event - single thin circle -->
{:else if element.eventType === 'end'}
  <!-- End Event - thick border -->
  <circle
    cx={centerX}
    cy={centerY}
    r={radius}
    fill="none"
    stroke="black"
    stroke-width="3"
  />
{:else if element.eventType === 'intermediate'}
  <!-- Intermediate Event - double circle -->
  <circle
    cx={centerX}
    cy={centerY}
    r={radius - 3}
    fill="none"
    stroke="black"
    stroke-width="1.5"
  />
{/if}

<!-- Event definition specific icons -->
{#if element.eventDefinition === 'message'}
  <!-- Message icon (envelope) -->
  <path
    d={`M${centerX - radius/2},${centerY - radius/4}
        h${radius} v${radius/2} h-${radius} z
        M${centerX - radius/2},${centerY - radius/4}
        l${radius/2},${radius/4} l${radius/2},-${radius/4}`}
    fill="none"
    stroke="black"
    stroke-width="1"
  />
{:else if element.eventDefinition === 'timer'}
  <!-- Timer icon (clock) -->
  <circle
    cx={centerX}
    cy={centerY}
    r={radius * 0.6}
    fill="none"
    stroke="black"
    stroke-width="1"
  />
  <path
    d={`M${centerX},${centerY - radius * 0.6} v${radius * 0.6}
        M${centerX},${centerY} l${radius * 0.4},${radius * 0.4}`}
    fill="none"
    stroke="black"
    stroke-width="1"
  />
{:else if element.eventDefinition === 'error'}
  <!-- Error icon (lightning bolt) -->
  <path
    d={`M${centerX - radius/3},${centerY - radius/2}
        l${radius/3},${radius/2}
        l-${radius/4},${radius/4}
        l${radius/2},${radius/4}
        l-${radius/3},-${radius/2}
        l${radius/4},-${radius/4}
        z`}
    fill="black"
    stroke="none"
  />
{:else if element.eventDefinition === 'signal'}
  <!-- Signal icon (triangle) -->
  <path
    d={`M${centerX},${centerY - radius/2}
        l${radius/2},${radius}
        h-${radius}
        z`}
    fill="none"
    stroke="black"
    stroke-width="1"
  />
{/if}

<!-- Event label -->
<text
  x={centerX}
  y={centerY + radius + 15}
  text-anchor="middle"
  class="event-label"
>
  {#each element.label.split('\n') as line, i}
    <tspan
      x={centerX}
      dy={i === 0 ? 0 : 16}
      font-size="12px"
    >
      {line}
    </tspan>
  {/each}
</text>

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
