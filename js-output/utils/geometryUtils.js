/**
 * Calculate the intersection point between a line segment and a rectangle
 * @param lineStart Start point of the line segment
 * @param lineEnd End point of the line segment
 * @param rect Rectangle defined by {x, y, width, height}
 * @returns The intersection point or null if no intersection
 */
export function calculateIntersection(lineStart, lineEnd, rect) {
    // Calculate the direction vector of the line
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    // Normalize the direction vector for more accurate calculations
    const length = Math.sqrt(dx * dx + dy * dy);
    const nx = length > 0 ? dx / length : 0;
    const ny = length > 0 ? dy / length : 0;
    // Check if the line is horizontal or vertical (with a small tolerance)
    const isHorizontal = Math.abs(ny) < 0.001;
    const isVertical = Math.abs(nx) < 0.001;
    // For special cases (horizontal or vertical lines), use simplified calculations
    if (isHorizontal) {
        const y = lineStart.y;
        // Check if the line intersects the rectangle vertically
        if (y >= rect.y && y <= rect.y + rect.height) {
            // Determine which x-coordinate to use based on line direction
            if (nx > 0) {
                // Line goes from left to right
                return { x: rect.x, y };
            }
            else if (nx < 0) {
                // Line goes from right to left
                return { x: rect.x + rect.width, y };
            }
            else {
                // Line is exactly vertical, use the closest edge
                const distToLeft = Math.abs(lineStart.x - rect.x);
                const distToRight = Math.abs(lineStart.x - (rect.x + rect.width));
                return { x: distToLeft < distToRight ? rect.x : rect.x + rect.width, y };
            }
        }
    }
    else if (isVertical) {
        const x = lineStart.x;
        // Check if the line intersects the rectangle horizontally
        if (x >= rect.x && x <= rect.x + rect.width) {
            // Determine which y-coordinate to use based on line direction
            if (ny > 0) {
                // Line goes from top to bottom
                return { x, y: rect.y };
            }
            else if (ny < 0) {
                // Line goes from bottom to top
                return { x, y: rect.y + rect.height };
            }
            else {
                // Line is exactly horizontal, use the closest edge
                const distToTop = Math.abs(lineStart.y - rect.y);
                const distToBottom = Math.abs(lineStart.y - (rect.y + rect.height));
                return { x, y: distToTop < distToBottom ? rect.y : rect.y + rect.height };
            }
        }
    }
    // For general case, check intersection with each edge of the rectangle
    // Rectangle edges
    const edges = [
        // Top edge: (x, y) to (x + width, y)
        { start: { x: rect.x, y: rect.y }, end: { x: rect.x + rect.width, y: rect.y } },
        // Right edge: (x + width, y) to (x + width, y + height)
        { start: { x: rect.x + rect.width, y: rect.y }, end: { x: rect.x + rect.width, y: rect.y + rect.height } },
        // Bottom edge: (x, y + height) to (x + width, y + height)
        { start: { x: rect.x, y: rect.y + rect.height }, end: { x: rect.x + rect.width, y: rect.y + rect.height } },
        // Left edge: (x, y) to (x, y + height)
        { start: { x: rect.x, y: rect.y }, end: { x: rect.x, y: rect.y + rect.height } }
    ];
    // Find the closest intersection point to lineEnd
    let closestIntersection = null;
    let minDistance = Number.MAX_VALUE;
    for (const edge of edges) {
        const intersection = lineIntersection(lineStart, lineEnd, edge.start, edge.end);
        if (intersection) {
            // Calculate distance from lineEnd to intersection
            const dx = intersection.x - lineEnd.x;
            const dy = intersection.y - lineEnd.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            // Update closest intersection if this one is closer
            if (distance < minDistance) {
                minDistance = distance;
                closestIntersection = intersection;
            }
        }
    }
    return closestIntersection;
}
/**
 * Calculate the intersection point between two line segments
 * @param line1Start Start point of the first line segment
 * @param line1End End point of the first line segment
 * @param line2Start Start point of the second line segment
 * @param line2End End point of the second line segment
 * @returns The intersection point or null if no intersection
 */
