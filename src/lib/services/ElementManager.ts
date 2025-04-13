import { bpmnStore } from '$lib/stores/bpmnStore';
import type { BpmnElementUnion, Position } from '$lib/models/bpmnElements';
import { snapPositionToGrid, snapToGrid } from '$lib/utils/gridUtils';
import {
  createTask,
  createEvent,
  createGateway,
  createSubProcess,
  createDataObject,
  createDataStore,
  createTextAnnotation,
  createPool,
  createLane
} from '$lib/utils/elementFactory';

/**
 * ElementManager Service
 *
 * Handles all element creation, manipulation, and management operations
 * for the BPMN editor.
 */
class ElementManager {
  /**
   * Add a new task element to the BPMN store
   * @param taskType The type of task
   * @param x The x position
   * @param y The y position
   * @returns The created task element
   */
  addTask(taskType = 'user', x = 200, y = 200): BpmnElementUnion {
    const newTask = createTask(taskType, x, y);
    bpmnStore.addElement(newTask);
    return newTask;
  }

  /**
   * Add a new event element to the BPMN store
   * @param eventType The type of event (start, intermediate, end)
   * @param eventDefinition The event definition (message, timer, etc.)
   * @param x The x position
   * @param y The y position
   * @returns The created event element
   */
  addEvent(eventType = 'start', eventDefinition = 'none', x = 400, y = 200): BpmnElementUnion {
    const newEvent = createEvent(eventType, eventDefinition, x, y);
    bpmnStore.addElement(newEvent);
    return newEvent;
  }

  /**
   * Add a new gateway element to the BPMN store
   * @param gatewayType The type of gateway
   * @param x The x position
   * @param y The y position
   * @returns The created gateway element
   */
  addGateway(gatewayType = 'exclusive', x = 300, y = 300): BpmnElementUnion {
    const newGateway = createGateway(gatewayType, x, y);
    bpmnStore.addElement(newGateway);
    return newGateway;
  }

  /**
   * Add a new subprocess element to the BPMN store
   * @param subProcessType The type of subprocess
   * @param x The x position
   * @param y The y position
   * @returns The created subprocess element
   */
  addSubProcess(subProcessType = 'embedded', x = 200, y = 300): BpmnElementUnion {
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
    return newSubProcess;
  }

  /**
   * Add a new data object element to the BPMN store
   * @param isInput Whether this is a data input
   * @param isOutput Whether this is a data output
   * @param x The x position
   * @param y The y position
   * @returns The created data object element
   */
  addDataObject(isInput = false, isOutput = false, x = 500, y = 200): BpmnElementUnion {
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
    return newDataObject;
  }

  /**
   * Add a new data store element to the BPMN store
   * @param x The x position
   * @param y The y position
   * @returns The created data store element
   */
  addDataStore(x = 500, y = 300): BpmnElementUnion {
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
    return newDataStore;
  }

  /**
   * Add a new text annotation element to the BPMN store
   * @param x The x position
   * @param y The y position
   * @returns The created text annotation element
   */
  addTextAnnotation(x = 600, y = 200): BpmnElementUnion {
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
    return newTextAnnotation;
  }

  /**
   * Add a new pool element to the BPMN store
   * @param x The x position
   * @param y The y position
   * @param isHorizontal Whether the pool is horizontal
   * @returns The created pool element
   */
  addPool(x = 100, y = 100, isHorizontal = true): BpmnElementUnion {
    const pool = createPool(x, y, isHorizontal);
    bpmnStore.addElement(pool);
    return pool;
  }

  /**
   * Add a new lane to a pool
   * @param poolId The ID of the parent pool
   * @param label The label for the lane
   * @returns The created lane element
   */
  addLane(poolId: string, label = 'New Lane'): BpmnElementUnion | null {
    let pool: BpmnElementUnion | undefined;
    let existingLanes: BpmnElementUnion[] = [];

    // Use a one-time subscription to get the current state
    const unsubscribe = bpmnStore.subscribe(store => {
      pool = store.find(el => el.id === poolId && el.type === 'pool');
      existingLanes = store.filter(el => el.type === 'lane' && el.parentRef === poolId);
    });
    unsubscribe();

    if (!pool) {
      console.error(`Pool with ID ${poolId} not found`);
      return null;
    }

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

    return newLane;
  }

