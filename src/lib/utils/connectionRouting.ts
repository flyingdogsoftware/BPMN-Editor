import type { Position } from '../models/bpmnElements';
import { snapToGrid } from './gridUtils';

/**
 * Calculate an orthogonal path between two points
 * @param start The start position
 * @param end The end position
 * @param waypoints Optional waypoints for the path
 * @returns SVG path data string
 */
export function calculateOrthogonalPath(
  start: Position,
  end: Position,
  waypoints: Position[] = []
): string {
  // If waypoints are provided, use them
  if (waypoints && waypoints.length > 0) {
    return calculatePathWithWaypoints(start, end, waypoints);
  }

  // Otherwise, calculate a direct orthogonal path
  return calculateDirectOrthogonalPath(start, end);
}

/**
 * Calculate a path with waypoints
 * @param start The start position
 * @param end The end position
 * @param waypoints The waypoints for the path
 * @returns SVG path data string
 */
function calculatePathWithWaypoints(
  start: Position,
  end: Position,
  waypoints: Position[]
): string {
  let path = `M ${start.x} ${start.y}`;

  // Add each waypoint
  waypoints.forEach((point, index) => {
    // For the first waypoint, create a segment from start to waypoint
    if (index === 0) {
      path += createOrthogonalSegment(start, point);
    } else {
      // For subsequent waypoints, create a segment from previous waypoint
      path += createOrthogonalSegment(waypoints[index - 1], point);
    }
  });

  // Add final segment from last waypoint to end
  if (waypoints.length > 0) {
    path += createOrthogonalSegment(waypoints[waypoints.length - 1], end);
  }

  return path;
}

/**
 * Calculate a direct orthogonal path between two points
 * @param start The start position
 * @param end The end position
 * @returns SVG path data string
 */
function calculateDirectOrthogonalPath(start: Position, end: Position): string {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  // Start the path
  let path = `M ${start.x} ${start.y}`;

  // Corner radius for rounded corners
  const cornerRadius = 10;

  // If the points are aligned horizontally or vertically, use a direct line
  if (Math.abs(start.x - end.x) < 0.001 || Math.abs(start.y - end.y) < 0.001) {
    path += ` L ${end.x} ${end.y}`;
    return path;
  }

  // Determine whether to go horizontal or vertical first
  // This simple heuristic can be improved based on element types and positions
  const goHorizontalFirst = Math.abs(dx) > Math.abs(dy);

  // Debug logging can be uncommented for troubleshooting
  // console.log('Direct path calculation:', { start, end, goHorizontalFirst });

  if (goHorizontalFirst) {
    // Go horizontal first, then vertical
    // Create a path with only 3 segments (including the start point)
    path += ` L ${end.x} ${start.y}`;
    path += createRoundedCorner(end.x, start.y, end.x, end.y, end.x, end.y, cornerRadius);
    path += ` L ${end.x} ${end.y}`;

    // Debug logging can be uncommented for troubleshooting
    // console.log('Corner point (horizontal first):', { x: end.x, y: start.y });
  } else {
    // Go vertical first, then horizontal
    // Create a path with only 3 segments (including the start point)
    path += ` L ${start.x} ${end.y}`;
    path += createRoundedCorner(start.x, end.y, end.x, end.y, end.x, end.y, cornerRadius);
    path += ` L ${end.x} ${end.y}`;

    // Debug logging can be uncommented for troubleshooting
    // console.log('Corner point (vertical first):', { x: start.x, y: end.y });
  }

  // Debug logging can be uncommented for troubleshooting
  // console.log('Final path:', path);

  return path;
}

/**
 * Create an orthogonal segment between two points
 * @param start The start position
 * @param end The end position
 * @returns SVG path data string (without the initial M command)
 */
