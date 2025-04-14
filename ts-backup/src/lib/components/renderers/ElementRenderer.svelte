<script lang="ts">
  import TaskRenderer from './TaskRenderer.svelte';
  import EventRenderer from './EventRenderer.svelte';
  import GatewayRenderer from './GatewayRenderer.svelte';
  
  // Props
  export let element;
  export let isDragging = false;
</script>

{#if element.type === 'task'}
  <TaskRenderer {element} {isDragging} />
{:else if element.type === 'event'}
  <EventRenderer {element} {isDragging} />
{:else if element.type === 'gateway'}
  <GatewayRenderer {element} {isDragging} />
{:else}
  <!-- Fallback for other element types -->
  <rect
    x={element.x}
    y={element.y}
    width={element.width}
    height={element.height}
    fill="white"
    stroke="black"
    stroke-width={isDragging ? "2" : "1.5"}
  />
  <text
    x={element.x + element.width / 2}
    y={element.y + element.height / 2}
    text-anchor="middle"
    dominant-baseline="middle"
    font-size="12px"
  >
    {element.label || element.type}
  </text>
{/if}
