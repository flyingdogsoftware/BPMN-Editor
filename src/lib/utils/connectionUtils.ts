import type { AnchorPosition, BpmnNode, ConnectionPoint, Position } from '$lib/types/bpmn';
import { snapToGrid } from './gridUtils';

/**
 * Calculate connection points for a BPMN node
 * @param element The BPMN node element
 * @returns Array of connection points
 */
export function calculateConnectionPoints(element: BpmnNode): ConnectionPoint[] {
  const points: ConnectionPoint[] = [];
  const centerX = element.x + element.width / 2;
  const centerY = element.y + element.height / 2;

  // Create connection points based on element type
  if (element.type === 'task') {
    // Tasks have connection points on all four sides
    points.push(
      createConnectionPoint(element.id, 'top', centerX, element.y),
      createConnectionPoint(element.id, 'right', element.x + element.width, centerY),
      createConnectionPoint(element.id, 'bottom', centerX, element.y + element.height),
      createConnectionPoint(element.id, 'left', element.x, centerY)
    );
  } else if (element.type === 'event') {
    // Events have connection points on all four sides
    points.push(
      createConnectionPoint(element.id, 'top', centerX, element.y),
      createConnectionPoint(element.id, 'right', element.x + element.width, centerY),
      createConnectionPoint(element.id, 'bottom', centerX, element.y + element.height),
      createConnectionPoint(element.id, 'left', element.x, centerY)
    );
  } else if (element.type === 'gateway') {
    // Gateways have connection points on all four sides
    points.push(
      createConnectionPoint(element.id, 'top', centerX, element.y),
      createConnectionPoint(element.id, 'right', element.x + element.width, centerY),
      createConnectionPoint(element.id, 'bottom', centerX, element.y + element.height),
      createConnectionPoint(element.id, 'left', element.x, centerY)
    );
  }

  return points;
}

/**
 * Create a connection point
 * @param elementId The ID of the element the connection point belongs to
 * @param position The position of the connection point (top, right, bottom, left)
 * @param x The x coordinate of the connection point
 * @param y The y coordinate of the connection point
 * @returns A connection point object
 */
export function createConnectionPoint(
  elementId: string,
  position: AnchorPosition,
  x: number,
  y: number
): ConnectionPoint {
  return {
    id: `${elementId}-${position}`,
    elementId,
    position,
    x,
    y
  };
}

/**
 * Calculate the path for a connection between two points
 * @param start The start position
 * @param end The end position
 * @param waypoints Optional waypoints for the path
 * @param routingType The type of routing to use (direct or orthogonal)
 * @returns SVG path data string
 */
export function calculateConnectionPath(
  start: Position,
  end: Position,
  waypoints?: Position[],
  routingType: 'direct' | 'orthogonal' = 'orthogonal'
): string {
  if (waypoints && waypoints.length > 0) {
    // Use waypoints if provided
    let path = `M ${start.x} ${start.y}`;

    // Create orthogonal segments between waypoints
    let prevPoint = start;

    for (const point of waypoints) {
      if (routingType === 'orthogonal') {
        // Create orthogonal segment between prevPoint and current point
        path += calculateOrthogonalSegment(prevPoint, point);
      } else {
        // Direct line to the waypoint
        path += ` L ${point.x} ${point.y}`;
      }
      prevPoint = point;
    }

    // Final segment to the end point
    if (routingType === 'orthogonal') {
      path += calculateOrthogonalSegment(prevPoint, end);
    } else {
      path += ` L ${end.x} ${end.y}`;
    }

    return path;
  } else if (routingType === 'direct') {
    // Direct routing (straight line)
    return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  } else {
    // Orthogonal routing (right angles)
    return calculateOrthogonalPath(start, end);
  }
}

/**
 * Calculate an orthogonal path between two points
 * @param start The start position
 * @param end The end position
 * @returns SVG path data string
 */
