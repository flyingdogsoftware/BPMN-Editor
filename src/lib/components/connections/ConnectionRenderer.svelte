<script>
  import { calculateOrthogonalPath } from '../../utils/connectionRouting';
  import ConnectionSegment from './ConnectionSegment.svelte';

  // Props
  export let connections = [];
  export let elements = [];
  export let selectedConnectionId = null;
  export let onSelect = (id) => {};
  export let onContextMenu = (event, connection) => {};

  // Import necessary functions
  import { bpmnStore } from '../../stores/bpmnStore';
  import { snapToGrid } from '../../utils/gridUtils';

  // State for dragging
  let isDragging = false;
  let dragType = null; // 'source', 'target', 'waypoint', 'segment'
  let dragConnectionId = null;
  let dragWaypointIndex = -1;
  let dragStartX = 0;
  let dragStartY = 0;
  let originalWaypoints = [];

  // Calculate connection paths
  $: connectionPaths = connections.map(connection => {
    // Find source and target elements
    const source = elements.find(el => el.id === connection.sourceId);
    const target = elements.find(el => el.id === connection.targetId);

    if (!source || !target) return null;

    // Calculate start and end positions
    const start = {
      x: source.x + source.width / 2,
      y: source.y + source.height / 2
    };

    const end = {
      x: target.x + target.width / 2,
      y: target.y + target.height / 2
    };

    // Calculate the path
    const path = calculateOrthogonalPath(start, end, connection.waypoints || []);

    return {
      id: connection.id,
      path,
      connection,
      start,
      end
    };
  }).filter(Boolean);

  // Determine connection styling based on type
  function getConnectionStyle(connection) {
    switch (connection.connectionType) {
      case 'sequence':
        return {
          stroke: '#333',
          strokeWidth: 2,
          strokeDasharray: '',
          markerEnd: 'url(#sequenceFlowMarker)'
        };
      case 'message':
        return {
          stroke: '#3498db',
          strokeWidth: 2,
          strokeDasharray: '5,5',
          markerEnd: 'url(#messageFlowMarker)'
        };
      case 'association':
        return {
          stroke: '#999',
          strokeWidth: 1.5,
          strokeDasharray: '3,3',
          markerEnd: ''
        };
      default:
        return {
          stroke: '#333',
          strokeWidth: 2,
          strokeDasharray: '',
          markerEnd: 'url(#sequenceFlowMarker)'
        };
    }
  }

  // Handle connection click
  function handleConnectionClick(event, connectionId) {
    event.stopPropagation();
    onSelect(connectionId);
  }

  // Handle connection right-click
  function handleConnectionRightClick(event, connection) {
    event.preventDefault();
    event.stopPropagation();
    onContextMenu(event, connection);
  }

  // Handle drag start for connection endpoints
  function handleHandleDragStart(event, connection, type) {
    event.stopPropagation();
    event.preventDefault();

    isDragging = true;
    dragType = type;
    dragConnectionId = connection.id;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    originalWaypoints = [...(connection.waypoints || [])];

    // Add event listeners for mouse move and mouse up
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  // Handle drag start for waypoints
  function handleWaypointDragStart(event, connection, index) {
    event.stopPropagation();
    event.preventDefault();

    isDragging = true;
    dragType = 'waypoint';
    dragConnectionId = connection.id;
    dragWaypointIndex = index;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    originalWaypoints = [...(connection.waypoints || [])];

    // Add event listeners for mouse move and mouse up
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  // Handle drag start for segments (creating new waypoints)
  function handleSegmentDragStart(event, connection, index) {
    event.stopPropagation();
    event.preventDefault();

    isDragging = true;
    dragType = 'segment';
    dragConnectionId = connection.id;
    dragWaypointIndex = index;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    originalWaypoints = [...(connection.waypoints || [])];

    // Create a new waypoint at the current mouse position
    const newWaypoint = {
      x: event.offsetX,
      y: event.offsetY
    };

    // Add the new waypoint to the connection
    let updatedWaypoints = [...originalWaypoints];
    if (index === -1) {
      // For direct connections, add the first waypoint
      updatedWaypoints = [newWaypoint];
    } else {
      // Insert the new waypoint at the specified index
      updatedWaypoints.splice(index + 1, 0, newWaypoint);
    }

    // Update the connection
    bpmnStore.updateElement(connection.id, { waypoints: updatedWaypoints });

    // Update the drag index to point to the new waypoint
    dragWaypointIndex = index === -1 ? 0 : index + 1;

    // Add event listeners for mouse move and mouse up
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  // Handle mouse move during drag
  function handleMouseMove(event) {
    if (!isDragging || !dragConnectionId) return;

    const connection = connections.find(c => c.id === dragConnectionId);
    if (!connection) return;

    const dx = event.clientX - dragStartX;
    const dy = event.clientY - dragStartY;

    // Update the drag start position
    dragStartX = event.clientX;
    dragStartY = event.clientY;

    // Handle different drag types
    if (dragType === 'waypoint' || dragType === 'segment') {
      // Update the waypoint position
      const waypoints = [...(connection.waypoints || [])];
      if (dragWaypointIndex >= 0 && dragWaypointIndex < waypoints.length) {
        waypoints[dragWaypointIndex] = {
          x: snapToGrid(waypoints[dragWaypointIndex].x + dx, 20),
          y: snapToGrid(waypoints[dragWaypointIndex].y + dy, 20)
        };

        // Update the connection
        bpmnStore.updateElement(connection.id, { waypoints });
      }
    } else if (dragType === 'source' || dragType === 'target') {
      // For now, we'll just update the waypoints
      // In a more advanced implementation, we could update the source/target element
      const waypoints = [...(connection.waypoints || [])];

      if (dragType === 'source' && waypoints.length > 0) {
        // Update the first waypoint
        waypoints[0] = {
          x: snapToGrid(waypoints[0].x + dx, 20),
          y: snapToGrid(waypoints[0].y + dy, 20)
        };
      } else if (dragType === 'target' && waypoints.length > 0) {
        // Update the last waypoint
        waypoints[waypoints.length - 1] = {
          x: snapToGrid(waypoints[waypoints.length - 1].x + dx, 20),
          y: snapToGrid(waypoints[waypoints.length - 1].y + dy, 20)
        };
      } else {
        // If there are no waypoints, create one
        const source = elements.find(el => el.id === connection.sourceId);
        const target = elements.find(el => el.id === connection.targetId);

        if (source && target) {
          const sourceCenter = {
            x: source.x + source.width / 2,
            y: source.y + source.height / 2
          };

          const targetCenter = {
            x: target.x + target.width / 2,
            y: target.y + target.height / 2
          };

          if (dragType === 'source') {
            waypoints.push({
              x: snapToGrid(sourceCenter.x + dx, 20),
              y: snapToGrid(sourceCenter.y + dy, 20)
            });
          } else {
            waypoints.push({
              x: snapToGrid(targetCenter.x + dx, 20),
              y: snapToGrid(targetCenter.y + dy, 20)
            });
          }
        }
      }

      // Update the connection
      bpmnStore.updateElement(connection.id, { waypoints });
    }
  }

  // Handle mouse up after drag
  function handleMouseUp() {
    if (!isDragging) return;

    // Reset drag state
    isDragging = false;
    dragType = null;
    dragConnectionId = null;
    dragWaypointIndex = -1;
    originalWaypoints = [];

    // Remove event listeners
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }

  // Add event listeners for mouse move and mouse up
  import { onMount, onDestroy } from 'svelte';

  // Check if we're in the browser
  const isBrowser = typeof window !== 'undefined';

  onMount(() => {
    // No need to add listeners here, they're added when dragging starts
  });

  onDestroy(() => {
    // Clean up any listeners that might be left
    if (isBrowser && isDragging) {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
  });
</script>

<!-- Define markers for connections -->
<defs>
  <marker
    id="sequenceFlowMarker"
    viewBox="0 0 10 10"
    refX="10"
    refY="5"
    markerWidth="6"
    markerHeight="6"
    orient="auto"
  >
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#333" />
  </marker>

  <marker
    id="messageFlowMarker"
    viewBox="0 0 10 10"
    refX="10"
    refY="5"
    markerWidth="6"
    markerHeight="6"
    orient="auto"
  >
    <circle cx="5" cy="5" r="4" fill="white" stroke="#3498db" stroke-width="1" />
  </marker>
</defs>

<!-- Render connections -->
{#each connectionPaths as { id, path, connection, start, end } (id)}
  <g
    class="connection"
    class:selected={id === selectedConnectionId}
    on:click={(e) => handleConnectionClick(e, id)}
    on:keydown={(e) => e.key === 'Enter' && handleConnectionClick(e, id)}
    on:contextmenu={(e) => handleConnectionRightClick(e, connection)}
    role="button"
    tabindex="0"
    aria-label="Connection between elements"
  >
    <ConnectionSegment
      {path}
      style={getConnectionStyle(connection)}
      isSelected={id === selectedConnectionId}
    />

    <!-- Connection Label -->
    {#if connection.label}
      <g class="connection-label">
        <!-- Calculate label position (can be improved) -->
        <text
          x={(start.x + end.x) / 2}
          y={(start.y + end.y) / 2 - 10}
          text-anchor="middle"
          font-size="12px"
          fill="#333"
        >
          {connection.label}
        </text>
      </g>
    {/if}

    <!-- Connection handles (only when selected) -->
    {#if id === selectedConnectionId}
      <!-- Source handle -->
      <circle
        cx={start.x}
        cy={start.y}
        r="6"
        fill="white"
        stroke="#27ae60"
        stroke-width="2"
        class="connection-handle source"
        on:mousedown={(e) => handleHandleDragStart(e, connection, 'source')}
        role="button"
        tabindex="0"
        aria-label="Drag source connection point"
      />

      <!-- Target handle -->
      <circle
        cx={end.x}
        cy={end.y}
        r="6"
        fill="white"
        stroke="#e74c3c"
        stroke-width="2"
        class="connection-handle target"
        on:mousedown={(e) => handleHandleDragStart(e, connection, 'target')}
        role="button"
        tabindex="0"
        aria-label="Drag target connection point"
      />

      <!-- Waypoint handles -->
      {#if connection.waypoints && connection.waypoints.length > 0}
        {#each connection.waypoints as waypoint, i}
          <circle
            cx={waypoint.x}
            cy={waypoint.y}
            r="5"
            fill="white"
            stroke="#3498db"
            stroke-width="2"
            class="waypoint-handle"
            on:mousedown={(e) => handleWaypointDragStart(e, connection, i)}
            role="button"
            tabindex="0"
            aria-label="Drag waypoint {i+1}"
          />
        {/each}
      {/if}

      <!-- Add segment handles for creating new waypoints -->
      {#if path}
        <!-- Calculate midpoints of each segment for adding new waypoints -->
        {#if !connection.waypoints || connection.waypoints.length === 0}
          <!-- For direct connections with no waypoints, add a handle in the middle -->
          <circle
            cx={(start.x + end.x) / 2}
            cy={(start.y + end.y) / 2}
            r="5"
            fill="white"
            stroke="#3498db"
            stroke-width="2"
            stroke-dasharray="2,2"
            class="segment-handle"
            on:mousedown={(e) => handleSegmentDragStart(e, connection, -1)}
            role="button"
            tabindex="0"
            aria-label="Add waypoint"
          />
        {/if}
      {/if}
    {/if}
  </g>
{/each}

<style>
  .connection {
    cursor: pointer;
    outline: none; /* Remove the outline/black box when selected */
  }

  /* Selected connection styles are in ConnectionSegment.svelte */
  .connection.selected {
    outline: none; /* Ensure no outline is shown */
  }

  /* Add a custom focus style for accessibility */
  .connection:focus {
    outline: none;
  }

  .connection:focus path {
    filter: drop-shadow(0 0 5px rgba(52, 152, 219, 0.8));
  }

  .connection-handle {
    cursor: move;
  }

  .waypoint-handle {
    cursor: move;
  }
</style>
