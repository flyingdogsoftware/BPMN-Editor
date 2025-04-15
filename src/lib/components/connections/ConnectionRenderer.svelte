<script>
  import { calculateOrthogonalPath, adjustWaypoint, optimizeWaypoints, findBestConnectionPoint } from '../../utils/connectionRouting';
  import { calculateElementIntersection } from '../../utils/geometryUtils';
  import ConnectionSegment from './ConnectionSegment.svelte';
  import ConnectionLabel from './ConnectionLabel.svelte';
  import ConnectionEndpointHandle from './ConnectionEndpointHandle.svelte';
  import OptimizeConnectionButton from './OptimizeConnectionButton.svelte';

  // Props
  export let connections = [];
  export let elements = [];
  export let selectedConnectionId = null;
  export let onSelect = (id) => {};
  export let onContextMenu = (event, connection) => {};
  export let onEditLabel = (connection) => {};

  // Import necessary functions
  import { bpmnStore } from '../../stores/bpmnStore';
  import { snapToGrid } from '../../utils/gridUtils';
  import { onMount, onDestroy } from 'svelte';

  // State for dragging
  let isDragging = false;
  let dragType = null; // 'source', 'target', 'segment'
  let dragConnectionId = null;
  let dragStartX = 0;
  let dragStartY = 0;
  let originalWaypoints = [];

  // State for endpoint reconnection
  let potentialTargetElement = null;
  let isHoveringOverValidTarget = false;
  let hoverPosition = { x: 0, y: 0 };

  // Force recalculation of paths when connections change
  $: connectionPathsKey = JSON.stringify(connections.map(c => ({ id: c.id, waypoints: c.waypoints })));

  // Calculate connection paths
  $: connectionPaths = connectionPathsKey && connections.map(connection => {
    // Find source and target elements
    const source = elements.find(el => el.id === connection.sourceId);
    const target = elements.find(el => el.id === connection.targetId);

    if (!source || !target) return null;

    // Calculate source center position
    const sourceCenter = {
      x: source.x + source.width / 2,
      y: source.y + source.height / 2
    };

    // Calculate target center position
    const targetCenter = {
      x: target.x + target.width / 2,
      y: target.y + target.height / 2
    };

    // Check if we're currently dragging this connection
    const isDraggingThisConnection = isDragging && dragConnectionId === connection.id;

    // Special handling for event elements (circles) and gateways (diamonds) as targets
    let adjustedWaypoints = [...(connection.waypoints || [])];

    // For event elements and gateways, we need to ensure the connection approaches from the correct direction
    if ((target.type === 'event' || target.type === 'gateway') && adjustedWaypoints.length === 0) {
      // For direct connections, we need to ensure we approach from a cardinal direction
      const dx = targetCenter.x - sourceCenter.x;
      const dy = targetCenter.y - sourceCenter.y;

      // Determine if we should approach horizontally or vertically
      const approachHorizontally = Math.abs(dx) > Math.abs(dy);

      if (approachHorizontally) {
        // Add a waypoint that ensures we approach horizontally
        adjustedWaypoints = [
          { x: targetCenter.x, y: sourceCenter.y }
        ];
      } else {
        // Add a waypoint that ensures we approach vertically
        adjustedWaypoints = [
          { x: sourceCenter.x, y: targetCenter.y }
        ];
      }
    }

    // Get all points in the path
    const waypoints = adjustedWaypoints;

    // Calculate the actual start point (source connection point)
    let start;

    // If we're dragging the source endpoint of this connection, use the temporary source point
    if (isDraggingThisConnection && dragType === 'source' && connection.tempSourcePoint) {
      start = connection.tempSourcePoint;
    } else if (waypoints.length > 0) {
      // If there are waypoints, calculate the best connection point from source to first waypoint
      start = findBestConnectionPoint(source, waypoints[0]);
    } else {
      // If there are no waypoints, calculate the best connection point from source to target
      start = findBestConnectionPoint(source, targetCenter);
    }

    // All points in the path
    const allPoints = [start, ...waypoints, targetCenter];

    // Determine the last segment start point
    let lastSegmentStart;
    if (waypoints.length > 0) {
      // If there are waypoints, the last segment starts from the last waypoint
      lastSegmentStart = waypoints[waypoints.length - 1];
    } else {
      // For direct paths, determine the corner point based on the path calculation logic
      const dx = targetCenter.x - start.x;
      const dy = targetCenter.y - start.y;

      // If the points are aligned horizontally or vertically, use a direct line
      if (Math.abs(start.x - targetCenter.x) < 0.001 || Math.abs(start.y - targetCenter.y) < 0.001) {
        lastSegmentStart = start;
      } else {
        const goHorizontalFirst = Math.abs(dx) > Math.abs(dy);

        if (goHorizontalFirst) {
          lastSegmentStart = { x: targetCenter.x, y: start.y };
        } else {
          lastSegmentStart = { x: start.x, y: targetCenter.y };
        }
      }
    }

    // Calculate the intersection point with the target element's boundary
    let end;

    // If we're dragging the target endpoint of this connection, use the temporary target point
    if (isDraggingThisConnection && dragType === 'target' && connection.tempTargetPoint) {
      end = connection.tempTargetPoint;
    } else {
      // For all element types, use the utility function which has specialized handling for events
      end = calculateElementIntersection(lastSegmentStart, targetCenter, target);

      // For event elements and gateways, ensure the intersection point is correctly calculated
      if (target.type === 'event' || target.type === 'gateway') {
      // Calculate the direction vector from center to lastSegmentStart
      const dx = lastSegmentStart.x - targetCenter.x;
      const dy = lastSegmentStart.y - targetCenter.y;

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

        end = {
          x: targetCenter.x + nx * offsetRadius,
          y: targetCenter.y + ny * offsetRadius
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

        end = {
          x: targetCenter.x + nx * offsetDistance,
          y: targetCenter.y + ny * offsetDistance
        };
      }
    }
    }

    // Now calculate the path with the adjusted waypoints
    // but ending at the intersection point instead of the center
    let pathPoints;
    let path;

    // If we're dragging an endpoint, use a straight line
    if (isDraggingThisConnection && (dragType === 'source' || dragType === 'target')) {
      // Just use start and end points for a direct line
      pathPoints = [start, end];
      path = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
    } else {
      // Normal path calculation with waypoints
      pathPoints = [start, ...waypoints];
      pathPoints.push(end);

      // Generate the SVG path data
      path = `M ${start.x} ${start.y}`;

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
    }

    return {
      id: connection.id,
      path,
      connection,
      start,
      end, // Use the calculated end point as the visual end
      originalEnd: targetCenter, // Keep the original end for reference
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
    console.log('Connection clicked:', connectionId, 'Current selected:', selectedConnectionId);
    onSelect(connectionId);
    console.log('After selection, selected connection ID:', selectedConnectionId);
  }

  // Handle connection double-click
  function handleConnectionDoubleClick(event, connection) {
    event.stopPropagation();
    event.preventDefault();

    console.log('ConnectionRenderer: Double-click on connection', connection.id);

    // First try the direct method
    if (onEditLabel) {
      console.log('ConnectionRenderer: Calling onEditLabel directly');
      onEditLabel(connection);
    } else {
      // Fallback to custom event
      console.log('ConnectionRenderer: Using custom event fallback');
      const editEvent = new CustomEvent('edit-label', {
        detail: { connectionId: connection.id },
        bubbles: true
      });

      console.log('ConnectionRenderer: Dispatching edit-label event');
      document.dispatchEvent(editEvent);
    }
  }

  // Handle connection right-click
  function handleConnectionRightClick(event, connection) {
    event.preventDefault();
    event.stopPropagation();
    onContextMenu(event, connection);
  }

  // Handle drag start for connection endpoints
  function handleEndpointDragStart(event, connection, type) {
    event.stopPropagation();
    event.preventDefault();

    console.log(`Starting drag of ${type} endpoint for connection ${connection.id}`);
    console.log('Event details:', { clientX: event.clientX, clientY: event.clientY, offsetX: event.offsetX, offsetY: event.offsetY });

    isDragging = true;
    dragType = type;
    dragConnectionId = connection.id;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    originalWaypoints = [...(connection.waypoints || [])];

    // Reset potential target state
    potentialTargetElement = null;
    isHoveringOverValidTarget = false;

    // Add event listeners for mouse move and mouse up
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // Log the current state for debugging
    console.log('Drag state initialized:', { isDragging, dragType, dragConnectionId, dragStartX, dragStartY });
  }

  // Waypoint drag functionality removed

  // Handle drag start for segments (creating new waypoints)
  function handleSegmentDragStart(event, connection, index) {
    event.stopPropagation();
    event.preventDefault();

    isDragging = true;
    dragType = 'segment';
    dragConnectionId = connection.id;
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

    // No need to track waypoint index anymore

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

    // Log the current waypoints for debugging
    console.log('DEBUG: Current waypoints before drag:', JSON.stringify(connection.waypoints));

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
      // console.log('Not dragging or no dragConnectionId');
      return;
    }

    console.log('Mouse move during drag:', {
      dragType,
      dragConnectionId,
      clientX: event.clientX,
      clientY: event.clientY,
      offsetX: event.offsetX,
      offsetY: event.offsetY
    });

    const connection = connections.find(c => c.id === dragConnectionId);
    if (!connection) {
      console.error('Connection not found during drag:', dragConnectionId);
      return;
    }

    const dx = event.clientX - dragStartX;
    const dy = event.clientY - dragStartY;
    console.log('Movement delta:', { dx, dy });

    // Update the drag start position
    dragStartX = event.clientX;
    dragStartY = event.clientY;

    // Current mouse position in SVG coordinates
    const mousePosition = {
      x: event.offsetX,
      y: event.offsetY
    };

    // Store the current hover position
    hoverPosition = mousePosition;
    console.log('Current hover position:', hoverPosition);

    // Handle different drag types
    if (dragType === 'segment') {
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
      // Check if we're hovering over a valid target element
      potentialTargetElement = null;
      isHoveringOverValidTarget = false;

      // Find potential target elements (excluding the current connection and the element at the other end)
      const otherEndId = dragType === 'source' ? connection.targetId : connection.sourceId;

      // Find elements under the mouse position
      for (const element of elements) {
        // Skip connections and the element at the other end
        if (element.type === 'connection' || element.id === otherEndId) {
          continue;
        }

        // Check if mouse is over this element
        if (isPointInElement(hoverPosition, element)) {
          potentialTargetElement = element;
          isHoveringOverValidTarget = true;
          break;
        }
      }

      // Update the waypoints to show the connection being dragged
      const waypoints = [...(connection.waypoints || [])];

      // Get the source and target elements
      const source = elements.find(el => el.id === connection.sourceId);
      const target = elements.find(el => el.id === connection.targetId);

      if (!source || !target) {
        console.error('Source or target element not found');
        return;
      }

      // Calculate centers
      const sourceCenter = {
        x: source.x + source.width / 2,
        y: source.y + source.height / 2
      };

      const targetCenter = {
        x: target.x + target.width / 2,
        y: target.y + target.height / 2
      };

      // Store the original waypoints if we haven't already
      if (!connection.originalWaypoints) {
        bpmnStore.updateElement(connection.id, { originalWaypoints: [...waypoints] });
      }

      // During dragging, we'll use a temporary straight line instead of modifying the routing
      // We'll just update a temporary property to show the drag position
      if (dragType === 'source') {
        // If we have a potential target, use its best connection point
        if (potentialTargetElement) {
          const bestPoint = findBestConnectionPoint(potentialTargetElement, targetCenter);
          bpmnStore.updateElement(connection.id, { tempSourcePoint: bestPoint });
        } else {
          // Otherwise, follow the mouse
          const mousePoint = {
            x: snapToGrid(hoverPosition.x, 20),
            y: snapToGrid(hoverPosition.y, 20)
          };
          bpmnStore.updateElement(connection.id, { tempSourcePoint: mousePoint });
        }
      }
      // If we're dragging the target endpoint
      else if (dragType === 'target') {
        // If we have a potential target, use its best connection point
        if (potentialTargetElement) {
          const bestPoint = findBestConnectionPoint(potentialTargetElement, sourceCenter);
          bpmnStore.updateElement(connection.id, { tempTargetPoint: bestPoint });
        } else {
          // Otherwise, follow the mouse
          const mousePoint = {
            x: snapToGrid(hoverPosition.x, 20),
            y: snapToGrid(hoverPosition.y, 20)
          };
          bpmnStore.updateElement(connection.id, { tempTargetPoint: mousePoint });
        }
      }
    }
  }

  // Handle mouse up after drag
  function handleMouseUp() {
    console.log('Mouse up after drag');
    if (!isDragging) return;

    // Store the connection ID for optimization after drag
    const connectionToOptimize = dragConnectionId;

    // Handle endpoint reconnection
    if ((dragType === 'source' || dragType === 'target') && potentialTargetElement && isHoveringOverValidTarget) {
      const connection = connections.find(c => c.id === dragConnectionId);
      if (connection) {
        console.log(`Reconnecting ${dragType} of connection ${connection.id} to element ${potentialTargetElement.id}`);

        // Update the connection's source or target
        if (dragType === 'source') {
          bpmnStore.updateElement(connection.id, { sourceId: potentialTargetElement.id });
        } else {
          bpmnStore.updateElement(connection.id, { targetId: potentialTargetElement.id });
        }

        // Clear temporary points
        bpmnStore.updateElement(connection.id, {
          tempSourcePoint: null,
          tempTargetPoint: null,
          originalWaypoints: null
        });

        // Force recalculation of the path using the default routing
        // This is the same as when a user creates a new connection
        const source = elements.find(el => el.id === (dragType === 'source' ? potentialTargetElement.id : connection.sourceId));
        const target = elements.find(el => el.id === (dragType === 'target' ? potentialTargetElement.id : connection.targetId));

        if (source && target) {
          // Calculate source and target centers
          const sourceCenter = {
            x: source.x + source.width / 2,
            y: source.y + source.height / 2
          };

          const targetCenter = {
            x: target.x + target.width / 2,
            y: target.y + target.height / 2
          };

          // Calculate default waypoints based on the centers
          const dx = targetCenter.x - sourceCenter.x;
          const dy = targetCenter.y - sourceCenter.y;

          // Determine if we should go horizontal or vertical first
          const goHorizontalFirst = Math.abs(dx) > Math.abs(dy);

          let defaultWaypoints = [];

          // For non-trivial distances, add a waypoint to create an orthogonal path
          if (Math.abs(dx) > 10 && Math.abs(dy) > 10) {
            if (goHorizontalFirst) {
              defaultWaypoints = [{ x: targetCenter.x, y: sourceCenter.y }];
            } else {
              defaultWaypoints = [{ x: sourceCenter.x, y: targetCenter.y }];
            }
          }

          // Update the connection with the default waypoints
          bpmnStore.updateElement(connection.id, { waypoints: defaultWaypoints });
        }
      }
    } else {
      // If we didn't reconnect to a new element, restore the original waypoints
      if (dragConnectionId) {
        const connection = connections.find(c => c.id === dragConnectionId);
        if (connection) {
          // Restore original waypoints if they exist
          if (connection.originalWaypoints) {
            bpmnStore.updateElement(connection.id, {
              waypoints: [...connection.originalWaypoints],
              originalWaypoints: null,
              tempSourcePoint: null,
              tempTargetPoint: null
            });
          } else {
            // Clear temporary points
            bpmnStore.updateElement(connection.id, {
              tempSourcePoint: null,
              tempTargetPoint: null
            });
          }
        }
      }
    }

    // Reset drag state
    isDragging = false;
    dragType = null;
    dragConnectionId = null;
    originalWaypoints = [];
    potentialTargetElement = null;
    isHoveringOverValidTarget = false;

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

    // Optimize the connection waypoints after a short delay to ensure all updates are complete
    if (connectionToOptimize) {
      setTimeout(() => {
        const connection = connections.find(c => c.id === connectionToOptimize);
        if (connection && connection.waypoints && connection.waypoints.length > 1) {
          console.log('DEBUG: Auto-optimizing connection after drag:', connectionToOptimize);
          const optimizedWaypoints = optimizeWaypoints(connection.waypoints);
          bpmnStore.updateConnectionWaypoints(connectionToOptimize, optimizedWaypoints);
        }
      }, 100); // Small delay to ensure the connection is fully updated
    }
  }

  // Helper function to check if a point is inside an element
  function isPointInElement(point, element) {
    if (!element || !('x' in element) || !('y' in element) ||
        !('width' in element) || !('height' in element)) {
      return false;
    }

    // For regular rectangular elements
    if (element.type !== 'gateway' && element.type !== 'event') {
      return point.x >= element.x && point.x <= element.x + element.width &&
             point.y >= element.y && point.y <= element.y + element.height;
    }

    // For circular events
    if (element.type === 'event') {
      const centerX = element.x + element.width / 2;
      const centerY = element.y + element.height / 2;
      const radius = element.width / 2;

      const dx = point.x - centerX;
      const dy = point.y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      return distance <= radius;
    }

    // For diamond-shaped gateways
    if (element.type === 'gateway') {
      const centerX = element.x + element.width / 2;
      const centerY = element.y + element.height / 2;

      // Transform to diamond coordinates
      const dx = Math.abs(point.x - centerX);
      const dy = Math.abs(point.y - centerY);

      // Check if point is inside the diamond
      return (dx / (element.width / 2) + dy / (element.height / 2)) <= 1;
    }

    return false;
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

<!-- Debug Optimize Button for selected connection -->
{#if selectedConnectionId}
  {#each connections.filter(c => c.id === selectedConnectionId) as selectedConnection}
    <OptimizeConnectionButton
      connectionId={selectedConnection.id}
      waypoints={selectedConnection.waypoints || []}
    />
  {/each}
{/if}

<!-- Render connections -->
{#each connectionPaths as { id, path, connection, start, end } (id)}
  <g
    class="connection"
    class:selected={id === selectedConnectionId || connection.isSelected}
    on:click={(e) => handleConnectionClick(e, id)}
    on:dblclick={(e) => handleConnectionDoubleClick(e, connection)}
    on:keydown={(e) => e.key === 'Enter' && handleConnectionClick(e, id)}
    on:contextmenu={(e) => handleConnectionRightClick(e, connection)}
    role="button"
    tabindex="0"
    aria-label="Connection between elements"
  >
    <ConnectionSegment
      {path}
      style={getConnectionStyle(connection)}
      isSelected={id === selectedConnectionId || connection.isSelected}
      {start}
      {end}
      waypoints={connection.waypoints || []}
      onHandleDragStart={(segmentIndex, event) => handleSegmentHandleDragStart(id, segmentIndex, event)}
      onDoubleClick={(e) => handleConnectionDoubleClick(e, connection)}
    />

    <!-- Connection Label -->
    <ConnectionLabel
      {connection}
      isSelected={id === selectedConnectionId || connection.isSelected}
      {onEditLabel}
    />

    <!-- Connection endpoint handles (always visible when selected) -->
    {#if id === selectedConnectionId || connection.isSelected}
      <!-- Source handle -->
      <g class="endpoint-container source">
        <ConnectionEndpointHandle
          x={start.x}
          y={start.y}
          isSource={true}
          isVisible={true}
          on:dragStart={(e) => handleEndpointDragStart(e.detail.event, connection, 'source')}
        />
      </g>

      <!-- Target handle -->
      <g class="endpoint-container target">
        <ConnectionEndpointHandle
          x={end.x}
          y={end.y}
          isSource={false}
          isVisible={true}
          on:dragStart={(e) => handleEndpointDragStart(e.detail.event, connection, 'target')}
        />
      </g>

      <!-- Waypoint handles removed -->
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

  /* Waypoint handle styles removed */
</style>
