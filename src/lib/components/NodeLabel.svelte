<script>
  import { bpmnStore } from '../stores/bpmnStore';
  import { snapToGrid } from '../utils/gridUtils';
  import type { BpmnElementUnion, Position, BpmnNode } from '../types/bpmn';
  import { onMount, tick } from 'svelte';

  // Props
  export let element: BpmnElementUnion;
  export let position: Position;
  export let isEditing: boolean = false;
  export let onStartEdit: ((id: string) => void) | undefined;
  export let onEndEdit: ((id: string, label: string | null) => void) | undefined;

  // Local state
  let isDragging: boolean = false;
  let startX: number = 0;
  let startY: number = 0;
  let dragX: number = 0;
  let dragY: number = 0;
  let labelText: string = element && typeof element.label === 'string' ? element.label : '';
  let inputElement: HTMLInputElement | null = null;
  let svgElement: SVGElement | null = null;
  let svgPosition: Position = { x: 0, y: 0 };

  // Grid size for snapping
  const gridSize: number = 20;

  // Calculate default position if none is provided
  $: defaultPosition = calculateDefaultPosition(element);
  $: position = element.labelPosition || defaultPosition;

  // Calculate display position (including any drag offset)
  $: displayX = position.x + dragX;
  $: displayY = position.y + dragY;

  // Template-Hilfsvariable für isSelected
  $: hasIsSelected = element && 'isSelected' in element && (element as any).isSelected === true;

  // Type Guard: Prüft, ob das Element ein Node ist (x, y, width, height vorhanden)
  function isNode(element: BpmnElementUnion): element is BpmnNode {
    return (
      element &&
      typeof (element as any).x === 'number' &&
      typeof (element as any).y === 'number' &&
      typeof (element as any).width === 'number' &&
      typeof (element as any).height === 'number'
    );
  }

  // Calculate default position based on element type
  function calculateDefaultPosition(element: BpmnElementUnion | undefined): Position {
    if (!element || !isNode(element)) return { x: 0, y: 0 };

    // Default positions based on element type
    switch (element.type) {
      case 'task':
      case 'event':
      case 'gateway':
        return { x: element.x + element.width / 2, y: element.y - 15 };
      default:
        return { x: element.x, y: element.y };
    }
  }

  // Mouse event handlers
  function handleMouseDown(event: MouseEvent) {
    if (!element || !('isSelected' in element) || !element.isSelected) return;

    event.stopPropagation();

    isDragging = true;
    startX = event.clientX;
    startY = event.clientY;
    dragX = 0;
    dragY = 0;

    // Add event listeners for drag
    window.addEventListener('mousemove', handleMouseMove as EventListener);
    window.addEventListener('mouseup', handleMouseUp as EventListener);
  }

  function handleMouseMove(event: MouseEvent) {
    if (!isDragging) return;

    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    dragX = dx;
    dragY = dy;
  }

  function handleMouseUp(event: MouseEvent) {
    if (!isDragging) return;

    isDragging = false;

    // Remove event listeners
    window.removeEventListener('mousemove', handleMouseMove as EventListener);
    window.removeEventListener('mouseup', handleMouseUp as EventListener);

    // Calculate final position with snapping
    const newX = snapToGrid(position.x + dragX, gridSize);
    const newY = snapToGrid(position.y + dragY, gridSize);

    // Update the label position in the store
    bpmnStore.updateNodeLabelPosition(element.id, { x: newX, y: newY });

    // Reset drag offsets
    dragX = 0;
    dragY = 0;
  }

  function handleDoubleClick(event: MouseEvent) {
    event.stopPropagation();
    if (!isEditing && onStartEdit && element) {
      onStartEdit(element.id);
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (isEditing && event.key === 'Enter') {
      saveLabel();
    } else if (isEditing && event.key === 'Escape') {
      cancelEdit();
    }
  }

  function saveLabel() {
    if (isEditing && onEndEdit && element) {
      onEndEdit(element.id, labelText);
    }
  }

  function cancelEdit() {
    labelText = element && typeof element.label === 'string' ? element.label : '';
    if (isEditing && onEndEdit && element) {
      onEndEdit(element.id, null);
    }
  }

  // Update local label text when element label changes
  $: if (element && typeof element.label === 'string') {
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
    {#if hasIsSelected}
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
