import { get } from 'svelte/store';
import { bpmnStore } from '../stores/bpmnStore';
import { getMovingWith, getInternalConnections, isContainer } from '../utils/containment';
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
     * Ein Element ziehen - mit allem, was daran haengt.
     *
     * Was mitkommt, beantwortet getMovingWith an einer Stelle fuer alle
     * Faelle: Randereignisse folgen ihrer Aktivitaet, der Inhalt eines
     * aufgeklappten Unterprozesses folgt dem Unterprozess, und ein Pool nimmt
     * seine Lanes und deren Inhalt mit. Frueher galt nur der letzte Fall.
     *
     * Waehrend des Ziehens wird bewusst nicht am Raster eingerastet, damit die
     * Bewegung fluessig bleibt; das besorgt handleElementDragEnd.
     *
     * @param {string} elementId Id des gezogenen Elements
     * @param {number} dx Verschiebung in x seit dem Beginn
     * @param {number} dy Verschiebung in y seit dem Beginn
     * @param {Record<string,{x:number,y:number}>} originalPositions Positionen zu Beginn
     */
    handleElementDrag(elementId, dx, dy, originalPositions) {
        const elements = get(bpmnStore);
        const element = elements.find(el => el.id === elementId);
        if (!element) return;

        const originalPos = originalPositions[elementId];
        if (!originalPos) return;

        bpmnStore.updateElement(elementId, { x: originalPos.x + dx, y: originalPos.y + dy });

        if (!this.shouldMoveContents(element)) return;

        const movingIds = getMovingWith(element, elements);
        for (const id of movingIds) {
            const pos = originalPositions[id];
            if (!pos) continue; // beim Anfassen nicht erfasst - dann bleibt es stehen
            bpmnStore.updateElement(id, { x: pos.x + dx, y: pos.y + dy });
        }

        // Verbindungen, deren beide Enden mitwandern, behalten ihren Verlauf.
        const all = new Set([...movingIds, String(elementId)]);
        for (const connection of getInternalConnections(all, elements)) {
            const original = originalPositions[`waypoints:${connection.id}`];
            if (!original) continue;
            bpmnStore.updateConnectionWaypoints(
                connection.id,
                original.map(p => ({ x: p.x + dx, y: p.y + dy }))
            );
        }
    }

    /**
     * Entscheidet, ob der Inhalt eines Bereichs mitwandert.
     *
     * In der Mehrfachauswahl bewegt der Anwender ausgewaehlte Elemente, nicht
     * den Bereich - dann bleibt der Inhalt stehen, ausser der Bereich selbst
     * ist das einzige ausgewaehlte Element.
     *
     * @param {object} element
     * @returns {boolean}
     */
    shouldMoveContents(element) {
        if (!isContainer(element) && element.type !== 'task' && element.type !== 'subprocess') {
            return true; // ein einfacher Knoten: nur Randereignisse, immer mitnehmen
        }
        if (!multiSelectionManager.getSelectionMode()) return true;
        const selected = multiSelectionManager.getSelectedElementIds();
        return selected.includes(element.id) && selected.length === 1;
    }

    /**
     * Ziehen beenden: die Endlage am Raster einrasten und alles Mitbewegte um
     * denselben Betrag nachziehen, damit die Abstaende erhalten bleiben.
     *
     * @param {string} elementId
     */
    handleElementDragEnd(elementId) {
        const elements = get(bpmnStore);
        const element = elements.find(el => el.id === elementId);
        if (!element || element.type === 'connection') return;
        if (!('x' in element) || !('y' in element)) return;

        const [snappedX, snappedY] = snapPositionToGrid(element.x, element.y);
        const offsetX = snappedX - element.x;
        const offsetY = snappedY - element.y;
        bpmnStore.updateElement(elementId, { x: snappedX, y: snappedY });

        const connectionsToUpdate = new Set();
        for (const connection of elements) {
            if (connection.type !== 'connection') continue;
            if (connection.sourceId === elementId || connection.targetId === elementId) {
                connectionsToUpdate.add(connection.id);
            }
        }

        if (this.shouldMoveContents(element) && (offsetX !== 0 || offsetY !== 0)) {
            const movingIds = getMovingWith(element, elements);
            for (const id of movingIds) {
                const moved = elements.find(el => el.id === id);
                if (!moved || !('x' in moved) || !('y' in moved)) continue;
                bpmnStore.updateElement(id, { x: moved.x + offsetX, y: moved.y + offsetY });
            }
            const all = new Set([...movingIds, String(elementId)]);
            for (const connection of elements) {
                if (connection.type !== 'connection') continue;
                if (all.has(String(connection.sourceId)) || all.has(String(connection.targetId))) {
                    connectionsToUpdate.add(connection.id);
                }
            }
            for (const connection of getInternalConnections(all, elements)) {
                if (!Array.isArray(connection.waypoints) || !connection.waypoints.length) continue;
                bpmnStore.updateConnectionWaypoints(
                    connection.id,
                    connection.waypoints.map(p => ({ x: p.x + offsetX, y: p.y + offsetY }))
                );
                connectionsToUpdate.delete(connection.id); // Verlauf stimmt bereits
            }
        }

        if (connectionsToUpdate.size) {
            this.scheduleBatchConnectionUpdate([...connectionsToUpdate]);
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
}
// Export a singleton instance
export const elementManager = new ElementManager();
