<script>
  import { snapToGrid } from '$lib/utils/gridUtils';

  // Props
  export let x;
  export let y;
  export let isSource;
  export let onDragStart;
  export let onDrag;
  export let onDragEnd;

  // Local state
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let dragX = 0;
  let dragY = 0;

  // Event handlers
  function handleMouseDown(event) {
    event.stopPropagation();
    
    isDragging = true;
    startX = event.clientX;
    startY = event.clientY;
    
    // Call the parent's drag start handler
    onDragStart(isSource);
    
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
    onDrag(x + dragX, y + dragY, isSource);
  }

  function handleMouseUp(event) {
    if (!isDragging) return;
    
    isDragging = false;
    
    // Calculate final position
    const finalX = x + dragX;
    const finalY = y + dragY;
    
    // Call the parent's drag end handler
    onDragEnd(finalX, finalY, isSource);
    
    // Remove global event listeners
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }

  // Keyboard event handler for accessibility
  function handleKeyDown(event) {
    const step = event.shiftKey ? 1 : 10;
    
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      onDrag(x, y - step, isSource);
      onDragEnd(x, y - step, isSource);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      onDrag(x, y + step, isSource);
      onDragEnd(x, y + step, isSource);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      onDrag(x - step, y, isSource);
      onDragEnd(x - step, y, isSource);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      onDrag(x + step, y, isSource);
      onDragEnd(x + step, y, isSource);
    }
  }
</script>

<circle
  cx={x}
  cy={y}
  r={8}
  class="endpoint-handle"
  class:source={isSource}
  class:target={!isSource}
  on:mousedown={handleMouseDown}
  on:keydown={handleKeyDown}
  tabindex="0"
  role="button"
  aria-label={isSource ? "Source endpoint" : "Target endpoint"}
/>

<style>
  .endpoint-handle {
    fill: white;
    stroke-width: 2;
    cursor: move;
    transition: r 0.2s, fill 0.2s;
  }
  
  .endpoint-handle.source {
    stroke: #27ae60;
  }
  
  .endpoint-handle.target {
    stroke: #e74c3c;
  }
  
  .endpoint-handle:hover {
    r: 10;
    fill: #f8f9fa;
  }
  
  .endpoint-handle.source:hover {
    fill: rgba(39, 174, 96, 0.2);
  }
  
  .endpoint-handle.target:hover {
    fill: rgba(231, 76, 60, 0.2);
  }
</style>
