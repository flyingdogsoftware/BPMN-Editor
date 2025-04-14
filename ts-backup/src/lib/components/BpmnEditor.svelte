<script lang="ts">
  import { bpmnStore } from '$lib/stores/bpmnStore';
  import { snapPositionToGrid, snapToGrid } from '$lib/utils/gridUtils';
  import { isValidConnection, calculateConnectionPoints } from '$lib/utils/connectionUtils';
  import { onMount } from 'svelte';
  import { importBpmnXml } from '$lib/utils/xml/bpmnXmlParser';

  // Import new utility modules
  import { createElement } from '$lib/utils/elementFactory';
  import { handleDragStart, calculateDragPosition, handleElementDrop } from '$lib/utils/dragHandlers';
  import { handleResizeStart, calculateResizeValues } from '$lib/utils/resizeHandlers';
  import { findClosestConnectionPoint, handleConnectionStart, handleConnectionComplete } from '$lib/utils/connectionHandlers';

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
  import ConnectionPointWrapper from './ConnectionPointWrapper.svelte';
  import ConnectionPreview from './ConnectionPreview.svelte';
  import Connection from './Connection.svelte';
  import LabelEditDialog from './LabelEditDialog.svelte';
  import Toolbar from './toolbar/Toolbar.svelte';
  import ResizeHandle from './ResizeHandle.svelte';

  // Import new components
  import Canvas from './Canvas.svelte';
  import ElementFactory from './ElementFactory.svelte';
  import ElementRenderer from './renderers/ElementRenderer.svelte';
  import TaskRenderer from './renderers/TaskRenderer.svelte';
  import EventRenderer from './renderers/EventRenderer.svelte';
  import GatewayRenderer from './renderers/GatewayRenderer.svelte';
  import ConnectionRenderer from './renderers/ConnectionRenderer.svelte';
  import PoolLaneRenderer from './renderers/PoolLaneRenderer.svelte';

  // Listen for edit-label events from Connection components
  onMount(() => {
    if (isBrowser) {
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
      openLabelDialog(connection, connection.connectionType === 'sequence');
    }
  }

  // Canvas dimensions - will be set dynamically based on window size
  let canvasWidth = 800; // Default size before client-side rendering
  let canvasHeight = 600; // Default size before client-side rendering

  // Viewport state for panning/scrolling
  let viewportX = 0;
  let viewportY = 0;
  let isDraggingCanvas = false;
  let dragCanvasStartX = 0;
  let dragCanvasStartY = 0;
  let canvasContainerElement;

  // Check if we're in a browser environment
  const isBrowser = typeof window !== 'undefined';

  // Calculate the minimum canvas size based on element positions
  $: {
    // Default minimum size
    let minWidth = isBrowser ? window.innerWidth : 1200; // Fallback size for SSR
    let minHeight = isBrowser ? window.innerHeight : 800; // Fallback size for SSR

    // Find the furthest element to determine required canvas size
    $bpmnStore.forEach(element => {
      if (element.type !== 'connection') {
        const rightEdge = element.x + element.width + 200; // Add some padding
        const bottomEdge = element.y + element.height + 200; // Add some padding

        minWidth = Math.max(minWidth, rightEdge);
        minHeight = Math.max(minHeight, bottomEdge);
      }
    });

    // Update canvas dimensions if needed
    canvasWidth = Math.max(canvasWidth, minWidth);
    canvasHeight = Math.max(canvasHeight, minHeight);
  }

  // Function to position the viewport for optimal element visibility
  function centerViewportOnElements() {
    // Always start with viewport at 0,0
    viewportX = 0;
    viewportY = 0;

    // If there are no elements, just keep viewport at 0,0
    if ($bpmnStore.length === 0) return;

    // Find the bounding box of all elements
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    $bpmnStore.forEach(element => {
      if (element.type !== 'connection' && 'x' in element && 'y' in element) {
        minX = Math.min(minX, element.x);
        minY = Math.min(minY, element.y);
        maxX = Math.max(maxX, element.x + (element.width || 0));
        maxY = Math.max(maxY, element.y + (element.height || 0));
      }
    });

    // If we found elements, check if they're already visible
    if (minX !== Infinity && minY !== Infinity) {
      // Get the visible area dimensions
      const visibleWidth = isBrowser ? window.innerWidth : 1200;
      const visibleHeight = isBrowser ? window.innerHeight : 800;

      // If all elements are already visible within the viewport at position 0,0,
      // then we don't need to adjust the viewport
      if (maxX <= visibleWidth && maxY <= visibleHeight) {
        // All elements are visible, keep viewport at 0,0
        return;
      }

      // If we get here, some elements are outside the visible area
      // We'll only adjust the viewport if absolutely necessary
      // and we'll try to keep as many elements visible as possible

      // Add a small margin to ensure elements aren't right at the edge
      const margin = 20;

      // If elements extend beyond the right or bottom edge but are still
      // close to the origin, we might not need to adjust the viewport
      if (minX < margin && minY < margin &&
          maxX < visibleWidth * 1.5 && maxY < visibleHeight * 1.5) {
        // Elements are still relatively close to the origin, keep viewport at 0,0
        return;
      }

      // At this point, we need to adjust the viewport to show the elements
      // We'll try to keep the top-left corner of the elements visible
      viewportX = Math.max(0, minX - margin);
      viewportY = Math.max(0, minY - margin);
    }
  }

  // Update canvas dimensions when window is resized
  onMount(() => {
    if (isBrowser) {
      const updateCanvasSize = () => {
        // Update the visible area size
        const visibleWidth = window.innerWidth;
        const visibleHeight = window.innerHeight;

        // Ensure canvas is at least as large as the window
        canvasWidth = Math.max(visibleWidth, canvasWidth);
        canvasHeight = Math.max(visibleHeight, canvasHeight);
      };

      window.addEventListener('resize', updateCanvasSize);
      updateCanvasSize(); // Initial size

      // Center the viewport on the diagram elements
      centerViewportOnElements();

      // Initialize the canvas container reference
      canvasContainerElement = document.getElementById('canvas-container');

      return () => {
        window.removeEventListener('resize', updateCanvasSize);
      };
    }
  });

  // Grid size for snapping
  const gridSize = 20;

  // Dragging state
  let isDragging = false;
  let draggedElementId = null;
  let dragStartX = 0;
  let dragStartY = 0;
  // These variables are used for storing original positions during drag
  let originalPositions = {}; // Store original positions of elements being moved together

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

  // Element Manager Component reference
  let elementManagerComponent;

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
      if ('x' in element && 'y' in element) {
        originalPositions[element.id] = { x: element.x, y: element.y };
      }

      // If this is a pool, store positions of all lanes and contained elements
      if (element.type === 'pool' && element.lanes && element.lanes.length > 0) {
        // Store positions of all lanes in this pool
        element.lanes.forEach(laneId => {
          const lane = $bpmnStore.find(el => el.id === laneId && el.type === 'lane');
          if (lane && 'x' in lane && 'y' in lane) {
            originalPositions[lane.id] = { x: lane.x, y: lane.y };
          }
        });

        // Store positions of all elements contained within the pool
        $bpmnStore.forEach(el => {
          if (isNode(el) && el.type !== 'pool' && el.type !== 'lane' && 'x' in el && 'y' in el) {
            // Check if element is inside the pool
            if (isElementInsidePool(el, element)) {
              originalPositions[el.id] = { x: el.x, y: el.y };
            }
          }
        });
      }
    }

    // Add event listeners for mouse move and mouse up
    if (isBrowser) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
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

      // Use the ElementManagerComponent to handle element dragging
      if (elementManagerComponent) {
        elementManagerComponent.handleElementDrag(draggedElementId, dx, dy);
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

  // Handle canvas mouse down for panning
  function handleCanvasMouseDown(event) {
    // Only handle if it's directly on the canvas, not on an element
    if (event.target.tagName === 'svg' || event.target.tagName === 'rect' && event.target.getAttribute('fill') === 'url(#grid)') {
      // Only handle left mouse button
      if (event.button !== 0) return;

      event.preventDefault();

      // Start canvas dragging
      isDraggingCanvas = true;
      dragCanvasStartX = event.clientX - viewportX;
      dragCanvasStartY = event.clientY - viewportY;

      // Add event listeners for mouse move and mouse up
      if (isBrowser) {
        window.addEventListener('mousemove', handleCanvasMouseMove);
        window.addEventListener('mouseup', handleCanvasMouseUp);
      }
    }
  }

  // Handle canvas mouse move for panning
  function handleCanvasMouseMove(event) {
    if (isDraggingCanvas) {
      // Calculate new viewport position
      const newViewportX = event.clientX - dragCanvasStartX;
      const newViewportY = event.clientY - dragCanvasStartY;

      // Only allow panning to the left and up (negative values)
      // This prevents panning to the right and down (positive values)
      viewportX = Math.min(0, newViewportX);
      viewportY = Math.min(0, newViewportY);
    }
  }

  // Handle canvas mouse up for panning
  function handleCanvasMouseUp() {
    isDraggingCanvas = false;

    // Remove event listeners
    if (isBrowser) {
      window.removeEventListener('mousemove', handleCanvasMouseMove);
      window.removeEventListener('mouseup', handleCanvasMouseUp);
    }
  }

  // Handle canvas wheel for zooming (future enhancement)
  function handleCanvasWheel(event) {
    // Prevent default scrolling behavior
    event.preventDefault();

    // Calculate scroll direction and adjust viewport
    if (event.deltaY < 0) {
      // Scroll up - move viewport down
      viewportY = Math.min(0, viewportY + 50);
    } else {
      // Scroll down - move viewport up
      viewportY = Math.min(0, viewportY - 50);
    }

    // Horizontal scrolling with shift key
    if (event.shiftKey) {
      if (event.deltaY < 0) {
        // Scroll right
        viewportX = Math.min(0, viewportX - 50);
      } else {
        // Scroll left
        viewportX = Math.min(0, viewportX + 50);
      }
    }
  }

  // End dragging or resizing
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
      // Use the ElementManagerComponent to handle element drag end
      if (elementManagerComponent) {
        elementManagerComponent.handleElementDragEnd(draggedElementId);
      }
    }

    // Reset dragging and resizing states
    isDragging = false;
    draggedElementId = null;
    isResizing = false;
    resizingElementId = null;
    resizeHandlePosition = null;

    // Remove event listeners
    if (isBrowser) {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
  }

  // Start creating a connection
  function handleConnectionPointMouseDown(event, point) {
    event.stopPropagation();
    event.preventDefault();

    isCreatingConnection = true;
    connectionStartPoint = point;
    connectionEndPosition = { x: point.x, y: point.y };

    // Add event listeners for mouse move and mouse up
    if (isBrowser) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
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

  // Handle double-click on a lane to edit its label
  function handleLaneDoubleClick(lane) {
    if (lane && lane.type === 'lane') {
      openLabelDialog(lane);
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

  // Filter connections (moved to ConnectionRenderer)
</script>

<div class="bpmn-editor">
  <div style="padding: 8px 16px;">
    <label for="bpmn-import-input" style="display: inline-block; margin-right: 8px;">
      <button type="button" on:click={() => document.getElementById('bpmn-import-input').click()}>
        Import BPMN XML
      </button>
    </label>
    <input
      id="bpmn-import-input"
      type="file"
      accept=".bpmn,.xml"
      style="display: none"
      on:change={handleImportBpmnXml}
    />
    <button type="button" on:click={() => importTestPoolsFile()} style="margin-left: 8px;">
      Test Import Pools
    </button>
  </div>
  <!-- Element Manager Component -->
  <ElementManagerComponent bind:this={elementManagerComponent} bind:originalPositions />

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
    on:toggleConnectionPoints={toggleConnectionPoints}
    on:addCondition={addConditionToSelectedConnection}
    on:reset={() => bpmnStore.reset()}
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
      isDraggingCanvas={isDraggingCanvas}
      onMouseDown={handleCanvasMouseDown}
      onWheel={handleCanvasWheel}
    >

      <!-- Markers for connections moved to ConnectionRenderer -->

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

      <!-- Connection rendering moved to ConnectionRenderer component -->
      <ConnectionRenderer
        onConnectionSelect={handleConnectionSelect}
        onConnectionEndpointAdjustment={handleConnectionEndpointAdjustment}
        onEditLabel={(conn) => openLabelDialog(conn)}
        isCreatingConnection={isCreatingConnection}
        connectionStartPoint={connectionStartPoint}
        connectionEndPosition={connectionEndPosition}
        connectionPreviewValid={connectionPreviewValid}
      />

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
              <TaskRenderer {element} isDragging={draggedElementId === element.id} />
            {:else if element.type === 'event'}
              <EventRenderer {element} isDragging={draggedElementId === element.id} />
            {:else if element.type === 'gateway'}
              <GatewayRenderer {element} isDragging={draggedElementId === element.id} />
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

            <!-- Connection points -->
            {#if showConnectionPoints || isCreatingConnection}
              {#each calculateConnectionPoints(element) as point (point.id)}
                <ConnectionPointWrapper
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
    height: 100vh;
    width: 100%;
    cursor: grab; /* Show grab cursor to indicate the canvas can be panned */
  }

  .canvas-scroll-container.dragging {
    cursor: grabbing; /* Show grabbing cursor when actively panning */
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
    min-height: 100vh;
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


</style>
