<script >
  import TaskRenderer from './renderers/TaskRenderer.svelte';
  import EventRenderer from './renderers/EventRenderer.svelte';
  import GatewayRenderer from './renderers/GatewayRenderer.svelte';
  import PoolRenderer from './renderers/PoolRenderer.svelte';
  
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
{:else if element.type === 'pool'}
  <PoolRenderer {element} {isDragging} isLane={false} />
{:else if element.type === 'lane'}
  <PoolRenderer {element} {isDragging} isLane={true} />
{/if}