function lineIntersection(line1Start, line1End, line2Start, line2End) {
    // Line 1 represented as a1x + b1y = c1
    const a1 = line1End.y - line1Start.y;
    const b1 = line1Start.x - line1End.x;
    const c1 = a1 * line1Start.x + b1 * line1Start.y;
    // Line 2 represented as a2x + b2y = c2
    const a2 = line2End.y - line2Start.y;
    const b2 = line2Start.x - line2End.x;
    const c2 = a2 * line2Start.x + b2 * line2Start.y;
    const determinant = a1 * b2 - a2 * b1;
    // If lines are parallel, no intersection
    if (Math.abs(determinant) < 0.001) {
        return null;
    }
    const x = (b2 * c1 - b1 * c2) / determinant;
    const y = (a1 * c2 - a2 * c1) / determinant;
    // Check if the intersection point is within both line segments
    const onLine1 = isPointOnLineSegment(line1Start, line1End, { x, y });
    const onLine2 = isPointOnLineSegment(line2Start, line2End, { x, y });
    if (onLine1 && onLine2) {
        return { x, y };
    }
    return null;
}
/**
 * Check if a point is on a line segment
 * @param lineStart Start point of the line segment
 * @param lineEnd End point of the line segment
 * @param point The point to check
 * @returns True if the point is on the line segment, false otherwise
 */
function isPointOnLineSegment(lineStart, lineEnd, point) {
    // Check if the point is within the bounding box of the line segment
    const minX = Math.min(lineStart.x, lineEnd.x);
    const maxX = Math.max(lineStart.x, lineEnd.x);
    const minY = Math.min(lineStart.y, lineEnd.y);
    const maxY = Math.max(lineStart.y, lineEnd.y);
    return (point.x >= minX - 0.001 &&
        point.x <= maxX + 0.001 &&
        point.y >= minY - 0.001 &&
        point.y <= maxY + 0.001);
}
/**
 * Calculate the intersection point between a line and a rectangle specifically for BPMN elements
 * @param lineStart Start point of the line
 * @param lineEnd End point of the line (center of the target element)
 * @param element Target element with x, y, width, height
 * @returns The intersection point where the line meets the element's boundary
 */
export function calculateElementIntersection(lineStart, lineEnd, element) {
    // Calculate the center of the element
    const elementCenter = {
        x: element.x + element.width / 2,
        y: element.y + element.height / 2
    };
    // If lineEnd is not at the element center, adjust it
    // This ensures we're always calculating from the correct center point
    if (Math.abs(lineEnd.x - elementCenter.x) > 0.001 || Math.abs(lineEnd.y - elementCenter.y) > 0.001) {
        lineEnd = elementCenter;
    }
    // For gateway elements (diamond shape), use a different calculation
    if (element.type === 'gateway') {
        return calculateGatewayIntersection(lineStart, lineEnd, element);
    }
    // For event elements (circle shape), use a circle intersection calculation
    if (element.type === 'event') {
        return calculateCircleIntersection(lineStart, lineEnd, element);
    }
    // For regular rectangular elements
    const intersection = calculateIntersection(lineStart, lineEnd, element);
    // If no intersection found, return a point on the element boundary
    // This is a fallback to ensure we always have a point on the boundary
    if (!intersection) {
        // Calculate direction vector from element center to lineStart
        const dx = lineStart.x - elementCenter.x;
        const dy = lineStart.y - elementCenter.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        // If the distance is very small, use a default direction
        if (distance < 0.001) {
            // Default to a point on the right side of the element
            return {
                x: elementCenter.x + element.width / 2,
                y: elementCenter.y
            };
        }
        // Normalize the direction vector
        const nx = dx / distance;
        const ny = dy / distance;
        // Find the intersection with the element boundary
        // by moving from the center in the direction of lineStart
        const halfWidth = element.width / 2;
        const halfHeight = element.height / 2;
        // Calculate how far to go in each direction to hit the boundary
        const tx = nx === 0 ? Number.MAX_VALUE : Math.abs(halfWidth / nx);
        const ty = ny === 0 ? Number.MAX_VALUE : Math.abs(halfHeight / ny);
        // Use the smaller of the two distances
        const t = Math.min(tx, ty);
        // Apply a small offset to ensure the arrow head is properly positioned
        const offset = 2;
        const adjustedT = Math.max(0, t - offset / distance);
        return {
            x: elementCenter.x + nx * adjustedT,
            y: elementCenter.y + ny * adjustedT
        };
    }
    return intersection;
}
/**
 * Calculate the intersection point between a line and a gateway (diamond shape)
 * @param lineStart Start point of the line
 * @param lineEnd End point of the line (center of the gateway)
 * @param element Gateway element with x, y, width, height
 * @returns The intersection point where the line meets the gateway's boundary
 */