function calculateOrthogonalPath(start: Position, end: Position): string {
  // Determine the direction of the connection
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);

  // Minimum distance for the orthogonal segments
  const minDistance = 20;

  // Determine the best routing strategy based on the positions
  if (adx < minDistance && ady < minDistance) {
    // If points are very close, use a simple L shape
    return `M ${start.x} ${start.y} L ${start.x} ${end.y} L ${end.x} ${end.y}`;
  }

  // Determine if we should go horizontal first or vertical first
  // This decision is based on the anchor position and the relative positions
  const startAnchor = getAnchorDirection(start, end);
  const endAnchor = getAnchorDirection(end, start);

  if (startAnchor === 'right' && dx > 0) {
    // Going right from start
    const midX = start.x + Math.max(adx / 2, minDistance);
    return `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`;
  } else if (startAnchor === 'left' && dx < 0) {
    // Going left from start
    const midX = start.x - Math.max(adx / 2, minDistance);
    return `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`;
  } else if (startAnchor === 'bottom' && dy > 0) {
    // Going down from start
    const midY = start.y + Math.max(ady / 2, minDistance);
    return `M ${start.x} ${start.y} L ${start.x} ${midY} L ${end.x} ${midY} L ${end.x} ${end.y}`;
  } else if (startAnchor === 'top' && dy < 0) {
    // Going up from start
    const midY = start.y - Math.max(ady / 2, minDistance);
    return `M ${start.x} ${start.y} L ${start.x} ${midY} L ${end.x} ${midY} L ${end.x} ${end.y}`;
  } else {
    // For other cases, use a more complex path with multiple segments
    if (adx > ady) {
      // Horizontal distance is greater, so go horizontal first
      const thirdX = start.x + dx / 3;
      const twoThirdsX = start.x + 2 * dx / 3;
      return `M ${start.x} ${start.y} L ${thirdX} ${start.y} L ${thirdX} ${end.y} L ${end.x} ${end.y}`;
    } else {
      // Vertical distance is greater, so go vertical first
      const thirdY = start.y + dy / 3;
      const twoThirdsY = start.y + 2 * dy / 3;
      return `M ${start.x} ${start.y} L ${start.x} ${thirdY} L ${end.x} ${thirdY} L ${end.x} ${end.y}`;
    }
  }
}

/**
 * Determine the anchor direction based on two points
 * @param p1 The first position
 * @param p2 The second position
 * @returns The anchor direction ('top', 'right', 'bottom', or 'left')
 */
function getAnchorDirection(p1: Position, p2: Position): AnchorPosition {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);

  if (adx > ady) {
    // Horizontal direction is dominant
    return dx > 0 ? 'right' : 'left';
  } else {
    // Vertical direction is dominant
    return dy > 0 ? 'bottom' : 'top';
  }
}

/**
 * Check if a connection is valid between two elements
 * @param sourceType The type of the source element
 * @param targetType The type of the target element
 * @returns Whether the connection is valid
 */
export function isValidConnection(sourceType: string, targetType: string): boolean {
  // Implement validation rules based on BPMN specification
  // For now, allow all connections
  return true;
}

/**
 * Calculate an orthogonal segment between two points
 * @param start The start position
 * @param end The end position
 * @returns SVG path data string (without the initial M command)
 */
function calculateOrthogonalSegment(start: Position, end: Position): string {
  // Determine the direction of the connection
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  // If the points are aligned horizontally or vertically, use a direct line
  if (start.x === end.x || start.y === end.y) {
    return ` L ${end.x} ${end.y}`;
  }

  // Otherwise, create an L-shaped path
  return ` L ${end.x} ${start.y} L ${end.x} ${end.y}`;
}

/**
 * Generate virtual bendpoints for a connection
 * @param start The start position
 * @param end The end position
 * @param waypoints Existing waypoints
 * @param segmentThreshold Minimum length of segment to add a virtual bendpoint
 * @returns Array of virtual bendpoint positions
 */
