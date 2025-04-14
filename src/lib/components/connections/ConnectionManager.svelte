<script>
  import { bpmnStore } from '../../stores/bpmnStore';
  import { calculateOrthogonalPath, findBestConnectionPoint } from '../../utils/connectionRouting';
  import ConnectionRenderer from './ConnectionRenderer.svelte';
  import ConnectionContextMenu from './ConnectionContextMenu.svelte';

  // Props
  export let onEditLabel = (connection) => {};

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
    selectedConnectionId = connectionId === selectedConnectionId ? null : connectionId;
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
      // Create a new connection
      const newConnection = {
        id: `connection-${Date.now()}`,
        type: 'connection',
        label: '',
        sourceId: source.id,
        targetId: target.id,
        connectionType: 'sequence',
        waypoints: []
      };

      // Add the connection to the store
      bpmnStore.addConnection(newConnection);
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
    }

    hideContextMenu();
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
