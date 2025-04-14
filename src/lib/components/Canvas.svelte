<script >
  import { onMount } from 'svelte';

  // Props
  export let width = 800;
  export let height = 600;
  export let viewportX = 0;
  export let viewportY = 0;
  export let isDraggingCanvas = false;
  export let onMouseDown = (event) => {};
  export let onWheel = (event) => {};

  // Grid properties
  const gridSize = 20;
  const gridColor = '#e0e0e0';
  const gridStrokeWidth = 1;
</script>

<div
  class="canvas-scroll-container"
  on:mousedown={onMouseDown}
  on:wheel={onWheel}
  class:dragging={isDraggingCanvas}
  aria-label="BPMN Editor Canvas"
>
  <svg
    {width}
    {height}
    class="canvas"
    style="transform: translate({viewportX}px, {viewportY}px);"
  >
    <!-- Draw grid -->
    <pattern id="grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
      <path
        d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
        fill="none"
        stroke={gridColor}
        stroke-width={gridStrokeWidth}
      />
    </pattern>
    <rect width="100%" height="100%" fill="url(#grid)" />

    <!-- Slot for BPMN elements -->
    <slot />
  </svg>
</div>

<style>
  .canvas-scroll-container {
    width: 100%;
    height: 100%;
    cursor: grab;
    background-color: #f9f9f9;
    overflow: hidden;
    position: relative;
  }

  .canvas-scroll-container.dragging {
    cursor: grabbing;
  }

  .canvas {
    position: absolute;
    top: 0;
    left: 0;
  }
</style>
