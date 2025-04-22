import { snapToGrid } from './gridUtils';
/**
 * Calculate an orthogonal path between two points
 * @param start The start position
 * @param end The end position
 * @param waypoints Optional waypoints for the path
 * @returns SVG path data string
 */
export function calculateOrthogonalPath(start, end, waypoints = []) {
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
function calculatePathWithWaypoints(start, end, waypoints) {
    let path = `M ${start.x} ${start.y}`;
    // Add each waypoint
    waypoints.forEach((point, index) => {
        // For the first waypoint, create a segment from start to waypoint
        if (index === 0) {
            path += createOrthogonalSegment(start, point);
        }
        else {
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
function calculateDirectOrthogonalPath(start, end) {
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
    }
    else {
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
function createOrthogonalSegment(start, end) {
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
    }
    else {
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
function createRoundedCorner(x1, y1, x2, y2, x3, y3, radius) {
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
export function calculateConnectionPoints(element, numPoints = 3) {
    if (!element || !('x' in element) || !('y' in element) ||
        !('width' in element) || !('height' in element)) {
        return [];
    }
    const points = [];
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
        points.push({ x: x + width / 2, y }, // Top
        { x: x + width, y: y + height / 2 }, // Right
        { x: x + width / 2, y: y + height }, // Bottom
        { x, y: y + height / 2 } // Left
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
export function findBestConnectionPoint(element, position, numPoints = 3) {
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
export function optimizeWaypoints(waypoints) {
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
    // For all cases, check for collinear segments and remove them
    // Merge collinear segments
    const result = [];
    // Always keep the first point
    result.push(optimized[0]);
    // Process each point
    for (let i = 1; i < optimized.length - 1; i++) {
        const prev = result[result.length - 1]; // Last point in our result so far
        const current = optimized[i]; // Current point we're evaluating
        const next = optimized[i + 1]; // Next point in the sequence
        // Check if the current point is on a straight line (horizontal or vertical)
        const isHorizontalLine = Math.abs(prev.y - current.y) < EPSILON && Math.abs(current.y - next.y) < EPSILON;
        const isVerticalLine = Math.abs(prev.x - current.x) < EPSILON && Math.abs(current.x - next.x) < EPSILON;
        console.log(`DEBUG: Point ${i}:`, current, 'isHorizontal:', isHorizontalLine, 'isVertical:', isVerticalLine);
        // If the point is on a straight line, skip it
        if (isHorizontalLine || isVerticalLine) {
            console.log(`DEBUG: Point ${i} is on a straight line - skipping`);
            // Skip this point (don't add to result)
        }
        else {
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
 * Remove redundant waypoints without changing the path structure
 * @param start The start position
 * @param end The end position
 * @param waypoints The waypoints to optimize
 * @returns The optimized waypoints with only redundant points removed
 */
export function removeNonCornerWaypoints(start, end, waypoints) {
    if (!waypoints || waypoints.length === 0) {
        return waypoints;
    }
    console.log('DEBUG: Original waypoints:', JSON.stringify(waypoints));
    // Make a deep copy of the waypoints to avoid modifying the original
    const result = [...waypoints];
    // Small epsilon for floating point comparisons
    const EPSILON = 0.001;
    // Special case: If we have exactly 2 waypoints, check if it's an L-shape
    // If it is, we need to preserve both waypoints to maintain the L-shape
    if (waypoints.length === 2) {
        const p1 = start;
        const p2 = waypoints[0];
        const p3 = waypoints[1];
        const p4 = end;
        // Check if this is an L-shaped connection (horizontal then vertical)
        const isHorizontalThenVertical = Math.abs(p1.y - p2.y) < EPSILON && // First segment is horizontal
            Math.abs(p2.x - p3.x) < EPSILON && // Second segment is vertical
            Math.abs(p3.x - p4.x) < EPSILON; // Third segment is vertical
        // Check if this is an L-shaped connection (vertical then horizontal)
        const isVerticalThenHorizontal = Math.abs(p1.x - p2.x) < EPSILON && // First segment is vertical
            Math.abs(p2.y - p3.y) < EPSILON && // Second segment is horizontal
            Math.abs(p3.y - p4.y) < EPSILON; // Third segment is horizontal
        // If it's an L-shape, preserve both waypoints
        if (isHorizontalThenVertical || isVerticalThenHorizontal) {
            console.log('DEBUG: Preserving L-shaped connection with 2 waypoints');
            return result;
        }
    }
    // Helper function to check if three points are collinear (on the same line)
    function areCollinear(p1, p2, p3) {
        // Check if the three points are collinear using cross product
        const dx1 = p2.x - p1.x;
        const dy1 = p2.y - p1.y;
        const dx2 = p3.x - p2.x;
        const dy2 = p3.y - p2.y;
        // Cross product == 0 means the points are collinear
        return Math.abs(dx1 * dy2 - dy1 * dx2) < EPSILON;
    }
    // Helper function to check if a point is on a horizontal or vertical line
    function isOrthogonal(p1, p2, p3) {
        // Check if the three points form a horizontal or vertical line
        return (
        // All three points have the same x-coordinate (vertical line)
        (Math.abs(p1.x - p2.x) < EPSILON && Math.abs(p2.x - p3.x) < EPSILON) ||
            // All three points have the same y-coordinate (horizontal line)
            (Math.abs(p1.y - p2.y) < EPSILON && Math.abs(p2.y - p3.y) < EPSILON));
    }
    // Helper function to check if removing a point would break an L-shape
    function wouldBreakLShape(prev, current, next) {
        // Check if we have a horizontal-vertical or vertical-horizontal pattern
        const isHorizontalThenVertical = Math.abs(prev.y - current.y) < EPSILON && // First segment is horizontal
            Math.abs(current.x - next.x) < EPSILON; // Second segment is vertical
        const isVerticalThenHorizontal = Math.abs(prev.x - current.x) < EPSILON && // First segment is vertical
            Math.abs(current.y - next.y) < EPSILON; // Second segment is horizontal
        // If it's a corner point in an L-shape, we should preserve it
        return isHorizontalThenVertical || isVerticalThenHorizontal;
    }
    // We'll use a simple approach: remove points that are on the same line as their neighbors
    // but ONLY if they form a horizontal or vertical line (to maintain orthogonal routing)
    // First, combine all points in order: start, waypoints, end
    const allPoints = [start, ...result, end];
    // We'll mark points for removal rather than removing them directly
    // to avoid issues with changing indices during iteration
    const pointsToRemove = [];
    // Check each waypoint (excluding start and end)
    for (let i = 1; i < allPoints.length - 1; i++) {
        const prev = allPoints[i - 1];
        const current = allPoints[i];
        const next = allPoints[i + 1];
        // Only remove points that are on the same orthogonal line AND not part of an L-shape
        if (isOrthogonal(prev, current, next) &&
            areCollinear(prev, current, next) &&
            !wouldBreakLShape(prev, current, next)) {
            // Mark this waypoint for removal (adjust index to match result array)
            pointsToRemove.push(i - 1);
        }
    }
    // Remove the marked points in reverse order to avoid index issues
    for (let i = pointsToRemove.length - 1; i >= 0; i--) {
        result.splice(pointsToRemove[i], 1);
    }
    console.log('DEBUG: Optimized waypoints (only redundant points removed):', JSON.stringify(result));
    console.log('DEBUG: Reduced from', waypoints.length, 'to', result.length, 'points');
    console.log('DEBUG: Removed', pointsToRemove.length, 'redundant points');
    return result;
}
/**
 * Adjust a waypoint to maintain orthogonal routing
 * @param waypoints The current waypoints
 * @param index The index of the waypoint to adjust
 * @param newPosition The new position of the waypoint
 * @returns The adjusted waypoints
 */
export function adjustWaypoint(waypoints, index, newPosition) {
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
        }
        else {
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
export function adjustWaypointsForElementMove(waypoints, isSource, dx, dy) {
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
    }
    else {
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
            const wasHorizontal = Math.abs(waypoints[lastIndex].y - waypoints[lastIndex - 1].y) < EPSILON;
            const wasVertical = Math.abs(waypoints[lastIndex].x - waypoints[lastIndex - 1].x) < EPSILON;
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
            }
            else if (prevSegmentVertical && nextSegmentHorizontal) {
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
export function calculateSegmentMidpoints(start, end, waypoints = []) {
    // If there are no waypoints, we need to calculate the orthogonal path
    if (!waypoints || waypoints.length === 0) {
        return calculateDirectPathMidpoints(start, end);
    }
    const EPSILON = 0.001;
    // Special case for L-shaped connections with 3 points (2 waypoints + end)
    if (waypoints.length === 2) {
        const p1 = start;
        const p2 = waypoints[0];
        const p3 = waypoints[1];
        const p4 = end;
        // Check if this is an L-shaped connection (horizontal then vertical)
        const isHorizontalThenVertical = Math.abs(p1.y - p2.y) < EPSILON && // First segment is horizontal
            Math.abs(p2.x - p3.x) < EPSILON && // Second segment is vertical
            Math.abs(p3.x - p4.x) < EPSILON; // Third segment is vertical
        if (isHorizontalThenVertical) {
            console.log('DEBUG: L-shaped connection with 2 waypoints detected (horizontal then vertical)');
            // Return THREE midpoints - one for each segment
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
                },
                {
                    position: {
                        x: p3.x,
                        y: (p3.y + p4.y) / 2
                    },
                    orientation: 'vertical'
                }
            ];
        }
        // Check if this is an L-shaped connection (vertical then horizontal)
        const isVerticalThenHorizontal = Math.abs(p1.x - p2.x) < EPSILON && // First segment is vertical
            Math.abs(p2.y - p3.y) < EPSILON && // Second segment is horizontal
            Math.abs(p3.y - p4.y) < EPSILON; // Third segment is horizontal
        if (isVerticalThenHorizontal) {
            // L-shaped connection with 2 waypoints detected (vertical then horizontal)
            // Return THREE midpoints - one for each segment
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
                },
                {
                    position: {
                        x: (p3.x + p4.x) / 2,
                        y: p3.y
                    },
                    orientation: 'horizontal'
                }
            ];
        }
        // Check if this is a U-shaped connection (horizontal, vertical, horizontal)
        const isUShapeHVH = Math.abs(p1.y - p2.y) < EPSILON && // First segment is horizontal
            Math.abs(p2.x - p3.x) < EPSILON && // Second segment is vertical
            Math.abs(p3.y - p4.y) < EPSILON; // Third segment is horizontal
        if (isUShapeHVH) {
            // U-shaped connection detected (horizontal, vertical, horizontal)
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
                },
                {
                    position: {
                        x: (p3.x + p4.x) / 2,
                        y: p3.y
                    },
                    orientation: 'horizontal'
                }
            ];
        }
        // Check if this is a U-shaped connection (vertical, horizontal, vertical)
        const isUShapeVHV = Math.abs(p1.x - p2.x) < EPSILON && // First segment is vertical
            Math.abs(p2.y - p3.y) < EPSILON && // Second segment is horizontal
            Math.abs(p3.x - p4.x) < EPSILON; // Third segment is vertical
        if (isUShapeVHV) {
            // U-shaped connection detected (vertical, horizontal, vertical)
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
                },
                {
                    position: {
                        x: p3.x,
                        y: (p3.y + p4.y) / 2
                    },
                    orientation: 'vertical'
                }
            ];
        }
    }
    // For all other cases, use a simplified approach
    const allPoints = [start, ...waypoints, end];
    const midpoints = [];
    // Special case for direct connections with no waypoints
    if (waypoints.length === 0) {
        // For direct connections, we need to ensure we have at least one handle
        // Calculate a direct orthogonal path
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        // If the points are aligned horizontally or vertically, there's just one segment
        if (Math.abs(start.x - end.x) < EPSILON || Math.abs(start.y - end.y) < EPSILON) {
            const isHorizontal = Math.abs(start.y - end.y) < EPSILON;
            midpoints.push({
                position: {
                    x: (start.x + end.x) / 2,
                    y: (start.y + end.y) / 2
                },
                orientation: isHorizontal ? 'horizontal' : 'vertical'
            });
        }
        else {
            // For L-shaped connections, add two handles
            const goHorizontalFirst = Math.abs(dx) > Math.abs(dy);
            if (goHorizontalFirst) {
                // Horizontal then vertical
                midpoints.push({
                    position: {
                        x: start.x + dx / 2,
                        y: start.y
                    },
                    orientation: 'horizontal'
                });
                midpoints.push({
                    position: {
                        x: end.x,
                        y: start.y + dy / 2
                    },
                    orientation: 'vertical'
                });
            }
            else {
                // Vertical then horizontal
                midpoints.push({
                    position: {
                        x: start.x,
                        y: start.y + dy / 2
                    },
                    orientation: 'vertical'
                });
                midpoints.push({
                    position: {
                        x: start.x + dx / 2,
                        y: end.y
                    },
                    orientation: 'horizontal'
                });
            }
        }
        return midpoints;
    }
    // Process each segment between consecutive points
    for (let i = 0; i < allPoints.length - 1; i++) {
        const p1 = allPoints[i];
        const p2 = allPoints[i + 1];
        // Determine if the segment is horizontal or vertical
        const isHorizontal = Math.abs(p1.y - p2.y) < EPSILON;
        const isVertical = Math.abs(p1.x - p2.x) < EPSILON;
        // Skip diagonal segments (should not happen in orthogonal routing)
        if (!isHorizontal && !isVertical) {
            console.warn('Diagonal segment detected in orthogonal path:', { p1, p2 });
            // For diagonal segments, default to horizontal orientation
            midpoints.push({
                position: {
                    x: (p1.x + p2.x) / 2,
                    y: (p1.y + p2.y) / 2
                },
                orientation: 'horizontal'
            });
            continue;
        }
        // Calculate the midpoint - position it in the middle of the segment
        let midpoint;
        if (isHorizontal) {
            midpoint = {
                position: {
                    x: (p1.x + p2.x) / 2, // Middle of horizontal segment
                    y: p1.y // Same y as the segment
                },
                orientation: 'horizontal'
            };
        }
        else { // isVertical
            midpoint = {
                position: {
                    x: p1.x, // Same x as the segment
                    y: (p1.y + p2.y) / 2 // Middle of vertical segment
                },
                orientation: 'vertical'
            };
        }
        midpoints.push(midpoint);
        // Added midpoint for segment
    }
    // IMPORTANT: ALWAYS ensure we have a handle for EVERY segment
    // This is critical for complex paths with multiple waypoints
    // Check if we have the right number of midpoints
    // We should have one midpoint for each segment between points
    if (midpoints.length < allPoints.length - 1) {
        // Missing midpoints. Adding handles for all segments.
        // Clear existing midpoints and recalculate for all segments
        midpoints.length = 0;
        // Process each segment between consecutive points
        for (let i = 0; i < allPoints.length - 1; i++) {
            const p1 = allPoints[i];
            const p2 = allPoints[i + 1];
            // Determine if the segment is horizontal or vertical
            const isHorizontal = Math.abs(p1.y - p2.y) < EPSILON;
            const isVertical = Math.abs(p1.x - p2.x) < EPSILON;
            // Calculate the midpoint with proper positioning
            let midpoint;
            if (isHorizontal) {
                midpoint = {
                    position: {
                        x: (p1.x + p2.x) / 2, // Middle of horizontal segment
                        y: p1.y // Same y as the segment
                    },
                    orientation: 'horizontal'
                };
            }
            else if (isVertical) {
                midpoint = {
                    position: {
                        x: p1.x, // Same x as the segment
                        y: (p1.y + p2.y) / 2 // Middle of vertical segment
                    },
                    orientation: 'vertical'
                };
            }
            else {
                // Default to horizontal for diagonal segments
                midpoint = {
                    position: {
                        x: (p1.x + p2.x) / 2,
                        y: (p1.y + p2.y) / 2
                    },
                    orientation: 'horizontal'
                };
            }
            midpoints.push(midpoint);
            // Added midpoint for segment
        }
    }
    // Ensure we have at least one midpoint
    if (midpoints.length === 0) {
        // No midpoints calculated, adding default midpoint
        // If no midpoints were calculated, add a default one based on segment orientation
        const isHorizontal = Math.abs(start.y - end.y) < EPSILON;
        const isVertical = Math.abs(start.x - end.x) < EPSILON;
        if (isHorizontal) {
            midpoints.push({
                position: {
                    x: (start.x + end.x) / 2, // Middle of horizontal segment
                    y: start.y // Same y as the segment
                },
                orientation: 'horizontal'
            });
        }
        else if (isVertical) {
            midpoints.push({
                position: {
                    x: start.x, // Same x as the segment
                    y: (start.y + end.y) / 2 // Middle of vertical segment
                },
                orientation: 'vertical'
            });
        }
        else {
            // For diagonal segments, use a direct midpoint with horizontal orientation
            midpoints.push({
                position: {
                    x: (start.x + end.x) / 2,
                    y: (start.y + end.y) / 2
                },
                orientation: 'horizontal'
            });
        }
    }
    return midpoints;
}
/**
 * Calculate midpoints for a direct orthogonal path with no waypoints
 * @param start The start position
 * @param end The end position
 * @returns Array of midpoints with their orientation
 */
function calculateDirectPathMidpoints(start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const midpoints = [];
    const EPSILON = 0.001;
    // If the points are aligned horizontally or vertically, there's just one segment
    if (Math.abs(start.x - end.x) < EPSILON || Math.abs(start.y - end.y) < EPSILON) {
        const isHorizontal = Math.abs(start.y - end.y) < EPSILON;
        if (isHorizontal) {
            midpoints.push({
                position: {
                    x: (start.x + end.x) / 2, // Middle of horizontal segment
                    y: start.y // Same y as the segment
                },
                orientation: 'horizontal'
            });
        }
        else {
            midpoints.push({
                position: {
                    x: start.x, // Same x as the segment
                    y: (start.y + end.y) / 2 // Middle of vertical segment
                },
                orientation: 'vertical'
            });
        }
        return midpoints;
    }
    // Determine whether to go horizontal or vertical first
    const goHorizontalFirst = Math.abs(dx) > Math.abs(dy);
    // Calculate the corner point
    const cornerPoint = goHorizontalFirst
        ? { x: end.x, y: start.y } // Horizontal then vertical
        : { x: start.x, y: end.y }; // Vertical then horizontal
    if (goHorizontalFirst) {
        // First segment: horizontal from start to corner
        midpoints.push({
            position: {
                x: (start.x + cornerPoint.x) / 2, // Middle of horizontal segment
                y: start.y // Same y as the segment
            },
            orientation: 'horizontal'
        });
        // Second segment: vertical from corner to end
        midpoints.push({
            position: {
                x: cornerPoint.x, // Same x as the segment
                y: (cornerPoint.y + end.y) / 2 // Middle of vertical segment
            },
            orientation: 'vertical'
        });
        // Direct path (horizontal first)
    }
    else {
        // First segment: vertical from start to corner
        midpoints.push({
            position: {
                x: start.x, // Same x as the segment
                y: (start.y + cornerPoint.y) / 2 // Middle of vertical segment
            },
            orientation: 'vertical'
        });
        // Second segment: horizontal from corner to end
        midpoints.push({
            position: {
                x: (cornerPoint.x + end.x) / 2, // Middle of horizontal segment
                y: cornerPoint.y // Same y as the segment
            },
            orientation: 'horizontal'
        });
        // Direct path (vertical first)
    }
    return midpoints;
}
