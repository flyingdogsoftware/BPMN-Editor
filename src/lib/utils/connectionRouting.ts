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
 * Optimize waypoints by removing unnecessary points
 * @param waypoints The waypoints to optimize
 * @returns The optimized waypoints
 */
export function optimizeWaypoints(waypoints: Position[]): Position[] {
  if (!waypoints || waypoints.length <= 1) {
    console.log('DEBUG: No waypoints to optimize or only one waypoint');
    return waypoints;
  }

  console.log('DEBUG: Starting waypoint optimization with', waypoints.length, 'points');
  console.log('DEBUG: Original waypoints:', JSON.stringify(waypoints));

  // Make a deep copy to avoid modifying the original array
  let optimized = JSON.parse(JSON.stringify(waypoints));

  // Define a small epsilon for floating point comparisons
  const EPSILON = 0.001;

  // For all cases, merge collinear segments
  const result: Position[] = [];

  // Always keep the first point
  result.push(optimized[0]);

  // Process each point
  for (let i = 1; i < optimized.length - 1; i++) {
    const prev = result[result.length - 1]; // Last point in our result so far
    const current = optimized[i];           // Current point we're evaluating
    const next = optimized[i + 1];          // Next point in the sequence

    // Check if the current point is on a straight line (horizontal or vertical)
    const isHorizontalLine = Math.abs(prev.y - current.y) < EPSILON && Math.abs(current.y - next.y) < EPSILON;
    const isVerticalLine = Math.abs(prev.x - current.x) < EPSILON && Math.abs(current.x - next.x) < EPSILON;

    console.log(`DEBUG: Point ${i}:`, current, 'isHorizontal:', isHorizontalLine, 'isVertical:', isVerticalLine);

    // If the point is on a straight line, skip it
    if (isHorizontalLine || isVerticalLine) {
      console.log(`DEBUG: Point ${i} is on a straight line - skipping`);
      // Skip this point (don't add to result)
    } else {
      // Otherwise, it's a corner point that changes direction, so keep it
      console.log(`DEBUG: Point ${i} is a corner - keeping`);
      result.push(current);
    }
  }

  // Always keep the last point
  result.push(optimized[optimized.length - 1]);

  console.log('DEBUG: Final optimized waypoints:', JSON.stringify(result));
  console.log('DEBUG: Reduced from', waypoints.length, 'to', result.length, 'points');

  return result;
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
 * Adjust waypoints when a connected element is moved
 * @param waypoints The current waypoints
 * @param isSource Whether the source element was moved (true) or the target element (false)
 * @param dx The x-distance the element was moved
 * @param dy The y-distance the element was moved
 * @returns The adjusted waypoints
 */
export function adjustWaypointsForElementMove(
  waypoints: Position[],
  isSource: boolean,
  dx: number,
  dy: number
): Position[] {
  if (!waypoints || waypoints.length === 0) {
    return waypoints;
  }

  // Make a deep copy of the waypoints to avoid reference issues
  const updatedWaypoints = JSON.parse(JSON.stringify(waypoints));

  // Small epsilon for floating point comparisons
  const EPSILON = 0.001;

  // Log the adjustment operation
  console.log(`Adjusting waypoints for ${isSource ? 'source' : 'target'} movement:`, { dx, dy });

  if (isSource) {
    // If the source element moved, adjust the first waypoint
    updatedWaypoints[0] = {
      x: updatedWaypoints[0].x + dx,
      y: updatedWaypoints[0].y + dy
    };

    // If there's a second waypoint, adjust it to maintain orthogonality
    if (updatedWaypoints.length > 1) {
      const firstWaypoint = updatedWaypoints[0];
      const secondWaypoint = updatedWaypoints[1];

      // Determine if the first segment was horizontal or vertical
      const wasHorizontal = Math.abs(waypoints[0].y - waypoints[1].y) < EPSILON;
      const wasVertical = Math.abs(waypoints[0].x - waypoints[1].x) < EPSILON;

      // If the first segment was horizontal, maintain that relationship
      if (wasHorizontal) {
        updatedWaypoints[1] = {
          ...secondWaypoint,
          y: firstWaypoint.y
        };
      }
      // If the first segment was vertical, maintain that relationship
      else if (wasVertical) {
        updatedWaypoints[1] = {
          ...secondWaypoint,
          x: firstWaypoint.x
        };
      }
      // If it was diagonal, we need to decide which dimension to preserve
      else {
        // For now, we'll prioritize maintaining the overall shape
        // by not adjusting the second point
      }
    }
  } else {
    // If the target element moved, adjust the last waypoint
    const lastIndex = updatedWaypoints.length - 1;
    updatedWaypoints[lastIndex] = {
      x: updatedWaypoints[lastIndex].x + dx,
      y: updatedWaypoints[lastIndex].y + dy
    };

    // If there's a second-to-last waypoint, adjust it to maintain orthogonality
    if (updatedWaypoints.length > 1) {
      const lastWaypoint = updatedWaypoints[lastIndex];
      const secondLastWaypoint = updatedWaypoints[lastIndex - 1];

      // Determine if the last segment was horizontal or vertical
      const wasHorizontal = Math.abs(waypoints[lastIndex].y - waypoints[lastIndex-1].y) < EPSILON;
      const wasVertical = Math.abs(waypoints[lastIndex].x - waypoints[lastIndex-1].x) < EPSILON;

      // If the last segment was horizontal, maintain that relationship
      if (wasHorizontal) {
        updatedWaypoints[lastIndex - 1] = {
          ...secondLastWaypoint,
          y: lastWaypoint.y
        };
      }
      // If the last segment was vertical, maintain that relationship
      else if (wasVertical) {
        updatedWaypoints[lastIndex - 1] = {
          ...secondLastWaypoint,
          x: lastWaypoint.x
        };
      }
      // If it was diagonal, we need to decide which dimension to preserve
      else {
        // For now, we'll prioritize maintaining the overall shape
        // by not adjusting the second-to-last point
      }
    }
  }

  // Ensure all segment handles are properly positioned
  // This is important for maintaining the visual appearance of the connection
  // and ensuring that handles are correctly positioned after element movement
  if (updatedWaypoints.length > 2) {
    // Process intermediate waypoints to maintain orthogonal routing
    for (let i = 1; i < updatedWaypoints.length - 1; i++) {
      const prev = updatedWaypoints[i - 1];
      const current = updatedWaypoints[i];
      const next = updatedWaypoints[i + 1];

      // Check if we have horizontal segments that need to be maintained
      const prevSegmentHorizontal = Math.abs(prev.y - current.y) < EPSILON;
      const nextSegmentHorizontal = Math.abs(current.y - next.y) < EPSILON;

      // Check if we have vertical segments that need to be maintained
      const prevSegmentVertical = Math.abs(prev.x - current.x) < EPSILON;
      const nextSegmentVertical = Math.abs(current.x - next.x) < EPSILON;

      // Maintain horizontal-vertical or vertical-horizontal patterns
      if (prevSegmentHorizontal && nextSegmentVertical) {
        // Corner point: horizontal then vertical
        // Ensure the corner maintains its position relative to the segments
        updatedWaypoints[i] = {
          x: next.x,
          y: prev.y
        };
      } else if (prevSegmentVertical && nextSegmentHorizontal) {
        // Corner point: vertical then horizontal
        // Ensure the corner maintains its position relative to the segments
        updatedWaypoints[i] = {
          x: prev.x,
          y: next.y
        };
      }
      // If both segments are horizontal or both are vertical, we might need to adjust
      // but for now we'll leave those cases as they are to avoid unexpected changes
    }
  }

  // Log the result
  console.log('Waypoints adjustment result:', {
    original: waypoints,
    adjusted: updatedWaypoints
  });

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

  const EPSILON = 0.001;

  // Special case for L-shaped connections with 3 points
  if (waypoints.length === 2) {
    const p1 = start;
    const p2 = waypoints[0];
    const p3 = waypoints[1];

    // Check if this is an L-shaped connection (horizontal then vertical)
    const isHorizontalThenVertical =
      Math.abs(p1.y - p2.y) < EPSILON && // First segment is horizontal
      Math.abs(p2.x - p3.x) < EPSILON;   // Second segment is vertical

    if (isHorizontalThenVertical) {
      // Return only two midpoints - one for the horizontal segment and one for the vertical segment
      return [
        {
          position: {
            x: (p1.x + p2.x) / 2,
            y: p1.y
          },
          orientation: 'horizontal'
        },
        {
          position: {
            x: p2.x,
            y: (p2.y + p3.y) / 2
          },
          orientation: 'vertical'
        }
      ];
    }

    // Check if this is an L-shaped connection (vertical then horizontal)
    const isVerticalThenHorizontal =
      Math.abs(p1.x - p2.x) < EPSILON && // First segment is vertical
      Math.abs(p2.y - p3.y) < EPSILON;   // Second segment is horizontal

    if (isVerticalThenHorizontal) {
      // Return only two midpoints - one for the vertical segment and one for the horizontal segment
      return [
        {
          position: {
            x: p1.x,
            y: (p1.y + p2.y) / 2
          },
          orientation: 'vertical'
        },
        {
          position: {
            x: (p2.x + p3.x) / 2,
            y: p2.y
          },
          orientation: 'horizontal'
        }
      ];
    }
  }

  // For all other cases, use a simplified approach
  const allPoints: Position[] = [start, ...waypoints, end];
  const midpoints: Array<{position: Position, orientation: 'horizontal' | 'vertical'}> = [];

  // Process each segment between consecutive points
  for (let i = 0; i < allPoints.length - 1; i++) {
    const p1 = allPoints[i];
    const p2 = allPoints[i + 1];

    // Determine if the segment is horizontal or vertical
    const isHorizontal = Math.abs(p1.y - p2.y) < EPSILON;

    // Calculate the midpoint
    const midpoint = {
      position: {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2
      },
      orientation: isHorizontal ? 'horizontal' : 'vertical' as 'horizontal' | 'vertical'
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
