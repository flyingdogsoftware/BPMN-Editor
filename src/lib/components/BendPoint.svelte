<script>
  import { snapToGrid } from '../utils/gridUtils';

  // Props
  export let x;
  export let y;
  export let index;
  export let isVirtual = false;
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
    onDragStart(index, isVirtual);
    
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
    onDrag(index, x + dragX, y + dragY);
  }

  function handleMouseUp(event) {
    if (!isDragging) return;
    
    isDragging = false;
    
    // Calculate final position
    const finalX = x + dragX;
    const finalY = y + dragY;
    
    // Call the parent's drag end handler
    onDragEnd(index, finalX, finalY, isVirtual);
    
    // Remove global event listeners
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }

  // Keyboard event handler for accessibility
  function handleKeyDown(event) {
    const step = event.shiftKey ? 1 : 10;
    
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      onDrag(index, x, y - step);
      onDragEnd(index, x, y - step, isVirtual);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      onDrag(index, x, y + step);
      onDragEnd(index, x, y + step, isVirtual);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      onDrag(index, x - step, y);
      onDragEnd(index, x - step, y, isVirtual);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      onDrag(index, x + step, y);
      onDragEnd(index, x + step, y, isVirtual);
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      // Implement delete functionality if needed
    }
  }
</script>

<circle
  cx={x}
  cy={y}
  r={isVirtual ? 4 : 6}
  class="bendpoint"
  class:virtual={isVirtual}
  on:mousedown={handleMouseDown}
  on:keydown={handleKeyDown}
  tabindex="0"
  role="button"
  aria-label={isVirtual ? "Add bendpoint" : "Bendpoint"}
/>

<style>
  .bendpoint {
    fill: white;
    stroke: #3498db;
    stroke-width: 2;
    cursor: move;
    transition: r 0.2s;
  }
  
  .bendpoint:hover {
    fill: #d4e6f1;
    r: 7;
  }
  
  .bendpoint.virtual {
    fill: rgba(255, 255, 255, 0.5);
    stroke-dasharray: 2;
    opacity: 0.7;
  }
  
  .bendpoint.virtual:hover {
    opacity: 1;
    fill: white;
  }
</style>
