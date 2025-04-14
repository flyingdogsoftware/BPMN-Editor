<script>
  // Props
  export let x = 0;
  export let y = 0;
  export let type = 'waypoint'; // 'source', 'target', or 'waypoint'
  export let onDragStart = () => {};
  export let onDrag = (dx, dy) => {};
  export let onDragEnd = () => {};
  
  // State
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  
  // Handle mouse down
  function handleMouseDown(event) {
    event.stopPropagation();
    
    isDragging = true;
    startX = event.clientX;
    startY = event.clientY;
    
    // Call the drag start callback
    onDragStart();
    
    // Add event listeners for mouse move and mouse up
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }
  
  // Handle mouse move
  function handleMouseMove(event) {
    if (!isDragging) return;
    
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    
    // Call the drag callback
    onDrag(dx, dy);
    
    // Update the start position
    startX = event.clientX;
    startY = event.clientY;
  }
  
  // Handle mouse up
  function handleMouseUp() {
    if (!isDragging) return;
    
    isDragging = false;
    
    // Call the drag end callback
    onDragEnd();
    
    // Remove event listeners
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }
  
  // Determine the handle style based on the type
  $: handleStyle = type === 'source' ? 'source-handle' :
                   type === 'target' ? 'target-handle' : 'waypoint-handle';
</script>

<circle
  class="connection-handle {handleStyle}"
  cx={x}
  cy={y}
  r={type === 'waypoint' ? 5 : 6}
  on:mousedown={handleMouseDown}
/>

<style>
  .connection-handle {
    cursor: move;
    fill: white;
    stroke-width: 2;
  }
  
  .source-handle {
    stroke: #27ae60;
  }
  
  .target-handle {
    stroke: #e74c3c;
  }
  
  .waypoint-handle {
    stroke: #3498db;
  }
</style>