function createOrthogonalSegment(start: Position, end: Position): string {
  // Corner radius for rounded corners
  const cornerRadius = 10;

  // If the points are aligned horizontally or vertically, use a direct line
  if (start.x === end.x || start.y === end.y) {
    return ` L ${end.x} ${end.y}`;
  }

  // Determine whether to go horizontal or vertical first
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const goHorizontalFirst = Math.abs(dx) > Math.abs(dy);

  if (goHorizontalFirst) {
    // Go horizontal first, then vertical
    return ` L ${end.x} ${start.y}` +
           createRoundedCorner(end.x, start.y, end.x, end.y, end.x, end.y, cornerRadius) +
           ` L ${end.x} ${end.y}`;
  } else {
    // Go vertical first, then horizontal
    return ` L ${start.x} ${end.y}` +
           createRoundedCorner(start.x, end.y, end.x, end.y, end.x, end.y, cornerRadius) +
           ` L ${end.x} ${end.y}`;
  }
}

/**
 * Create a rounded corner for an SVG path
 * @param x1 X coordinate of the start point
 * @param y1 Y coordinate of the start point
 * @param x2 X coordinate of the corner point
 * @param y2 Y coordinate of the corner point
 * @param x3 X coordinate of the end point
 * @param y3 Y coordinate of the end point
 * @param radius The corner radius
 * @returns SVG path data string for the rounded corner
 */
function createRoundedCorner(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  radius: number
): string {
  // Calculate the direction vectors
  const dx1 = x2 - x1;
  const dy1 = y2 - y1;
  const dx2 = x3 - x2;
  const dy2 = y3 - y2;

  // Calculate the distances
  const dist1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
  const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

  // If either segment is too short, don't create a rounded corner
  if (dist1 < radius || dist2 < radius) {
    return ` L ${x2} ${y2}`;
  }

  // Calculate the normalized direction vectors
  const nx1 = dx1 / dist1;
  const ny1 = dy1 / dist1;
  const nx2 = dx2 / dist2;
  const ny2 = dy2 / dist2;

  // Calculate the start and end points of the arc
  const arcStartX = x2 - nx1 * radius;
  const arcStartY = y2 - ny1 * radius;
  const arcEndX = x2 + nx2 * radius;
  const arcEndY = y2 + ny2 * radius;

  // Create the arc command
  // We use a simple quadratic Bezier curve for the corner
  return ` L ${arcStartX} ${arcStartY} Q ${x2} ${y2}, ${arcEndX} ${arcEndY}`;
}

/**
 * Calculate connection points for a BPMN element
 * @param element The BPMN element
 * @param numPoints Number of connection points per side
 * @returns Array of connection points
 */
export function calculateConnectionPoints(
  element: any,
  numPoints: number = 3
): Position[] {
  if (!element || !('x' in element) || !('y' in element) ||
      !('width' in element) || !('height' in element)) {
    return [];
  }

  const points: Position[] = [];
  const { x, y, width, height } = element;

  // Calculate points for each side
  // Top side
  for (let i = 1; i <= numPoints; i++) {
    points.push({
      x: x + (width * i) / (numPoints + 1),
      y
    });
  }

  // Right side
  for (let i = 1; i <= numPoints; i++) {
    points.push({
      x: x + width,
      y: y + (height * i) / (numPoints + 1)
    });
  }

  // Bottom side
  for (let i = 1; i <= numPoints; i++) {
    points.push({
      x: x + (width * i) / (numPoints + 1),
      y: y + height
    });
  }

  // Left side
  for (let i = 1; i <= numPoints; i++) {
    points.push({
      x,
      y: y + (height * i) / (numPoints + 1)
    });
  }

  // For gateways (diamond shape), add points at the corners
  if (element.type === 'gateway') {
    points.push(
      { x: x + width / 2, y },           // Top
      { x: x + width, y: y + height / 2 }, // Right
      { x: x + width / 2, y: y + height }, // Bottom
      { x, y: y + height / 2 }            // Left
    );
  }

  return points;
}

/**
 * Find the best connection point for a given position
 * @param element The BPMN element
 * @param position The position to connect to
 * @param numPoints Number of connection points per side
 * @returns The best connection point
 */
