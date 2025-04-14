<script lang="ts">
  // Props
  export let element;
  export let isDragging = false;
</script>

<!-- Base task rectangle -->
<rect
  x={element.x}
  y={element.y}
  width={element.width}
  height={element.height}
  rx="5"
  ry="5"
  fill="white"
  stroke="black"
  stroke-width={isDragging ? "2" : "1.5"}
  class="task-element"
/>

<!-- Task label -->
<text
  x={element.x + element.width / 2}
  y={element.y + element.height / 2}
  text-anchor="middle"
  dominant-baseline="middle"
  class="task-label"
>
  {#each element.label.split('\n') as line, i}
    <tspan
      x={element.x + element.width / 2}
      dy={i === 0 ? 0 : 16}
      font-size="12px"
    >
      {line}
    </tspan>
  {/each}
</text>

<!-- Task type specific icons -->
{#if element.taskType === 'user'}
  <!-- User Task Icon -->
  <path
    d={`M${element.x + 10},${element.y + 10}
        a8,8 0 1,0 16,0 a8,8 0 1,0 -16,0
        M${element.x + 18},${element.y + 18}
        v6 h-16 v-6 a8,8 0 0,1 16,0z`}
    fill="none"
    stroke="black"
    stroke-width="1"
  />
{:else if element.taskType === 'service'}
  <!-- Service Task Icon (gear) -->
  <path
    d={`M${element.x + 18},${element.y + 8}
        l2,0 l1,-4 l2,0 l1,4 l2,0
        l-3,3 l1,2 l3,-1 l1,2 l-3,2
        l0,2 l3,1 l-1,2 l-3,-1 l-1,2
        l3,3 l-2,1 l-1,-3 l-2,0 l-1,3
        l-2,0 l1,-3 l-2,-1 l-3,3 l-1,-2
        l3,-2 l0,-2 l-3,-1 l1,-2 l3,1
        l1,-2 l-3,-3z`}
    fill="none"
    stroke="black"
    stroke-width="1"
  />
  <circle
    cx={element.x + 18}
    cy={element.y + 18}
    r="5"
    fill="none"
    stroke="black"
    stroke-width="1"
  />
{:else if element.taskType === 'send'}
  <!-- Send Task Icon (envelope) -->
  <path
    d={`M${element.x + 10},${element.y + 13}
        h16 v10 h-16 z
        M${element.x + 10},${element.y + 13}
        l8,6 l8,-6`}
    fill="none"
    stroke="black"
    stroke-width="1"
  />
{:else if element.taskType === 'receive'}
  <!-- Receive Task Icon (envelope) -->
  <path
    d={`M${element.x + 10},${element.y + 13}
        h16 v10 h-16 z
        M${element.x + 10},${element.y + 13}
        l8,6 l8,-6`}
    fill="none"
    stroke="black"
    stroke-width="1"
    stroke-dasharray="2,2"
  />
{:else if element.taskType === 'manual'}
  <!-- Manual Task Icon (hand) -->
  <path
    d={`M${element.x + 17},${element.y + 10}
        c0,-1 -1,-2 -2,-2 c-1,0 -2,1 -2,2 v6
        c-1,0 -2,1 -2,2 c0,1 1,2 2,2 h2
        c0,1 1,2 2,2 c1,0 2,-1 2,-2 v-10`}
    fill="none"
    stroke="black"
    stroke-width="1"
  />
{:else if element.taskType === 'business-rule'}
  <!-- Business Rule Task Icon (table) -->
  <rect
    x={element.x + 10}
    y={element.y + 10}
    width="16"
    height="12"
    fill="none"
    stroke="black"
    stroke-width="1"
  />
  <path
    d={`M${element.x + 10},${element.y + 14} h16
        M${element.x + 10},${element.y + 18} h16
        M${element.x + 16},${element.y + 10} v12`}
    fill="none"
    stroke="black"
    stroke-width="1"
  />
{:else if element.taskType === 'script'}
  <!-- Script Task Icon (script) -->
  <path
    d={`M${element.x + 10},${element.y + 10}
        c0,-1 1,-2 2,-2 h8 c1,0 2,1 2,2 v2 c0,1 -1,2 -2,2 h-8 c-1,0 -2,-1 -2,-2 z
        M${element.x + 12},${element.y + 16} h12
        M${element.x + 12},${element.y + 20} h12`}
    fill="none"
    stroke="black"
    stroke-width="1"
  />
{/if}

<style>
  .task-element {
    transition: stroke-width 0.2s;
  }
  
  .task-label {
    font-family: Arial, sans-serif;
    font-size: 12px;
    pointer-events: none;
  }
</style>
