<script>
  import { bpmnStore } from '$lib/stores/bpmnStore';
  import {
    calculateConnectionPath,
    calculateLabelPosition,
    generateVirtualBendpoints,
    updateWaypoint,
    calculateConnectionPoints
  } from '$lib/utils/connectionUtils';
  import { snapToGrid } from '$lib/utils/gridUtils';
  import BendPoint from './BendPoint.svelte';
  import ConnectionEndpointHandle from './ConnectionEndpointHandle.svelte';

  // Props
  export let connection;
  export let sourcePosition;
  export let targetPosition;
  export let onSelect;
  export let onEndpointAdjustment = (isAdjusting) => {};

  // Local state
  let isDragging = false;
  let isEndpointDragging = false;
  let previewWaypoints = null;
  let previewSourcePosition = null;
  let previewTargetPosition = null;
  let virtualBendpoints = [];
  let highlightedConnectionPoints = [];

  // Grid size for snapping
  const gridSize = 20;
  // Minimum segment length to show virtual bendpoints
  const segmentThreshold = 50;

  // Computed
  $: {
    // Calculate virtual bendpoints when connection is selected
    if (connection.isSelected) {
      virtualBendpoints = generateVirtualBendpoints(
        sourcePosition,
        targetPosition,
        connection.waypoints || [],
        segmentThreshold
      );
    } else {
      virtualBendpoints = [];
    }
  }

  $: pathData = calculateConnectionPath(
    isEndpointDragging && previewSourcePosition ? previewSourcePosition : sourcePosition,
    isEndpointDragging && previewTargetPosition ? previewTargetPosition : targetPosition,
    isDragging && previewWaypoints ? previewWaypoints : connection.waypoints,
    'orthogonal'
  );

  $: labelPosition = calculateLabelPosition(
    sourcePosition,
    targetPosition,
    connection.waypoints
  );

  // Connection styling based on type
  $: {
    switch (connection.connectionType) {
      case 'sequence':
        strokeColor = '#333';
        strokeWidth = 2;
        strokeDasharray = '';
        markerEnd = 'url(#sequenceFlowMarker)';
        break;
      case 'message':
        strokeColor = '#3498db';
        strokeWidth = 2;
        strokeDasharray = '5,5';
        markerEnd = 'url(#messageFlowMarker)';
        break;
      case 'association':
        strokeColor = '#999';
        strokeWidth = 1.5;
        strokeDasharray = '3,3';
        markerEnd = '';
        break;
      default:
        strokeColor = '#333';
        strokeWidth = 2;
        strokeDasharray = '';
        markerEnd = 'url(#sequenceFlowMarker)';
    }
  }

  let strokeColor;
  let strokeWidth;
  let strokeDasharray;
  let markerEnd;

  // Event handlers
  function handleClick(event) {
    event.stopPropagation();
    onSelect(connection.id);
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(connection.id);
    }
  }

  // Bendpoint drag handlers
  function handleBendPointDragStart() {
    isDragging = true;

    // Initialize preview waypoints
    previewWaypoints = connection.waypoints ? [...connection.waypoints] : [];
  }

  function handleBendPointDrag(index, x, y) {
    if (!isDragging) return;

    // Update the preview waypoints
    if (previewWaypoints) {
      previewWaypoints = updateWaypoint(previewWaypoints, index, x, y, false);
    }
  }

  function handleBendPointDragEnd(index, x, y, isVirtual) {
    if (!isDragging) return;

    isDragging = false;

    // Snap to grid
    const snappedX = snapToGrid(x, gridSize);
    const snappedY = snapToGrid(y, gridSize);

    // If this is a virtual point, convert it to a real waypoint
    if (isVirtual) {
      // Create a new array of waypoints with the virtual point added
      const newWaypoints = connection.waypoints ? [...connection.waypoints] : [];
      newWaypoints.push({ x: snappedX, y: snappedY });

      // Sort waypoints by position (this is a simple approach, might need refinement)
      // For now, we'll just add it and let the user adjust if needed

      // Update the connection in the store
      bpmnStore.updateConnectionWaypoints(connection.id, newWaypoints);
    } else {
      // Update the existing waypoint
      const updatedWaypoints = updateWaypoint(
        connection.waypoints || [],
        index,
        snappedX,
        snappedY,
        true,
        gridSize
      );

      // Update the connection in the store
      bpmnStore.updateConnectionWaypoints(connection.id, updatedWaypoints);
    }

    // Reset preview
    previewWaypoints = null;
  }

  // Endpoint handle drag handlers
  function handleEndpointDragStart(isSource) {
    isEndpointDragging = true;

    // Initialize preview positions
    previewSourcePosition = isSource ? null : sourcePosition;
    previewTargetPosition = isSource ? targetPosition : null;

    // Get all available connection points for highlighting
    highlightedConnectionPoints = [];

    // Notify parent component that we're adjusting endpoints
    onEndpointAdjustment(true);
  }

  function handleEndpointDrag(x, y, isSource) {
    if (!isEndpointDragging) return;

    // Update the preview position
    if (isSource) {
      previewSourcePosition = { x, y };
    } else {
      previewTargetPosition = { x, y };
    }
  }

  function handleEndpointDragEnd(x, y, isSource) {
    if (!isEndpointDragging) return;

    isEndpointDragging = false;

    // Snap to grid
    const snappedX = snapToGrid(x, gridSize);
    const snappedY = snapToGrid(y, gridSize);

    // Get all elements from the store
    const elements = Array.isArray($bpmnStore) ? $bpmnStore : [];

    // Get all connection points from all elements
    const allPoints = [];

    // Process each element that is not a connection
    elements.forEach(element => {
      if (element && element.type !== 'connection') {
        // Get connection points for this element
        try {
          const elementPoints = calculateConnectionPoints(element);
          if (elementPoints && elementPoints.length) {
            allPoints.push(...elementPoints);
          }
        } catch (error) {
          console.error('Error calculating connection points:', error);
        }
      }
    });

    // Find the closest point
    let closestPoint = null;
    let minDistance = Infinity;

    allPoints.forEach(point => {
      if (point && typeof point.x === 'number' && typeof point.y === 'number') {
        const dx = point.x - snappedX;
        const dy = point.y - snappedY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Use a larger snap radius to make it easier to connect
        if (distance < minDistance && distance < 30) { // Within 30px radius
          minDistance = distance;
          closestPoint = point;
        }
      }
    });

    // If we found a valid connection point, update the connection
    if (closestPoint && typeof closestPoint === 'object' && 'id' in closestPoint && connection && typeof connection === 'object' && 'id' in connection) {
      console.log('Updating connection endpoint:', isSource ? 'source' : 'target', closestPoint.id);

      // Update the connection in the store
      if (isSource) {
        bpmnStore.updateConnectionEndpoints(connection.id, closestPoint.id, undefined);
      } else {
        bpmnStore.updateConnectionEndpoints(connection.id, undefined, closestPoint.id);
      }
    } else {
      console.log('No valid connection point found');
    }

    // Reset preview
    previewSourcePosition = null;
    previewTargetPosition = null;
    highlightedConnectionPoints = [];

    // Notify parent component that we're done adjusting endpoints
    onEndpointAdjustment(false);
  }
