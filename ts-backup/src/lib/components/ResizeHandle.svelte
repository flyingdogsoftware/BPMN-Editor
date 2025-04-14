<script>
  import { snapToGrid } from '$lib/utils/gridUtils';

  // Props
  export let x;
  export let y;
  export let position; // 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'right', 'bottom'
  export let onDragStart;
  export let onDrag;
  export let onDragEnd;

  // Local state
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let dragX = 0;
  let dragY = 0;

  // Computed properties
  $: cursor = getCursorStyle(position);
  $: size = 8; // Size of the handle

  // Get the appropriate cursor style based on the handle position
  function getCursorStyle(pos) {
    switch (pos) {
      case 'top-left':
        return 'nwse-resize';
      case 'top-right':
        return 'nesw-resize';
      case 'bottom-left':
        return 'nesw-resize';
      case 'bottom-right':
        return 'nwse-resize';
      case 'right':
        return 'ew-resize';
      case 'bottom':
        return 'ns-resize';
      default:
        return 'move';
    }
  }

  // Event handlers
  function handleMouseDown(event) {
    event.stopPropagation();
    
    isDragging = true;
    startX = event.clientX;
    startY = event.clientY;
    
    // Call the parent's drag start handler
    onDragStart(position);
    
    // Add global event listeners
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  function handleMouseMove(event) {
    if (!isDragging) return;
    
    // Calculate the distance moved
    dragX = event.clientX - startX;
    dragY = event.clientY - startY;
    
    // Call the parent's drag handler with the new position
    onDrag(dragX, dragY, position);
  }

  function handleMouseUp(event) {
    if (!isDragging) return;
    
    isDragging = false;
    
    // Calculate final position
    const finalDragX = dragX;
    const finalDragY = dragY;
    
    // Call the parent's drag end handler
    onDragEnd(finalDragX, finalDragY, position);
    
    // Remove global event listeners
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    
    // Reset drag values
    dragX = 0;
    dragY = 0;
  }

  // Keyboard event handler for accessibility
  function handleKeyDown(event) {
    const step = event.shiftKey ? 1 : 10;
    let dx = 0;
    let dy = 0;
    
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      dy = -step;
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      dy = step;
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      dx = -step;
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      dx = step;
    } else {
      return; // Not an arrow key, do nothing
    }
    
    // Call drag handlers
    onDrag(dx, dy, position);
    onDragEnd(dx, dy, position);
  }
</script>

<rect
  x={x - size/2}
  y={y - size/2}
  width={size}
  height={size}
  class="resize-handle"
  style="cursor: {cursor};"
  on:mousedown={handleMouseDown}
  on:keydown={handleKeyDown}
  tabindex="0"
  role="button"
  aria-label="Resize handle"
/>

<style>
  .resize-handle {
    fill: white;
    stroke: #3498db;
    stroke-width: 2;
    transition: fill 0.2s;
  }
  
  .resize-handle:hover {
    fill: #3498db;
  }
</style>
