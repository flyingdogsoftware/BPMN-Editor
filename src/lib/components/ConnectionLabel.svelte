<script>
  import { bpmnStore } from '../stores/bpmnStore';
  import { snapToGrid } from '../utils/gridUtils';
  import { onMount, tick } from 'svelte';

  // Props
  export let connection;
  export let position;
  export let isEditing = false;
  export let onStartEdit;
  export let onEndEdit;

  // Local state
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let dragX = 0;
  let dragY = 0;
  let labelText = connection.label || '';
  let inputElement;
  let svgElement;
  let svgPosition = { x: 0, y: 0 };

  // Grid size for snapping
  const gridSize = 20;

  onMount(() => {
    // Find the SVG element to get its position
    svgElement = document.querySelector('svg.canvas');
    updateSvgPosition();

    // Add resize listener to update SVG position
    window.addEventListener('resize', updateSvgPosition);
    window.addEventListener('scroll', updateSvgPosition);
    return () => {
      window.removeEventListener('resize', updateSvgPosition);
      window.removeEventListener('scroll', updateSvgPosition);
    };
  });

  function updateSvgPosition() {
    if (svgElement) {
      const rect = svgElement.getBoundingClientRect();
      svgPosition = { x: rect.left, y: rect.top };
    }
  }

  // Event handlers
  function handleMouseDown(event) {
    if (isEditing) return;

    event.stopPropagation();

    isDragging = true;
    startX = event.clientX;
    startY = event.clientY;

    // Add global event listeners
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  function handleMouseMove(event) {
    if (!isDragging) return;

    // Calculate the distance moved
    dragX = event.clientX - startX;
    dragY = event.clientY - startY;
  }

  function handleMouseUp(event) {
    if (!isDragging) return;

    isDragging = false;

    // Calculate final position
    const finalX = position.x + dragX;
    const finalY = position.y + dragY;

    // Snap to grid
    const snappedX = snapToGrid(finalX, gridSize);
    const snappedY = snapToGrid(finalY, gridSize);

    // Update the connection label position in the store
    if (connection && connection.id) {
      bpmnStore.updateConnectionLabelPosition(connection.id, { x: snappedX, y: snappedY });
    }

    // Reset drag state
    dragX = 0;
    dragY = 0;

    // Remove global event listeners
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }

  function handleDoubleClick(event) {
    event.stopPropagation();
    if (!isEditing && onStartEdit) {
      onStartEdit(connection.id);
    }
  }

  function handleKeyDown(event) {
    if (isEditing && event.key === 'Enter') {
      saveLabel();
    } else if (isEditing && event.key === 'Escape') {
      cancelEdit();
    }
  }

  function saveLabel() {
    if (isEditing && onEndEdit) {
      onEndEdit(connection.id, labelText);
    }
  }

  function cancelEdit() {
    labelText = connection.label || '';
    if (isEditing && onEndEdit) {
      onEndEdit(connection.id, null);
    }
  }

  // Update local label text when connection label changes
  $: if (connection && connection.label !== undefined) {
    labelText = connection.label;
  }

  // Computed position with drag offset
  $: displayX = position.x + (isDragging ? dragX : 0);
  $: displayY = position.y + (isDragging ? dragY : 0);

  // Determine if this is a condition expression
  $: isCondition = connection.connectionType === 'sequence' && connection.condition;

  // Calculate absolute position for the HTML input
  $: inputStyle = isEditing ? `
    position: absolute;
    left: ${svgPosition.x + displayX - 60}px;
    top: ${svgPosition.y + displayY - 15}px;
    width: 120px;
    height: 30px;
    z-index: 1000;
    background-color: white;
    border: 1px solid #3498db;
    border-radius: 3px;
    padding: 0;
  ` : '';

  // Focus the input when editing starts
  $: if (isEditing && inputElement) {
    tick().then(() => {
      setTimeout(() => {
        inputElement.focus();
        inputElement.select();
      }, 50);
    });
  }
</script>

<!-- SVG Label -->
<g
  class="connection-label-container"
  class:dragging={isDragging}
  class:editing={isEditing}
  class:condition={isCondition}
  on:mousedown={handleMouseDown}
  on:dblclick={handleDoubleClick}
  on:keydown={handleKeyDown}
  role="button"
  tabindex="0"
  aria-label="Connection label"
>
  {#if !isEditing}
    <text
      x={displayX}
      y={displayY - (labelText.split('\n').length > 1 ? (labelText.split('\n').length - 1) * 8 : 0)}
      text-anchor="middle"
      class="connection-label"
      class:condition={isCondition}
    >
      {#if isCondition}
        <tspan class="condition-marker">[</tspan>
        {#each labelText.split('\n') as line, i}
          <tspan x={displayX} dy={i === 0 ? 0 : 16}>{line}</tspan>
        {/each}
        <tspan class="condition-marker">]</tspan>
      {:else}
        {#each labelText.split('\n') as line, i}
          <tspan x={displayX} dy={i === 0 ? 0 : 16}>{line}</tspan>
        {/each}
      {/if}
    </text>
    {#if connection.isSelected}
      <rect
        x={displayX - 5}
        y={displayY - 5}
        width="10"
        height="10"
        class="drag-handle"
      />
    {/if}
  {/if}
</g>

<!-- HTML Input (outside SVG) -->
{#if isEditing}
  <div class="label-input-container" style={inputStyle}>
    <input
      bind:this={inputElement}
      bind:value={labelText}
      class="label-input"
      on:blur={saveLabel}
      on:keydown={handleKeyDown}
      autofocus
    />
  </div>
{/if}

<style>
  .connection-label {
    font-size: 12px;
    fill: #333;
    pointer-events: all;
    user-select: none;
    cursor: move;
  }

  .connection-label.condition {
    font-style: italic;
    fill: #3498db;
  }

  .condition-marker {
    font-weight: bold;
  }

  .drag-handle {
    fill: #3498db;
    opacity: 0.5;
    cursor: move;
  }

  .connection-label-container.dragging .connection-label {
    fill: #3498db;
  }

  :global(.label-input-container) {
    position: absolute;
    z-index: 1000;
  }

  :global(.label-input) {
    width: 100%;
    height: 100%;
    border: none;
    padding: 2px 4px;
    font-size: 12px;
    text-align: center;
    background-color: white;
    outline: none;
    box-sizing: border-box;
  }
</style>
