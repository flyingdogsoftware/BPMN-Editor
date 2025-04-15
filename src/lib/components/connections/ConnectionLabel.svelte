<script>
  import { bpmnStore } from '../../stores/bpmnStore';
  import { snapToGrid } from '../../utils/gridUtils';
  import { onMount, tick, afterUpdate } from 'svelte';

  // Props
  export let connection;
  export let isSelected = false;
  export let onEditLabel = null;

  // Local state
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let dragX = 0;
  let dragY = 0;
  let labelText = '';
  let labelPosition = { x: 0, y: 0 };

  // Grid size for snapping
  const gridSize = 20;

  // Calculate the default label position based on the connection path
  function calculateDefaultLabelPosition() {
    // Calculate the midpoint of the connection path
    if (connection.waypoints && connection.waypoints.length > 0) {
      // If there are waypoints, use the middle waypoint or the midpoint between two middle waypoints
      const midIndex = Math.floor(connection.waypoints.length / 2);
      if (connection.waypoints.length % 2 === 1) {
        // Odd number of waypoints, use the middle one
        return {
          x: connection.waypoints[midIndex].x,
          y: connection.waypoints[midIndex].y - 20 // Offset above the waypoint
        };
      } else {
        // Even number of waypoints, use midpoint between two middle waypoints
        const midPoint1 = connection.waypoints[midIndex - 1];
        const midPoint2 = connection.waypoints[midIndex];
        return {
          x: (midPoint1.x + midPoint2.x) / 2,
          y: (midPoint1.y + midPoint2.y) / 2 - 20 // Offset above the midpoint
        };
      }
    } else {
      // If no waypoints, calculate a position between source and target
      // This is a fallback and should rarely be used
      const source = $bpmnStore.find(el => el.id === connection.sourceId);
      const target = $bpmnStore.find(el => el.id === connection.targetId);

      if (source && target) {
        const sourceCenter = {
          x: source.x + source.width / 2,
          y: source.y + source.height / 2
        };

        const targetCenter = {
          x: target.x + target.width / 2,
          y: target.y + target.height / 2
        };

        return {
          x: (sourceCenter.x + targetCenter.x) / 2,
          y: (sourceCenter.y + targetCenter.y) / 2 - 20 // Offset above the midpoint
        };
      }
    }

    // Default fallback position
    return { x: 0, y: 0 };
  }

  // Update the label position based on the connection
  function updateLabelPosition() {
    // Convert legacy position to offset if needed
    convertLegacyPosition();

    // Update the label text
    labelText = connection.label || '';

    // Calculate the default position
    const defaultPos = calculateDefaultLabelPosition();

    // If we have a stored offset, apply it
    if (connection.labelOffset) {
      labelPosition = {
        x: defaultPos.x + connection.labelOffset.x,
        y: defaultPos.y + connection.labelOffset.y
      };
    }
    // For backward compatibility - if we have an absolute position, use it
    else if (connection.labelPosition) {
      labelPosition = connection.labelPosition;
    }
    // Otherwise use the default position
    else {
      labelPosition = defaultPos;
    }
  }

  // Update the label position whenever the component updates
  afterUpdate(updateLabelPosition);

  // Also update on mount
  onMount(() => {
    updateLabelPosition();
  });

  // Computed values for display
  $: displayX = labelPosition.x + dragX;
  $: displayY = labelPosition.y + dragY;
  $: isCondition = connection.isConditional || (connection.condition && connection.condition.length > 0);

  // Event handlers
  function handleMouseDown(event) {
    event.stopPropagation();

    isDragging = true;
    startX = event.clientX;
    startY = event.clientY;
    dragX = 0;
    dragY = 0;

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

  function handleMouseUp() {
    if (!isDragging) return;

    // Calculate the new offset from the default position
    const defaultPos = calculateDefaultLabelPosition();
    const newOffset = {
      x: snapToGrid(labelPosition.x + dragX - defaultPos.x, gridSize),
      y: snapToGrid(labelPosition.y + dragY - defaultPos.y, gridSize)
    };

    // Update the label offset in the store
    bpmnStore.updateConnectionLabelOffset(connection.id, newOffset);

    // Reset dragging state
    isDragging = false;
    dragX = 0;
    dragY = 0;

    // Remove global event listeners
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }

  function handleDoubleClick(event) {
    event.stopPropagation();
    console.log('ConnectionLabel: Double-click on label for connection', connection.id);

    // First try the direct method
    if (onEditLabel) {
      console.log('ConnectionLabel: Calling onEditLabel directly');
      onEditLabel(connection);
    } else {
      // Fallback to custom event
      console.log('ConnectionLabel: Using custom event fallback');
      const editEvent = new CustomEvent('edit-label', {
        detail: { connectionId: connection.id },
        bubbles: true
      });

      console.log('ConnectionLabel: Dispatching edit-label event');
      event.target.dispatchEvent(editEvent);
    }
  }

  // Convert legacy absolute position to offset
  function convertLegacyPosition() {
    if (connection.labelPosition && !connection.labelOffset) {
      const defaultPos = calculateDefaultLabelPosition();
      const offset = {
        x: connection.labelPosition.x - defaultPos.x,
        y: connection.labelPosition.y - defaultPos.y
      };

      // Update the store with the new offset
      bpmnStore.updateConnectionLabelOffset(connection.id, offset);
    }
  }

  // Clean up event listeners on destruction
  onMount(() => {
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  });
</script>

<!-- Connection Label -->
<g
  class="connection-label"
  class:dragging={isDragging}
  class:selected={isSelected}
  class:condition={isCondition}
  on:mousedown={handleMouseDown}
  on:dblclick={handleDoubleClick}
  role="button"
  tabindex="0"
  aria-label="Connection label"
>
  {#if labelText}
    <!-- Background for better visibility -->
    <rect
      x={displayX - 5 - (labelText.length * 3.5)}
      y={displayY - 15}
      width={(labelText.length * 7) + 10}
      height="20"
      rx="3"
      ry="3"
      class="label-background"
    />

    <!-- Label text -->
    <text
      x={displayX}
      y={displayY}
      text-anchor="middle"
      class="connection-label-text"
      class:condition={isCondition}
    >
      {#if isCondition}
        <tspan class="condition-marker">[</tspan>
        {labelText}
        <tspan class="condition-marker">]</tspan>
      {:else}
        {labelText}
      {/if}
    </text>

    <!-- Drag handle (only visible when selected) -->
    {#if isSelected}
      <rect
        x={displayX - 5}
        y={displayY - 20}
        width="10"
        height="10"
        class="drag-handle"
      />
    {/if}
  {/if}
</g>

<style>
  .connection-label {
    cursor: pointer;
  }

  .connection-label.dragging {
    cursor: grabbing;
  }

  .connection-label.selected .label-background {
    stroke: #3498db;
    stroke-width: 1px;
  }

  .label-background {
    fill: white;
    fill-opacity: 0.8;
    stroke: #ddd;
    stroke-width: 0.5px;
  }

  .connection-label-text {
    font-size: 12px;
    fill: #333;
    pointer-events: none;
  }

  .connection-label-text.condition {
    font-style: italic;
  }

  .condition-marker {
    font-weight: bold;
  }

  .drag-handle {
    fill: #3498db;
    cursor: move;
  }
</style>
