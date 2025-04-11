import type { AnchorPosition, BpmnNode, ConnectionPoint, Position } from '$lib/types/bpmn';

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

    for (const point of waypoints) {
      path += ` L ${point.x} ${point.y}`;
    }

    path += ` L ${end.x} ${end.y}`;
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
