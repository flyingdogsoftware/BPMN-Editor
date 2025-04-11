<script>
  import { bpmnStore } from '$lib/stores/bpmnStore';
  import { snapPositionToGrid } from '$lib/utils/gridUtils';
  import { isValidConnection, calculateConnectionPoints } from '$lib/utils/connectionUtils';
  import { onMount } from 'svelte';
  import ConnectionPoint from './ConnectionPoint.svelte';
  import ConnectionPreview from './ConnectionPreview.svelte';
  import Connection from './Connection.svelte';
  import LabelEditDialog from './LabelEditDialog.svelte';

  // Listen for edit-label events from Connection components
  onMount(() => {
    document.addEventListener('edit-label', handleEditLabelEvent);

    return () => {
      document.removeEventListener('edit-label', handleEditLabelEvent);
    };
  });

  // Handle edit-label events from Connection components
  function handleEditLabelEvent(event) {
    console.log('BpmnEditor: Received edit-label event', event.detail);
    const connectionId = event.detail.connectionId;
    const connection = $bpmnStore.find(el => el.id === connectionId);

    if (connection) {
      console.log('BpmnEditor: Found connection, opening label dialog', connection);
      openLabelDialog(connection, connection.connectionType === 'sequence');
    }
  }

  // Canvas dimensions
  let canvasWidth = 800;
  let canvasHeight = 600;

  // Grid size for snapping
  const gridSize = 20;

  // Dragging state
  let isDragging = false;
  let draggedElementId = null;
  let dragStartX = 0;
  let dragStartY = 0;
  let elementStartX = 0;
  let elementStartY = 0;

  // Connection state
  let isCreatingConnection = false;
  let isAdjustingConnectionEndpoint = false;
  let connectionStartPoint = null;
  let connectionEndPosition = null;
  let connectionPreviewValid = true;
  let showConnectionPoints = false;
  let highlightedConnectionPoints = [];

  // Label editing state
  let isLabelDialogOpen = false;
  let currentEditingConnection = null;
  let currentEditingNode = null;
  let currentLabelText = '';

  // Helper function to check if element is a node (task, event, gateway)
  function isNode(element) {
    return element.type === 'task' || element.type === 'event' || element.type === 'gateway';
  }

  // Get all connection points for all elements
  function getAllConnectionPoints() {
    const points = [];

    $bpmnStore.forEach((element) => {
      if (isNode(element)) {
        const elementPoints = calculateConnectionPoints(element);
        points.push(...elementPoints);
      }
    });

    return points;
  }

  // Add a new task
  function addTask() {
    const newTask = {
      id: `task-${Date.now()}`,
      type: 'task',
      label: 'New Task',
      x: 200,
      y: 200,
      width: 120,
      height: 80,
      taskType: 'user'
    };
    bpmnStore.addElement(newTask);
  }

  // Add a new event
  function addEvent() {
    const newEvent = {
      id: `event-${Date.now()}`,
      type: 'event',
      label: 'New Event',
      x: 400,
      y: 200,
      width: 36,
      height: 36,
      eventType: 'start',
      eventDefinition: 'none'
    };
    bpmnStore.addElement(newEvent);
  }

  // Add a new gateway
  function addGateway() {
    const newGateway = {
      id: `gateway-${Date.now()}`,
      type: 'gateway',
      label: 'New Gateway',
      x: 300,
      y: 300,
      width: 50,
      height: 50,
      gatewayType: 'exclusive'
    };
    bpmnStore.addElement(newGateway);
  }

  // Start dragging an element
  function handleMouseDown(event, element) {
    // Only handle left mouse button
    if (event.button !== 0) return;

    event.preventDefault();

    // If we're creating a connection, don't start dragging
    if (isCreatingConnection) return;

    isDragging = true;
    draggedElementId = element.id;

    // Store the initial mouse position
    dragStartX = event.clientX;
    dragStartY = event.clientY;

    // Store the initial element position
    if (isNode(element)) {
      elementStartX = element.x;
      elementStartY = element.y;
    }

    // Add event listeners for mouse move and mouse up
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  // Handle keyboard events for accessibility
  function handleKeyDown(event, element) {
    // Only handle node elements (not connections)
    if (!isNode(element)) return;

    // Handle different key presses
    const moveDistance = event.shiftKey ? 10 : 20; // Smaller steps with Shift key

    if (event.key === 'Enter' || event.key === ' ') {
      // Enter or Space key - toggle selection
      event.preventDefault();

      // Toggle selection
      if (draggedElementId === element.id) {
        draggedElementId = null;
      } else {
        draggedElementId = element.id;
        elementStartX = element.x;
        elementStartY = element.y;
      }
    } else if (event.key === 'ArrowUp') {
      // Move up
      event.preventDefault();
      bpmnStore.updateElement(element.id, { y: element.y - moveDistance });
    } else if (event.key === 'ArrowDown') {
      // Move down
      event.preventDefault();
      bpmnStore.updateElement(element.id, { y: element.y + moveDistance });
    } else if (event.key === 'ArrowLeft') {
      // Move left
      event.preventDefault();
      bpmnStore.updateElement(element.id, { x: element.x - moveDistance });
    } else if (event.key === 'ArrowRight') {
      // Move right
      event.preventDefault();
      bpmnStore.updateElement(element.id, { x: element.x + moveDistance });
    }
  }

  // Handle mouse movement during drag
  function handleMouseMove(event) {
    if (isCreatingConnection && connectionStartPoint) {
      // Update the end position of the connection preview
      connectionEndPosition = { x: event.offsetX, y: event.offsetY };

      // Check if the mouse is over a valid connection point
      const points = getAllConnectionPoints();
      const targetPoint = points.find(p => {
        const dx = p.x - event.offsetX;
        const dy = p.y - event.offsetY;
        return Math.sqrt(dx * dx + dy * dy) < 10; // Within 10px radius
      });

      if (targetPoint) {
        // Snap to the connection point
        connectionEndPosition = { x: targetPoint.x, y: targetPoint.y };

        // Check if this would be a valid connection
        const sourceElement = $bpmnStore.find(el => el.id === connectionStartPoint?.elementId);
        const targetElement = $bpmnStore.find(el => el.id === targetPoint.elementId);

        if (sourceElement && targetElement) {
          // Check if a connection already exists between these elements
          const existingConnection = $bpmnStore.find(el =>
            el.type === 'connection' &&
            ((el.sourceId === sourceElement.id && el.targetId === targetElement.id) ||
             (el.sourceId === targetElement.id && el.targetId === sourceElement.id))
          );

          connectionPreviewValid =
            sourceElement.id !== targetElement.id && // Can't connect to self
            isValidConnection(sourceElement.type, targetElement.type) &&
            !existingConnection; // Can't create duplicate connections
        } else {
          connectionPreviewValid = false;
        }
      } else {
        connectionPreviewValid = false;
      }
    } else if (isDragging && draggedElementId) {
      // Calculate the distance moved
      const dx = event.clientX - dragStartX;
      const dy = event.clientY - dragStartY;

      // Calculate new position
      const newX = elementStartX + dx;
      const newY = elementStartY + dy;

      // Update the element position in the store (without snapping during drag for smooth movement)
      bpmnStore.updateElement(draggedElementId, { x: newX, y: newY });
    }
  }

  // End dragging
  function handleMouseUp() {
    if (isCreatingConnection && connectionStartPoint && connectionEndPosition) {
      // Check if we're over a valid connection point
      const points = getAllConnectionPoints();
      const targetPoint = connectionEndPosition ? points.find(p => {
        const dx = p.x - connectionEndPosition.x;
        const dy = p.y - connectionEndPosition.y;
        return Math.sqrt(dx * dx + dy * dy) < 10; // Within 10px radius
      }) : null;

      if (targetPoint && connectionPreviewValid && connectionStartPoint) {
        // Create a new connection
        const sourceElement = $bpmnStore.find(el => el.id === connectionStartPoint.elementId);
        const targetElement = $bpmnStore.find(el => el.id === targetPoint.elementId);

        if (sourceElement && targetElement) {
          // Check if a connection already exists between these elements
          const existingConnection = $bpmnStore.find(el =>
            el.type === 'connection' &&
            ((el.sourceId === sourceElement.id && el.targetId === targetElement.id) ||
             (el.sourceId === targetElement.id && el.targetId === sourceElement.id))
          );

          // Only create a new connection if one doesn't already exist
          if (!existingConnection) {
            const newConnection = {
              id: `connection-${Date.now()}`,
              type: 'connection',
              label: '',
              sourceId: sourceElement.id,
              targetId: targetElement.id,
              sourcePointId: connectionStartPoint.id,
              targetPointId: targetPoint.id,
              connectionType: 'sequence', // Default to sequence flow
              waypoints: [] // Empty waypoints to let the orthogonal path calculation handle it
            };

            bpmnStore.addConnection(newConnection);
          }
        }
      }

      // Reset connection creation state
      isCreatingConnection = false;
      connectionStartPoint = null;
      connectionEndPosition = null;
    } else if (isDragging && draggedElementId) {
      // Find the element that was being dragged
      const element = $bpmnStore.find(el => el.id === draggedElementId);

      if (element && isNode(element)) {
        // Snap the final position to the grid
        const [snappedX, snappedY] = snapPositionToGrid(element.x, element.y, gridSize);

        // Update the element with the snapped position
        bpmnStore.updateElement(draggedElementId, { x: snappedX, y: snappedY });
      }
    }

    // Reset dragging state
    isDragging = false;
    draggedElementId = null;

    // Remove event listeners
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }

  // Start creating a connection
  function handleConnectionPointMouseDown(event, point) {
    event.stopPropagation();
    event.preventDefault();

    isCreatingConnection = true;
    connectionStartPoint = point;
    connectionEndPosition = { x: point.x, y: point.y };

    // Add event listeners for mouse move and mouse up
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  // Toggle connection selection
  function handleConnectionSelect(id) {
    bpmnStore.toggleConnectionSelection(id);
  }

  // Add condition to selected connection
  function addConditionToSelectedConnection() {
    const selectedConnection = connections.find(c => c.isSelected);

    if (selectedConnection && selectedConnection.connectionType === 'sequence') {
      openLabelDialog(selectedConnection, true);
    }
  }

  // Label dialog functions
  function openLabelDialog(element, isCondition = false) {
    console.log('BpmnEditor: openLabelDialog called for element', element.id);

    if (element.type === 'connection') {
      currentEditingConnection = element;
      currentEditingNode = null;
    } else if (isNode(element)) {
      currentEditingNode = element;
      currentEditingConnection = null;
    } else {
      console.error('BpmnEditor: Unknown element type', element.type);
      return;
    }

    currentLabelText = element.label || '';
    isLabelDialogOpen = true;
    console.log('BpmnEditor: isLabelDialogOpen set to', isLabelDialogOpen);
  }

  function handleLabelSave(text) {
    if (currentEditingConnection) {
      if (currentEditingConnection.connectionType === 'sequence' &&
          currentEditingConnection.condition !== undefined) {
        // This is a condition expression
        bpmnStore.updateConnectionCondition(currentEditingConnection.id, text);

        // If there's no label yet, add a default one
        if (!currentEditingConnection.label) {
          bpmnStore.updateConnectionLabel(currentEditingConnection.id, text);
        }
      } else {
        // This is a regular label
        bpmnStore.updateConnectionLabel(currentEditingConnection.id, text);
      }
      closeLabelDialog();
    } else if (currentEditingNode) {
      // Update node label
      bpmnStore.updateNodeLabel(currentEditingNode.id, text);
      closeLabelDialog();
    }
  }

  function closeLabelDialog() {
    isLabelDialogOpen = false;
    currentEditingConnection = null;
    currentEditingNode = null;
    currentLabelText = '';
  }

  // Handle double-click on a node to edit its label
  function handleNodeDoubleClick(element) {
    if (isNode(element)) {
      openLabelDialog(element);
    }
  }

  // Start adjusting a connection endpoint
  function handleConnectionEndpointAdjustment(isAdjusting) {
    isAdjustingConnectionEndpoint = isAdjusting;

    // If we're starting to adjust, show all connection points
    if (isAdjusting) {
      showConnectionPoints = true;
    } else {
      // Reset to previous state when done
      showConnectionPoints = false;
    }
  }

  // Toggle connection points visibility
  function toggleConnectionPoints() {
    showConnectionPoints = !showConnectionPoints;
  }

  // This function is used for connection creation and preview
  // The actual connection points for rendering are calculated on-the-fly

  // Filter connections
  $: connections = $bpmnStore.filter(el => el.type === 'connection');

  // Get source and target positions for connections
  $: connectionPositions = connections.map(connection => {
    // Find the source and target elements
    const sourceElement = $bpmnStore.find(el => el.id === connection.sourceId);
    const targetElement = $bpmnStore.find(el => el.id === connection.targetId);

    // Calculate current connection points for these elements
    let sourcePoints = [];
    let targetPoints = [];

    if (sourceElement && sourceElement.type !== 'connection') {
      sourcePoints = calculateConnectionPoints(sourceElement);
    }

    if (targetElement && targetElement.type !== 'connection') {
      targetPoints = calculateConnectionPoints(targetElement);
    }

    // Find the specific connection points by ID
    const sourcePoint = sourcePoints.find(p => p.id === connection.sourcePointId);
    const targetPoint = targetPoints.find(p => p.id === connection.targetPointId);

    return {
      id: connection.id,
      source: sourcePoint ? { x: sourcePoint.x, y: sourcePoint.y } : { x: 0, y: 0 },
      target: targetPoint ? { x: targetPoint.x, y: targetPoint.y } : { x: 0, y: 0 }
    };
  });
</script>

<div class="bpmn-editor">
  <div class="toolbar">
    <button on:click={addTask}>Add Task</button>
    <button on:click={addEvent}>Add Event</button>
    <button on:click={addGateway}>Add Gateway</button>
    <button on:click={toggleConnectionPoints}>
      {showConnectionPoints ? 'Hide Connection Points' : 'Show Connection Points'}
    </button>
    <button on:click={addConditionToSelectedConnection} disabled={!connections.some(c => c.isSelected && c.connectionType === 'sequence')}>
      Add Condition
    </button>
    <button on:click={() => bpmnStore.reset()}>Reset</button>
  </div>

  <div class="canvas-container" id="canvas-container">
    <svg width={canvasWidth} height={canvasHeight} class="canvas">
      <!-- Draw grid -->
      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="gray" stroke-width="0.5" />
      </pattern>
      <rect width="100%" height="100%" fill="url(#grid)" />

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

      <!-- Draw connections -->
      {#each connections as connection (connection.id)}
        {#if connection.type === 'connection'}
          {@const posInfo = connectionPositions.find(p => p.id === connection.id)}
          {#if posInfo}
            <Connection
              connection={connection}
              sourcePosition={posInfo.source}
              targetPosition={posInfo.target}
              onSelect={handleConnectionSelect}
              onEndpointAdjustment={handleConnectionEndpointAdjustment}
              onEditLabel={(conn) => openLabelDialog(conn)}
            />
          {/if}
        {/if}
      {/each}

      <!-- Draw BPMN elements -->
      {#each $bpmnStore as element (element.id)}
        {#if isNode(element)}
          <!-- Group for each element to handle events together -->
          <g
            class="bpmn-element {draggedElementId === element.id ? 'dragging' : ''}"
            on:mousedown={e => handleMouseDown(e, element)}
            on:dblclick={() => handleNodeDoubleClick(element)}
            on:keydown={e => handleKeyDown(e, element)}
            role="button"
            tabindex="0"
            aria-label="Draggable {element.type} element: {element.label}"
          >
            {#if element.type === 'task'}
              <rect
                x={element.x}
                y={element.y}
                width={element.width}
                height={element.height}
                rx="5"
                ry="5"
                fill="white"
                stroke="black"
                stroke-width="2"
                class="element-shape"
              />
              <!-- Internal label for the task -->
              <text
                x={element.x + element.width/2}
                y={element.y + element.height/2}
                text-anchor="middle"
                dominant-baseline="middle"
                pointer-events="none"
              >
                {element.label}
              </text>
            {:else if element.type === 'event'}
              <circle
                cx={element.x + element.width/2}
                cy={element.y + element.height/2}
                r={element.width/2}
                fill="white"
                stroke="black"
                stroke-width="2"
                class="element-shape"
              />
              <text
                x={element.x + element.width/2}
                y={element.y + element.height/2 + 30}
                text-anchor="middle"
                pointer-events="none"
              >
                {element.label}
              </text>
            {:else if element.type === 'gateway'}
              <!-- Draw diamond shape for gateway -->
              <polygon
                points="
                  {element.x + element.width/2},{element.y}
                  {element.x + element.width},{element.y + element.height/2}
                  {element.x + element.width/2},{element.y + element.height}
                  {element.x},{element.y + element.height/2}
                "
                fill="white"
                stroke="black"
                stroke-width="2"
                class="element-shape"
              />
              <text
                x={element.x + element.width/2}
                y={element.y + element.height + 20}
                text-anchor="middle"
                pointer-events="none"
              >
                {element.label}
              </text>
            {/if}

            <!-- Connection points -->
            {#if showConnectionPoints || isCreatingConnection}
              {#each calculateConnectionPoints(element) as point (point.id)}
                <ConnectionPoint
                  point={point}
                  isVisible={showConnectionPoints}
                  isHighlighted={isAdjustingConnectionEndpoint}
                  onMouseDown={handleConnectionPointMouseDown}
                />
              {/each}
            {/if}
          </g>
        {/if}
      {/each}

      <!-- Connection preview -->
      {#if isCreatingConnection && connectionStartPoint && connectionEndPosition}
        <ConnectionPreview
          startPosition={{ x: connectionStartPoint.x, y: connectionStartPoint.y }}
          endPosition={connectionEndPosition}
          isValid={connectionPreviewValid}
        />
      {/if}
    </svg>
  </div>

  <!-- Label Edit Dialog -->
  <LabelEditDialog
    isOpen={isLabelDialogOpen}
    label={currentLabelText}
    isCondition={currentEditingConnection?.connectionType === 'sequence' && currentEditingConnection?.condition !== undefined}
    on:save={(e) => handleLabelSave(e.detail)}
    on:close={closeLabelDialog}
  />
</div>

<style>
  .bpmn-editor {
    display: flex;
    flex-direction: column;
    border: 1px solid #ccc;
    border-radius: 4px;
    overflow: hidden;
  }

  .toolbar {
    display: flex;
    gap: 8px;
    padding: 8px;
    background-color: #f0f0f0;
    border-bottom: 1px solid #ccc;
  }

  .toolbar button {
    padding: 6px 12px;
    background-color: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    cursor: pointer;
  }

  .toolbar button:hover {
    background-color: #e0e0e0;
  }

  .canvas-container {
    overflow: auto;
    background-color: #f9f9f9;
  }

  .canvas {
    min-width: 100%;
    min-height: 600px;
  }

  /* Element styling */
  .bpmn-element {
    cursor: move;
  }

  .bpmn-element.dragging {
    opacity: 0.8;
  }

  .bpmn-element.dragging .element-shape {
    stroke: #3498db;
    stroke-width: 3px;
  }

  .element-shape:hover {
    stroke: #2980b9;
    stroke-width: 2.5px;
  }
</style>
