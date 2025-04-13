<script>
  import { bpmnStore } from '$lib/stores/bpmnStore';
  import { snapToGrid } from '$lib/utils/gridUtils';
  import { onMount, tick } from 'svelte';

  // Props
  export let element;
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
  let labelText = element.label || '';
  let inputElement;
  let svgElement;
  let svgPosition = { x: 0, y: 0 };

  // Grid size for snapping
  const gridSize = 20;

  // Calculate default position if none is provided
  $: defaultPosition = calculateDefaultPosition(element);
  $: position = element.labelPosition || defaultPosition;

  // Calculate display position (including any drag offset)
  $: displayX = position.x + dragX;
  $: displayY = position.y + dragY;

  // Calculate default position based on element type
  function calculateDefaultPosition(element) {
    if (!element) return { x: 0, y: 0 };

    // Default positions based on element type
    switch (element.type) {
      case 'task':
        return { x: element.x + element.width / 2, y: element.y - 15 };
      case 'event':
        return { x: element.x + element.width / 2, y: element.y - 15 };
      case 'gateway':
        return { x: element.x + element.width / 2, y: element.y - 15 };
      default:
        return { x: element.x, y: element.y };
    }
  }

  // Mouse event handlers
  function handleMouseDown(event) {
    if (!element.isSelected) return;

    event.stopPropagation();

    isDragging = true;
    startX = event.clientX;
    startY = event.clientY;
    dragX = 0;
    dragY = 0;

    // Add event listeners for drag
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  function handleMouseMove(event) {
    if (!isDragging) return;

    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    dragX = dx;
    dragY = dy;
  }

  function handleMouseUp(event) {
    if (!isDragging) return;

    isDragging = false;

    // Remove event listeners
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);

    // Calculate final position with snapping
    const newX = snapToGrid(position.x + dragX, gridSize);
    const newY = snapToGrid(position.y + dragY, gridSize);

    // Update the label position in the store
    bpmnStore.updateNodeLabelPosition(element.id, { x: newX, y: newY });

    // Reset drag offsets
    dragX = 0;
    dragY = 0;
  }

  function handleDoubleClick(event) {
    event.stopPropagation();
    if (!isEditing && onStartEdit) {
      onStartEdit(element.id);
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
      onEndEdit(element.id, labelText);
    }
  }

  function cancelEdit() {
    labelText = element.label || '';
    if (isEditing && onEndEdit) {
      onEndEdit(element.id, null);
    }
  }

  // Update local label text when element label changes
  $: if (element && element.label !== undefined) {
    labelText = element.label;
  }
</script>

<style>
  .node-label {
    font-size: 12px;
    user-select: none;
    pointer-events: all;
    fill: #333;
  }

  .node-label-container {
    cursor: pointer;
  }

  .node-label-container.dragging {
    cursor: move;
  }

  .drag-handle {
    fill: #007bff;
    cursor: move;
  }
</style>

<!-- SVG Label -->
<g
  class="node-label-container"
  class:dragging={isDragging}
  class:editing={isEditing}
  on:mousedown={handleMouseDown}
  on:dblclick={handleDoubleClick}
  on:keydown={handleKeyDown}
  role="button"
  tabindex="0"
  aria-label="Node label"
>
  {#if !isEditing}
    <text
      x={displayX}
      y={displayY - (labelText.split('\n').length > 1 ? (labelText.split('\n').length - 1) * 8 : 0)}
      text-anchor="middle"
      class="node-label"
    >
      {#each labelText.split('\n') as line, i}
        <tspan x={displayX} dy={i === 0 ? 0 : 16}>{line}</tspan>
      {/each}
    </text>
    {#if element.isSelected}
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
