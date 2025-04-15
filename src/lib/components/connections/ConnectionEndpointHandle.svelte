<script>
  import { createEventDispatcher } from 'svelte';
  import { onMount } from 'svelte';

  // Props
  export let x = 0;
  export let y = 0;
  export let isSource = true;
  export let isVisible = true;

  // Event dispatcher
  const dispatch = createEventDispatcher();

  // Handle mouse down event
  function handleMouseDown(event) {
    console.log(`${isSource ? 'Source' : 'Target'} endpoint handle mousedown at (${x}, ${y})`);
    event.stopPropagation();
    event.preventDefault();

    // Dispatch the dragStart event with the position and type
    dispatch('dragStart', {
      event,
      type: isSource ? 'source' : 'target',
      position: { x, y }
    });
  }

  // Handle keyboard events for accessibility
  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleMouseDown(event);
    }
  }

  onMount(() => {
    console.log(`Endpoint handle mounted: ${isSource ? 'Source' : 'Target'} at (${x}, ${y})`);
  });
</script>

{#if isVisible}
  <g
    class="endpoint-handle {isSource ? 'source' : 'target'}"
    on:mousedown={handleMouseDown}
    on:keydown={handleKeyDown}
    role="button"
    tabindex="0"
    aria-label="{isSource ? 'Source' : 'Target'} endpoint handle"
  >
    <!-- Larger hit area for better interaction -->
    <circle
      cx={x}
      cy={y}
      r="15"
      fill="rgba(255, 255, 255, 0.01)"
      class="hit-area"
    />

    <!-- Visible handle - simple blue dot -->
    <circle
      cx={x}
      cy={y}
      r="6"
      fill="#3498db"
      stroke="white"
      stroke-width="1"
    />

    <!-- Debug text removed to prevent flickering -->
  </g>
{/if}

<style>
  .endpoint-handle {
    cursor: move;
    pointer-events: all;
  }

  .endpoint-handle circle {
    filter: drop-shadow(0 0 3px rgba(52, 152, 219, 0.7));
  }

  .hit-area {
    pointer-events: all;
    cursor: move;
  }
</style>