export function findBestConnectionPoint(
  element: any,
  position: Position,
  numPoints: number = 3
): Position {
  const points = calculateConnectionPoints(element, numPoints);

  // Find the closest point
  let closestPoint = points[0];
  let minDistance = Number.MAX_VALUE;

  points.forEach(point => {
    const dx = point.x - position.x;
    const dy = point.y - position.y;
    const distance = dx * dx + dy * dy;

    if (distance < minDistance) {
      minDistance = distance;
      closestPoint = point;
    }
  });

  return closestPoint;
}

/**
 * Adjust a waypoint to maintain orthogonal routing
 * @param waypoints The current waypoints
 * @param index The index of the waypoint to adjust
 * @param newPosition The new position of the waypoint
 * @returns The adjusted waypoints
 */
export function adjustWaypoint(
  waypoints: Position[],
  index: number,
  newPosition: Position
): Position[] {
  if (!waypoints || index < 0 || index >= waypoints.length) {
    return waypoints;
  }

  const updatedWaypoints = [...waypoints];

  // Snap the new position to grid
  const snappedPosition = {
    x: snapToGrid(newPosition.x, 20),
    y: snapToGrid(newPosition.y, 20)
  };

  // Get the original waypoint
  const originalWaypoint = waypoints[index];

  // Determine the movement constraints based on adjacent waypoints
  let moveX = true;
  let moveY = true;

  // Check previous waypoint if exists
  if (index > 0) {
    const prevWaypoint = waypoints[index - 1];
    // If previous segment is horizontal (same Y), restrict Y movement
    if (Math.abs(prevWaypoint.y - originalWaypoint.y) < 0.001) {
      moveY = false;
    }
    // If previous segment is vertical (same X), restrict X movement
    if (Math.abs(prevWaypoint.x - originalWaypoint.x) < 0.001) {
      moveX = false;
    }
  }

  // Check next waypoint if exists
  if (index < waypoints.length - 1) {
    const nextWaypoint = waypoints[index + 1];
    // If next segment is horizontal (same Y), restrict Y movement
    if (Math.abs(nextWaypoint.y - originalWaypoint.y) < 0.001) {
      moveY = false;
    }
    // If next segment is vertical (same X), restrict X movement
    if (Math.abs(nextWaypoint.x - originalWaypoint.x) < 0.001) {
      moveX = false;
    }
  }

  // If both X and Y are restricted, prioritize one based on the larger movement
  if (!moveX && !moveY) {
    const dx = Math.abs(snappedPosition.x - originalWaypoint.x);
    const dy = Math.abs(snappedPosition.y - originalWaypoint.y);
    if (dx > dy) {
      moveX = true;
    } else {
      moveY = true;
    }
  }

  // Apply the movement constraints
  const adjustedPosition = {
    x: moveX ? snappedPosition.x : originalWaypoint.x,
    y: moveY ? snappedPosition.y : originalWaypoint.y
  };

  // Update the waypoint
  updatedWaypoints[index] = adjustedPosition;

  // If we have adjacent waypoints, we need to maintain orthogonality
  if (index > 0 && index < waypoints.length - 1) {
    const prevWaypoint = waypoints[index - 1];
    const nextWaypoint = waypoints[index + 1];

    // If we moved the X coordinate and have a horizontal segment with the previous point
    if (moveX && Math.abs(prevWaypoint.y - originalWaypoint.y) < 0.001) {
      // Keep the segment horizontal by updating the Y coordinate of the previous point
      updatedWaypoints[index - 1] = {
        ...prevWaypoint,
        y: adjustedPosition.y
      };
    }

    // If we moved the Y coordinate and have a vertical segment with the previous point
    if (moveY && Math.abs(prevWaypoint.x - originalWaypoint.x) < 0.001) {
      // Keep the segment vertical by updating the X coordinate of the previous point
      updatedWaypoints[index - 1] = {
        ...prevWaypoint,
        x: adjustedPosition.x
      };
    }

    // If we moved the X coordinate and have a horizontal segment with the next point
    if (moveX && Math.abs(nextWaypoint.y - originalWaypoint.y) < 0.001) {
      // Keep the segment horizontal by updating the Y coordinate of the next point
      updatedWaypoints[index + 1] = {
        ...nextWaypoint,
        y: adjustedPosition.y
      };
    }

    // If we moved the Y coordinate and have a vertical segment with the next point
    if (moveY && Math.abs(nextWaypoint.x - originalWaypoint.x) < 0.001) {
      // Keep the segment vertical by updating the X coordinate of the next point
      updatedWaypoints[index + 1] = {
        ...nextWaypoint,
        x: adjustedPosition.x
      };
    }
  }

  return updatedWaypoints;
}

