<script>
  // Props
  export let point;
  export let isVisible = false;
  export let isHighlighted = false;
  export let onMouseDown;

  // Local state
  let isHovered = false;

  // Event handlers
  function handleMouseEnter() {
    isHovered = true;
  }

  function handleMouseLeave() {
    isHovered = false;
  }

  function handleMouseDown(event) {
    event.stopPropagation();
    onMouseDown(event, point);
  }

  // Computed
  $: showPoint = isVisible || isHovered || isHighlighted;
  $: pointSize = isHovered ? 8 : isHighlighted ? 7 : 6;
</script>

<circle
  cx={point.x}
  cy={point.y}
  r={pointSize}
  class="connection-point"
  class:visible={showPoint}
  class:hovered={isHovered}
  class:highlighted={isHighlighted}
  on:mouseenter={handleMouseEnter}
  on:mouseleave={handleMouseLeave}
  on:mousedown={handleMouseDown}
  role="button"
  tabindex="0"
  aria-label="Connection point"
/>

<style>
  .connection-point {
    fill: white;
    stroke: #3498db;
    stroke-width: 2;
    opacity: 0;
    cursor: crosshair;
    transition: opacity 0.2s, r 0.2s;
  }

  .connection-point.visible {
    opacity: 1;
  }

  .connection-point.hovered {
    fill: #3498db;
    stroke: #2980b9;
  }

  .connection-point.highlighted {
    fill: #f39c12;
    stroke: #e67e22;
    opacity: 0.8;
  }
</style>
