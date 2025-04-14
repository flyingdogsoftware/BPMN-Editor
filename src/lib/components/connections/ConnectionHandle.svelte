<script>
  // Props
  export let x = 0;
  export let y = 0;
  export let orientation = 'horizontal'; // 'horizontal' or 'vertical'
  export let onDragStart = () => {};
  export let isVisible = true;

  // Handle mouse down event
  function handleMouseDown(event) {
    event.stopPropagation();
    event.preventDefault();
    onDragStart(event);
  }
</script>

{#if isVisible}
  <g
    class="connection-handle {orientation}"
    on:mousedown={handleMouseDown}
    role="button"
    tabindex="0"
    aria-label="Connection handle"
  >
    <rect
      x={orientation === 'horizontal' ? x - 12 : x - 6}
      y={orientation === 'horizontal' ? y - 6 : y - 12}
      width={orientation === 'horizontal' ? 24 : 12}
      height={orientation === 'horizontal' ? 12 : 24}
      rx="4"
      ry="4"
      fill="#3498db"
      stroke="#2980b9"
      stroke-width="2"
    />
    <!-- Debug circle can be uncommented for troubleshooting
    <circle cx={x} cy={y} r="2" fill="red" />
    -->
  </g>
{/if}

<style>
  .connection-handle {
    cursor: move;
    pointer-events: all;
    transition: opacity 0.2s;
  }

  .connection-handle rect {
    opacity: 0.8;
  }

  .connection-handle rect:hover {
    opacity: 1;
    filter: drop-shadow(0 0 3px rgba(52, 152, 219, 0.7));
  }
</style>
