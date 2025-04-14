<script>
  import { bpmnStore } from '../stores/bpmnStore';
  import {
    calculateConnectionPath,
    calculateLabelPosition,
    generateVirtualBendpoints,
    updateWaypoint,
    calculateConnectionPoints
  } from '../utils/connectionUtils';
  import { snapToGrid } from '../utils/gridUtils';
  import BendPoint from './BendPoint.svelte';
  import ConnectionEndpointHandle from './ConnectionEndpointHandle.svelte';
  import ConnectionLabel from './ConnectionLabel.svelte';

  // Props
  export let connection;
  export let sourcePosition;
  export let targetPosition;
  export let onSelect;
  export let onEndpointAdjustment = (isAdjusting) => {};
  export let onEditLabel = (connection) => {};

  // Label editing state
  let isEditingLabel = false;

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

  // Ensure waypoints are properly initialized
  $: {
    // If we have a connection with waypoints but they're not being used correctly,
    // make sure they're properly set up
    if (connection && connection.waypoints && connection.waypoints.length > 0) {
      // Check if the first and last waypoints match the source and target positions
      const firstWaypoint = connection.waypoints[0];
      const lastWaypoint = connection.waypoints[connection.waypoints.length - 1];

      // If the first or last waypoint is far from the source/target position,
      // we might need to update the connection points
      const sourceDistance = Math.sqrt(
        Math.pow(firstWaypoint.x - sourcePosition.x, 2) +
        Math.pow(firstWaypoint.y - sourcePosition.y, 2)
      );

      const targetDistance = Math.sqrt(
        Math.pow(lastWaypoint.x - targetPosition.x, 2) +
        Math.pow(lastWaypoint.y - targetPosition.y, 2)
      );

      // If the distances are too large, log a warning
      if (sourceDistance > 30 || targetDistance > 30) {
        console.log(`Connection ${connection.id} has waypoints that don't match endpoints:`);
        console.log(`- Source position: (${sourcePosition.x}, ${sourcePosition.y}), First waypoint: (${firstWaypoint.x}, ${firstWaypoint.y}), Distance: ${sourceDistance}`);
        console.log(`- Target position: (${targetPosition.x}, ${targetPosition.y}), Last waypoint: (${lastWaypoint.x}, ${lastWaypoint.y}), Distance: ${targetDistance}`);
      }
    }
  }

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

  function handleDoubleClick(event) {
    event.stopPropagation();
    console.log('Connection: handleDoubleClick called for connection', connection.id);

    // If the connection doesn't have a label yet, create an empty one
    if (!connection.label) {
      console.log('Connection: Creating empty label for connection', connection.id);
      bpmnStore.updateConnectionLabel(connection.id, '');
    }

    // Call the onEditLabel prop to open the label dialog in the parent component
    console.log('Connection: Calling onEditLabel prop');
    onEditLabel(connection);
  }

  // Label editing handlers
  function handleStartLabelEdit(connectionId) {
    console.log('Connection: handleStartLabelEdit called for connectionId', connectionId);
    console.log('Connection: current connection.id', connection.id);
    console.log('Connection: isEditingLabel before', isEditingLabel);

    if (connectionId === connection.id) {
      // If there's no label yet, add an empty one
      if (!connection.label) {
        console.log('Connection: No label found, creating empty one');
        bpmnStore.updateConnectionLabel(connectionId, '');
      }
      isEditingLabel = true;
      console.log('Connection: isEditingLabel after', isEditingLabel);
    }
  }

  function handleEndLabelEdit(connectionId, newLabel) {
    if (connectionId === connection.id) {
      isEditingLabel = false;

      if (newLabel !== null) {
        // Update the label in the store
        bpmnStore.updateConnectionLabel(connectionId, newLabel);
      }
    }
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
  on:dblclick={handleDoubleClick}
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

  <!-- Connection Label -->
  <ConnectionLabel
    connection={connection}
    position={connection.labelPosition || labelPosition}
    isEditing={isEditingLabel}
    onStartEdit={handleStartLabelEdit}
    onEndEdit={handleEndLabelEdit}
  />

  <!-- Edit Label Button (only shown when connection is selected) -->
  {#if connection.isSelected}
    <g
      class="edit-label-button"
      on:click={() => {
        console.log('Connection: Edit button clicked, calling onEditLabel');
        // Call the onEditLabel prop to open the label dialog in the parent component
        onEditLabel(connection);
      }}
      on:keydown={(e) => {
        if (e.key === 'Enter') {
          console.log('Connection: Edit button Enter key pressed, calling onEditLabel');
          onEditLabel(connection);
        }
      }}
      transform="translate({(connection.labelPosition || labelPosition).x + 30}, {(connection.labelPosition || labelPosition).y - 10})"
      role="button"
      tabindex="0"
      aria-label="Edit connection label"
    >
      <rect x="-10" y="-10" width="20" height="20" rx="3" fill="#3498db" />
      <text x="0" y="4" text-anchor="middle" fill="white" font-size="14">✎</text>
    </g>
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
</style>