</script>

<g
  class="connection"
  class:selected={connection.isSelected}
  on:click={handleClick}
  on:keydown={handleKeyDown}
  role="button"
  tabindex="0"
  aria-label="Connection"
>
  <path
    d={pathData}
    fill="none"
    stroke={strokeColor}
    stroke-width={strokeWidth}
    stroke-dasharray={strokeDasharray}
    marker-end={markerEnd}
  />

  {#if connection.label}
    <text
      x={labelPosition.x}
      y={labelPosition.y}
      text-anchor="middle"
      dominant-baseline="middle"
      class="connection-label"
    >
      {connection.label}
    </text>
  {/if}

  {#if connection.isSelected}
    <!-- Show endpoint handles when selected -->
    <ConnectionEndpointHandle
      x={sourcePosition.x}
      y={sourcePosition.y}
      isSource={true}
      onDragStart={handleEndpointDragStart}
      onDrag={handleEndpointDrag}
      onDragEnd={handleEndpointDragEnd}
    />
    <ConnectionEndpointHandle
      x={targetPosition.x}
      y={targetPosition.y}
      isSource={false}
      onDragStart={handleEndpointDragStart}
      onDrag={handleEndpointDrag}
      onDragEnd={handleEndpointDragEnd}
    />

    <!-- Show bendpoints when selected -->
    {#if connection.waypoints && connection.waypoints.length > 0}
      {#each connection.waypoints as waypoint, i}
        <BendPoint
          x={waypoint.x}
          y={waypoint.y}
          index={i}
          isVirtual={false}
          onDragStart={handleBendPointDragStart}
          onDrag={handleBendPointDrag}
          onDragEnd={handleBendPointDragEnd}
        />
      {/each}
    {/if}

    <!-- Show virtual bendpoints on long segments -->
    {#each virtualBendpoints as vpoint, i}
      <BendPoint
        x={vpoint.x}
        y={vpoint.y}
        index={i}
        isVirtual={true}
        onDragStart={() => handleBendPointDragStart()}
        onDrag={(_, x, y) => handleBendPointDrag(connection.waypoints ? connection.waypoints.length + i : i, x, y)}
        onDragEnd={(_, x, y, isVirtual) => handleBendPointDragEnd(connection.waypoints ? connection.waypoints.length + i : i, x, y, isVirtual)}
      />
    {/each}
  {/if}
</g>

<style>
  .connection path {
    cursor: pointer;
    pointer-events: stroke;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .connection.selected path {
    stroke-width: 3;
    filter: drop-shadow(0 0 2px rgba(52, 152, 219, 0.5));
  }

  .connection-label {
    font-size: 12px;
    fill: #333;
    pointer-events: none;
    user-select: none;
  }
</style>
