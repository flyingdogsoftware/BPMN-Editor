import { snapPositionToGrid } from './gridUtils';
/**
 * Creates a new task element
 * @param taskType The type of task to create
 * @param x The x position
 * @param y The y position
 * @returns A new task element
 */
export function createTask(taskType = 'user', x = 200, y = 200) {
    // Snap the position to grid
    const [snappedX, snappedY] = snapPositionToGrid(x, y);
    return {
        id: `task-${Date.now()}`,
        type: 'task',
        label: `${taskType.charAt(0).toUpperCase() + taskType.slice(1)} Task`,
        x: snappedX,
        y: snappedY,
        width: 120,
        height: 80,
        taskType: taskType
    };
}
/**
 * Creates a new event element
 * @param eventType The type of event (start, intermediate, end)
 * @param eventDefinition The event definition (message, timer, etc.)
 * @param x The x position
 * @param y The y position
 * @returns A new event element
 */
export function createEvent(eventType = 'start', eventDefinition = 'none', x = 200, y = 200) {
    // Snap the position to grid
    const [snappedX, snappedY] = snapPositionToGrid(x, y);
    const size = 36; // Default size for events
    return {
        id: `event-${Date.now()}`,
        type: 'event',
        label: `${eventType.charAt(0).toUpperCase() + eventType.slice(1)} Event`,
        x: snappedX - size / 2,
        y: snappedY - size / 2,
        width: size,
        height: size,
        eventType: eventType,
        eventDefinition: eventDefinition
    };
}
/**
 * Creates a new gateway element
 * @param gatewayType The type of gateway
 * @param x The x position
 * @param y The y position
 * @returns A new gateway element
 */
export function createGateway(gatewayType = 'exclusive', x = 200, y = 200) {
    // Snap the position to grid
    const [snappedX, snappedY] = snapPositionToGrid(x, y);
    const size = 50; // Default size for gateways
    return {
        id: `gateway-${Date.now()}`,
        type: 'gateway',
        label: `${gatewayType.charAt(0).toUpperCase() + gatewayType.slice(1)} Gateway`,
        x: snappedX - size / 2,
        y: snappedY - size / 2,
        width: size,
        height: size,
        gatewayType: gatewayType
    };
}
/**
 * Creates a new pool element
 * @param x The x position
 * @param y The y position
 * @param isHorizontal Whether the pool is horizontal
 * @returns A new pool element
 */
export function createPool(x = 100, y = 100, isHorizontal = true) {
    // Snap the position to grid
    const [snappedX, snappedY] = snapPositionToGrid(x, y);
    return {
        id: `pool-${Date.now()}`,
        type: 'pool',
        label: 'Pool',
        x: snappedX,
        y: snappedY,
        width: isHorizontal ? 600 : 400,
        height: isHorizontal ? 200 : 600,
        isHorizontal: isHorizontal,
        lanes: []
    };
}
/**
 * Creates a new lane element
 * @param poolId The ID of the parent pool
 * @param x The x position
 * @param y The y position
 * @param width The width
 * @param height The height
 * @param isHorizontal Whether the lane is horizontal
 * @returns A new lane element
 */
export function createLane(poolId, x = 100, y = 100, width = 600, height = 100, isHorizontal = true) {
    // Snap the position to grid
    const [snappedX, snappedY] = snapPositionToGrid(x, y);
    return {
        id: `lane-${Date.now()}`,
        type: 'lane',
        label: 'Lane',
        x: snappedX,
        y: snappedY,
        width: width,
        height: height,
        isHorizontal: isHorizontal,
        parentRef: poolId,
        flowNodeRefs: []
    };
}
/**
 * Creates a new sub-process element
 * @param subProcessType The type of sub-process
 * @param x The x position
 * @param y The y position
 * @returns A new sub-process element
 */
export function createSubProcess(subProcessType = 'embedded', x = 200, y = 300) {
    // Snap the position to grid
    const [snappedX, snappedY] = snapPositionToGrid(x, y);
    return {
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
}
/**
 * Creates a new data object element
 * @param isInput Whether this is a data input
 * @param isOutput Whether this is a data output
 * @param x The x position
 * @param y The y position
 * @returns A new data object element
 */
export function createDataObject(isInput = false, isOutput = false, x = 500, y = 200) {
    // Snap the position to grid
    const [snappedX, snappedY] = snapPositionToGrid(x, y);
    return {
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
}
/**
 * Creates a new data store element
 * @param x The x position
 * @param y The y position
 * @returns A new data store element
 */
export function createDataStore(x = 500, y = 300) {
    // Snap the position to grid
    const [snappedX, snappedY] = snapPositionToGrid(x, y);
    return {
        id: `datastore-${Date.now()}`,
        type: 'datastore',
        label: 'Data Store',
        x: snappedX,
        y: snappedY,
        width: 50,
        height: 50,
        isCollection: false
    };
}
/**
 * Creates a new text annotation element
 * @param x The x position
 * @param y The y position
 * @returns A new text annotation element
 */
export function createTextAnnotation(x = 600, y = 200) {
    // Snap the position to grid
    const [snappedX, snappedY] = snapPositionToGrid(x, y);
    return {
        id: `annotation-${Date.now()}`,
        type: 'textannotation',
        label: 'Annotation',
        text: 'Text Annotation',
        x: snappedX,
        y: snappedY,
        width: 100,
        height: 80
    };
}
/**
 * Creates a new connection element
 * @param sourceId The ID of the source element
 * @param targetId The ID of the target element
 * @param connectionType The type of connection
 * @returns A new connection element
 */
export function createConnection(sourceId, targetId, connectionType = 'sequence') {
    return {
        id: `connection-${Date.now()}`,
        type: 'connection',
        label: '',
        sourceId: sourceId,
        targetId: targetId,
        connectionType: connectionType,
        waypoints: []
    };
}
/**
 * Creates a new BPMN element based on the element type
 * @param elementType The type of element to create
 * @param subtype The subtype of the element
 * @param x The x position
 * @param y The y position
 * @returns A new BPMN element
 */
export function createElement(elementType, subtype, x = 200, y = 200) {
    switch (elementType) {
        case 'task':
            // Ensure subtype is a valid TaskType
            return createTask(subtype, x, y);
        case 'event':
            // Ensure subtype is a valid EventType
            return createEvent(subtype, 'none', x, y);
        case 'gateway':
            // Ensure subtype is a valid GatewayType
            return createGateway(subtype, x, y);
        case 'pool':
            return createPool(x, y, subtype === 'horizontal');
        case 'subprocess':
            // Ensure subtype is a valid SubProcessType
            return createSubProcess(subtype, x, y);
        case 'dataobject':
            if (subtype === 'input') {
                return createDataObject(true, false, x, y);
            }
            else if (subtype === 'output') {
                return createDataObject(false, true, x, y);
            }
            else {
                return createDataObject(false, false, x, y);
            }
        case 'datastore':
            return createDataStore(x, y);
        case 'textannotation':
            return createTextAnnotation(x, y);
        // Note: 'lane' and 'connection' are typically created differently, not via this generic function
        default:
            console.error(`Unsupported element type for generic creation: ${elementType}`);
            return null;
    }
}
