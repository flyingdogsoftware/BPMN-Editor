<script >
  import { bpmnStore } from '../stores/bpmnStore';
  import { snapPositionToGrid, snapToGrid } from '../utils/gridUtils';
  // Removed old connection utils import
  import { onMount } from 'svelte';
  import { importBpmnXml } from '../utils/xml/bpmnXmlParser';
  import { exportBpmnXml, downloadBpmnXml } from '../utils/xml/bpmnXmlExporter';
  import { removeNonCornerWaypoints } from '../utils/connectionRouting';

  // Import Interaction Managers
  import { canvasInteractionManager } from '../services/CanvasInteractionManager';
  import { elementInteractionManager } from '../services/ElementInteractionManager';
  import { multiSelectionManager } from '../services/MultiSelectionManager';

  // Import new utility modules
  import { createElement } from '../utils/elementFactory';
  import { handleDragStart, calculateDragPosition, handleElementDrop } from '../utils/dragHandlers';
  import { handleResizeStart, calculateResizeValues } from '../utils/resizeHandlers';
  // Removed old connection handlers import

  // Import ElementManagerComponent
  import ElementManagerComponent from './ElementManagerComp.svelte';

  // Function to import a test BPMN file with pools and lanes
  async function importTestPoolsFile() {
    try {
      // Fetch the test file
      const response = await fetch('/test-pools.bpmn');
      if (!response.ok) {
        throw new Error(`Failed to fetch test file: ${response.statusText}`);
      }

      const xmlString = await response.text();
      console.log('Importing test BPMN XML...');
      console.log('XML content:', xmlString);

      const elements = importBpmnXml(xmlString);
      console.log('Imported elements:', elements);

      // Log pools and lanes specifically
      const pools = elements.filter(el => el.type === 'pool');
      const lanes = elements.filter(el => el.type === 'lane');
      console.log('Imported pools:', JSON.stringify(pools, null, 2));
      console.log('Imported lanes:', JSON.stringify(lanes, null, 2));

      // Reset the store and add the imported elements
      bpmnStore.reset();
      elements.forEach(el => bpmnStore.addElement(el));

      // Log the store after import
      console.log('Store after import:', $bpmnStore);
    } catch (err) {
      console.error('Failed to import test BPMN XML:', err);
      alert('Failed to import test BPMN XML: ' + err.message);
    }
  }

  // Function to import a test BPMN file with swimlanes
  async function importTestSwimlanesFile() {
    try {
      // Fetch the test file
      const response = await fetch('/test-swimlanes.bpmn');
      if (!response.ok) {
        throw new Error(`Failed to fetch test file: ${response.statusText}`);
      }

      const xmlString = await response.text();
      console.log('Importing test swimlanes BPMN XML...');
      console.log('XML content:', xmlString);

      const elements = importBpmnXml(xmlString);
      console.log('Imported elements:', elements);

      // Log pools and lanes specifically
      const pools = elements.filter(el => el.type === 'pool');
      const lanes = elements.filter(el => el.type === 'lane');
      console.log('Imported pools:', JSON.stringify(pools, null, 2));
      console.log('Imported lanes:', JSON.stringify(lanes, null, 2));

      // Reset the store and add the imported elements
      bpmnStore.reset();
      elements.forEach(el => bpmnStore.addElement(el));

      // Log the store after import
      console.log('Store after import:', $bpmnStore);
    } catch (err) {
      console.error('Failed to import test swimlanes BPMN XML:', err);
      alert('Failed to import test swimlanes BPMN XML: ' + err.message);
    }
  }

  // Export BPMN XML handler
  function handleExportBpmnXml() {
    try {
      console.log('Exporting BPMN XML...');
      const elements = $bpmnStore;
      const xml = exportBpmnXml(elements);
      console.log('Exported XML:', xml);
      downloadBpmnXml(xml, 'diagram.bpmn');
    } catch (error) {
      console.error('Error exporting BPMN XML:', error);
      alert(`Failed to export BPMN XML: ${error.message}`);
    }
  }

  // Import BPMN XML handler
  async function handleImportBpmnXml(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const xmlString = e.target.result;
        console.log('Importing BPMN XML...');
        console.log('XML content:', xmlString);
        const elements = importBpmnXml(xmlString);
        console.log('Imported elements:', elements);

        // Log pools and lanes specifically
        const pools = elements.filter(el => el.type === 'pool');
        const lanes = elements.filter(el => el.type === 'lane');
        console.log('Imported pools:', JSON.stringify(pools, null, 2));
        console.log('Imported lanes:', JSON.stringify(lanes, null, 2));

        // Validate pool-lane relationships
        pools.forEach(pool => {
          console.log(`Validating pool ${pool.id} (${pool.label})`);
          console.log(`  - Pool has ${pool.lanes?.length || 0} lanes:`, pool.lanes);

          // Check if all referenced lanes exist
          if (pool.lanes && pool.lanes.length > 0) {
            pool.lanes.forEach(laneId => {
              const lane = lanes.find(l => l.id === laneId);
              if (lane) {
                console.log(`  - Found lane ${laneId} (${lane.label})`);
                // Verify lane references back to this pool
                if (lane.parentRef !== pool.id) {
                  console.warn(`  - Lane ${laneId} has incorrect parentRef: ${lane.parentRef}, should be ${pool.id}`);
                }
              } else {
                console.error(`  - Lane ${laneId} referenced by pool ${pool.id} not found in imported elements!`);
              }
            });
          }
        });

        // Log connections specifically
        const connections = elements.filter(el => el.type === 'connection');
        console.log('Imported connections:', connections);

        bpmnStore.reset();
        elements.forEach(el => bpmnStore.addElement(el));

        // Log the store after import
        console.log('Store after import:', $bpmnStore);
      } catch (err) {
        console.error('Failed to import BPMN XML:', err);
        alert('Failed to import BPMN XML: ' + err.message);
      }
    };
    reader.readAsText(file);
    // Reset the input so the same file can be selected again
    event.target.value = '';
  }
  // Removed old connection components imports
  import LabelEditDialog from './LabelEditDialog.svelte';
  import Toolbar from './toolbar/Toolbar.svelte';
  import ResizeHandle from './ResizeHandle.svelte';

  // Import components
  import Canvas from './Canvas.svelte';
  import ElementFactory from './ElementFactory.svelte';
  import ElementRenderer from './renderers/ElementRenderer.svelte';
  import TaskRenderer from './renderers/TaskRenderer.svelte';
  import EventRenderer from './renderers/EventRenderer.svelte';
  import GatewayRenderer from './renderers/GatewayRenderer.svelte';
  import PoolLaneRenderer from './renderers/PoolLaneRenderer.svelte';

  // Import new connection management
  import ConnectionManager from './connections/ConnectionManager.svelte';
  import ElementContextMenu from './ElementContextMenu.svelte';

  // Import keyboard shortcuts for Undo/Redo
  import KeyboardShortcuts from './KeyboardShortcuts.svelte';


  // Listen for edit-label events from Connection components
  onMount(() => {
    if (isBrowser) {
      console.log('BpmnEditor: Adding edit-label event listener');
      document.addEventListener('edit-label', handleEditLabelEvent);

      return () => {
        document.removeEventListener('edit-label', handleEditLabelEvent);
      };
    }
  });

  // Handle edit-label events from Connection components
  function handleEditLabelEvent(event) {
    console.log('BpmnEditor: Received edit-label event', event.detail);
    const connectionId = event.detail.connectionId;
    const connection = $bpmnStore.find(el => el.id === connectionId);

    if (connection) {
      console.log('BpmnEditor: Found connection, opening label dialog', connection);
      // For sequence flows, we might want to edit the condition
      const isCondition = connection.connectionType === 'sequence';
      openLabelDialog(connection, isCondition);
    }
  }

  // Check if we're in a browser environment
  const isBrowser = typeof window !== 'undefined';

  // Use CanvasInteractionManager for canvas dimensions and viewport
  // Erstelle einen Store für den Viewport, um Reaktivität zu verbessern
  import { writable } from 'svelte/store';
  const viewportStore = writable(canvasInteractionManager.getViewport());

  // Aktualisiere den Store alle 50ms, um sicherzustellen, dass Änderungen erkannt werden
  let viewportUpdateInterval;
  onMount(() => {
    viewportUpdateInterval = setInterval(() => {
      viewportStore.set(canvasInteractionManager.getViewport());
    }, 50);

    return () => {
      clearInterval(viewportUpdateInterval);
    };
  });

  // Reaktive Variablen aus dem Store ableiten
  $: viewport = $viewportStore;
  $: canvasWidth = viewport.width;
  $: canvasHeight = viewport.height;
  $: viewportX = viewport.x;
  $: viewportY = viewport.y;
  $: zoomLevel = viewport.zoomLevel || 1.0; // Default to 1.0 if not set
  $: isDraggingCanvas = canvasInteractionManager.getIsDraggingCanvas();

  // Log viewport dimensions for debugging
  $: console.log('DEBUG: BpmnEditor - Current viewport dimensions:', { canvasWidth, canvasHeight, viewportX, viewportY, zoomLevel, isDragging: isDraggingCanvas });

  // Update canvas size based on elements
  $: canvasInteractionManager.updateCanvasSizeBasedOnElements($bpmnStore);

  // Function to position the viewport for optimal element visibility
  function centerViewportOnElements() {
    canvasInteractionManager.centerViewportOnElements($bpmnStore);
  }

  // Update ElementInteractionManager when elementManagerComponent changes
  $: if (elementManagerComponent) {
    elementInteractionManager.setElementManagerComponent(elementManagerComponent);
  }

  // Initialize canvas and event listeners
  onMount(() => {
    if (isBrowser) {
      // Initialize the CanvasInteractionManager
      canvasInteractionManager.initializeCanvas();

      // Center the viewport on the diagram elements
      centerViewportOnElements();

      return () => {
        canvasInteractionManager.cleanup();
        elementInteractionManager.cleanup();
      };
    }
  });

  // Grid size for snapping
  const gridSize = 20;

  // Dragging state - managed by ElementInteractionManager
  $: ({ isDragging, draggedElementId } = elementInteractionManager.getDraggingState());

  // Selection state - managed by MultiSelectionManager
  const selectionMode = multiSelectionManager.getSelectionModeStore();
  const selectedElementIds = multiSelectionManager.getSelectedElementIdsStore();
  const selectionRect = multiSelectionManager.getSelectionRectStore();

  // Resizing state
  let isResizing = false;
  let resizingElementId = null;
  let resizeHandlePosition = null;
  let originalSize = { width: 0, height: 0 };
  let originalPos = { x: 0, y: 0 };

  // Drop zone state
  let isDragOver = false;
  let dropX = 0;
  let dropY = 0;

  // Connection point type is imported from bpmnElements.ts

  // Removed old connection state

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
    return element.type !== 'connection';
  }

  // Helper function to check if an element is inside a pool
  function isElementInsidePool(element, pool) {
    if (!isNode(element) || !isNode(pool)) return false;

    // Check if the element is fully contained within the pool boundaries
    const elementX = element.x;
    const elementY = element.y;
    const elementWidth = element.width;
    const elementHeight = element.height;
    const poolX = pool.x;
    const poolY = pool.y;
    const poolWidth = pool.width;
    const poolHeight = pool.height;

    return elementX >= poolX &&
           elementY >= poolY &&
           elementX + elementWidth <= poolX + poolWidth &&
           elementY + elementHeight <= poolY + poolHeight;
  }

  // Removed getAllConnectionPoints function

  // Component references
  let elementManagerComponent;
  let connectionManagerComponent;

  // Function to force a refresh of a connection's rendering
  function forceConnectionRefresh(connectionId) {
    console.log('DEBUG: Forcing refresh of connection', connectionId);
    // This is a no-op update that forces a refresh
    setTimeout(() => {
      bpmnStore.updateElement(connectionId, { isSelected: false });
      bpmnStore.updateElement(connectionId, { isSelected: true });
    }, 10);
  }

  // Function to refresh all connections
  function refreshAllConnections() {
    console.log('DEBUG: Refreshing all connections');
    const connections = $bpmnStore.filter(el => el.type === 'connection');

    // Remember which connection was selected
    const selectedConnectionId = $bpmnStore.find(el => el.type === 'connection' && el.isSelected)?.id;

    // Refresh each connection
    connections.forEach(connection => {
      // Deselect all connections first
      bpmnStore.updateElement(connection.id, { isSelected: false });
    });

    // Short delay to ensure deselection is processed
    setTimeout(() => {
      // Reselect the previously selected connection if any
      if (selectedConnectionId) {
        bpmnStore.updateElement(selectedConnectionId, { isSelected: true });
      }
    }, 50);
  }

  // Function to optimize the selected connection
  function optimizeSelectedConnection() {
    // Find the selected connection
    const selectedConnection = $bpmnStore.find(el => el.type === 'connection' && el.isSelected);

    if (!selectedConnection) {
      console.error('No connection selected for optimization');
      return;
    }

    // Get source and target elements
    const source = $bpmnStore.find(el => el.id === selectedConnection.sourceId);
    const target = $bpmnStore.find(el => el.id === selectedConnection.targetId);

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

    console.log('DEBUG: Optimizing connection', selectedConnection.id);
    console.log('DEBUG: Original waypoints:', JSON.stringify(selectedConnection.waypoints));

    // Make a deep copy of the waypoints
    const waypoints = JSON.parse(JSON.stringify(selectedConnection.waypoints || []));

    // Use the simplified optimization function that ONLY removes redundant waypoints
    // without changing the path structure
    const optimized = removeNonCornerWaypoints(sourceCenter, targetCenter, waypoints);

    // Update the connection with the optimized waypoints
    bpmnStore.updateConnectionWaypoints(selectedConnection.id, optimized);

    // Force a refresh of the connection to ensure proper rendering
    forceConnectionRefresh(selectedConnection.id);

    // Force another refresh after a longer delay to ensure all handles are properly rendered
    setTimeout(() => {
      forceConnectionRefresh(selectedConnection.id);
    }, 100);
  }

  // Context menu state
  let showElementContextMenu = false;
  let contextMenuPosition = { x: 0, y: 0 };
  let contextMenuElement = null;

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
      lanes: [laneId],
      processRef: undefined,
      isExecutable: false
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

  // Start dragging an element - delegated to ElementInteractionManager
  function handleMouseDown(event, element) {
    console.log('DEBUG: handleMouseDown called for element:', element.id, 'type:', element.type);

    // Check if element is inside a pool
    if (element.type !== 'pool' && element.type !== 'lane') {
      const pools = $bpmnStore.filter(el => el.type === 'pool');
      for (const pool of pools) {
        if (isElementInsidePool(element, pool)) {
          console.log('DEBUG: Element is inside pool:', pool.id);
          break;
        }
      }
    }

    // Check if element is already in a multi-selection
    const isInMultiSelection = $selectedElementIds.includes(element.id) && $selectedElementIds.length > 1;
    console.log('DEBUG: isInMultiSelection:', isInMultiSelection, 'selectedElementIds:', $selectedElementIds);

    // If in selection mode, handle selection or dragging of selected elements
    if ($selectionMode) {
      // If the element is already selected, allow dragging it
      if ($selectedElementIds.includes(element.id)) {
        console.log('DEBUG: In selection mode, dragging already selected element:', element.id);
        // Continue with the drag operation
      } else {
        // Otherwise, select the element instead of dragging
        // Check if shift key is pressed for multi-select
        const addToSelection = event.shiftKey;
        console.log('DEBUG: In selection mode, selecting element, addToSelection:', addToSelection);

        // Don't select pools or lanes when in selection mode
        if (element.type === 'pool' || element.type === 'lane') {
          // In selection mode, pools and lanes should not be selectable
          // The pointer-events are set to 'none' in the PoolLaneRenderer component
          // This is just a fallback in case the event still reaches here
          console.log('DEBUG: Ignoring selection of pool/lane in selection mode');
          return false;
        }

        multiSelectionManager.selectElement(element.id, addToSelection);
        return false; // Prevent dragging when selecting a new element
      }
    }

    // If element is part of a multi-selection, handle group dragging
    if (isInMultiSelection) {
      // Prevent default to avoid text selection during drag
      event.preventDefault();
      event.stopPropagation();

      // Get all selected elements and their positions
      const elements = $bpmnStore;
      const selectedElements = elements.filter(el => $selectedElementIds.includes(el.id));

      // Check if any pools or lanes are selected
      const hasPoolsOrLanes = selectedElements.some(el => el.type === 'pool' || el.type === 'lane');

      // Store original positions of all selected elements
      const originalPositions = {};
      selectedElements.forEach(el => {
        if (el.type !== 'connection') {
          originalPositions[el.id] = { x: el.x, y: el.y };
        }
      });

      // Find all connections between selected elements
      const internalConnections = [];
      const internalWaypoints = {};

      elements.forEach(el => {
        if (el.type === 'connection') {
          const sourceSelected = $selectedElementIds.includes(el.sourceId);
          const targetSelected = $selectedElementIds.includes(el.targetId);

          if (sourceSelected && targetSelected) {
            internalConnections.push(el.id);
            if (el.waypoints) {
              internalWaypoints[el.id] = JSON.parse(JSON.stringify(el.waypoints));
            }
          }
        }
      });

      // Find containing pools and lanes for boundary checking
      const pools = elements.filter(el => el.type === 'pool');
      const containingPoolsAndLanes = new Map(); // Map of elementId -> { pool, lane }

      // For each selected element, find its containing pool and lane
      selectedElements.forEach(el => {
        if (el.type !== 'connection' && el.type !== 'pool' && el.type !== 'lane') {
          // Find containing pool
          for (const pool of pools) {
            // Skip if the pool itself is selected - we don't want to constrain movement in that case
            // This should never happen now since we're not selecting pools in rectangle selection
            if ($selectedElementIds.includes(pool.id)) {
              console.log('DEBUG: Pool is selected, skipping constraint check:', pool.id);
              continue;
            }

            if (isElementInsidePool(el, pool)) {
              console.log('DEBUG: Element is inside pool:', el.id, 'pool:', pool.id);
              let containingLane = null;

              // Find containing lane
              if (pool.lanes && pool.lanes.length > 0) {
                for (const laneId of pool.lanes) {
                  // Skip if the lane itself is selected
                  // This should never happen now since we're not selecting lanes in rectangle selection
                  if ($selectedElementIds.includes(laneId)) {
                    console.log('DEBUG: Lane is selected, skipping constraint check:', laneId);
                    continue;
                  }

                  const lane = elements.find(l => l.id === laneId && l.type === 'lane');
                  if (lane && isElementInsidePool(el, lane)) {
                    containingLane = lane;
                    console.log('DEBUG: Element is inside lane:', el.id, 'lane:', lane.id);
                    break;
                  }
                }
              }

              containingPoolsAndLanes.set(el.id, { pool, lane: containingLane });
              break;
            }
          }
        }
      });

      console.log('DEBUG: Containing pools and lanes map:', Object.fromEntries(containingPoolsAndLanes));

      // Add event listeners for mouse move and mouse up
      if (isBrowser) {
        const startX = event.clientX;
        const startY = event.clientY;

        const handleMultiDragMove = (moveEvent) => {
          // Calculate the distance moved
          const dx = moveEvent.clientX - startX;
          const dy = moveEvent.clientY - startY;

          // Prevent default to avoid text selection during drag
          moveEvent.preventDefault();
          moveEvent.stopPropagation();

          // Move each selected element
          Object.keys(originalPositions).forEach(id => {
            const originalPos = originalPositions[id];
            const element = elements.find(el => el.id === id);

            if (!originalPos || !element || element.type === 'connection') {
              return;
            }

            // Calculate new position
            let newX = originalPos.x + dx;
            let newY = originalPos.y + dy;

            // Check if element is inside a pool/lane and constrain movement
            const container = containingPoolsAndLanes.get(id);
            if (container) {
              const boundaryElement = container.lane || container.pool;

              // Calculate boundaries
              const minX = boundaryElement.x;
              const minY = boundaryElement.y;
              const maxX = boundaryElement.x + boundaryElement.width - element.width;
              const maxY = boundaryElement.y + boundaryElement.height - element.height;

              // Constrain position to stay within boundaries
              newX = Math.max(minX, Math.min(maxX, newX));
              newY = Math.max(minY, Math.min(maxY, newY));
            }

            // Snap to grid
            const [snappedX, snappedY] = snapPositionToGrid(newX, newY);

            // Update the element position
            bpmnStore.updateElement(id, {
              x: snappedX,
              y: snappedY
            });
          });

          // Update internal connections to maintain their relative positions
          internalConnections.forEach(id => {
            const originalWaypoints = internalWaypoints[id];
            if (originalWaypoints) {
              // Move all waypoints by the same amount
              const updatedWaypoints = originalWaypoints.map(wp => ({
                x: wp.x + dx,
                y: wp.y + dy
              }));

              // Update the connection waypoints
              bpmnStore.updateConnectionWaypoints(id, updatedWaypoints);
            }
          });
        };

        const handleMultiDragUp = (upEvent) => {
          // Prevent default
          upEvent.preventDefault();
          upEvent.stopPropagation();

          // Find all connections that need to be refreshed
          const connectionsToRefresh = [];

          elements.forEach(el => {
            if (el.type === 'connection') {
              const sourceSelected = $selectedElementIds.includes(el.sourceId);
              const targetSelected = $selectedElementIds.includes(el.targetId);

              // Refresh connections where at least one endpoint is selected
              if (sourceSelected || targetSelected) {
                connectionsToRefresh.push(el.id);
              }
            }
          });

          // Force a refresh of all affected connections
          if (connectionsToRefresh.length > 0) {
            // Use a small delay to ensure all element positions are updated first
            setTimeout(() => {
              connectionsToRefresh.forEach(id => {
                // This is a no-op update that forces a refresh
                bpmnStore.updateElement(id, { isSelected: false });
                bpmnStore.updateElement(id, { isSelected: $selectedElementIds.includes(id) });
              });

              // Force another refresh after a longer delay to ensure all handles are properly rendered
              setTimeout(() => {
                connectionsToRefresh.forEach(id => {
                  bpmnStore.updateElement(id, { isSelected: false });
                  bpmnStore.updateElement(id, { isSelected: $selectedElementIds.includes(id) });
                });
              }, 100);
            }, 10);
          }

          // Remove event listeners
          window.removeEventListener('mousemove', handleMultiDragMove);
          window.removeEventListener('mouseup', handleMultiDragUp);
        };

        // Add event listeners for mouse move and mouse up
        window.addEventListener('mousemove', handleMultiDragMove);
        window.addEventListener('mouseup', handleMultiDragUp);
      }

      return false; // We're handling the drag ourselves
    }

    // First delegate to the ElementInteractionManager to set up basic dragging
    console.log('DEBUG: Delegating to ElementInteractionManager.handleMouseDown');
    const result = elementInteractionManager.handleMouseDown(event, element);
    console.log('DEBUG: ElementInteractionManager.handleMouseDown result:', result);
    if (!result) return false;

    // Then handle pool/lane specific logic - ONLY if we're directly dragging a pool or lane
    if (isNode(element) && (element.type === 'pool' || element.type === 'lane')) {
      console.log('DEBUG: Handling pool/lane specific logic for element:', element.id, 'type:', element.type);

      // If this is a pool, store positions of all lanes and contained elements
      // BUT ONLY if we're directly dragging the pool itself (not elements inside it)
      if (element.type === 'pool' && element.lanes && element.lanes.length > 0) {
        console.log('DEBUG: This is a pool with lanes, storing positions of contained elements');

        // Get current original positions
        const positions = elementInteractionManager.getOriginalPositions();
        console.log('DEBUG: Current original positions:', positions);
        const updatedPositions = { ...positions };

        // Store positions of all lanes in this pool
        element.lanes.forEach(laneId => {
          const lane = $bpmnStore.find(el => el.id === laneId && el.type === 'lane');
          if (lane && 'x' in lane && 'y' in lane) {
            updatedPositions[lane.id] = { x: lane.x, y: lane.y };
            console.log('DEBUG: Stored position for lane:', lane.id, 'position:', updatedPositions[lane.id]);
          }
        });

        // Store positions of all elements contained within the pool
        let elementsInsidePoolCount = 0;
        $bpmnStore.forEach(el => {
          if (isNode(el) && el.type !== 'pool' && el.type !== 'lane' && 'x' in el && 'y' in el) {
            // Check if element is inside the pool
            const isInside = isElementInsidePool(el, element);
            console.log('DEBUG: Checking if element is inside pool:', el.id, 'type:', el.type, 'result:', isInside);

            if (isInside) {
              elementsInsidePoolCount++;
              updatedPositions[el.id] = { x: el.x, y: el.y };
              console.log('DEBUG: Stored position for contained element:', el.id, 'position:', updatedPositions[el.id]);
            }
          }
        });
        console.log('DEBUG: Total elements inside pool:', elementsInsidePoolCount);

        // Update the original positions in the manager
        console.log('DEBUG: Setting updated positions in ElementInteractionManager');
        elementInteractionManager.setOriginalPositions(updatedPositions);
      }
    } else {
      console.log('DEBUG: Not handling pool/lane specific logic for element:', element.id, 'type:', element.type);

      // Check if this element is inside a pool
      if (isNode(element)) {
        const pools = $bpmnStore.filter(el => el.type === 'pool');
        for (const pool of pools) {
          if (isElementInsidePool(element, pool)) {
            console.log('DEBUG: Element is inside pool but pool is not being dragged directly:', pool.id);
            break;
          }
        }
      }
    }

    return true;
  }

  // Handle context menu for elements
  function handleElementContextMenu(event, element) {
    event.preventDefault();
    event.stopPropagation();

    // Show the context menu
    contextMenuPosition = { x: event.clientX, y: event.clientY };
    contextMenuElement = element;
    showElementContextMenu = true;

    // Add a click handler to hide the context menu when clicking outside
    setTimeout(() => {
      if (isBrowser) {
        window.addEventListener('click', hideElementContextMenu);
      }
    }, 0);
  }

  // Hide the element context menu
  function hideElementContextMenu() {
    showElementContextMenu = false;
    contextMenuElement = null;

    if (isBrowser) {
      window.removeEventListener('click', hideElementContextMenu);
    }
  }

  // Handle context menu actions
  function handleElementContextMenuAction(action) {
    if (!contextMenuElement) return;

    switch (action) {
      case 'create-connection':
        if (connectionManagerComponent) {
          connectionManagerComponent.startConnectionCreation(contextMenuElement);
        }
        break;
      case 'edit-label':
        openLabelDialog(contextMenuElement);
        break;
      case 'delete':
        bpmnStore.removeElement(contextMenuElement.id);
        break;
    }

    hideElementContextMenu();
  }

  // Handle keyboard events for accessibility - delegated to ElementInteractionManager
  function handleKeyDown(event, element) {
    // Handle global keyboard shortcuts
    if (event.key === 'Escape') {
      // Escape key - deselect all elements
      multiSelectionManager.deselectAll();
      return true;
    } else if (event.key === 'a' && (event.ctrlKey || event.metaKey)) {
      // Ctrl+A or Cmd+A - select all elements
      event.preventDefault();
      multiSelectionManager.selectAll();
      return true;
    }

    return elementInteractionManager.handleKeyDown(event, element);
  }

  // Handle resize start
  function startResize(element, position) {
    isResizing = true;
    resizingElementId = element.id;
    resizeHandlePosition = position;

    // Store original size and position
    originalSize = { width: element.width, height: element.height };
    originalPos = { x: element.x, y: element.y };

    // Add event listeners for mouse move and mouse up
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  // Handle resize drag
  function handleResizeDrag(dx, dy, position, element) {
    if (!isResizing || !element) return;

    let newWidth = originalSize.width;
    let newHeight = originalSize.height;
    let newX = originalPos.x;
    let newY = originalPos.y;

    // Calculate new size and position based on the handle being dragged
    switch (position) {
      case 'right':
        newWidth = Math.max(100, originalSize.width + dx);
        break;
      case 'bottom':
        newHeight = Math.max(100, originalSize.height + dy);
        break;
      case 'bottom-right':
        newWidth = Math.max(100, originalSize.width + dx);
        newHeight = Math.max(100, originalSize.height + dy);
        break;
    }

    // Update the element with the new size
    bpmnStore.updateElement(element.id, {
      width: newWidth,
      height: newHeight,
      x: newX,
      y: newY
    });

    // If this is a pool, also update its lanes
    if (element.type === 'pool' && element.lanes && element.lanes.length > 0) {
      // Update all lanes in this pool
      element.lanes.forEach(laneId => {
        const lane = $bpmnStore.find(el => el.id === laneId && el.type === 'lane');
        if (lane) {
          // Update lane width and height based on pool's new dimensions
          bpmnStore.updateElement(lane.id, {
            width: newWidth - 30, // Pool width minus label area
            height: newHeight / element.lanes.length // Divide height equally among lanes
          });
        }
      });

      // Reposition lanes vertically if needed
      let currentY = element.y;
      element.lanes.forEach((laneId) => {
        const lane = $bpmnStore.find(el => el.id === laneId && el.type === 'lane');
        if (lane) {
          // Use heightPercentage if available, otherwise divide equally
          const heightPercentage = lane.type === 'lane' && lane.heightPercentage ? lane.heightPercentage : (100 / element.lanes.length);
          const laneHeight = (newHeight * heightPercentage) / 100;

          bpmnStore.updateElement(lane.id, {
            y: currentY,
            height: laneHeight
          });

          // Update currentY for the next lane
          currentY += laneHeight;
        }
      });
    }
    // If this is a lane, handle lane resizing
    else if (element.type === 'lane') {
      if (position === 'bottom') {
        handleLaneResize(element, newHeight, position);
      } else if (position === 'right') {
        handleLaneResize(element, newWidth, position);
      }
    }
  }

  // Handle lane resizing
  function handleLaneResize(lane, newSize, position) {
    // Find the parent pool
    const pool = $bpmnStore.find(el => el.id === lane.parentRef && el.type === 'pool');
    if (!pool) return;

    // Find all lanes in this pool
    const lanes = $bpmnStore.filter(el =>
      el.type === 'lane' &&
      el.parentRef === pool.id
    );

    // Calculate the total size of all lanes except the one being resized
    const otherLanes = lanes.filter(l => l.id !== lane.id);

    // Minimum size for other lanes
    const minLaneSize = 50;
    const totalMinSize = otherLanes.length * minLaneSize;

    if (position === 'bottom') {
      // Vertical resizing (changing height)
      // Ensure we don't make the lane too large
      const maxAllowedHeight = pool.height - totalMinSize;
      const adjustedHeight = Math.min(newSize, maxAllowedHeight);

      // Sort lanes by y position to maintain order
      const sortedLanes = [...lanes].sort((a, b) => a.y - b.y);

      // Find the index of the lane being resized
      const resizeIndex = sortedLanes.findIndex(l => l.id === lane.id);
      if (resizeIndex === -1) return;


      // Calculate the height difference from the original lane height
      const heightDiff = adjustedHeight - lane.height;

      // If we're resizing the last lane, only adjust that lane
      if (resizeIndex === sortedLanes.length - 1) {
        // Update the resized lane
        bpmnStore.updateElement(lane.id, {
          height: adjustedHeight
        });

        // Adjust the lane above it (if any)
        if (resizeIndex > 0) {
          const laneAbove = sortedLanes[resizeIndex - 1];
          bpmnStore.updateElement(laneAbove.id, {
            height: laneAbove.height - heightDiff
          });
        }
      }
      // If we're resizing the first lane, adjust it and the lane below
      else if (resizeIndex === 0) {
        // Update the resized lane
        bpmnStore.updateElement(lane.id, {
          height: adjustedHeight
        });

        // Adjust the lane below it
        const laneBelow = sortedLanes[1];
        bpmnStore.updateElement(laneBelow.id, {
          y: pool.y + adjustedHeight,
          height: laneBelow.height - heightDiff
        });

        // Adjust all other lanes below
        let currentY = pool.y + adjustedHeight + laneBelow.height - heightDiff;
        for (let i = 2; i < sortedLanes.length; i++) {
          const nextLane = sortedLanes[i];
          bpmnStore.updateElement(nextLane.id, {
            y: currentY
          });
          currentY += nextLane.height;
        }
      }
      // If we're resizing a middle lane, adjust it and the lane below
      else {
        // Update the resized lane
        bpmnStore.updateElement(lane.id, {
          height: adjustedHeight
        });

        // Adjust the lane below it
        const laneBelow = sortedLanes[resizeIndex + 1];
        bpmnStore.updateElement(laneBelow.id, {
          y: lane.y + adjustedHeight,
          height: laneBelow.height - heightDiff
        });

        // Adjust all other lanes below
        let currentY = lane.y + adjustedHeight + laneBelow.height - heightDiff;
        for (let i = resizeIndex + 2; i < sortedLanes.length; i++) {
          const nextLane = sortedLanes[i];
          bpmnStore.updateElement(nextLane.id, {
            y: currentY
          });
          currentY += nextLane.height;
        }
      }
    } else if (position === 'right') {
      // Horizontal resizing (changing width)
      // Ensure we don't make the lane too large
      const maxAllowedWidth = pool.width - totalMinSize;
      const adjustedWidth = Math.min(newSize, maxAllowedWidth);

      // Sort lanes by x position to maintain order
      const sortedLanes = [...lanes].sort((a, b) => a.x - b.x);

      // Find the index of the lane being resized
      const resizeIndex = sortedLanes.findIndex(l => l.id === lane.id);
      if (resizeIndex === -1) return;

      // Calculate the width difference from the original lane width
      const widthDiff = adjustedWidth - lane.width;

      // If we're resizing the last lane, only adjust that lane
      if (resizeIndex === sortedLanes.length - 1) {
        // Update the resized lane
        bpmnStore.updateElement(lane.id, {
          width: adjustedWidth
        });

        // Adjust the lane to the left (if any)
        if (resizeIndex > 0) {
          const laneLeft = sortedLanes[resizeIndex - 1];
          bpmnStore.updateElement(laneLeft.id, {
            width: laneLeft.width - widthDiff
          });
        }
      }
      // If we're resizing the first lane, adjust it and the lane to the right
      else if (resizeIndex === 0) {
        // Update the resized lane
        bpmnStore.updateElement(lane.id, {
          width: adjustedWidth
        });

        // Adjust the lane to the right
        const laneRight = sortedLanes[1];
        bpmnStore.updateElement(laneRight.id, {
          x: pool.x + adjustedWidth,
          width: laneRight.width - widthDiff
        });

        // Adjust all other lanes to the right
        let currentX = pool.x + adjustedWidth + laneRight.width - widthDiff;
        for (let i = 2; i < sortedLanes.length; i++) {
          const nextLane = sortedLanes[i];
          bpmnStore.updateElement(nextLane.id, {
            x: currentX
          });
          currentX += nextLane.width;
        }
      }
      // If we're resizing a middle lane, adjust it and the lane to the right
      else {
        // Update the resized lane
        bpmnStore.updateElement(lane.id, {
          width: adjustedWidth
        });

        // Adjust the lane to the right
        const laneRight = sortedLanes[resizeIndex + 1];
        bpmnStore.updateElement(laneRight.id, {
          x: lane.x + adjustedWidth,
          width: laneRight.width - widthDiff
        });

        // Adjust all other lanes to the right
        let currentX = lane.x + adjustedWidth + laneRight.width - widthDiff;
        for (let i = resizeIndex + 2; i < sortedLanes.length; i++) {
          const nextLane = sortedLanes[i];
          bpmnStore.updateElement(nextLane.id, {
            x: currentX
          });
          currentX += nextLane.width;
        }
      }
    }
  }

  // Handle resize end
  function handleResizeEnd(dx, dy, position, element) {
    if (!isResizing || !element) return;

    // Calculate final size with snapping to grid
    let finalWidth = originalSize.width;
    let finalHeight = originalSize.height;
    let finalX = originalPos.x;
    let finalY = originalPos.y;

    switch (position) {
      case 'right':
        finalWidth = Math.max(100, snapToGrid(originalSize.width + dx, gridSize));
        break;
      case 'bottom':
        finalHeight = Math.max(100, snapToGrid(originalSize.height + dy, gridSize));
        break;
      case 'bottom-right':
        finalWidth = Math.max(100, snapToGrid(originalSize.width + dx, gridSize));
        finalHeight = Math.max(100, snapToGrid(originalSize.height + dy, gridSize));
        break;
    }

    // Update the element with the final snapped size
    bpmnStore.updateElement(element.id, {
      width: finalWidth,
      height: finalHeight,
      x: finalX,
      y: finalY
    });

    // If this is a pool, also update its lanes
    if (element.type === 'pool' && element.lanes && element.lanes.length > 0) {
      // Update all lanes in this pool
      const laneHeight = finalHeight / element.lanes.length;
      element.lanes.forEach((laneId, index) => {
        const lane = $bpmnStore.find(el => el.id === laneId && el.type === 'lane');
        if (lane) {
          bpmnStore.updateElement(lane.id, {
            width: finalWidth - 30, // Pool width minus label area
            height: laneHeight,
            y: element.y + (index * laneHeight)
          });
        }
      });
    }

    // Reset resizing state
    isResizing = false;
    resizingElementId = null;
    resizeHandlePosition = null;
  }

  // Handle mouse movement during drag or resize
  function handleMouseMove(event) {
    // Connection creation is now handled by the new ConnectionManager
    // Element dragging is now handled by ElementInteractionManager
  }

  // Handle selection of elements from the selection rectangle
  function handleSelectElements(elementIds) {
    console.log('DEBUG: Elements selected by rectangle:', elementIds);
    multiSelectionManager.selectElements(elementIds);
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
          elementManagerComponent.addTask(element.subtype, dropX, dropY);
        } else if (element.type === 'event') {
          elementManagerComponent.addEvent(element.subtype, element.eventDefinition || 'none', dropX, dropY);
        } else if (element.type === 'gateway') {
          elementManagerComponent.addGateway(element.subtype, dropX, dropY);
        } else if (element.type === 'subprocess') {
          elementManagerComponent.addSubProcess(element.subtype, dropX, dropY);
        } else if (element.type === 'dataobject') {
          if (element.subtype === 'input') {
            elementManagerComponent.addDataObject(true, false, dropX, dropY);
          } else if (element.subtype === 'output') {
            elementManagerComponent.addDataObject(false, true, dropX, dropY);
          } else {
            elementManagerComponent.addDataObject(false, false, dropX, dropY);
          }
        } else if (element.type === 'datastore') {
          elementManagerComponent.addDataStore(dropX, dropY);
        } else if (element.type === 'textannotation') {
          elementManagerComponent.addTextAnnotation(dropX, dropY);
        } else if (element.type === 'pool') {
          elementManagerComponent.addPool(dropX, dropY);
        } else if (element.type === 'lane') {
          // When dropping a lane directly, create a new pool with a lane
          elementManagerComponent.addPool(dropX, dropY);
        }
      } catch (error) {
        console.error('Error parsing dropped element data:', error);
      }
    }
  }

  // Handle canvas mouse down for panning or selection rectangle
  function handleCanvasMouseDown(event) {
    console.log('BPMN-EDITOR-CANVAS-DOWN: Function called', {
      target: event.target.tagName,
      button: event.button,
      fill: event.target.tagName === 'rect' ? event.target.getAttribute('fill') : null,
      selectionMode: $selectionMode,
      time: new Date().toISOString()
    });

    // Only handle if it's directly on the canvas, not on an element
    if (event.target.tagName === 'svg' || event.target.tagName === 'rect' && event.target.getAttribute('fill') === 'url(#grid)') {
      // Only handle left mouse button
      if (event.button !== 0) {
        console.log('BPMN-EDITOR-CANVAS-DOWN: Not left mouse button, returning');
        return;
      }

      event.preventDefault();

      // Get canvas coordinates
      const canvasRect = document.getElementById('canvas-container').getBoundingClientRect();
      const canvasX = event.clientX - canvasRect.left - viewportX;
      const canvasY = event.clientY - canvasRect.top - viewportY;
      console.log('BPMN-EDITOR-CANVAS-DOWN: Canvas coordinates', { canvasX, canvasY });

      // If in selection mode, let the SelectionRectangle component handle it
      if ($selectionMode) {
        // Do nothing here, the SelectionRectangle component will handle it
        console.log('BPMN-EDITOR-CANVAS-DOWN: In selection mode, letting SelectionRectangle handle it');
      } else {
        // Otherwise start canvas dragging
        console.log('BPMN-EDITOR-CANVAS-DOWN: Canvas drag initiated');
        canvasInteractionManager.startCanvasDrag(event);

        // Add event listeners for mouse move and mouse up
        if (isBrowser) {
          console.log('BPMN-EDITOR-CANVAS-DOWN: Adding mousemove and mouseup event listeners');
          window.addEventListener('mousemove', handleCanvasMouseMove);
          window.addEventListener('mouseup', handleCanvasMouseUp);
        }
      }
    } else {
      console.log('BPMN-EDITOR-CANVAS-DOWN: Not on canvas or grid, ignoring');
    }
  }

  // Handle canvas mouse move for panning
  function handleCanvasMouseMove(event) {
    // Log only occasionally to avoid flooding the console
    if (Math.random() < 0.05) {
      console.log('BPMN-EDITOR-CANVAS-MOVE: Function called', {
        clientX: event.clientX,
        clientY: event.clientY,
        time: new Date().toISOString()
      });
    }

    canvasInteractionManager.dragCanvas(event);

    // Sofort den Viewport-Store aktualisieren, um Reaktivität zu verbessern
    viewportStore.set(canvasInteractionManager.getViewport());
  }

  // Handle canvas mouse up for panning
  function handleCanvasMouseUp() {
    console.log('BPMN-EDITOR-CANVAS-UP: Function called', {
      time: new Date().toISOString()
    });

    canvasInteractionManager.endCanvasDrag();

    // Sofort den Viewport-Store aktualisieren, um Reaktivität zu verbessern
    viewportStore.set(canvasInteractionManager.getViewport());

    // Remove event listeners
    if (isBrowser) {
      console.log('BPMN-EDITOR-CANVAS-UP: Removing mousemove and mouseup event listeners');
      window.removeEventListener('mousemove', handleCanvasMouseMove);
      window.removeEventListener('mouseup', handleCanvasMouseUp);
    }

    console.log('BPMN-EDITOR-CANVAS-UP: Canvas drag ended');
  }

  // Handle canvas wheel for zooming (future enhancement)
  function handleCanvasWheel(event) {
    canvasInteractionManager.handleCanvasWheel(event);

    // Sofort den Viewport-Store aktualisieren, um Reaktivität zu verbessern
    viewportStore.set(canvasInteractionManager.getViewport());
  }

  // End dragging or resizing
  function handleMouseUp() {
    // Connection creation is now handled by the new ConnectionManager
    // Element dragging is now handled by ElementInteractionManager

    // Reset resizing states
    isResizing = false;
    resizingElementId = null;
    resizeHandlePosition = null;

    // Remove event listeners
    if (isBrowser) {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
  }

  // Removed old connection functions

  // Add Condition functionality removed

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

        // No need to set a default label position anymore - the ConnectionLabel component
        // will calculate it automatically based on the connection path
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

  // Handle double-click on a lane to edit its label
  function handleLaneDoubleClick(lane) {
    if (lane && lane.type === 'lane') {
      openLabelDialog(lane);
    }
  }

  // Removed connection endpoint adjustment functions

  // Connection Points functionality removed

  // This function is used for connection creation and preview
  // The actual connection points for rendering are calculated on-the-fly

  // Filter connections (moved to ConnectionRenderer)
</script>

<div class="bpmn-editor">
  <!-- Keyboard shortcuts for Undo/Redo -->
  <KeyboardShortcuts />
  <!-- Hidden file input for import -->
  <input
    id="bpmn-import-input"
    type="file"
    accept=".bpmn,.xml"
    style="display: none"
    on:change={handleImportBpmnXml}
  />

  <!-- Element Manager Component -->
  <ElementManagerComponent bind:this={elementManagerComponent} />

  <Toolbar
    on:add={({detail}) => {
      // Get the current mouse position or use default position
      const x = detail.x || 300;
      const y = detail.y || 200;

      if (detail.type === 'task') {
        elementManagerComponent.addTask(detail.subtype, x, y);
      } else if (detail.type === 'event') {
        elementManagerComponent.addEvent(detail.subtype, detail.eventDefinition || 'none', x, y);
      } else if (detail.type === 'gateway') {
        elementManagerComponent.addGateway(detail.subtype, x, y);
      } else if (detail.type === 'subprocess') {
        elementManagerComponent.addSubProcess(detail.subtype, x, y);
      } else if (detail.type === 'dataobject') {
        if (detail.subtype === 'input') {
          elementManagerComponent.addDataObject(true, false, x, y);
        } else if (detail.subtype === 'output') {
          elementManagerComponent.addDataObject(false, true, x, y);
        } else {
          elementManagerComponent.addDataObject(false, false, x, y);
        }
      } else if (detail.type === 'datastore') {
        elementManagerComponent.addDataStore(x, y);
      } else if (detail.type === 'textannotation') {
        elementManagerComponent.addTextAnnotation(x, y);
      } else if (detail.type === 'pool') {
        elementManagerComponent.addPool(x, y);
      } else if (detail.type === 'lane') {
        // Lane creation is handled differently
        // elementManagerComponent.addLane(poolId, label);
      }
    }}
    on:reset={() => bpmnStore.reset()}
    on:zoomIn={() => canvasInteractionManager.zoomIn()}
    on:zoomOut={() => canvasInteractionManager.zoomOut()}
    on:import={() => document.getElementById('bpmn-import-input').click()}
    on:export={handleExportBpmnXml}
  />

  <div
    class="canvas-container"
    id="canvas-container"
    on:dragover={handleDragOver}
    on:drop={handleDrop}
    on:dragleave={() => isDragOver = false}
    class:drag-over={isDragOver}
    role="region"
    aria-label="BPMN Editor Drop Zone"
  >
    {#if isDragOver}
      <div class="drop-indicator" style="left: {dropX}px; top: {dropY}px;"></div>
    {/if}
    <Canvas
      width={canvasWidth}
      height={canvasHeight}
      viewportX={viewportX}
      viewportY={viewportY}
      zoomLevel={zoomLevel}
      isDraggingCanvas={isDraggingCanvas}
      onMouseDown={handleCanvasMouseDown}
      onWheel={handleCanvasWheel}
    >

      <!-- Connection Manager -->
      <ConnectionManager
        bind:this={connectionManagerComponent}
        onEditLabel={(conn) => openLabelDialog(conn)}
      />

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
            on:contextmenu={e => handleElementContextMenu(e, element)}
            on:keydown={e => handleKeyDown(e, element)}
            role="button"
            tabindex="0"
            aria-label="Draggable {element.type} element: {element.label}"
          >
            <PoolLaneRenderer
              {element}
              isDragging={draggedElementId === element.id}
              onStartResize={startResize}
              onResizeDrag={handleResizeDrag}
              onResizeEnd={handleResizeEnd}
              onNodeDoubleClick={handleNodeDoubleClick}
              onLaneDoubleClick={handleLaneDoubleClick}
              onAddLane={addLane}
            />
          </g>
        {/if}
      {/each}

      <!-- Connection Manager -->
      <ConnectionManager
        bind:this={connectionManagerComponent}
        onEditLabel={(conn) => openLabelDialog(conn)}
      />

      <!-- Selection Rectangle (only shown in selection mode) -->
      {#if $selectionMode}
        <g>
          <rect
            x="0"
            y="0"
            width="1"
            height="1"
            fill="none"
            stroke="none"
            tabindex="0"
            role="button"
            aria-label="Selection area"
            on:mousedown={(e) => {
              console.log('BPMN-EDITOR: Selection mousedown', {
                target: e.target.tagName,
                button: e.button,
                time: new Date().toISOString()
              });

              // Only handle left mouse button
              if (e.button !== 0) return;

              // Only handle if it's directly on the canvas, not on an element
              if (!(e.target.tagName === 'svg' ||
                    (e.target.tagName === 'rect' && e.target.getAttribute('fill') === 'url(#grid)'))) {
                return;
              }

              // Get canvas coordinates
              const canvas = document.getElementById('canvas-container');
              if (!canvas) return;

              const rect = canvas.getBoundingClientRect();
              const startX = e.clientX - rect.left - viewportX;
              const startY = e.clientY - rect.top - viewportY;
              let currentX = startX;
              let currentY = startY;

              console.log('BPMN-EDITOR: Started selection at', { startX, startY });

              // Create selection rectangle
              const selectionRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
              selectionRect.setAttribute('fill', 'rgba(0, 123, 255, 0.1)');
              selectionRect.setAttribute('stroke', 'rgba(0, 123, 255, 0.8)');
              selectionRect.setAttribute('stroke-width', '1');
              selectionRect.setAttribute('stroke-dasharray', '5,5');
              selectionRect.setAttribute('x', startX);
              selectionRect.setAttribute('y', startY);
              selectionRect.setAttribute('width', '0');
              selectionRect.setAttribute('height', '0');

              // Add selection rectangle to SVG
              const svg = document.querySelector('svg');
              if (svg) {
                svg.appendChild(selectionRect);
              }

              // Handle mouse move
              const handleMouseMove = (moveEvent) => {
                // Get canvas coordinates
                const canvasRect = canvas.getBoundingClientRect();
                currentX = moveEvent.clientX - canvasRect.left - viewportX;
                currentY = moveEvent.clientY - canvasRect.top - viewportY;

                // Update selection rectangle
                const left = Math.min(startX, currentX);
                const top = Math.min(startY, currentY);
                const width = Math.abs(currentX - startX);
                const height = Math.abs(currentY - startY);

                selectionRect.setAttribute('x', left);
                selectionRect.setAttribute('y', top);
                selectionRect.setAttribute('width', width);
                selectionRect.setAttribute('height', height);
              };

              // Handle mouse up
              const handleMouseUp = (upEvent) => {
                // Remove event listeners
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);

                // Get selection rectangle dimensions
                const left = Math.min(startX, currentX);
                const top = Math.min(startY, currentY);
                const width = Math.abs(currentX - startX);
                const height = Math.abs(currentY - startY);

                console.log('BPMN-EDITOR: Ended selection at', {
                  left,
                  top,
                  width,
                  height
                });

                // Remove selection rectangle
                if (svg && selectionRect) {
                  svg.removeChild(selectionRect);
                }

                // Select elements within the rectangle
                const elements = $bpmnStore.filter(element => {
                  // Skip connections for now
                  if (element.type === 'connection') return false;

                  // Check if element overlaps with the selection rectangle
                  return (
                    element.x < left + width &&
                    element.x + element.width > left &&
                    element.y < top + height &&
                    element.y + element.height > top
                  );
                });

                // Get element IDs
                const elementIds = elements.map(element => element.id);
                console.log('BPMN-EDITOR: Selected elements:', elementIds);

                // Select the elements
                multiSelectionManager.selectElements(elementIds);
              };

              // Add event listeners
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);

              // Prevent default to avoid text selection
              e.preventDefault();
              e.stopPropagation();
            }}
          />
        </g>
      {/if}

      <!-- Manual optimize button removed -->

      <!-- Draw other BPMN elements (on top of pools and lanes) -->
      {#each $bpmnStore as element (element.id)}
        {#if element.type !== 'pool' && element.type !== 'lane' && isNode(element)}
          <!-- Group for each element to handle events together -->
          <g
            class="bpmn-element {draggedElementId === element.id ? 'dragging' : ''} {element.isSelected ? 'selected' : ''}"
            data-element-type={element.type}
            on:mousedown={e => handleMouseDown(e, element)}
            on:dblclick={() => handleNodeDoubleClick(element)}
            on:contextmenu={e => handleElementContextMenu(e, element)}
            on:keydown={e => handleKeyDown(e, element)}
            role="button"
            tabindex="0"
            aria-label="Draggable {element.type} element: {element.label}"
          >
            {#if element.type === 'task' || element.type === 'event' || element.type === 'gateway' || element.type === 'subprocess'}
              <ElementRenderer {element} isDragging={draggedElementId === element.id} isSelected={element.isSelected} />
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
                y={element.y + element.height + 20 - (element.label && element.label.includes('\n') ? (element.label.split('\n').length - 1) * 8 : 0)}
                text-anchor="middle"
                pointer-events="none"
                font-size="12px"
              >
                {#each (element.label || '').split('\n') as line, i}
                  <tspan x={element.x + element.width/2} dy={i === 0 ? 0 : 16}>{line}</tspan>
                {/each}
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
                y={element.y + 20 - (element.text && element.text.includes('\n') ? (element.text.split('\n').length - 1) * 8 : 0)}
                pointer-events="none"
                font-size="12px"
              >
                {#each (element.text || '').split('\n') as line, i}
                  <tspan x={element.x + 5} dy={i === 0 ? 0 : 16}>{line}</tspan>
                {/each}
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
                font-size="12px"
              >
                {element.label}
              </text>


            {/if}

            <!-- Connection points will be implemented in the new ConnectionManager component -->
          </g>
        {/if}
      {/each}

      <!-- Connection preview moved to ConnectionRenderer component -->
    </Canvas>
  </div>

  <!-- Label Edit Dialog -->
  <LabelEditDialog
    isOpen={isLabelDialogOpen}
    label={currentLabelText}
    isCondition={currentEditingConnection?.connectionType === 'sequence' && currentEditingConnection?.condition !== undefined}
    on:save={(e) => handleLabelSave(e.detail)}
    on:close={closeLabelDialog}
  />

  <!-- Element Context Menu -->
  {#if showElementContextMenu && contextMenuElement}
    <ElementContextMenu
      position={contextMenuPosition}
      element={contextMenuElement}
      onAction={handleElementContextMenuAction}
    />
  {/if}
</div>

<style>
  .bpmn-editor {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100vh;
    overflow: hidden;
  }

  /* Toolbar styles moved to Toolbar.svelte component */

  .canvas-container {
    overflow: hidden; /* Changed from auto to hidden to handle our own scrolling */
    background-color: #f9f9f9;
    position: relative;
    transition: all 0.2s;
    height: 100vh; /* Volle Höhe des Viewports */
    width: 100%;
    flex: 1; /* Nimm den verfügbaren Platz ein */
    display: flex; /* Verwende Flexbox für die Kinder */
    flex-direction: column; /* Stapele Kinder vertikal */
    cursor: grab; /* Show grab cursor to indicate the canvas can be panned */
  }

  /* Canvas dragging styles moved to Canvas.svelte */

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

  .bpmn-element.selected .element-shape,
  .bpmn-element.selected path,
  .bpmn-element.selected rect,
  .bpmn-element.selected ellipse {
    stroke: #007bff;
    stroke-width: 2.5px;
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


</style>
