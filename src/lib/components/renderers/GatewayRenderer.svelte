<script >
  // Props
  export let element;
  export let isDragging = false;
  export let isSelected = false;

  // Computed properties
  $: centerX = element.x + element.width / 2;
  $: centerY = element.y + element.height / 2;
  $: size = Math.min(element.width, element.height);
</script>

<!-- Base gateway diamond -->
<path
  d={`M${centerX},${centerY - size/2}
      L${centerX + size/2},${centerY}
      L${centerX},${centerY + size/2}
      L${centerX - size/2},${centerY}
      Z`}
  fill="white"
  stroke={isSelected ? "#007bff" : "black"}
  stroke-width={isDragging || isSelected ? "2" : "1.5"}
  class="gateway-element {isSelected ? 'selected' : ''}"
/>

<!-- Gateway type specific icons -->
{#if element.gatewayType === 'exclusive'}
  <!-- Exclusive Gateway (X) -->
  <path
    d={`M${centerX - size/4},${centerY - size/4}
        L${centerX + size/4},${centerY + size/4}
        M${centerX - size/4},${centerY + size/4}
        L${centerX + size/4},${centerY - size/4}`}
    fill="none"
    stroke="black"
    stroke-width="2"
  />
{:else if element.gatewayType === 'parallel'}
  <!-- Parallel Gateway (plus) -->
  <path
    d={`M${centerX},${centerY - size/4}
        L${centerX},${centerY + size/4}
        M${centerX - size/4},${centerY}
        L${centerX + size/4},${centerY}`}
    fill="none"
    stroke="black"
    stroke-width="2"
  />
{:else if element.gatewayType === 'inclusive'}
  <!-- Inclusive Gateway (circle) -->
  <circle
    cx={centerX}
    cy={centerY}
    r={size/4}
    fill="none"
    stroke="black"
    stroke-width="2"
  />
{:else if element.gatewayType === 'event-based'}
  <!-- Event-based Gateway (double circle with pentagon) -->
  <circle
    cx={centerX}
    cy={centerY}
    r={size/4}
    fill="none"
    stroke="black"
    stroke-width="1"
  />
  <circle
    cx={centerX}
    cy={centerY}
    r={size/3}
    fill="none"
    stroke="black"
    stroke-width="1"
  />
  <path
    d={`M${centerX},${centerY - size/6}
        L${centerX + size/7},${centerY - size/12}
        L${centerX + size/9},${centerY + size/8}
        L${centerX - size/9},${centerY + size/8}
        L${centerX - size/7},${centerY - size/12}
        Z`}
    fill="none"
    stroke="black"
    stroke-width="1"
  />
{/if}

<!-- Gateway label -->
<text
  x={centerX}
  y={centerY + size/2 + 15}
  text-anchor="middle"
  class="gateway-label"
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
  .gateway-element {
    transition: stroke-width 0.2s;
  }

  .gateway-label {
    font-family: Arial, sans-serif;
    font-size: 12px;
    pointer-events: none;
  }
</style>