/**
 * Calculate the midpoints of each segment in a path
 * @param start The start position
 * @param end The end position
 * @param waypoints The waypoints for the path
 * @returns Array of midpoints with their orientation
 */
export function calculateSegmentMidpoints(
  start: Position,
  end: Position,
  waypoints: Position[] = []
): Array<{position: Position, orientation: 'horizontal' | 'vertical'}> {
  // If there are no waypoints, we need to calculate the orthogonal path
  if (!waypoints || waypoints.length === 0) {
    return calculateDirectPathMidpoints(start, end);
  }

  const allPoints: Position[] = [start, ...waypoints, end];
  const midpoints: Array<{position: Position, orientation: 'horizontal' | 'vertical'}> = [];

  // Calculate midpoints between consecutive points
  for (let i = 0; i < allPoints.length - 1; i++) {
    const p1 = allPoints[i];
    const p2 = allPoints[i + 1];

    // Determine if the segment is horizontal or vertical
    const isHorizontal = Math.abs(p1.y - p2.y) < 0.001; // Use small epsilon for floating point comparison
    const orientation = isHorizontal ? 'horizontal' : 'vertical';

    // Calculate the midpoint
    const midpoint = {
      position: {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2
      },
      orientation
    };

    midpoints.push(midpoint);
  }

  return midpoints;
}

/**
 * Calculate midpoints for a direct orthogonal path with no waypoints
 * @param start The start position
 * @param end The end position
 * @returns Array of midpoints with their orientation
 */
function calculateDirectPathMidpoints(
  start: Position,
  end: Position
): Array<{position: Position, orientation: 'horizontal' | 'vertical'}> {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const midpoints: Array<{position: Position, orientation: 'horizontal' | 'vertical'}> = [];

  // If the points are aligned horizontally or vertically, there's just one segment
  if (Math.abs(start.x - end.x) < 0.001 || Math.abs(start.y - end.y) < 0.001) {
    const isHorizontal = Math.abs(start.y - end.y) < 0.001;
    midpoints.push({
      position: {
        x: (start.x + end.x) / 2,
        y: (start.y + end.y) / 2
      },
      orientation: isHorizontal ? 'horizontal' : 'vertical'
    });
    return midpoints;
  }

  // Determine whether to go horizontal or vertical first
  const goHorizontalFirst = Math.abs(dx) > Math.abs(dy);

  if (goHorizontalFirst) {
    // First segment: horizontal from start to corner
    midpoints.push({
      position: {
        x: start.x + dx / 2, // Midpoint of horizontal segment
        y: start.y
      },
      orientation: 'horizontal'
    });

    // Second segment: vertical from corner to end
    midpoints.push({
      position: {
        x: end.x,
        y: start.y + dy / 2 // Midpoint of vertical segment
      },
      orientation: 'vertical'
    });

    // Debug logging can be uncommented for troubleshooting
    // console.log('Corner point (horizontal first):', { x: end.x, y: start.y });
  } else {
    // First segment: vertical from start to corner
    midpoints.push({
      position: {
        x: start.x,
        y: start.y + dy / 2 // Midpoint of vertical segment
      },
      orientation: 'vertical'
    });

    // Second segment: horizontal from corner to end
    midpoints.push({
      position: {
        x: start.x + dx / 2, // Midpoint of horizontal segment
        y: end.y
      },
      orientation: 'horizontal'
    });

    // Debug logging can be uncommented for troubleshooting
    // console.log('Corner point (vertical first):', { x: start.x, y: end.y });
  }

  // Debug logging can be uncommented for troubleshooting
  // console.log('Direct path midpoints:', midpoints);

  return midpoints;
}
