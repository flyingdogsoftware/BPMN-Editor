<script>
  import { bpmnStore } from '$lib/stores/bpmnStore';
  import { snapPositionToGrid } from '$lib/utils/gridUtils';
  import { isValidConnection, calculateConnectionPoints } from '$lib/utils/connectionUtils';
  import { onMount } from 'svelte';
  import ConnectionPoint from './ConnectionPoint.svelte';
  import ConnectionPreview from './ConnectionPreview.svelte';
  import Connection from './Connection.svelte';
  import LabelEditDialog from './LabelEditDialog.svelte';
  import Toolbar from './toolbar/Toolbar.svelte';

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
  // These variables are used for storing original positions during drag
  let originalPositions = {}; // Store original positions of elements being moved together

  // Drop zone state
  let isDragOver = false;
  let dropX = 0;
  let dropY = 0;

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

  // Context menu state variables removed

  // Add lane button state
  let showAddLaneButton = null;

  // Helper function to check if element is a node (any element with position and size)
  function isNode(element) {
    return element.type === 'task' ||
           element.type === 'event' ||
           element.type === 'gateway' ||
           element.type === 'subprocess' ||
           element.type === 'callactivity' ||
           element.type === 'dataobject' ||
           element.type === 'datastore' ||
           element.type === 'textannotation' ||
           element.type === 'group' ||
           element.type === 'pool' ||
           element.type === 'lane' ||
           element.type === 'conversation' ||
           element.type === 'choreography';
  }

  // Helper function to check if an element is inside a pool
  function isElementInsidePool(element, pool) {
    if (!isNode(element) || !isNode(pool)) return false;

    // Check if the element is fully contained within the pool boundaries
    return element.x >= pool.x &&
           element.y >= pool.y &&
           element.x + element.width <= pool.x + pool.width &&
           element.y + element.height <= pool.y + pool.height;
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
  function addTask(taskType = 'user', x = 200, y = 200) {
    // Snap the position to grid
    const [snappedX, snappedY] = snapPositionToGrid(x, y);

    const newTask = {
      id: `task-${Date.now()}`,
      type: 'task',
      label: `${taskType.charAt(0).toUpperCase() + taskType.slice(1)} Task`,
      x: snappedX,
      y: snappedY,
      width: 120,
      height: 80,
      taskType: taskType
    };
    bpmnStore.addElement(newTask);
  }

  // Add a new event
  function addEvent(eventType = 'start', eventDefinition = 'none', x = 400, y = 200) {
    // Snap the position to grid
    const [snappedX, snappedY] = snapPositionToGrid(x, y);

    const newEvent = {
      id: `event-${Date.now()}`,
      type: 'event',
      label: `${eventDefinition.charAt(0).toUpperCase() + eventDefinition.slice(1)} ${eventType.charAt(0).toUpperCase() + eventType.slice(1)} Event`,
      x: snappedX,
      y: snappedY,
      width: 36,
      height: 36,
      eventType: eventType,
      eventDefinition: eventDefinition
    };
    bpmnStore.addElement(newEvent);
  }

  // Add a new gateway
  function addGateway(gatewayType = 'exclusive', x = 300, y = 300) {
    // Snap the position to grid
    const [snappedX, snappedY] = snapPositionToGrid(x, y);

    const newGateway = {
      id: `gateway-${Date.now()}`,
      type: 'gateway',
      label: `${gatewayType.charAt(0).toUpperCase() + gatewayType.slice(1)} Gateway`,
      x: snappedX,
      y: snappedY,
      width: 50,
      height: 50,
      gatewayType: gatewayType
    };
    bpmnStore.addElement(newGateway);
  }

  // Add a new subprocess
  function addSubProcess(subProcessType = 'embedded', x = 200, y = 300) {
    // Snap the position to grid
    const [snappedX, snappedY] = snapPositionToGrid(x, y);

    const newSubProcess = {
      id: `subprocess-${Date.now()}`,
      type: 'subprocess',
      label: `${subProcessType.charAt(0).toUpperCase() + subProcessType.slice(1)} SubProcess`,
      x: snappedX,
      y: snappedY,
      width: 180,
      height: 120,
      subProcessType: subProcessType,
      isExpanded: true,
      children: []
    };
    bpmnStore.addElement(newSubProcess);
  }

  // Add a new data object
  function addDataObject(isInput = false, isOutput = false, x = 500, y = 200) {
    // Snap the position to grid
    const [snappedX, snappedY] = snapPositionToGrid(x, y);

    const newDataObject = {
      id: `dataobject-${Date.now()}`,
      type: 'dataobject',
      label: isInput ? 'Data Input' : (isOutput ? 'Data Output' : 'Data Object'),
      x: snappedX,
      y: snappedY,
      width: 36,
      height: 50,
      isCollection: false,
      isInput: isInput,
      isOutput: isOutput
    };
    bpmnStore.addElement(newDataObject);
  }

  // Add a new data store
  function addDataStore(x = 500, y = 300) {
    // Snap the position to grid
    const [snappedX, snappedY] = snapPositionToGrid(x, y);

    const newDataStore = {
      id: `datastore-${Date.now()}`,
      type: 'datastore',
      label: 'Data Store',
      x: snappedX,
      y: snappedY,
      width: 50,
      height: 50,
      isCollection: false
    };
    bpmnStore.addElement(newDataStore);
  }

  // Add a new text annotation
  function addTextAnnotation(x = 600, y = 200) {
    // Snap the position to grid
    const [snappedX, snappedY] = snapPositionToGrid(x, y);

    const newTextAnnotation = {
      id: `annotation-${Date.now()}`,
      type: 'textannotation',
      label: 'Annotation',
      text: 'Text Annotation',
      x: snappedX,
      y: snappedY,
      width: 100,
      height: 80
    };
    bpmnStore.addElement(newTextAnnotation);
  }

  // Add a new pool
  function addPool(x = 100, y = 400) {
    // Snap the position to grid
    const [snappedX, snappedY] = snapPositionToGrid(x, y);

    // Create a default lane ID
    const laneId = `lane-${Date.now()}`;

    // Create a new pool with a default lane
    const newPool = {
      id: `pool-${Date.now()}`,
      type: 'pool',
      label: 'Pool',
      x: snappedX,
      y: snappedY,
      width: 600,
      height: 200,
      isHorizontal: true,
      lanes: [laneId]
    };

    // Create the default lane
    const defaultLane = {
      id: laneId,
      type: 'lane',
      label: 'Lane',
      x: snappedX + 30, // Account for pool label area
      y: snappedY,
      width: 570, // Pool width minus label area
      height: 200,
      isHorizontal: true,
      parentRef: newPool.id,
      heightPercentage: 100, // 100% of pool height
      flowNodeRefs: []
    };

    // Add both elements to the store
    bpmnStore.addElement(newPool);
    bpmnStore.addElement(defaultLane);
  }

  // Add a new lane to an existing pool
  function addLane(poolId, label = 'Lane') {
    // Find the pool
    const pool = $bpmnStore.find(el => el.id === poolId && el.type === 'pool');
    if (!pool) return;

    // Find existing lanes in this pool
    const existingLanes = $bpmnStore.filter(el =>
      el.type === 'lane' &&
      pool.lanes && pool.lanes.includes(el.id)
    );

    // Calculate the height for each lane (including the new one)
    const laneCount = existingLanes.length + 1;
    const laneHeight = pool.height / laneCount;

    // Create a new lane
    const newLane = {
      id: `lane-${Date.now()}`,
      type: 'lane',
      label: label,
      x: pool.x + 30, // Account for pool label area
      y: pool.y, // Will be set correctly below
      width: pool.width - 30, // Pool width minus label area
      height: laneHeight,
      isHorizontal: pool.isHorizontal,
      parentRef: pool.id,
      flowNodeRefs: []
    };

    // Update existing lanes to adjust their heights and positions
    existingLanes.forEach((lane, index) => {
      bpmnStore.updateElement(lane.id, {
        height: laneHeight,
        // Adjust y positions to stack lanes vertically
        y: pool.y + (index * laneHeight)
      });
    });

    // Position the new lane at the bottom
    newLane.y = pool.y + (existingLanes.length * laneHeight);

    // Add the new lane to the store
    bpmnStore.addElement(newLane);

    // Update the pool to include the new lane
    bpmnStore.updateElement(pool.id, {
      lanes: [...(pool.lanes || []), newLane.id]
    });
  }

  // Right-click handlers removed

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
      // Reset the original positions object
      originalPositions = {};

      // Store the original position of the dragged element
      originalPositions[element.id] = { x: element.x, y: element.y };

      // If this is a pool, store positions of all lanes and contained elements
      if (element.type === 'pool' && element.lanes && element.lanes.length > 0) {
        // Store positions of all lanes in this pool
        element.lanes.forEach(laneId => {
          const lane = $bpmnStore.find(el => el.id === laneId && el.type === 'lane');
          if (lane) {
            originalPositions[lane.id] = { x: lane.x, y: lane.y };
          }
        });

        // Store positions of all elements contained within the pool
        $bpmnStore.forEach(el => {
          if (isNode(el) && el.type !== 'pool' && el.type !== 'lane') {
            // Check if element is inside the pool
            if (isElementInsidePool(el, element)) {
              originalPositions[el.id] = { x: el.x, y: el.y };
            }
          }
        });
      }
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
        // Store original position for dragging
        originalPositions = {};
        originalPositions[element.id] = { x: element.x, y: element.y };
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

      // Get the element being dragged
      const element = $bpmnStore.find(el => el.id === draggedElementId);
      if (!element || !isNode(element)) return;

      // Get the original position of the dragged element
      const originalPos = originalPositions[draggedElementId];
      if (!originalPos) return;

      // Calculate the new position based on the original position and the drag distance
      const newX = originalPos.x + dx;
      const newY = originalPos.y + dy;

      // Update the element position in the store (without snapping during drag for smooth movement)
      bpmnStore.updateElement(draggedElementId, { x: newX, y: newY });

      // If this is a pool, also move all its lanes and contained elements
      if (element.type === 'pool' && element.lanes && element.lanes.length > 0) {
        // Move all lanes in this pool
        element.lanes.forEach(laneId => {
          const lane = $bpmnStore.find(el => el.id === laneId && el.type === 'lane');
          const laneOriginalPos = originalPositions[laneId];
          if (lane && laneOriginalPos) {

            // Move the lane based on its original position plus the drag distance
            bpmnStore.updateElement(lane.id, {
              x: laneOriginalPos.x + dx,
              y: laneOriginalPos.y + dy
            });
          }
        });

        // Move all elements contained within the pool
        $bpmnStore.forEach(el => {
          if (isNode(el) && el.type !== 'pool' && el.type !== 'lane') {
            const elOriginalPos = originalPositions[el.id];
            if (elOriginalPos) {
              // Move the element based on its original position plus the drag distance
              bpmnStore.updateElement(el.id, {
                x: elOriginalPos.x + dx,
                y: elOriginalPos.y + dy
              });
            }
          }
        });
      }
    }
  }

  // Handle drag over event for drop zone
  function handleDragOver(event) {
    // Prevent default to allow drop
    event.preventDefault();

    // Set the drop effect to copy
    event.dataTransfer.dropEffect = 'copy';

    // Update drop zone state
    isDragOver = true;

    // Update drop position for visual feedback
    const canvasRect = event.currentTarget.getBoundingClientRect();
    dropX = event.clientX - canvasRect.left;
    dropY = event.clientY - canvasRect.top;
  }

  // Handle drop event
  function handleDrop(event) {
    // Prevent default browser behavior
    event.preventDefault();

    // Reset drop zone state
    isDragOver = false;

    // Get the canvas position
    const canvasRect = event.currentTarget.getBoundingClientRect();
    const dropX = event.clientX - canvasRect.left;
    const dropY = event.clientY - canvasRect.top;
    console.log('Drop position:', { dropX, dropY });

    // Get the dropped element data
    console.log('BpmnEditor: Drop event triggered');
    console.log('BpmnEditor: Available data types:', event.dataTransfer.types);

    // Try different MIME types
    let elementData;
    try {
      elementData = event.dataTransfer.getData('application/bpmn-element');
      console.log('BpmnEditor: application/bpmn-element data:', elementData);
    } catch (error) {
      console.error('BpmnEditor: Error getting application/bpmn-element data:', error);
    }

    if (!elementData) {
      try {
        // Try text/plain as a fallback
        elementData = event.dataTransfer.getData('text/plain');
        console.log('BpmnEditor: text/plain fallback data:', elementData);
      } catch (error) {
        console.error('BpmnEditor: Error getting text/plain data:', error);
      }
    }

    console.log('BpmnEditor: Final element data received:', elementData);

    if (elementData) {
      try {
        // Parse the element data
        const element = JSON.parse(elementData);
        console.log('Parsed element:', element);

        // Create a new element at the drop position
        if (element.type === 'task') {
          addTask(element.subtype, dropX, dropY);
        } else if (element.type === 'event') {
          addEvent(element.subtype, element.eventDefinition || 'none', dropX, dropY);
        } else if (element.type === 'gateway') {
          addGateway(element.subtype, dropX, dropY);
        } else if (element.type === 'subprocess') {
          addSubProcess(element.subtype, dropX, dropY);
        } else if (element.type === 'dataobject') {
          if (element.subtype === 'input') {
            addDataObject(true, false, dropX, dropY);
          } else if (element.subtype === 'output') {
            addDataObject(false, true, dropX, dropY);
          } else {
            addDataObject(false, false, dropX, dropY);
          }
        } else if (element.type === 'datastore') {
          addDataStore(dropX, dropY);
        } else if (element.type === 'textannotation') {
          addTextAnnotation(dropX, dropY);
        } else if (element.type === 'pool') {
          addPool(dropX, dropY);
        } else if (element.type === 'lane') {
          // When dropping a lane directly, create a new pool with a lane
          addPool(dropX, dropY);
        }
      } catch (error) {
        console.error('Error parsing dropped element data:', error);
      }
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
        // Get the current position
        const currentX = element.x;
        const currentY = element.y;

        // Snap the final position to the grid
        const [snappedX, snappedY] = snapPositionToGrid(currentX, currentY, gridSize);

        // Update the element with the snapped position
        bpmnStore.updateElement(draggedElementId, { x: snappedX, y: snappedY });

        // If this is a pool, also update all its lanes and contained elements to maintain their relative positions
        if (element.type === 'pool' && element.lanes && element.lanes.length > 0) {
          // Calculate the offset from the current position to the snapped position
          const offsetX = snappedX - currentX;
          const offsetY = snappedY - currentY;

          // Update all lanes in this pool
          element.lanes.forEach(laneId => {
            const lane = $bpmnStore.find(el => el.id === laneId && el.type === 'lane');
            if (lane) {
              // Apply the same offset to the lane
              bpmnStore.updateElement(lane.id, {
                x: lane.x + offsetX,
                y: lane.y + offsetY
              });
            }
          });

          // Update all elements contained within the pool
          $bpmnStore.forEach(el => {
            if (isNode(el) && el.type !== 'pool' && el.type !== 'lane') {
              // Check if element is inside the pool
              if (isElementInsidePool(el, element)) {
                // Apply the same offset to the contained element
                bpmnStore.updateElement(el.id, {
                  x: el.x + offsetX,
                  y: el.y + offsetY
                });
              }
            }
          });
        }
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
  <Toolbar
    on:add={({detail}) => {
      // Get the current mouse position or use default position
      const x = detail.x || 300;
      const y = detail.y || 200;

      if (detail.type === 'task') {
        addTask(detail.subtype, x, y);
      } else if (detail.type === 'event') {
        addEvent(detail.subtype, detail.eventDefinition || 'none', x, y);
      } else if (detail.type === 'gateway') {
        addGateway(detail.subtype, x, y);
      } else if (detail.type === 'subprocess') {
        addSubProcess(detail.subtype, x, y);
      } else if (detail.type === 'dataobject') {
        if (detail.subtype === 'input') {
          addDataObject(true, false, x, y);
        } else if (detail.subtype === 'output') {
          addDataObject(false, true, x, y);
        } else {
          addDataObject(false, false, x, y);
        }
      } else if (detail.type === 'datastore') {
        addDataStore(x, y);
      } else if (detail.type === 'textannotation') {
        addTextAnnotation(x, y);
      } else if (detail.type === 'pool') {
        addPool(x, y);
      } else if (detail.type === 'lane') {
        addLane(x, y);
      }
    }}
    on:toggleConnectionPoints={toggleConnectionPoints}
    on:addCondition={addConditionToSelectedConnection}
    on:reset={() => bpmnStore.reset()}
  />

  <div
    class="canvas-container"
    id="canvas-container"
    role="region"
    aria-label="BPMN Editor Canvas"
    on:dragover={handleDragOver}
    on:drop={handleDrop}
    on:dragleave={() => isDragOver = false}
    class:drag-over={isDragOver}
  >
    {#if isDragOver}
      <div class="drop-indicator" style="left: {dropX}px; top: {dropY}px;"></div>
    {/if}
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

      <!-- Draw pools and lanes first (background) -->
      {#each $bpmnStore as element (element.id)}
        {#if element.type === 'pool' || element.type === 'lane'}
          <!-- Use a lower z-index for pools and lanes to ensure other elements appear on top -->
          <!-- Group for each element to handle events together -->
          <g
            class="bpmn-element {draggedElementId === element.id ? 'dragging' : ''}"
            data-element-type={element.type}
            on:mousedown={e => handleMouseDown(e, element)}
            on:dblclick={() => handleNodeDoubleClick(element)}
            on:keydown={e => handleKeyDown(e, element)}
            role="button"
            tabindex="0"
            aria-label="Draggable {element.type} element: {element.label}"
          >
            {#if element.type === 'pool'}
              <!-- Pool -->
              <rect
                x={element.x}
                y={element.y}
                width={element.width}
                height={element.height}
                fill="white"
                stroke="black"
                stroke-width="2"
                class="element-shape"
              />

              <!-- Add Lane Button (always visible) -->
              {#if element.type === 'pool'}
                  {#if element.isHorizontal}
                    <!-- Horizontal pool add lane button -->
                    <g
                      class="add-lane-button"
                      role="button"
                      tabindex="0"
                      aria-label="Add Lane"
                      on:click={() => addLane(element.id)}
                      on:keydown={e => e.key === 'Enter' && addLane(element.id)}
                      transform={`translate(${element.x + element.width/2}, ${element.y + element.height - 5})`}
                    >
                      <rect x="-10" y="-10" width="20" height="20" rx="3" fill="#1890ff" stroke="#0050b3" stroke-width="1.5" />
                      <text x="0" y="0" text-anchor="middle" dominant-baseline="middle" font-size="16" font-weight="bold" fill="white">+</text>
                      <title>Add Lane</title>
                    </g>
                  {:else}
                    <!-- Vertical pool add lane button -->
                    <g
                      class="add-lane-button"
                      role="button"
                      tabindex="0"
                      aria-label="Add Lane"
                      on:click={() => addLane(element.id)}
                      on:keydown={e => e.key === 'Enter' && addLane(element.id)}
                      transform={`translate(${element.x + element.width - 5}, ${element.y + element.height/2})`}
                    >
                      <rect x="-10" y="-10" width="20" height="20" rx="3" fill="#1890ff" stroke="#0050b3" stroke-width="1.5" />
                      <text x="0" y="0" text-anchor="middle" dominant-baseline="middle" font-size="16" font-weight="bold" fill="white">+</text>
                      <title>Add Lane</title>
                    </g>
                  {/if}
              {/if}

              <!-- Pool Label Area -->
              {#if element.isHorizontal}
                <rect
                  x={element.x}
                  y={element.y}
                  width="30"
                  height={element.height}
                  fill="white"
                  stroke="black"
                  stroke-width="1"
                />
                <text
                  x={element.x + 15}
                  y={element.y + element.height/2}
                  text-anchor="middle"
                  dominant-baseline="middle"
                  transform={`rotate(-90, ${element.x + 15}, ${element.y + element.height/2})`}
                  pointer-events="none"
                >
                  {element.label}
                </text>

                <!-- Render lanes within this pool -->
                {#if element.lanes && element.lanes.length > 0}
                  {#each element.lanes as laneId}
                    {@const lane = $bpmnStore.find(el => el.id === laneId && el.type === 'lane')}
                    {#if lane}
                      <!-- Lane separator line -->
                      <line
                        x1={element.x + 30}
                        y1={lane.y}
                        x2={element.x + element.width}
                        y2={lane.y}
                        stroke="black"
                        stroke-width="1"
                      />
                      <!-- Lane label -->
                      <text
                        x={element.x + 25}
                        y={lane.y + lane.height/2}
                        text-anchor="middle"
                        dominant-baseline="middle"
                        transform={`rotate(-90, ${element.x + 25}, ${lane.y + lane.height/2})`}
                        pointer-events="none"
                      >
                        {lane.label}
                      </text>
                    {/if}
                  {/each}
                {/if}
              {:else}
                <!-- Vertical pool rendering -->
                <rect
                  x={element.x}
                  y={element.y}
                  width={element.width}
                  height="30"
                  fill="white"
                  stroke="black"
                  stroke-width="1"
                />
                <text
                  x={element.x + element.width/2}
                  y={element.y + 15}
                  text-anchor="middle"
                  dominant-baseline="middle"
                  pointer-events="none"
                >
                  {element.label}
                </text>

                <!-- Render lanes within this pool -->
                {#if element.lanes && element.lanes.length > 0}
                  {#each element.lanes as laneId}
                    {@const lane = $bpmnStore.find(el => el.id === laneId && el.type === 'lane')}
                    {#if lane}
                      <!-- Lane separator line -->
                      <line
                        x1={lane.x}
                        y1={element.y + 30}
                        x2={lane.x}
                        y2={element.y + element.height}
                        stroke="black"
                        stroke-width="1"
                      />
                      <!-- Lane label -->
                      <text
                        x={lane.x + lane.width/2}
                        y={element.y + 15}
                        text-anchor="middle"
                        dominant-baseline="middle"
                        pointer-events="none"
                      >
                        {lane.label}
                      </text>
                    {/if}
                  {/each}
                {/if}
              {/if}


            {/if}
          </g>
        {/if}
      {/each}

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

      <!-- Draw other BPMN elements (on top of pools and lanes) -->
      {#each $bpmnStore as element (element.id)}
        {#if element.type !== 'pool' && element.type !== 'lane' && isNode(element)}
          <!-- Group for each element to handle events together -->
          <g
            class="bpmn-element {draggedElementId === element.id ? 'dragging' : ''}"
            data-element-type={element.type}
            on:mousedown={e => handleMouseDown(e, element)}
            on:dblclick={() => handleNodeDoubleClick(element)}
            on:keydown={e => handleKeyDown(e, element)}
            role="button"
            tabindex="0"
            aria-label="Draggable {element.type} element: {element.label}"
          >
            {#if element.type === 'task'}
              <!-- Base task rectangle -->
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

              <!-- Task type specific icons -->
              {#if element.taskType === 'user'}
                <!-- User Task Icon -->
                <path
                  d={`M${element.x + 10},${element.y + 10}
                      a8,8 0 1,0 16,0 a8,8 0 1,0 -16,0
                      M${element.x + 18},${element.y + 18}
                      v6 h-16 v-6 a8,8 0 0,1 16,0z`}
                  fill="none"
                  stroke="black"
                  stroke-width="1"
                />
              {:else if element.taskType === 'service'}
                <!-- Service Task Icon (gear) -->
                <path
                  d={`M${element.x + 18},${element.y + 8}
                      l2,0 l1,-4 l2,0 l1,4 l2,0
                      l-3,3 l1,2 l3,-1 l1,2 l-3,2
                      l0,2 l3,1 l-1,2 l-3,-1 l-1,2
                      l3,3 l-2,1 l-1,-3 l-2,0 l-1,3
                      l-2,0 l1,-3 l-2,-1 l-3,3 l-1,-2
                      l3,-2 l0,-2 l-3,-1 l1,-2 l3,1
                      l1,-2 l-3,-3z`}
                  fill="none"
                  stroke="black"
                  stroke-width="1"
                />
                <circle
                  cx={element.x + 18}
                  cy={element.y + 18}
                  r="5"
                  fill="none"
                  stroke="black"
                  stroke-width="1"
                />
              {:else if element.taskType === 'send'}
                <!-- Send Task Icon (envelope) -->
                <path
                  d={`M${element.x + 10},${element.y + 13}
                      h16 v10 h-16 z
                      M${element.x + 10},${element.y + 13}
                      l8,6 l8,-6`}
                  fill="none"
                  stroke="black"
                  stroke-width="1"
                />
              {:else if element.taskType === 'receive'}
                <!-- Receive Task Icon (envelope) -->
                <path
                  d={`M${element.x + 10},${element.y + 13}
                      h16 v10 h-16 z
                      M${element.x + 10},${element.y + 13}
                      l8,6 l8,-6`}
                  fill="none"
                  stroke="black"
                  stroke-width="1"
                  stroke-dasharray="2,2"
                />
              {:else if element.taskType === 'manual'}
                <!-- Manual Task Icon (hand) -->
                <path
                  d={`M${element.x + 17},${element.y + 10}
                      c0,-1 -1,-2 -2,-2 c-1,0 -2,1 -2,2 v6
                      c-1,0 -2,1 -2,2 c0,1 1,2 2,2 h2
                      c0,1 1,2 2,2 c1,0 2,-1 2,-2 v-10
                      M${element.x + 13},${element.y + 16}
                      c-1,0 -2,1 -2,2 c0,1 1,2 2,2 h2`}
                  fill="none"
                  stroke="black"
                  stroke-width="1"
                />
              {:else if element.taskType === 'business-rule'}
                <!-- Business Rule Task Icon (table) -->
                <rect
                  x={element.x + 10}
                  y={element.y + 10}
                  width="16"
                  height="12"
                  fill="none"
                  stroke="black"
                  stroke-width="1"
                />
                <path
                  d={`M${element.x + 10},${element.y + 14} h16
                      M${element.x + 10},${element.y + 18} h16
                      M${element.x + 16},${element.y + 10} v12`}
                  stroke="black"
                  stroke-width="1"
                />
              {:else if element.taskType === 'script'}
                <!-- Script Task Icon (scroll) -->
                <path
                  d={`M${element.x + 10},${element.y + 10}
                      h12 c2,0 2,2 0,2 h-12 z
                      M${element.x + 10},${element.y + 14}
                      h12 c2,0 2,2 0,2 h-12 z
                      M${element.x + 10},${element.y + 18}
                      h12 c2,0 2,2 0,2 h-12 z`}
                  fill="none"
                  stroke="black"
                  stroke-width="1"
                />
              {/if}

              <!-- Loop, Multi-Instance, Compensation markers -->
              {#if element.isLoop}
                <path
                  d={`M${element.x + element.width - 15},${element.y + element.height - 10}
                      l5,0 l-2.5,5 z
                      M${element.x + element.width - 15},${element.y + element.height - 15}
                      a5,5 0 1,1 5,5`}
                  fill="black"
                  stroke="black"
                  stroke-width="1"
                />
              {:else if element.isMultiInstance}
                <path
                  d={`M${element.x + element.width - 15},${element.y + element.height - 15} h6
                      M${element.x + element.width - 15},${element.y + element.height - 12} h6
                      M${element.x + element.width - 15},${element.y + element.height - 9} h6`}
                  stroke="black"
                  stroke-width="1"
                />
              {:else if element.isCompensation}
                <path
                  d={`M${element.x + element.width - 15},${element.y + element.height - 15}
                      l5,5 l-5,5 m-5,-5 l5,5 l-5,5`}
                  fill="none"
                  stroke="black"
                  stroke-width="1"
                />
              {/if}

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
              <!-- Base event circle -->
              <circle
                cx={element.x + element.width/2}
                cy={element.y + element.height/2}
                r={element.width/2}
                fill="white"
                stroke="black"
                stroke-width="2"
                class="element-shape"
              />

              <!-- Event type specific styling -->
              {#if element.eventType === 'start'}
                <!-- Start event has a single thin border -->
              {:else if element.eventType === 'end'}
                <!-- End event has a thick border -->
                <circle
                  cx={element.x + element.width/2}
                  cy={element.y + element.height/2}
                  r={element.width/2 - 2}
                  fill="white"
                  stroke="black"
                  stroke-width="4"
                />
              {:else if element.eventType === 'intermediate-catch' || element.eventType === 'intermediate-throw'}
                <!-- Intermediate event has a double border -->
                <circle
                  cx={element.x + element.width/2}
                  cy={element.y + element.height/2}
                  r={element.width/2 - 4}
                  fill="white"
                  stroke="black"
                  stroke-width="1"
                />
              {:else if element.eventType === 'boundary'}
                <!-- Boundary event has a double border and is attached to an activity -->
                <circle
                  cx={element.x + element.width/2}
                  cy={element.y + element.height/2}
                  r={element.width/2 - 4}
                  fill="white"
                  stroke="black"
                  stroke-width="1"
                />
              {/if}

              <!-- Event definition specific icons -->
              {#if element.eventDefinition === 'message'}
                <!-- Message icon (envelope) -->
                <path
                  d={`M${element.x + element.width/2 - 8},${element.y + element.height/2 - 5}
                      h16 v10 h-16 z
                      M${element.x + element.width/2 - 8},${element.y + element.height/2 - 5}
                      l8,6 l8,-6`}
                  fill="none"
                  stroke="black"
                  stroke-width="1"
                />
              {:else if element.eventDefinition === 'timer'}
                <!-- Timer icon (clock) -->
                <circle
                  cx={element.x + element.width/2}
                  cy={element.y + element.height/2}
                  r="10"
                  fill="none"
                  stroke="black"
                  stroke-width="1"
                />
                <path
                  d={`M${element.x + element.width/2},${element.y + element.height/2 - 10} v10 h5`}
                  fill="none"
                  stroke="black"
                  stroke-width="1"
                />
              {:else if element.eventDefinition === 'error'}
                <!-- Error icon (lightning bolt) -->
                <path
                  d={`M${element.x + element.width/2 - 5},${element.y + element.height/2 - 8}
                      l5,8 l5,-4 l-5,8 l-5,-4 z`}
                  fill="none"
                  stroke="black"
                  stroke-width="1"
                />
              {:else if element.eventDefinition === 'escalation'}
                <!-- Escalation icon (triangle) -->
                <path
                  d={`M${element.x + element.width/2},${element.y + element.height/2 - 8}
                      l6,12 l-12,0 z`}
                  fill="none"
                  stroke="black"
                  stroke-width="1"
                />
              {:else if element.eventDefinition === 'signal'}
                <!-- Signal icon (triangle) -->
                <path
                  d={`M${element.x + element.width/2},${element.y + element.height/2 - 8}
                      l8,12 h-16 z`}
                  fill="none"
                  stroke="black"
                  stroke-width="1"
                />
              {:else if element.eventDefinition === 'conditional'}
                <!-- Conditional icon (document with lines) -->
                <rect
                  x={element.x + element.width/2 - 6}
                  y={element.y + element.height/2 - 8}
                  width="12"
                  height="16"
                  fill="none"
                  stroke="black"
                  stroke-width="1"
                />
                <path
                  d={`M${element.x + element.width/2 - 4},${element.y + element.height/2 - 5} h8
                      M${element.x + element.width/2 - 4},${element.y + element.height/2} h8
                      M${element.x + element.width/2 - 4},${element.y + element.height/2 + 5} h8`}
                  stroke="black"
                  stroke-width="1"
                />
              {:else if element.eventDefinition === 'link'}
                <!-- Link icon (arrow) -->
                <path
                  d={`M${element.x + element.width/2 - 8},${element.y + element.height/2}
                      h12 m-3,-5 l5,5 l-5,5`}
                  fill="none"
                  stroke="black"
                  stroke-width="1"
                />
              {:else if element.eventDefinition === 'terminate'}
                <!-- Terminate icon (filled circle) -->
                <circle
                  cx={element.x + element.width/2}
                  cy={element.y + element.height/2}
                  r="10"
                  fill="black"
                />
              {:else if element.eventDefinition === 'multiple'}
                <!-- Multiple icon (star) -->
                <path
                  d={`M${element.x + element.width/2},${element.y + element.height/2 - 10}
                      l2,8 l8,-2 l-6,6 l6,6 l-8,-2 l-2,8 l-2,-8 l-8,2 l6,-6 l-6,-6 l8,2 z`}
                  fill="none"
                  stroke="black"
                  stroke-width="1"
                />
              {:else if element.eventDefinition === 'parallel-multiple'}
                <!-- Parallel Multiple icon (plus) -->
                <path
                  d={`M${element.x + element.width/2},${element.y + element.height/2 - 10}
                      v20 m-10,-10 h20`}
                  stroke="black"
                  stroke-width="2"
                />
              {:else if element.eventDefinition === 'compensation'}
                <!-- Compensation icon (rewind) -->
                <path
                  d={`M${element.x + element.width/2 - 10},${element.y + element.height/2}
                      l10,-8 v16 z
                      M${element.x + element.width/2},${element.y + element.height/2}
                      l10,-8 v16 z`}
                  fill="none"
                  stroke="black"
                  stroke-width="1"
                />
              {:else if element.eventDefinition === 'cancel'}
                <!-- Cancel icon (X) -->
                <path
                  d={`M${element.x + element.width/2 - 8},${element.y + element.height/2 - 8}
                      l16,16 m-16,0 l16,-16`}
                  stroke="black"
                  stroke-width="1"
                />
              {/if}

              <!-- Event label -->
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

              <!-- Gateway type specific icons -->
              {#if element.gatewayType === 'exclusive'}
                <!-- Exclusive Gateway (X) -->
                <path
                  d={`M${element.x + element.width/2 - 10},${element.y + element.height/2 - 10}
                      l20,20 m-20,0 l20,-20`}
                  stroke="black"
                  stroke-width="2"
                />
              {:else if element.gatewayType === 'parallel'}
                <!-- Parallel Gateway (plus) -->
                <path
                  d={`M${element.x + element.width/2},${element.y + element.height/2 - 10}
                      v20 m-10,-10 h20`}
                  stroke="black"
                  stroke-width="2"
                />
              {:else if element.gatewayType === 'inclusive'}
                <!-- Inclusive Gateway (circle) -->
                <circle
                  cx={element.x + element.width/2}
                  cy={element.y + element.height/2}
                  r="10"
                  fill="none"
                  stroke="black"
                  stroke-width="2"
                />
              {:else if element.gatewayType === 'complex'}
                <!-- Complex Gateway (asterisk) -->
                <path
                  d={`M${element.x + element.width/2},${element.y + element.height/2 - 10}
                      v20 m-10,-10 h20 m-15,-5 l10,10 m0,-10 l-10,10`}
                  stroke="black"
                  stroke-width="2"
                />
              {:else if element.gatewayType === 'event-based'}
                <!-- Event-based Gateway (pentagon with circle) -->
                <circle
                  cx={element.x + element.width/2}
                  cy={element.y + element.height/2}
                  r="12"
                  fill="none"
                  stroke="black"
                  stroke-width="1"
                />
                <circle
                  cx={element.x + element.width/2}
                  cy={element.y + element.height/2}
                  r="8"
                  fill="none"
                  stroke="black"
                  stroke-width="1"
                />
                <path
                  d={`M${element.x + element.width/2},${element.y + element.height/2 - 8}
                      l7.6,5.5 l-2.9,8.9 h-9.4 l-2.9,-8.9 z`}
                  fill="none"
                  stroke="black"
                  stroke-width="1"
                />
              {:else if element.gatewayType === 'parallel-event-based'}
                <!-- Parallel Event-based Gateway (double circle with parallel inside) -->
                <circle
                  cx={element.x + element.width/2}
                  cy={element.y + element.height/2}
                  r="12"
                  fill="none"
                  stroke="black"
                  stroke-width="1"
                />
                <circle
                  cx={element.x + element.width/2}
                  cy={element.y + element.height/2}
                  r="8"
                  fill="none"
                  stroke="black"
                  stroke-width="1"
                />
                <path
                  d={`M${element.x + element.width/2},${element.y + element.height/2 - 5}
                      v10 m-5,-5 h10`}
                  stroke="black"
                  stroke-width="2"
                />
              {/if}

              <!-- Gateway label -->
              <text
                x={element.x + element.width/2}
                y={element.y + element.height + 20}
                text-anchor="middle"
                pointer-events="none"
              >
                {element.label}
              </text>
            {:else if element.type === 'dataobject'}
              <!-- Data Object -->
              <path
                d={`M${element.x + 5},${element.y}
                    h${element.width - 10}
                    l5,5 v${element.height - 10}
                    h-${element.width} v-${element.height - 5} z
                    M${element.x + element.width},${element.y + 5}
                    v-5 h-5 z`}
                fill="white"
                stroke="black"
                stroke-width="1"
                class="element-shape"
              />

              <!-- Data Object Type Markers -->
              {#if element.isInput}
                <!-- Data Input Marker (arrow pointing into the data object) -->
                <path
                  d={`M${element.x + element.width/2 - 10},${element.y - 10}
                      h20 m-10,10 l-10,-10 l10,-10`}
                  fill="none"
                  stroke="black"
                  stroke-width="1"
                />
              {:else if element.isOutput}
                <!-- Data Output Marker (arrow pointing out of the data object) -->
                <path
                  d={`M${element.x + element.width/2 - 10},${element.y - 10}
                      h20 m-10,10 l10,-10 l-10,-10`}
                  fill="none"
                  stroke="black"
                  stroke-width="1"
                />
              {/if}

              <!-- Collection Marker (three lines) -->
              {#if element.isCollection}
                <path
                  d={`M${element.x + element.width/2 - 5},${element.y + element.height + 3}
                      h10 m-10,3 h10 m-10,3 h10`}
                  stroke="black"
                  stroke-width="1"
                />
              {/if}

              <!-- Data Object Label -->
              <text
                x={element.x + element.width/2}
                y={element.y + element.height + 20}
                text-anchor="middle"
                pointer-events="none"
              >
                {element.label}
              </text>

            {:else if element.type === 'datastore'}
              <!-- Data Store (cylinder) -->
              <path
                d={`M${element.x},${element.y + 10}
                    a${element.width/2},10 0 0,0 ${element.width},0
                    v${element.height - 20}
                    a${element.width/2},10 0 0,1 -${element.width},0 z`}
                fill="white"
                stroke="black"
                stroke-width="1"
                class="element-shape"
              />
              <ellipse
                cx={element.x + element.width/2}
                cy={element.y + 10}
                rx={element.width/2}
                ry="10"
                fill="white"
                stroke="black"
                stroke-width="1"
              />

              <!-- Collection Marker (three lines) -->
              {#if element.isCollection}
                <path
                  d={`M${element.x + element.width/2 - 5},${element.y + element.height + 3}
                      h10 m-10,3 h10 m-10,3 h10`}
                  stroke="black"
                  stroke-width="1"
                />
              {/if}

              <!-- Data Store Label -->
              <text
                x={element.x + element.width/2}
                y={element.y + element.height + 20}
                text-anchor="middle"
                pointer-events="none"
              >
                {element.label}
              </text>

            {:else if element.type === 'textannotation'}
              <!-- Text Annotation -->
              <rect
                x={element.x}
                y={element.y}
                width={element.width}
                height={element.height}
                fill="white"
                stroke="black"
                stroke-width="1"
                stroke-dasharray="5,3"
                class="element-shape"
              />
              <path
                d={`M${element.x},${element.y} l-10,10 v${element.height - 20} l10,10`}
                fill="none"
                stroke="black"
                stroke-width="1"
                stroke-dasharray="5,3"
              />

              <!-- Text Annotation Content -->
              <text
                x={element.x + 5}
                y={element.y + 20}
                pointer-events="none"
              >
                {element.text}
              </text>

            {:else if element.type === 'group'}
              <!-- Group -->
              <rect
                x={element.x}
                y={element.y}
                width={element.width}
                height={element.height}
                fill="none"
                stroke="black"
                stroke-width="1"
                stroke-dasharray="8,4"
                class="element-shape"
              />

              <!-- Group Label -->
              <text
                x={element.x + 5}
                y={element.y - 5}
                pointer-events="none"
              >
                {element.label}
              </text>

            {:else if element.type === 'pool'}
              <!-- Pool -->
              <g class="pool-container">
                <rect
                  x={element.x}
                  y={element.y}
                  width={element.width}
                  height={element.height}
                  fill="white"
                  stroke="black"
                  stroke-width="2"
                  class="element-shape"
                />
              </g>

              <!-- Pool Label Area -->
              {#if element.isHorizontal}
                <rect
                  x={element.x}
                  y={element.y}
                  width="30"
                  height={element.height}
                  fill="white"
                  stroke="black"
                  stroke-width="1"
                />
                <text
                  x={element.x + 15}
                  y={element.y + element.height/2}
                  text-anchor="middle"
                  dominant-baseline="middle"
                  transform={`rotate(-90, ${element.x + 15}, ${element.y + element.height/2})`}
                  pointer-events="none"
                >
                  {element.label}
                </text>

                <!-- Render lanes within this pool -->
                {#if element.lanes && element.lanes.length > 0}
                  {#each element.lanes as laneId}
                    {@const lane = $bpmnStore.find(el => el.id === laneId && el.type === 'lane')}
                    {#if lane}
                      <!-- Lane separator line -->
                      <line
                        x1={element.x + 30}
                        y1={lane.y}
                        x2={element.x + element.width}
                        y2={lane.y}
                        stroke="black"
                        stroke-width="1"
                      />
                      <!-- Lane label -->
                      <text
                        x={element.x + 25}
                        y={lane.y + lane.height/2}
                        text-anchor="middle"
                        dominant-baseline="middle"
                        transform={`rotate(-90, ${element.x + 25}, ${lane.y + lane.height/2})`}
                        pointer-events="none"
                      >
                        {lane.label}
                      </text>
                    {/if}
                  {/each}
                {/if}
              {:else}
                <rect
                  x={element.x}
                  y={element.y}
                  width={element.width}
                  height="30"
                  fill="white"
                  stroke="black"
                  stroke-width="1"
                />
                <text
                  x={element.x + element.width/2}
                  y={element.y + 15}
                  text-anchor="middle"
                  dominant-baseline="middle"
                  pointer-events="none"
                >
                  {element.label}
                </text>

                <!-- Render lanes within this pool (vertical) -->
                {#if element.lanes && element.lanes.length > 0}
                  {#each element.lanes as laneId}
                    {@const lane = $bpmnStore.find(el => el.id === laneId && el.type === 'lane')}
                    {#if lane}
                      <!-- Lane separator line -->
                      <line
                        x1={lane.x}
                        y1={element.y + 30}
                        x2={lane.x}
                        y2={element.y + element.height}
                        stroke="black"
                        stroke-width="1"
                      />
                      <!-- Lane label -->
                      <text
                        x={lane.x + lane.width/2}
                        y={element.y + 15}
                        text-anchor="middle"
                        dominant-baseline="middle"
                        pointer-events="none"
                      >
                        {lane.label}
                      </text>
                    {/if}
                  {/each}
                {/if}
              {/if}

            {:else if element.type === 'lane'}
              <!-- Lane is rendered as part of the pool, not separately -->
              <!-- This is just a placeholder for selection and dragging -->
              <rect
                x={element.x}
                y={element.y}
                width={element.width}
                height={element.height}
                fill="none"
                stroke="none"
                stroke-width="0"
                fill-opacity="0.1"
                class="element-shape"
              />
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

  <!-- Context Menu removed -->
</div>

<style>
  .bpmn-editor {
    display: flex;
    flex-direction: column;
    border: 1px solid #ccc;
    border-radius: 4px;
    overflow: hidden;
  }

  /* Toolbar styles moved to Toolbar.svelte component */

  .canvas-container {
    overflow: auto;
    background-color: #f9f9f9;
    position: relative;
    transition: all 0.2s;
  }

  .canvas-container.drag-over {
    background-color: #e6f7ff;
    box-shadow: inset 0 0 0 2px #1890ff;
  }

  /* Ensure pools and lanes are rendered below other elements */
  g.bpmn-element[data-element-type="pool"],
  g.bpmn-element[data-element-type="lane"] {
    z-index: 1;
  }

  /* Ensure other elements are rendered above pools and lanes */
  g.bpmn-element:not([data-element-type="pool"]):not([data-element-type="lane"]) {
    z-index: 2;
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

  /* Drop indicator */
  .drop-indicator {
    position: absolute;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background-color: rgba(24, 144, 255, 0.5);
    border: 2px solid #1890ff;
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 100;
  }

  /* Add Lane Button styling */
  .add-lane-button {
    cursor: pointer;
    opacity: 0.9;
    transition: opacity 0.3s ease-in-out;
  }

  .add-lane-button:hover {
    opacity: 1;
  }

  .add-lane-button rect {
    transition: fill 0.3s ease-in-out, stroke 0.3s ease-in-out, filter 0.3s ease-in-out;
    filter: drop-shadow(0px 2px 3px rgba(0, 0, 0, 0.2));
    transform-origin: center;
    transform-box: fill-box;
  }

  .add-lane-button:hover rect {
    fill: #bae7ff;
    stroke: #0050b3;
    filter: drop-shadow(0px 4px 6px rgba(0, 0, 0, 0.3));
    transform: scale(1.1);
  }

  .add-lane-button text {
    pointer-events: none;
    transition: fill 0.3s ease-in-out;
    transform-origin: center;
    transform-box: fill-box;
  }

  .add-lane-button:hover text {
    fill: #0050b3;
    transform: scale(1.1);
  }
</style>
