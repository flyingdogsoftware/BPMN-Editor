<script>
  import TaskRenderer from './TaskRenderer.svelte';
  import EventRenderer from './EventRenderer.svelte';
  import GatewayRenderer from './GatewayRenderer.svelte';
  import SubProcessRenderer from './SubProcessRenderer.svelte';

  // Props
  export let element;
  export let isDragging = false;

  // Computed property for selection state
  $: isSelected = element.isSelected || false;
</script>

<!-- Selection highlight if element is selected -->
{#if isSelected}
  <rect
    x={element.x - 4}
    y={element.y - 4}
    width={element.width + 8}
    height={element.height + 8}
    fill="rgba(0, 123, 255, 0.1)"
    stroke="#007bff"
    stroke-width="2.5"
    stroke-dasharray="5,3"
    rx="4"
    ry="4"
    class="selection-indicator"
  />
{/if}

{#if element.type === 'task'}
  <TaskRenderer {element} {isDragging} {isSelected} />
{:else if element.type === 'event'}
  <EventRenderer {element} {isDragging} {isSelected} />
{:else if element.type === 'gateway'}
  <GatewayRenderer {element} {isDragging} {isSelected} />
{:else if element.type === 'subprocess'}
  <SubProcessRenderer {element} {isDragging} {isSelected} />
{:else}
  <!-- Fallback for other element types -->
  <rect
    x={element.x}
    y={element.y}
    width={element.width}
    height={element.height}
    fill="white"
    stroke={isSelected ? "#007bff" : "black"}
    stroke-width={isDragging || isSelected ? "2" : "1.5"}
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
