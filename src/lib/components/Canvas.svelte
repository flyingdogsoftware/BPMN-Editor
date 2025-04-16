<script >
  import { onMount } from 'svelte';

  // Props
  export let width = 800;
  export let height = 600;
  export let viewportX = 0;
  export let viewportY = 0;
  export let zoomLevel = 1.0; // Default zoom level is 100%
  export let isDraggingCanvas = false;
  export let onMouseDown = (event) => {};
  export let onWheel = (event) => {};

  // Grid properties
  const gridSize = 20;
  const gridColor = '#e0e0e0';
  const gridStrokeWidth = 1;

  // Calculate the transform string including zoom
  $: transformString = `translate(${viewportX}px, ${viewportY}px) scale(${zoomLevel})`;

  // Debug: Log viewport changes
  $: console.log('DEBUG: Canvas component - viewport changed:', { viewportX, viewportY, zoomLevel });
</script>

<!-- Using role="presentation" to indicate this is a non-interactive element for visual presentation -->
<div
  class="canvas-scroll-container"
  on:mousedown={onMouseDown}
  on:wheel={onWheel}
  class:dragging={isDraggingCanvas}
  aria-label="BPMN Editor Canvas"
  role="presentation"
>
  <svg
    {width}
    {height}
    class="canvas"
    style="transform: {transformString} !important;"
    data-viewport-x={viewportX}
    data-viewport-y={viewportY}
    data-zoom-level={zoomLevel}
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
    height: 100vh; /* Verwende die volle Höhe des Viewports */
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
    min-width: 100%;
    min-height: 100vh; /* Mindestens die volle Höhe des Viewports */
    will-change: transform; /* Optimiert die Transformation für bessere Performance */
    transform-origin: 0 0; /* Setzt den Transformationsursprung auf die obere linke Ecke */
  }
</style>
