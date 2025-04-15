<script>
  import { calculateOrthogonalPath, adjustWaypoint, optimizeWaypoints } from '../../utils/connectionRouting';
  import { calculateElementIntersection } from '../../utils/geometryUtils';
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
  import { onMount, onDestroy } from 'svelte';

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

    // Special handling for event elements (circles) and gateways (diamonds) as targets
    let adjustedWaypoints = [...(connection.waypoints || [])];

    // For event elements and gateways, we need to ensure the connection approaches from the correct direction
    if ((target.type === 'event' || target.type === 'gateway') && adjustedWaypoints.length === 0) {
      // For direct connections, we need to ensure we approach from a cardinal direction
      const dx = end.x - start.x;
      const dy = end.y - start.y;

      // Determine if we should approach horizontally or vertically
      const approachHorizontally = Math.abs(dx) > Math.abs(dy);

      if (approachHorizontally) {
        // Add a waypoint that ensures we approach horizontally
        adjustedWaypoints = [
          { x: end.x, y: start.y }
        ];
      } else {
        // Add a waypoint that ensures we approach vertically
        adjustedWaypoints = [
          { x: start.x, y: end.y }
        ];
      }
    }

    // Get all points in the path
    const waypoints = adjustedWaypoints;
    const allPoints = [start, ...waypoints, end];

    // Determine the last segment start point
    let lastSegmentStart;
    if (waypoints.length > 0) {
      // If there are waypoints, the last segment starts from the last waypoint
      lastSegmentStart = waypoints[waypoints.length - 1];
    } else {
      // For direct paths, determine the corner point based on the path calculation logic
      const dx = end.x - start.x;
      const dy = end.y - start.y;

      // If the points are aligned horizontally or vertically, use a direct line
      if (Math.abs(start.x - end.x) < 0.001 || Math.abs(start.y - end.y) < 0.001) {
        lastSegmentStart = start;
      } else {
        const goHorizontalFirst = Math.abs(dx) > Math.abs(dy);

        if (goHorizontalFirst) {
          lastSegmentStart = { x: end.x, y: start.y };
        } else {
          lastSegmentStart = { x: start.x, y: end.y };
        }
      }
    }

    // Calculate the intersection point with the target element's boundary
    let intersectionPoint;

    // For all element types, use the utility function which has specialized handling for events
    intersectionPoint = calculateElementIntersection(lastSegmentStart, end, target);

    // For event elements and gateways, ensure the intersection point is correctly calculated
    if (target.type === 'event' || target.type === 'gateway') {
      // Calculate the center of the element
      const center = {
        x: target.x + target.width / 2,
        y: target.y + target.height / 2
      };

      // Calculate the direction vector from center to lastSegmentStart
      const dx = lastSegmentStart.x - center.x;
      const dy = lastSegmentStart.y - center.y;

      // Calculate the distance
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Normalize the direction vector
      const nx = distance > 0.001 ? dx / distance : 1;
      const ny = distance > 0.001 ? dy / distance : 0;

      if (target.type === 'event') {
        // For event elements (circles)
        // Calculate the radius of the circle
        const radius = target.width / 2;

        // Apply a small offset to ensure the arrow head is visible
        const offsetRadius = radius - 5;

        intersectionPoint = {
          x: center.x + nx * offsetRadius,
          y: center.y + ny * offsetRadius
        };
      } else if (target.type === 'gateway') {
        // For gateway elements (diamonds)
        // The distance from center to corner is different for diamonds
        // For a diamond, the distance to the edge depends on the angle

        // Calculate the angle of approach (in radians)
        const angle = Math.atan2(ny, nx);

        // For a diamond, the distance to the edge is:
        // width/2 * cos(angle) + height/2 * sin(angle) for the absolute values
        const halfWidth = target.width / 2;
        const halfHeight = target.height / 2;

        // Calculate the distance to the edge
        const distanceToEdge = halfWidth * Math.abs(Math.cos(angle)) +
                              halfHeight * Math.abs(Math.sin(angle));

        // Apply a small offset to ensure the arrow head is visible
        const offsetDistance = distanceToEdge - 5;

        intersectionPoint = {
          x: center.x + nx * offsetDistance,
          y: center.y + ny * offsetDistance
        };
      }
    }

    // Now calculate the path with the adjusted waypoints
    // but ending at the intersection point instead of the center
    let pathPoints = [start, ...waypoints];

    // Add the intersection point as the final point
    pathPoints.push(intersectionPoint);

    // Generate the SVG path data
    let path = `M ${start.x} ${start.y}`;

    // Add each segment
    for (let i = 1; i < pathPoints.length; i++) {
      const prev = pathPoints[i - 1];
      const curr = pathPoints[i];

      // If this is the last point (intersection point), just draw a line to it
      if (i === pathPoints.length - 1) {
        path += ` L ${curr.x.toFixed(2)} ${curr.y.toFixed(2)}`;
      } else {
        // Otherwise, create an orthogonal segment
        const dx = curr.x - prev.x;
        const dy = curr.y - prev.y;

        // If the points are aligned horizontally or vertically, use a direct line
        if (Math.abs(dx) < 0.001 || Math.abs(dy) < 0.001) {
          path += ` L ${curr.x} ${curr.y}`;
        } else {
          // Otherwise, create a corner
          const goHorizontalFirst = Math.abs(dx) > Math.abs(dy);

          if (goHorizontalFirst) {
            path += ` L ${curr.x} ${prev.y} L ${curr.x} ${curr.y}`;
          } else {
            path += ` L ${prev.x} ${curr.y} L ${curr.x} ${curr.y}`;
          }
        }
      }
    }

    return {
      id: connection.id,
      path,
      connection,
      start,
      end: intersectionPoint, // Use the intersection point as the visual end
      originalEnd: end, // Keep the original end for reference
      waypoints: adjustedWaypoints // Use the adjusted waypoints
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
          markerEnd: 'url(#associationMarker)'
        };
      case 'dataassociation':
        return {
          stroke: '#999',
          strokeWidth: 1.5,
          strokeDasharray: '2,2',
          markerEnd: 'url(#associationMarker)'
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

  // Handle segment handle drag start from ConnectionSegment
  function handleSegmentHandleDragStart(connectionId, segmentIndex, event) {
    console.log('Handle drag start:', { connectionId, segmentIndex });

    const connection = connections.find(c => c.id === connectionId);
    if (!connection) {
      console.error('Connection not found:', connectionId);
      return;
    }

    // Calculate the position where the new waypoint should be added
    const source = elements.find(el => el.id === connection.sourceId);
    const target = elements.find(el => el.id === connection.targetId);

    if (!source || !target) {
      console.error('Source or target not found:', { sourceId: connection.sourceId, targetId: connection.targetId });
      return;
    }

    // Get the start and end positions
    const start = {
      x: source.x + source.width / 2,
      y: source.y + source.height / 2
    };

    const end = {
      x: target.x + target.width / 2,
      y: target.y + target.height / 2
    };

    // Get all points in order
    const points = [start, ...(connection.waypoints || []), end];
    console.log('Points:', points);

    // We need to determine where to insert the new waypoint
    // segmentIndex refers to the segment between points[segmentIndex] and points[segmentIndex + 1]
    if (segmentIndex >= 0 && segmentIndex < points.length - 1) {
      const p1 = points[segmentIndex];
      const p2 = points[segmentIndex + 1];

      // Determine if the segment is horizontal or vertical
      // Use a very lenient threshold for determining horizontal/vertical
      // or determine the dominant direction if it's diagonal
      const dx = Math.abs(p1.x - p2.x);
      const dy = Math.abs(p1.y - p2.y);

      // If the segment is more horizontal than vertical
      const isHorizontal = dy < dx;
      // If the segment is more vertical than horizontal
      const isVertical = dx <= dy;

      console.log('Segment info:', { p1, p2, dx, dy, isHorizontal, isVertical, segmentIndex });

      // Store the original segment information for dragging
      const segmentInfo = {
        p1: { ...p1 },
        p2: { ...p2 },
        isHorizontal,
        isVertical,
        segmentIndex
      };

      // Start dragging without modifying the connection yet
      isDragging = true;
      dragType = 'segment';
      dragConnectionId = connection.id;
      dragStartX = event.clientX;
      dragStartY = event.clientY;

      // Store the original waypoints for reference
      originalWaypoints = [...(connection.waypoints || [])];

      // Initialize accumulated movement
      window.accumulatedDx = 0;
      window.accumulatedDy = 0;

      // Store the segment info in a property for use during dragging
      window.currentSegmentInfo = segmentInfo;
      console.log('Drag started:', { isDragging, dragType, dragConnectionId });

      // Add event listeners for mouse move and mouse up
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
  }

  // Handle mouse move during drag
  function handleMouseMove(event) {
    if (!isDragging || !dragConnectionId) {
      console.log('Not dragging or no dragConnectionId');
      return;
    }

    console.log('Mouse move during drag:', { dragType, dragConnectionId });

    const connection = connections.find(c => c.id === dragConnectionId);
    if (!connection) {
      console.error('Connection not found during drag:', dragConnectionId);
      return;
    }

    const dx = event.clientX - dragStartX;
    const dy = event.clientY - dragStartY;

    // Update the drag start position
    dragStartX = event.clientX;
    dragStartY = event.clientY;

    // Handle different drag types
    if (dragType === 'waypoint') {
      // Get the current waypoints
      const waypoints = [...(connection.waypoints || [])];

      if (dragWaypointIndex >= 0 && dragWaypointIndex < waypoints.length) {
        // Calculate the new position with grid snapping
        const newPosition = {
          x: snapToGrid(waypoints[dragWaypointIndex].x + dx, 20),
          y: snapToGrid(waypoints[dragWaypointIndex].y + dy, 20)
        };

        // Use the adjustWaypoint function to maintain orthogonal routing
        const adjustedWaypoints = adjustWaypoint(waypoints, dragWaypointIndex, newPosition);

        // Update the connection with the adjusted waypoints
        bpmnStore.updateElement(connection.id, { waypoints: adjustedWaypoints });
      }
    } else if (dragType === 'segment') {
      // Handle segment dragging
      const segmentInfo = window.currentSegmentInfo;
      if (!segmentInfo) {
        console.error('No segment info found during drag');
        return;
      }

      console.log('Segment drag:', { dx, dy, segmentInfo });

      // Get the current waypoints
      let waypoints = [...(connection.waypoints || [])];

      // Calculate the total accumulated movement
      const totalDx = dx + (window.accumulatedDx || 0);
      const totalDy = dy + (window.accumulatedDy || 0);

      console.log('Accumulated movement:', { totalDx, totalDy });

      // Store the accumulated movement for the next frame
      window.accumulatedDx = totalDx;
      window.accumulatedDy = totalDy;

      // Determine which direction to move based on segment orientation
      if (segmentInfo.isHorizontal) {
        // For horizontal segments, only move vertically
        const moveY = snapToGrid(totalDy, 20);
        console.log('Horizontal segment, vertical move:', moveY);

        // Only create waypoints if the movement is significant
        if (Math.abs(moveY) >= 20) {
          // Create two new waypoints to maintain the horizontal segment length
          if (!window.waypointCreated) {
            console.log('Creating new waypoints for horizontal segment');

            // Create two waypoints to form a detour
            // For horizontal segments, we need to maintain the x-coordinates
            // but adjust the y-coordinates
            const wp1 = {
              x: segmentInfo.p1.x,
              y: segmentInfo.p1.y + moveY
            };

            const wp2 = {
              x: segmentInfo.p2.x,
              y: segmentInfo.p1.y + moveY
            };

            console.log('New waypoints:', wp1, wp2);

            // Insert the waypoints at the appropriate position
            if (segmentInfo.segmentIndex === 0) {
              // First segment (between start and first waypoint or end)
              waypoints = [wp1, wp2, ...waypoints];
            } else {
              // Insert after the previous waypoint
              waypoints.splice(segmentInfo.segmentIndex, 0, wp1, wp2);
            }

            // Update the connection
            console.log('Updating connection with new waypoints:', waypoints);
            bpmnStore.updateElement(connection.id, { waypoints });

            // Mark that we've created the waypoints
            window.waypointCreated = true;
            window.waypointIndices = {
              first: segmentInfo.segmentIndex === 0 ? 0 : segmentInfo.segmentIndex,
              second: segmentInfo.segmentIndex === 0 ? 1 : segmentInfo.segmentIndex + 1
            };
          }
          // If waypoints are already created, update their positions
          else if (window.waypointCreated && window.waypointIndices) {
            console.log('Updating existing waypoint positions');

            // Update both waypoints to maintain the horizontal segment
            if (window.waypointIndices.first < waypoints.length &&
                window.waypointIndices.second < waypoints.length) {

              waypoints[window.waypointIndices.first].y = segmentInfo.p1.y + moveY;
              waypoints[window.waypointIndices.second].y = segmentInfo.p1.y + moveY;

              // Update the connection
              console.log('Updating connection with moved waypoints:', waypoints);
              bpmnStore.updateElement(connection.id, { waypoints });
            }
          }
        }
      }
      else if (segmentInfo.isVertical) {
        // For vertical segments, only move horizontally
        const moveX = snapToGrid(totalDx, 20);
        console.log('Vertical segment, horizontal move:', moveX);

        // Only create waypoints if the movement is significant
        if (Math.abs(moveX) >= 20) {
          // Create two new waypoints to maintain the vertical segment length
          if (!window.waypointCreated) {
            console.log('Creating new waypoints for vertical segment');

            // Create two waypoints to form a detour
            // For vertical segments, we need to maintain the y-coordinates
            // but adjust the x-coordinates
            const wp1 = {
              x: segmentInfo.p1.x + moveX,
              y: segmentInfo.p1.y
            };

            const wp2 = {
              x: segmentInfo.p1.x + moveX,
              y: segmentInfo.p2.y
            };

            console.log('New waypoints:', wp1, wp2);

            // Insert the waypoints at the appropriate position
            if (segmentInfo.segmentIndex === 0) {
              // First segment (between start and first waypoint or end)
              waypoints = [wp1, wp2, ...waypoints];
            } else {
              // Insert after the previous waypoint
              waypoints.splice(segmentInfo.segmentIndex, 0, wp1, wp2);
            }

            // Update the connection
            console.log('Updating connection with new waypoints:', waypoints);
            bpmnStore.updateElement(connection.id, { waypoints });

            // Mark that we've created the waypoints
            window.waypointCreated = true;
            window.waypointIndices = {
              first: segmentInfo.segmentIndex === 0 ? 0 : segmentInfo.segmentIndex,
              second: segmentInfo.segmentIndex === 0 ? 1 : segmentInfo.segmentIndex + 1
            };
          }
          // If waypoints are already created, update their positions
          else if (window.waypointCreated && window.waypointIndices) {
            console.log('Updating existing waypoint positions');

            // Update both waypoints to maintain the vertical segment
            if (window.waypointIndices.first < waypoints.length &&
                window.waypointIndices.second < waypoints.length) {

              waypoints[window.waypointIndices.first].x = segmentInfo.p1.x + moveX;
              waypoints[window.waypointIndices.second].x = segmentInfo.p1.x + moveX;

              // Update the connection
              console.log('Updating connection with moved waypoints:', waypoints);
              bpmnStore.updateElement(connection.id, { waypoints });
            }
          }
        }
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
    console.log('Mouse up after drag');
    if (!isDragging) return;

    // Optimize waypoints for the connection that was being dragged
    if (dragConnectionId) {
      const connection = connections.find(c => c.id === dragConnectionId);
      if (connection && connection.waypoints && connection.waypoints.length > 0) {
        // Optimize the waypoints to remove unnecessary points
        const optimizedWaypoints = optimizeWaypoints(connection.waypoints);

        // Only update if the optimization actually changed something
        if (JSON.stringify(optimizedWaypoints) !== JSON.stringify(connection.waypoints)) {
          console.log('Optimizing waypoints:', {
            before: connection.waypoints.length,
            after: optimizedWaypoints.length,
            originalWaypoints: connection.waypoints,
            optimizedWaypoints: optimizedWaypoints
          });

          // Update the connection with optimized waypoints
          bpmnStore.updateElement(connection.id, { waypoints: optimizedWaypoints });
        }
      }
    }

    // Reset drag state
    isDragging = false;
    dragType = null;
    dragConnectionId = null;
    dragWaypointIndex = -1;
    originalWaypoints = [];

    // Clean up segment dragging state
    window.currentSegmentInfo = null;
    window.waypointCreated = false;
    window.waypointIndices = undefined;
    window.accumulatedDx = 0;
    window.accumulatedDy = 0;

    // Remove event listeners
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);

    console.log('Drag state reset');
  }

  // Add event listeners for mouse move and mouse up

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
    refX="5"
    refY="5"
    markerWidth="6"
    markerHeight="6"
    orient="auto"
  >
    <circle cx="5" cy="5" r="4" fill="white" stroke="#3498db" stroke-width="1" />
  </marker>

  <marker
    id="associationMarker"
    viewBox="0 0 10 10"
    refX="10"
    refY="5"
    markerWidth="5"
    markerHeight="5"
    orient="auto"
  >
    <path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="#999" stroke-width="1.5" />
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
      {start}
      {end}
      waypoints={connection.waypoints || []}
      onHandleDragStart={(segmentIndex, event) => handleSegmentHandleDragStart(id, segmentIndex, event)}
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

  .connection-handle {
    cursor: move;
  }

  .waypoint-handle {
    cursor: move;
  }
</style>