function calculateGatewayIntersection(lineStart, lineEnd, element) {
    // Gateway is a diamond shape, so we need to define its corners
    const center = {
        x: element.x + element.width / 2,
        y: element.y + element.height / 2
    };
    // Ensure lineEnd is at the center of the gateway
    lineEnd = { ...center };
    // The four corners of the diamond
    const corners = [
        { x: center.x, y: element.y }, // Top
        { x: element.x + element.width, y: center.y }, // Right
        { x: center.x, y: element.y + element.height }, // Bottom
        { x: element.x, y: center.y } // Left
    ];
    // Define the four edges of the diamond
    const edges = [
        { start: corners[0], end: corners[1] }, // Top-Right
        { start: corners[1], end: corners[2] }, // Right-Bottom
        { start: corners[2], end: corners[3] }, // Bottom-Left
        { start: corners[3], end: corners[0] } // Left-Top
    ];
    // Find the closest intersection point to lineEnd
    let closestIntersection = null;
    let minDistance = Number.MAX_VALUE;
    for (const edge of edges) {
        const intersection = lineIntersection(lineStart, lineEnd, edge.start, edge.end);
        if (intersection) {
            // Calculate distance from lineStart to intersection
            const dx = intersection.x - lineStart.x;
            const dy = intersection.y - lineStart.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            // Update closest intersection if this one is closer
            if (distance < minDistance) {
                minDistance = distance;
                closestIntersection = intersection;
            }
        }
    }
    // If no intersection found, calculate a fallback point
    if (!closestIntersection) {
        // Calculate direction vector from center to lineStart
        const dx = lineStart.x - center.x;
        const dy = lineStart.y - center.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        // Normalize the direction vector
        const nx = dx / distance;
        const ny = dy / distance;
        // For a diamond, we need to determine which edge to intersect with
        // based on the angle of approach
        const angle = Math.atan2(ny, nx);
        // Calculate the half-width and half-height of the diamond
        const halfWidth = element.width / 2;
        const halfHeight = element.height / 2;
        // Calculate the parameter t for the ray equation: p = center + t * direction
        // For a diamond, t depends on the angle of approach
        let t;
        // The diamond has 4 edges, and we need to find which one the ray intersects
        // We can use the absolute values of nx and ny to determine this
        if (Math.abs(nx) * halfHeight > Math.abs(ny) * halfWidth) {
            // Intersects with left or right edge
            t = halfWidth / Math.abs(nx);
        }
        else {
            // Intersects with top or bottom edge
            t = halfHeight / Math.abs(ny);
        }
        // Apply a small offset to ensure the arrow head is properly positioned
        t = Math.max(0, t - 1);
        return {
            x: center.x + nx * t,
            y: center.y + ny * t
        };
    }
    return closestIntersection;
}
/**
 * Calculate the intersection point between a line and a circle (for event elements)
 * @param lineStart Start point of the line
 * @param lineEnd End point of the line (center of the circle)
 * @param element Event element with x, y, width, height
 * @returns The intersection point where the line meets the circle's boundary
 */
function calculateCircleIntersection(lineStart, lineEnd, element) {
    // Calculate the center of the circle
    const center = {
        x: element.x + element.width / 2,
        y: element.y + element.height / 2
    };
    // Ensure lineEnd is at the center of the circle
    lineEnd = { ...center };
    // Calculate the radius of the circle (assuming width and height are equal)
    const radius = element.width / 2;
    // Calculate the direction vector from center to lineStart
    // This is the direction the connection is coming FROM
    const dx = lineStart.x - center.x;
    const dy = lineStart.y - center.y;
    // Calculate the distance from center to lineStart
    const distance = Math.sqrt(dx * dx + dy * dy);
    // If the distance is zero or very small (lineStart is at or very close to the center),
    // return a default point based on the relative positions of other elements
    if (distance < 0.001) {
        // Try to determine a reasonable direction based on the element's position
        // Default to right side if no better direction can be determined
        return {
            x: center.x + radius - 3, // Default to a point on the right side of the circle with offset for arrow
            y: center.y
        };
    }
    // Normalize the direction vector
    const nx = dx / distance;
    const ny = dy / distance;
    // Apply a small offset to ensure the arrow head is properly positioned
    // This helps with visual alignment of the arrow head
    // Increase the offset to ensure the arrowhead is clearly visible
    const offsetRadius = radius - 3; // Slightly shorter to ensure arrow head is visible
    // Calculate the intersection point
    return {
        x: center.x + nx * offsetRadius,
        y: center.y + ny * offsetRadius
    };
}
