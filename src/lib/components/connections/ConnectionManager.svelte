<script>
  import { bpmnStore } from '../../stores/bpmnStore';
  import { calculateOrthogonalPath, findBestConnectionPoint, removeNonCornerWaypoints } from '../../utils/connectionRouting';
  import ConnectionRenderer from './ConnectionRenderer.svelte';
  import ConnectionContextMenu from './ConnectionContextMenu.svelte';

  // Props
  export let onEditLabel = (connection) => {
    // Default implementation - dispatch a custom event
    const editEvent = new CustomEvent('edit-label', {
      detail: { connectionId: connection.id },
      bubbles: true
    });
    document.dispatchEvent(editEvent);
  };

  // State
  let selectedConnectionId = null;
  let isCreatingConnection = false;
  let sourceElement = null;
  let connectionPreview = null;
  let contextMenuPosition = { x: 0, y: 0 };
  let showContextMenu = false;
  let contextMenuConnection = null;

  // Filter connections from the store
  $: connections = $bpmnStore.filter(el => el.type === 'connection');

  // Get all elements that are not connections
  $: elements = $bpmnStore.filter(el => el.type !== 'connection');

  // Handle connection selection
  function handleConnectionSelect(connectionId) {
    console.log('ConnectionManager: handleConnectionSelect called with', connectionId);
    console.log('ConnectionManager: current selectedConnectionId', selectedConnectionId);

    // Toggle selection
    if (connectionId === selectedConnectionId) {
      selectedConnectionId = null;
    } else {
      // Deselect any previously selected connection in the store
      connections.forEach(conn => {
        if (conn.isSelected) {
          bpmnStore.updateElement(conn.id, { isSelected: false });
        }
      });

      // Select the new connection
      selectedConnectionId = connectionId;
      bpmnStore.updateElement(connectionId, { isSelected: true });
    }

    console.log('ConnectionManager: new selectedConnectionId', selectedConnectionId);
  }

  // Start creating a connection from an element
  export function startConnectionCreation(element) {
    isCreatingConnection = true;
    sourceElement = element;
  }

  // Handle mouse move during connection creation
  function handleMouseMove(event) {
    if (!isCreatingConnection || !sourceElement) return;

    // Update the connection preview
    connectionPreview = {
      start: {
        x: sourceElement.x + sourceElement.width / 2,
        y: sourceElement.y + sourceElement.height / 2
      },
      end: {
        x: event.offsetX,
        y: event.offsetY
      }
    };
  }

  // Handle mouse up during connection creation
  function handleMouseUp(event) {
    if (!isCreatingConnection || !sourceElement) return;

    // Find the target element under the mouse
    const targetElement = findElementAtPosition(event.offsetX, event.offsetY);

    if (targetElement && targetElement.id !== sourceElement.id) {
      // Create a new connection
      createConnection(sourceElement, targetElement);
    }

    // Reset connection creation state
    isCreatingConnection = false;
    sourceElement = null;
    connectionPreview = null;
  }

  // Find an element at a specific position
  function findElementAtPosition(x, y) {
    return elements.find(element => {
      if (element.type === 'connection') return false;

      // Check if the point is inside the element
      return x >= element.x && x <= element.x + element.width &&
             y >= element.y && y <= element.y + element.height;
    });
  }

  // Create a new connection between two elements
  function createConnection(source, target) {
    // Find the best connection points
    const sourcePoint = findBestConnectionPoint(source, { x: target.x + target.width / 2, y: target.y + target.height / 2 });
    const targetPoint = findBestConnectionPoint(target, { x: source.x + source.width / 2, y: source.y + source.height / 2 });

    // Check if a connection already exists
    const existingConnection = connections.find(conn =>
      (conn.sourceId === source.id && conn.targetId === target.id) ||
      (conn.sourceId === target.id && conn.targetId === source.id)
    );

    if (!existingConnection) {
      // Calculate initial waypoints for better rendering
      // This helps ensure the connection is properly rendered from the start
      const sourceCenter = {
        x: source.x + source.width / 2,
        y: source.y + source.height / 2
      };

      const targetCenter = {
        x: target.x + target.width / 2,
        y: target.y + target.height / 2
      };

      // Determine if we should go horizontal or vertical first
      const dx = targetCenter.x - sourceCenter.x;
      const dy = targetCenter.y - sourceCenter.y;
      const goHorizontalFirst = Math.abs(dx) > Math.abs(dy);

      // Create initial waypoints based on routing strategy
      // For a proper L-shape, we need one waypoint
      let initialWaypoints = [];

      if (goHorizontalFirst) {
        // Horizontal first, then vertical
        initialWaypoints = [
          { x: targetCenter.x, y: sourceCenter.y }  // Corner point
        ];
      } else {
        // Vertical first, then horizontal
        initialWaypoints = [
          { x: sourceCenter.x, y: targetCenter.y }  // Corner point
        ];
      }

      // Create a new connection with initial waypoints
      const newConnection = {
        id: `connection-${Date.now()}`,
        type: 'connection',
        label: '',
        sourceId: source.id,
        targetId: target.id,
        connectionType: 'sequence',
        waypoints: initialWaypoints
      };

      // Add the connection to the store
      bpmnStore.addConnection(newConnection);

      // Force a refresh of the connection to ensure proper rendering
      // This is similar to what happens when an element is moved
      setTimeout(() => {
        // Make a copy of the waypoints to trigger a reactive update
        const refreshedWaypoints = [...initialWaypoints];
        bpmnStore.updateElement(newConnection.id, { waypoints: refreshedWaypoints });

        // Force another refresh after a short delay to ensure all calculations are complete
        setTimeout(() => {
          // This is the same pattern used when elements are moved
          const finalWaypoints = [...refreshedWaypoints];
          bpmnStore.updateElement(newConnection.id, { waypoints: finalWaypoints });
        }, 50);
      }, 10);
    }
  }

  // Show context menu for a connection
  function showConnectionContextMenu(event, connection) {
    event.preventDefault();
    event.stopPropagation();

    contextMenuPosition = { x: event.clientX, y: event.clientY };
    contextMenuConnection = connection;
    showContextMenu = true;
  }

  // Hide context menu
  function hideContextMenu() {
    showContextMenu = false;
    contextMenuConnection = null;
  }

  // Handle context menu actions
  function handleContextMenuAction(action) {
    if (!contextMenuConnection) return;

    switch (action) {
      case 'edit-label':
        onEditLabel(contextMenuConnection);
        break;
      case 'delete':
        bpmnStore.removeElement(contextMenuConnection.id);
        break;
      case 'change-type-sequence':
        bpmnStore.updateElement(contextMenuConnection.id, { connectionType: 'sequence' });
        break;
      case 'change-type-message':
        bpmnStore.updateElement(contextMenuConnection.id, { connectionType: 'message' });
        break;
      case 'change-type-association':
        bpmnStore.updateElement(contextMenuConnection.id, { connectionType: 'association' });
        break;
      case 'optimize':
        optimizeConnection(contextMenuConnection);
        break;
    }

    hideContextMenu();
  }

  // Function to optimize a connection by removing redundant waypoints
  function optimizeConnection(connection) {
    if (!connection || !connection.waypoints || connection.waypoints.length === 0) {
      console.error('Connection not found or has no waypoints');
      return;
    }

    // Get source and target elements
    const source = elements.find(el => el.id === connection.sourceId);
    const target = elements.find(el => el.id === connection.targetId);

    if (!source || !target) {
      console.error('Source or target element not found');
      return;
    }

    // Calculate source and target centers
    const sourceCenter = {
      x: source.x + source.width / 2,
      y: source.y + source.height / 2
    };

    const targetCenter = {
      x: target.x + target.width / 2,
      y: target.y + target.height / 2
    };

    console.log('DEBUG: Optimizing connection', connection.id);
    console.log('DEBUG: Original waypoints:', JSON.stringify(connection.waypoints));

    // Make a deep copy of the waypoints
    const waypoints = JSON.parse(JSON.stringify(connection.waypoints));

    // Use the simplified optimization function that ONLY removes redundant waypoints
    // without changing the path structure
    const optimized = removeNonCornerWaypoints(sourceCenter, targetCenter, waypoints);

    // Update the connection with the optimized waypoints
    bpmnStore.updateConnectionWaypoints(connection.id, optimized);

    // Force a refresh of the connection to ensure proper rendering
    setTimeout(() => {
      // This is a no-op update that forces a refresh
      bpmnStore.updateElement(connection.id, { isSelected: true });
      bpmnStore.updateElement(connection.id, { isSelected: selectedConnectionId === connection.id });
    }, 10);
  }

  // Add event listeners for mouse move and mouse up
  import { onMount, onDestroy } from 'svelte';

  // Check if we're in the browser
  const isBrowser = typeof window !== 'undefined';

  onMount(() => {
    if (isBrowser) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('click', hideContextMenu);
    }
  });

  onDestroy(() => {
    if (isBrowser) {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('click', hideContextMenu);
    }
  });
</script>

<!-- Connection Renderer -->
<ConnectionRenderer
  {connections}
  {elements}
  selectedConnectionId={selectedConnectionId}
  onSelect={handleConnectionSelect}
  onContextMenu={showConnectionContextMenu}
  {onEditLabel}
/>

<!-- Connection Preview -->
{#if isCreatingConnection && connectionPreview}
  <path
    d={calculateOrthogonalPath(connectionPreview.start, connectionPreview.end)}
    stroke="#3498db"
    stroke-width="2"
    stroke-dasharray="5,5"
    fill="none"
    pointer-events="none"
  />
{/if}

<!-- Context Menu -->
{#if showContextMenu && contextMenuConnection}
  <ConnectionContextMenu
    position={contextMenuPosition}
    connection={contextMenuConnection}
    onAction={handleContextMenuAction}
  />
{/if}

<style>
  /* Styles for the connection manager */
</style>
