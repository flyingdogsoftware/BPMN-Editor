<script lang="ts">
  // Props
  export let element;
  export let isDragging = false;
  export let isLane = false;
</script>

<!-- Pool or Lane rectangle -->
<rect
  x={element.x}
  y={element.y}
  width={element.width}
  height={element.height}
  fill="white"
  stroke="black"
  stroke-width={isDragging ? "2" : "1.5"}
  class="pool-element"
/>

<!-- Label area for pools (not lanes) -->
{#if !isLane}
  <!-- Vertical separator line for the label area -->
  <line
    x1={element.x + 30}
    y1={element.y}
    x2={element.x + 30}
    y2={element.y + element.height}
    stroke="black"
    stroke-width="1.5"
  />

  <!-- Pool label (rotated for vertical display) -->
  <text
    x={element.x + 15}
    y={element.y + element.height / 2}
    text-anchor="middle"
    dominant-baseline="middle"
    transform="rotate(-90, ${element.x + 15}, ${element.y + element.height / 2})"
    class="pool-label"
  >
    {#each element.label.split('\n') as line, i}
      <tspan
        x={element.x + 15}
        dy={i === 0 ? 0 : 16}
        font-size="12px"
      >
        {line}
      </tspan>
    {/each}
  </text>
{:else}
  <!-- Lane label (rotated for vertical display) -->
  <text
    x={element.x + 15}
    y={element.y + element.height / 2}
    text-anchor="middle"
    dominant-baseline="middle"
    transform="rotate(-90, ${element.x + 15}, ${element.y + element.height / 2})"
    class="lane-label"
  >
    {#each element.label.split('\n') as line, i}
      <tspan
        x={element.x + 15}
        dy={i === 0 ? 0 : 16}
        font-size="12px"
      >
        {line}
      </tspan>
    {/each}
  </text>
{/if}

<style>
  .pool-element {
    transition: stroke-width 0.2s;
  }
  
  .pool-label, .lane-label {
    font-family: Arial, sans-serif;
    font-size: 12px;
    pointer-events: none;
  }
</style>
