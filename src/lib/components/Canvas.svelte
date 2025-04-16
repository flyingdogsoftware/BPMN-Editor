<script >
  import { onMount, onDestroy } from 'svelte';
  import { multiSelectionManager } from '../services/MultiSelectionManager';
  import { bpmnStore } from '../stores/bpmnStore';

  console.log('CANVAS: Script block start');

  // Props
  export let width = 800;
  export let height = 600;
  export let viewportX = 0;
  export let viewportY = 0;
  export let zoomLevel = 1.0; // Default zoom level is 100%
  export let isDraggingCanvas = false;
  export let onMouseDown = (event) => {
    console.log('CANVAS: onMouseDown delegate called');
  };
  export let onWheel = (event) => {
    console.log('CANVAS: onWheel delegate called');
  };

  // Grid properties
  const gridSize = 20;
  const gridColor = '#e0e0e0';
  const gridStrokeWidth = 1;

  // Get the selection mode
  const selectionMode = multiSelectionManager.getSelectionModeStore();
  console.log('CANVAS: selectionMode store initialized');

  // Selection rectangle state
  let isSelecting = false;
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let currentY = 0;

  console.log('CANVAS: Selection rectangle state initialized');

  // Computed properties for the rectangle
  $: left = Math.min(startX, currentX);
  $: top = Math.min(startY, currentY);
  $: width = Math.abs(currentX - startX);
  $: height = Math.abs(currentY - startY);

  // Selection rectangle handlers
  function handleSelectionMouseDown(e) {
    console.log('CANVAS-SELECTION-DOWN: Function called', {
      selectionMode: $selectionMode,
      button: e.button,
      target: e.target.tagName,
      isSelecting: isSelecting,
      time: new Date().toISOString()
    });
    if (!$selectionMode) {
      console.log('CANVAS-SELECTION-DOWN: Not in selection mode, returning');
      return;
    }
    if (e.button !== 0) {
      console.log('CANVAS-SELECTION-DOWN: Not left mouse button, returning');
      return;
    } // Only left mouse button
    if (typeof document === 'undefined') {
      console.log('CANVAS-SELECTION-DOWN: Document undefined, returning');
      return;
    }

    // Only handle if it's directly on the canvas, not on an element
    if (!(e.target.tagName === 'svg' ||
          (e.target.tagName === 'rect' && e.target.getAttribute('fill') === 'url(#grid)'))) {
      console.log('DEBUG: Not on canvas or grid, ignoring');
      return;
    }

    const canvas = document.getElementById('canvas-container');
    if (!canvas) {
      console.log('DEBUG: Canvas element not found');
      return;
    }

    const rect = canvas.getBoundingClientRect();
    startX = e.clientX - rect.left - viewportX;
    startY = e.clientY - rect.top - viewportY;
    currentX = startX;
    currentY = startY;

    console.log('DEBUG: Starting selection at', { startX, startY });
    isSelecting = true;

    // Add event listeners for mouse move and mouse up
    console.log('DEBUG: Adding mousemove and mouseup event listeners');
    document.addEventListener('mousemove', handleSelectionMouseMove);
    document.addEventListener('mouseup', handleSelectionMouseUp);

    // Prevent default to avoid text selection
    e.preventDefault();
    e.stopPropagation();
  }

  function handleSelectionMouseMove(e) {
    // Log only occasionally to avoid flooding the console
    if (Math.random() < 0.05) {
      console.log('CANVAS-SELECTION-MOVE: Function called', {
        isSelecting: isSelecting,
        time: new Date().toISOString()
      });
    }

    if (!isSelecting) {
      if (Math.random() < 0.05) {
        console.log('CANVAS-SELECTION-MOVE: Not selecting, returning');
      }
      return;
    }
    if (typeof document === 'undefined') return;

    const canvas = document.getElementById('canvas-container');
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    currentX = e.clientX - rect.left - viewportX;
    currentY = e.clientY - rect.top - viewportY;

    // Log every 10th move event to avoid flooding the console
    if (Math.random() < 0.05) {
      console.log('CANVAS-SELECTION-MOVE: Rectangle updated', {
        currentX,
        currentY,
        width: Math.abs(currentX - startX),
        height: Math.abs(currentY - startY)
      });
    }
  }

  function handleSelectionMouseUp(e) {
    console.log('CANVAS-SELECTION-UP: Function called', {
      isSelecting: isSelecting,
      time: new Date().toISOString(),
      startX: startX,
      startY: startY,
      currentX: currentX,
      currentY: currentY,
      width: Math.abs(currentX - startX),
      height: Math.abs(currentY - startY)
    });

    if (!isSelecting) {
      console.log('CANVAS-SELECTION-UP: Not selecting, ignoring mouseup');
      return;
    }
    if (typeof document === 'undefined') {
      console.log('CANVAS-SELECTION-UP: Document undefined, returning');
      return;
    }

    // Select elements within the rectangle
    const elements = $bpmnStore.filter(element => {
      // Skip connections for now
      if (element.type === 'connection') return false;

      // Check if element overlaps with the selection rectangle
      return (
        element.x < Math.max(startX, currentX) &&
        element.x + element.width > Math.min(startX, currentX) &&
        element.y < Math.max(startY, currentY) &&
        element.y + element.height > Math.min(startY, currentY)
      );
    });

    // Get element IDs
    const elementIds = elements.map(element => element.id);
    console.log('DEBUG: Selected elements:', elementIds);

    // Select the elements
    multiSelectionManager.selectElements(elementIds);

    // Reset selection state
    console.log('CANVAS-SELECTION-UP: Resetting selection state');
    isSelecting = false;

    // Remove event listeners
    console.log('CANVAS-SELECTION-UP: Removing event listeners');
    document.removeEventListener('mousemove', handleSelectionMouseMove);
    document.removeEventListener('mouseup', handleSelectionMouseUp);

    console.log('CANVAS-SELECTION-UP: Selection complete');
  }

  // Add and remove event listeners
  onMount(() => {
    console.log('CANVAS: onMount called');
    if (typeof document !== 'undefined') {
      const canvas = document.getElementById('canvas-container');
      if (canvas) {
        console.log('CANVAS: Adding mousedown event listener to canvas');
        canvas.addEventListener('mousedown', handleSelectionMouseDown);
      } else {
        console.log('CANVAS: Canvas element not found in onMount');
      }
    } else {
      console.log('CANVAS: Document undefined in onMount');
    }
  });

  onDestroy(() => {
    console.log('CANVAS: onDestroy called');
    if (typeof document !== 'undefined') {
      const canvas = document.getElementById('canvas-container');
      if (canvas) {
        console.log('CANVAS: Removing mousedown event listener from canvas');
        canvas.removeEventListener('mousedown', handleSelectionMouseDown);
      }
      console.log('CANVAS: Removing any remaining mousemove and mouseup event listeners');
      document.removeEventListener('mousemove', handleSelectionMouseMove);
      document.removeEventListener('mouseup', handleSelectionMouseUp);
    }
  });

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
  class:selecting={$selectionMode}
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

    <!-- Selection rectangle (only shown when actively selecting) -->
    {#if isSelecting && (width > 5 || height > 5)}
      <rect
        x={left}
        y={top}
        {width}
        {height}
        fill="rgba(0, 123, 255, 0.1)"
        stroke="rgba(0, 123, 255, 0.8)"
        stroke-width="1"
        stroke-dasharray="5,5"
      />
    {/if}
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

  /* Selection rectangle styling is now in the SelectionRectangle component */

  .canvas-scroll-container.selecting {
    cursor: crosshair;
  }
</style>
