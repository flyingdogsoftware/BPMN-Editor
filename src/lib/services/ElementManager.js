import { bpmnStore } from '../stores/bpmnStore';
import { isNode } from '../models/bpmnElements';
import { snapPositionToGrid, snapToGrid } from '../utils/gridUtils';
import { removeNonCornerWaypoints } from '../utils/connectionRouting';
import { multiSelectionManager } from './MultiSelectionManager';
import { createTask, createEvent, createGateway, createPool } from '../utils/elementFactory';
/**
 * ElementManager Service
 *
 * Handles all element creation, manipulation, and management operations
 * for the BPMN editor.
 */
class ElementManager {
    constructor() {
        // Debounce timer for connection updates
        this.connectionUpdateTimer = null;
        // Collection of connections that need to be updated
        this.pendingConnectionUpdates = new Set();
    }
    /**
     * Add a new task element to the BPMN store
     * @param taskType The type of task
     * @param x The x position
     * @param y The y position
     * @returns The created task element
     */
    addTask(taskType = 'user', x = 200, y = 200) {
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
    addEvent(eventType = 'start', eventDefinition = 'none', x = 400, y = 200) {
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
    addGateway(gatewayType = 'exclusive', x = 300, y = 300) {
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
    addSubProcess(subProcessType = 'embedded', x = 200, y = 300) {
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
    addDataObject(isInput = false, isOutput = false, x = 500, y = 200) {
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
    addDataStore(x = 500, y = 300) {
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
    addTextAnnotation(x = 600, y = 200) {
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
    addPool(x = 100, y = 100, isHorizontal = true) {
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
    addLane(poolId, label = 'New Lane') {
        let pool;
        let existingLanes = [];
        // Use a one-time subscription to get the current state
        const unsubscribe = bpmnStore.subscribe(store => {
            pool = store.find(el => el.id === poolId && el.type === 'pool');
            existingLanes = store.filter(el => el.type === 'lane' && el.parentRef === poolId);
        });
        unsubscribe();
        if (!pool || !isNode(pool)) {
            console.error(`Pool with ID ${poolId} not found or is not a node`);
            return null;
        }
        // Calculate the height for each lane (including the new one)
        const laneCount = existingLanes.length + 1;
        const laneHeight = pool.height / laneCount;
        // Create a new lane
        const newLane = {
            id: `lane-${Date.now()}`,
            type: 'lane', // Use const assertion to make it a literal type
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
            if (isNode(lane) && pool && isNode(pool)) {
                bpmnStore.updateElement(lane.id, {
                    height: laneHeight,
                    // Adjust y positions to stack lanes vertically
                    y: pool.y + (index * laneHeight)
                });
            }
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
    handleElementDrag(elementId, dx, dy, originalPositions) {
        console.log('DEBUG: handleElementDrag called with elementId:', elementId, 'dx:', dx, 'dy:', dy);
        console.log('DEBUG: Original positions:', originalPositions);
        let element;
        // Get the element being dragged
        const unsubscribe = bpmnStore.subscribe(store => {
            element = store.find(el => el.id === elementId);
        });
        unsubscribe();
        console.log('DEBUG: Element being dragged:', element);
        if (!element) {
            console.log('DEBUG: Element not found, returning');
            return;
        }
        // Get the original position of the dragged element
        const originalPos = originalPositions[elementId];
        console.log('DEBUG: Original position for element:', originalPos);
        if (!originalPos) {
            console.log('DEBUG: No original position for element, returning');
            return;
        }
        // Calculate the new position based on the original position and the drag distance
        const newX = originalPos.x + dx;
        const newY = originalPos.y + dy;
        console.log('DEBUG: New position calculated:', { newX, newY });
        // Update the element position in the store (without snapping during drag for smooth movement)
        bpmnStore.updateElement(elementId, { x: newX, y: newY });
        console.log('DEBUG: Element position updated in store');
        // If this is a pool, also move all its lanes and contained elements
        // BUT ONLY if we're directly dragging the pool itself (not elements inside it)
        if (element.type === 'pool' && element.lanes && element.lanes.length > 0) {
            console.log('DEBUG: Element is a pool with lanes, handling pool-specific logic');
            // Check if we're in selection mode - if so, we don't want to move contained elements
            // because the user might be trying to move elements within the pool
            const inSelectionMode = multiSelectionManager.getSelectionMode();
            // Get the currently selected element IDs
            const selectedIds = multiSelectionManager.getSelectedElementIds();
            console.log('DEBUG: In selection mode:', inSelectionMode, 'Selected IDs:', selectedIds);
            // Only move contained elements if we're not in selection mode or if the pool itself is selected
            // (not elements inside it)
            const shouldMoveContainedElements = !inSelectionMode ||
                (selectedIds.includes(element.id) && selectedIds.length === 1);
            console.log('DEBUG: Should move contained elements:', shouldMoveContainedElements);
            if (shouldMoveContainedElements) {
                // Move all lanes in this pool
                element.lanes.forEach(laneId => {
                    let lane;
                    const laneUnsubscribe = bpmnStore.subscribe(store => {
                        lane = store.find(el => el.id === laneId && el.type === 'lane');
                    });
                    laneUnsubscribe();
                    const laneOriginalPos = originalPositions[laneId];
                    console.log('DEBUG: Lane:', lane?.id, 'Original position:', laneOriginalPos);
                    if (lane && laneOriginalPos) {
                        // Move the lane based on its original position plus the drag distance
                        bpmnStore.updateElement(lane.id, {
                            x: laneOriginalPos.x + dx,
                            y: laneOriginalPos.y + dy
                        });
                        console.log('DEBUG: Updated lane position');
                    }
                });
                // Move all elements contained within the pool
                let allElements = [];
                const storeUnsubscribe = bpmnStore.subscribe(store => {
                    allElements = store;
                });
                storeUnsubscribe();
                console.log('DEBUG: Checking for elements inside the pool');
                let elementsInsidePoolCount = 0;
                allElements.forEach(el => {
                    if (el.type !== 'connection' && el.type !== 'pool' && el.type !== 'lane') {
                        const elOriginalPos = originalPositions[el.id];
                        const isInside = this.isElementInsidePool(el, element);
                        console.log('DEBUG: Element:', el.id, 'type:', el.type, 'is inside pool:', isInside, 'has original position:', !!elOriginalPos);
                        if (elOriginalPos && isInside) {
                            elementsInsidePoolCount++;
                            // Move the element based on its original position plus the drag distance
                            bpmnStore.updateElement(el.id, {
                                x: elOriginalPos.x + dx,
                                y: elOriginalPos.y + dy
                            });
                            console.log('DEBUG: Updated element position inside pool');
                        }
                    }
                });
                console.log('DEBUG: Total elements inside pool that were moved:', elementsInsidePoolCount);
            }
        }
    }
    /**
     * Handle element drag end (with snapping to grid)
     * @param elementId The ID of the element being dragged
     */
    handleElementDragEnd(elementId) {
        // Find the element that was being dragged
        let element;
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
            // BUT ONLY if we're directly dragging the pool itself (not elements inside it)
            if (element.type === 'pool' && element.lanes && element.lanes.length > 0) {
                // Check if we're in selection mode - if so, we don't want to move contained elements
                // because the user might be trying to move elements within the pool
                const inSelectionMode = multiSelectionManager.getSelectionMode();
                // Get the currently selected element IDs
                const selectedIds = multiSelectionManager.getSelectedElementIds();
                console.log('DEBUG: In selection mode:', inSelectionMode, 'Selected IDs:', selectedIds);
                // Only move contained elements if we're not in selection mode or if the pool itself is selected
                // (not elements inside it)
                const shouldMoveContainedElements = !inSelectionMode ||
                    (selectedIds.includes(element.id) && selectedIds.length === 1);
                console.log('DEBUG: Should move contained elements:', shouldMoveContainedElements);
                if (shouldMoveContainedElements) {
                    // Calculate the offset from snapping
                    const offsetX = snappedX - currentX;
                    const offsetY = snappedY - currentY;
                    // Update all lanes in this pool
                    element.lanes.forEach(laneId => {
                        let lane;
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
                    let allElements = [];
                    const storeUnsubscribe = bpmnStore.subscribe(store => {
                        allElements = store;
                    });
                    storeUnsubscribe();
                    // Collect all connections that need to be updated
                    const connectionsToUpdate = new Set();
                    allElements.forEach(el => {
                        if (el.type !== 'connection' && el.type !== 'pool' && el.type !== 'lane' && 'x' in el && 'y' in el) {
                            if (this.isElementInsidePool(el, element)) {
                                bpmnStore.updateElement(el.id, {
                                    x: el.x + offsetX,
                                    y: el.y + offsetY
                                });
                                // Add any connections connected to this element to the update list
                                allElements.forEach(conn => {
                                    if (conn.type === 'connection' && (conn.sourceId === el.id || conn.targetId === el.id)) {
                                        connectionsToUpdate.add(conn.id);
                                    }
                                });
                            }
                        }
                    });
                    // Schedule a batch update for all affected connections
                    if (connectionsToUpdate.size > 0) {
                        console.log(`Scheduling batch update for ${connectionsToUpdate.size} connections`);
                        this.scheduleBatchConnectionUpdate(connectionsToUpdate);
                    }
                }
            }
            else {
                // For non-pool elements, just optimize the directly connected connections
                this.optimizeConnectedConnections(elementId);
            }
        }
    }
    /**
     * Schedule a batch update for multiple connections
     * @param connectionIds Set of connection IDs to update
     */
    scheduleBatchConnectionUpdate(connectionIds) {
        // Add all connection IDs to the pending updates set
        connectionIds.forEach(id => this.pendingConnectionUpdates.add(id));
        // Clear any existing timer
        if (this.connectionUpdateTimer !== null) {
            window.clearTimeout(this.connectionUpdateTimer);
        }
        // Set a new timer to process all pending updates
        this.connectionUpdateTimer = window.setTimeout(() => {
            console.log(`Processing batch update for ${this.pendingConnectionUpdates.size} connections`);
            const startTime = performance.now();
            // Process all pending updates
            this.processPendingConnectionUpdates();
            const endTime = performance.now();
            console.log(`Batch connection update completed in ${endTime - startTime}ms`);
            this.connectionUpdateTimer = null;
        }, 200); // 200ms delay to batch updates
    }
    /**
     * Process all pending connection updates
     */
    processPendingConnectionUpdates() {
        // Get all elements from the store
        let allElements = [];
        const unsubscribe = bpmnStore.subscribe(store => {
            allElements = store;
        });
        unsubscribe();
        // Process each pending connection
        const pendingIds = Array.from(this.pendingConnectionUpdates);
        // Clear the pending updates set
        this.pendingConnectionUpdates.clear();
        // Batch process connections in smaller chunks to avoid UI freezing
        const chunkSize = 10;
        for (let i = 0; i < pendingIds.length; i += chunkSize) {
            const chunk = pendingIds.slice(i, i + chunkSize);
            // Process this chunk immediately
            this.processConnectionChunk(chunk, allElements);
            // If there are more chunks, schedule them with a small delay
            if (i + chunkSize < pendingIds.length) {
                const nextChunk = pendingIds.slice(i + chunkSize, i + chunkSize * 2);
                setTimeout(() => {
                    this.processConnectionChunk(nextChunk, allElements);
                }, 10);
            }
        }
    }
    /**
     * Process a chunk of connections
     * @param connectionIds Array of connection IDs to process
     * @param allElements All elements from the store
     */
    processConnectionChunk(connectionIds, allElements) {
        connectionIds.forEach(connectionId => {
            const connection = allElements.find(el => el.id === connectionId && el.type === 'connection');
            if (!connection)
                return;
            // Find source and target elements
            const source = allElements.find(el => el.id === connection.sourceId);
            const target = allElements.find(el => el.id === connection.targetId);
            if (!source || !target)
                return;
            // Calculate source and target centers
            const sourceCenter = {
                x: source.x + source.width / 2,
                y: source.y + source.height / 2
            };
            const targetCenter = {
                x: target.x + target.width / 2,
                y: target.y + target.height / 2
            };
            // Make a deep copy of the waypoints
            const waypoints = JSON.parse(JSON.stringify(connection.waypoints || []));
            // Optimize the waypoints
            const optimizedWaypoints = removeNonCornerWaypoints(sourceCenter, targetCenter, waypoints);
            // Update the connection with optimized waypoints
            bpmnStore.updateConnectionWaypoints(connection.id, optimizedWaypoints);
        });
    }
    /**
     * Optimize all connections connected to an element
     * @param elementId The ID of the element
     */
    optimizeConnectedConnections(elementId) {
        // Get all connections from the store
        let connections = [];
        let allElements = [];
        const unsubscribe = bpmnStore.subscribe(store => {
            connections = store.filter(el => el.type === 'connection' &&
                (el.sourceId === elementId || el.targetId === elementId));
            allElements = store;
        });
        unsubscribe();
        // Create a set of connection IDs to update
        const connectionIds = new Set();
        connections.forEach(connection => {
            if (connection.type === 'connection') {
                connectionIds.add(connection.id);
            }
        });
        // Schedule a batch update
        if (connectionIds.size > 0) {
            this.scheduleBatchConnectionUpdate(connectionIds);
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
    handleElementResize(elementId, dx, dy, position, originalSize, originalPos) {
        // Get the element being resized
        let element;
        const unsubscribe = bpmnStore.subscribe(store => {
            element = store.find(el => el.id === elementId);
        });
        unsubscribe();
        if (!element)
            return;
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
    handleElementResizeEnd(elementId, dx, dy, position, originalSize, originalPos) {
        // Get the element being resized
        let element;
        const unsubscribe = bpmnStore.subscribe(store => {
            element = store.find(el => el.id === elementId);
        });
        unsubscribe();
        if (!element)
            return;
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
        if (element.type === 'pool' && element.lanes && element.lanes.length > 0 && isNode(element)) {
            // Update all lanes in this pool
            const laneHeight = finalHeight / element.lanes.length;
            element.lanes.forEach((laneId, index) => {
                let lane;
                const laneUnsubscribe = bpmnStore.subscribe(store => {
                    lane = store.find(el => el.id === laneId && el.type === 'lane');
                });
                laneUnsubscribe();
                if (lane && element && isNode(element)) {
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
    isElementInsidePool(element, pool) {
        if (!isNode(element) || !isNode(pool)) {
            return false;
        }
        // Check if the element's center is inside the pool
        const elementCenterX = element.x + element.width / 2;
        const elementCenterY = element.y + element.height / 2;
        const result = (elementCenterX >= pool.x &&
            elementCenterX <= pool.x + pool.width &&
            elementCenterY >= pool.y &&
            elementCenterY <= pool.y + pool.height);
        console.log('DEBUG: isElementInsidePool check:', {
            elementId: element.id,
            elementType: element.type,
            elementCenter: { x: elementCenterX, y: elementCenterY },
            poolId: pool.id,
            poolBounds: { x: pool.x, y: pool.y, width: pool.width, height: pool.height },
            result: result
        });
        return result;
    }
}
// Export a singleton instance
export const elementManager = new ElementManager();
