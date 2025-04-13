import type { BpmnElementUnion } from '$lib/models/bpmnElements';
import { snapPositionToGrid } from './gridUtils';

/**
 * Creates a new task element
 * @param taskType The type of task to create
 * @param x The x position
 * @param y The y position
 * @returns A new task element
 */
export function createTask(taskType = 'user', x = 200, y = 200): BpmnElementUnion {
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
export function createEvent(eventType = 'start', eventDefinition = 'none', x = 200, y = 200): BpmnElementUnion {
  // Snap the position to grid
  const [snappedX, snappedY] = snapPositionToGrid(x, y);
  
  const size = 36; // Default size for events
  
  return {
    id: `event-${Date.now()}`,
    type: 'event',
    label: `${eventType.charAt(0).toUpperCase() + eventType.slice(1)} Event`,
    x: snappedX - size/2,
    y: snappedY - size/2,
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
export function createGateway(gatewayType = 'exclusive', x = 200, y = 200): BpmnElementUnion {
  // Snap the position to grid
  const [snappedX, snappedY] = snapPositionToGrid(x, y);
  
  const size = 50; // Default size for gateways
  
  return {
    id: `gateway-${Date.now()}`,
    type: 'gateway',
    label: `${gatewayType.charAt(0).toUpperCase() + gatewayType.slice(1)} Gateway`,
    x: snappedX - size/2,
    y: snappedY - size/2,
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
export function createPool(x = 100, y = 100, isHorizontal = true): BpmnElementUnion {
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
export function createLane(poolId: string, x = 100, y = 100, width = 600, height = 100, isHorizontal = true): BpmnElementUnion {
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
 * Creates a new connection element
 * @param sourceId The ID of the source element
 * @param targetId The ID of the target element
 * @param connectionType The type of connection
 * @returns A new connection element
 */
export function createConnection(sourceId: string, targetId: string, connectionType = 'sequence'): BpmnElementUnion {
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
 * @param x The x position
 * @param y The y position
 * @returns A new BPMN element
 */
export function createElement(elementType: string, subtype: string, x = 200, y = 200): BpmnElementUnion | null {
  switch (elementType) {
    case 'task':
      return createTask(subtype, x, y);
    case 'event':
      return createEvent(subtype, 'none', x, y);
    case 'gateway':
      return createGateway(subtype, x, y);
    case 'pool':
      return createPool(x, y, subtype === 'horizontal');
    default:
      console.error(`Unknown element type: ${elementType}`);
      return null;
  }
}