export function generateVirtualBendpoints(
  start: Position,
  end: Position,
  waypoints: Position[],
  segmentThreshold: number = 50
): Position[] {
  const virtualPoints: Position[] = [];

  // If no waypoints, calculate virtual points between start and end
  if (!waypoints || waypoints.length === 0) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;

    // Only add virtual points if the segment is long enough
    if (Math.abs(dx) > segmentThreshold && Math.abs(dy) > segmentThreshold) {
      // Add a virtual point at the corner of the L-shape
      virtualPoints.push({ x: end.x, y: start.y });
    }

    return virtualPoints;
  }

  // Add virtual points between waypoints
  let prevPoint = start;

  for (const point of waypoints) {
    // Check if the segment is long enough for a virtual point
    const dx = point.x - prevPoint.x;
    const dy = point.y - prevPoint.y;

    if (Math.abs(dx) > segmentThreshold && Math.abs(dy) > segmentThreshold) {
      // Add a virtual point at the corner of the L-shape
      virtualPoints.push({ x: point.x, y: prevPoint.y });
    }

    prevPoint = point;
  }

  // Check the final segment to the end point
  const lastDx = end.x - prevPoint.x;
  const lastDy = end.y - prevPoint.y;

  if (Math.abs(lastDx) > segmentThreshold && Math.abs(lastDy) > segmentThreshold) {
    virtualPoints.push({ x: end.x, y: prevPoint.y });
  }

  return virtualPoints;
}

/**
 * Update waypoints when a bendpoint is moved
 * @param waypoints The current waypoints array
 * @param index The index of the bendpoint being moved
 * @param newX The new X coordinate
 * @param newY The new Y coordinate
 * @param snapToGrid Whether to snap the new position to the grid
 * @param gridSize The grid size for snapping
 * @returns The updated waypoints array
 */
export function updateWaypoint(
  waypoints: Position[],
  index: number,
  newX: number,
  newY: number,
  snapToGrid: boolean = true,
  gridSize: number = 20
): Position[] {
  // Create a copy of the waypoints array
  const updatedWaypoints = [...waypoints];

  // Snap the coordinates to the grid if needed
  const x = snapToGrid ? Math.round(newX / gridSize) * gridSize : newX;
  const y = snapToGrid ? Math.round(newY / gridSize) * gridSize : newY;

  // Update the waypoint at the specified index
  updatedWaypoints[index] = { x, y };

  return updatedWaypoints;
}

/**
 * Add a new waypoint to the connection
 * @param waypoints The current waypoints array
 * @param newX The X coordinate of the new waypoint
 * @param newY The Y coordinate of the new waypoint
 * @param snapToGrid Whether to snap the new position to the grid
 * @param gridSize The grid size for snapping
 * @returns The updated waypoints array with the new waypoint inserted at the appropriate position
 */
export function addWaypoint(
  waypoints: Position[],
  newX: number,
  newY: number,
  snapToGrid: boolean = true,
  gridSize: number = 20
): Position[] {
  // Snap the coordinates to the grid if needed
  const x = snapToGrid ? Math.round(newX / gridSize) * gridSize : newX;
  const y = snapToGrid ? Math.round(newY / gridSize) * gridSize : newY;

  // Create a new waypoint
  const newWaypoint = { x, y };

  // If there are no existing waypoints, just return an array with the new one
  if (!waypoints || waypoints.length === 0) {
    return [newWaypoint];
  }

  // Otherwise, find the best position to insert the new waypoint
  // For now, we'll just append it to the end
  return [...waypoints, newWaypoint];
}

/**
 * Calculate the position for a connection label
 * @param start The start position of the connection
 * @param end The end position of the connection
 * @param waypoints Optional waypoints for the connection
 * @returns The position for the label
 */
export function calculateLabelPosition(
  start: Position,
  end: Position,
  waypoints?: Position[]
): Position {
  if (waypoints && waypoints.length > 0) {
    // If there are waypoints, place the label near the middle waypoint
    const middleIndex = Math.floor(waypoints.length / 2);
    return {
      x: waypoints[middleIndex].x,
      y: waypoints[middleIndex].y - 10 // Offset above the line
    };
  } else {
    // Otherwise, place the label in the middle of the connection
    return {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2 - 10 // Offset above the line
    };
  }
}