  /**
   * Handle element dragging
   * @param elementId The ID of the element being dragged
   * @param dx The change in x position
   * @param dy The change in y position
   * @param originalPositions The original positions of elements before dragging
   */
  handleElementDrag(elementId: string, dx: number, dy: number, originalPositions: Record<string, Position>): void {
    let element: BpmnElementUnion | undefined;

    // Get the element being dragged
    const unsubscribe = bpmnStore.subscribe(store => {
      element = store.find(el => el.id === elementId);
    });
    unsubscribe();

    if (!element) return;

    // Get the original position of the dragged element
    const originalPos = originalPositions[elementId];
    if (!originalPos) return;

    // Calculate the new position based on the original position and the drag distance
    const newX = originalPos.x + dx;
    const newY = originalPos.y + dy;

    // Update the element position in the store (without snapping during drag for smooth movement)
    bpmnStore.updateElement(elementId, { x: newX, y: newY });

    // If this is a pool, also move all its lanes and contained elements
    if (element.type === 'pool' && element.lanes && element.lanes.length > 0) {
      // Move all lanes in this pool
      element.lanes.forEach(laneId => {
        let lane: BpmnElementUnion | undefined;
        const laneUnsubscribe = bpmnStore.subscribe(store => {
          lane = store.find(el => el.id === laneId && el.type === 'lane');
        });
        laneUnsubscribe();

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
      let allElements: BpmnElementUnion[] = [];
      const storeUnsubscribe = bpmnStore.subscribe(store => {
        allElements = store;
      });
      storeUnsubscribe();

      allElements.forEach(el => {
        if (el.type !== 'connection' && el.type !== 'pool' && el.type !== 'lane') {
          const elOriginalPos = originalPositions[el.id];
          if (elOriginalPos && this.isElementInsidePool(el, element!)) {
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

  /**
   * Handle element drag end (with snapping to grid)
   * @param elementId The ID of the element being dragged
   */
  handleElementDragEnd(elementId: string): void {
    // Find the element that was being dragged
    let element: BpmnElementUnion | undefined;
    const unsubscribe = bpmnStore.subscribe(store => {
      element = store.find(el => el.id === elementId);
    });
    unsubscribe();

    if (element && element.type !== 'connection' && 'x' in element && 'y' in element) {
      // Get the current position
      const currentX = element.x;
      const currentY = element.y;

      // Snap the final position to the grid
      const [snappedX, snappedY] = snapPositionToGrid(currentX, currentY);

      // Update the element with the snapped position
      bpmnStore.updateElement(elementId, { x: snappedX, y: snappedY });

      // If this is a pool, also update its lanes
      if (element.type === 'pool' && element.lanes && element.lanes.length > 0) {
        // Calculate the offset from snapping
        const offsetX = snappedX - currentX;
        const offsetY = snappedY - currentY;

        // Update all lanes in this pool
        element.lanes.forEach(laneId => {
          let lane: BpmnElementUnion | undefined;
          const laneUnsubscribe = bpmnStore.subscribe(store => {
            lane = store.find(el => el.id === laneId && el.type === 'lane');
          });
          laneUnsubscribe();

          if (lane && 'x' in lane && 'y' in lane) {
            bpmnStore.updateElement(lane.id, {
              x: lane.x + offsetX,
              y: lane.y + offsetY
            });
          }
        });

        // Update all elements contained within the pool
        let allElements: BpmnElementUnion[] = [];
        const storeUnsubscribe = bpmnStore.subscribe(store => {
          allElements = store;
        });
        storeUnsubscribe();

        allElements.forEach(el => {
          if (el.type !== 'connection' && el.type !== 'pool' && el.type !== 'lane' && 'x' in el && 'y' in el) {
            if (this.isElementInsidePool(el, element!)) {
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

  /**
   * Handle element resize
   * @param elementId The ID of the element being resized
   * @param dx The change in x position
   * @param dy The change in y position
   * @param position The resize handle position
   * @param originalSize The original size of the element
   * @param originalPos The original position of the element
   */
  handleElementResize(
    elementId: string,
    dx: number,
    dy: number,
    position: string,
    originalSize: { width: number, height: number },
    originalPos: { x: number, y: number }
  ): void {
    // Get the element being resized
    let element: BpmnElementUnion | undefined;
    const unsubscribe = bpmnStore.subscribe(store => {
      element = store.find(el => el.id === elementId);
    });
    unsubscribe();

    if (!element) return;

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
    bpmnStore.updateElement(elementId, {
      width: newWidth,
      height: newHeight,
      x: newX,
      y: newY
    });
  }

  /**
   * Handle element resize end (with snapping to grid)
   * @param elementId The ID of the element being resized
   * @param dx The change in x position
   * @param dy The change in y position
   * @param position The resize handle position
   * @param originalSize The original size of the element
   * @param originalPos The original position of the element
   */
  handleElementResizeEnd(
    elementId: string,
    dx: number,
    dy: number,
    position: string,
    originalSize: { width: number, height: number },
    originalPos: { x: number, y: number }
  ): void {
    // Get the element being resized
    let element: BpmnElementUnion | undefined;
    const unsubscribe = bpmnStore.subscribe(store => {
      element = store.find(el => el.id === elementId);
    });
    unsubscribe();

    if (!element) return;

    // Calculate final size with snapping to grid
    let finalWidth = originalSize.width;
    let finalHeight = originalSize.height;
    let finalX = originalPos.x;
    let finalY = originalPos.y;

    switch (position) {
      case 'right':
        finalWidth = Math.max(100, snapToGrid(originalSize.width + dx));
        break;
      case 'bottom':
        finalHeight = Math.max(100, snapToGrid(originalSize.height + dy));
        break;
      case 'bottom-right':
        finalWidth = Math.max(100, snapToGrid(originalSize.width + dx));
        finalHeight = Math.max(100, snapToGrid(originalSize.height + dy));
        break;
    }

    // Update the element with the final snapped size
    bpmnStore.updateElement(elementId, {
      width: finalWidth,
      height: finalHeight,
      x: finalX,
      y: finalY
    });

    // If this is a pool, also update its lanes
    if (element.type === 'pool' && element.lanes && element.lanes.length > 0 && 'y' in element) {
      // Update all lanes in this pool
      const laneHeight = finalHeight / element.lanes.length;
      element.lanes.forEach((laneId, index) => {
        let lane: BpmnElementUnion | undefined;
        const laneUnsubscribe = bpmnStore.subscribe(store => {
          lane = store.find(el => el.id === laneId && el.type === 'lane');
        });
        laneUnsubscribe();

        if (lane) {
          bpmnStore.updateElement(lane.id, {
            width: finalWidth - 30, // Pool width minus label area
            height: laneHeight,
            y: element.y + (index * laneHeight)
          });
        }
      });
    }
  }

  /**
   * Check if an element is inside a pool
   * @param element The element to check
   * @param pool The pool to check against
   * @returns Whether the element is inside the pool
   */
  isElementInsidePool(element: BpmnElementUnion, pool: BpmnElementUnion): boolean {
    if (!('x' in element) || !('y' in element) || !('width' in element) || !('height' in element)) {
      return false;
    }

    if (!('x' in pool) || !('y' in pool) || !('width' in pool) || !('height' in pool)) {
      return false;
    }

    // Check if the element's center is inside the pool
    const elementCenterX = element.x + element.width / 2;
    const elementCenterY = element.y + element.height / 2;

    return (
      elementCenterX >= pool.x &&
      elementCenterX <= pool.x + pool.width &&
      elementCenterY >= pool.y &&
      elementCenterY <= pool.y + pool.height
    );
  }
}

// Export a singleton instance
export const elementManager = new ElementManager();
