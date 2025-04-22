import { calculateConnectionPoints } from './connectionUtils';
/**
 * Finds the closest connection point to a given position
 * @param position The position to find the closest connection point to
 * @param connectionPoints Array of connection points to search
 * @returns The closest connection point or null if none found
 */
export function findClosestConnectionPoint(position, connectionPoints) {
    if (!connectionPoints || connectionPoints.length === 0) {
        return null;
    }
    // Calculate distances to all connection points
    const distances = connectionPoints.map(point => {
        const dx = point.x - position.x;
        const dy = point.y - position.y;
        return {
            point,
            distance: Math.sqrt(dx * dx + dy * dy)
        };
    });
    // Sort by distance
    distances.sort((a, b) => a.distance - b.distance);
    // Return the closest point if it's within a reasonable distance (e.g., 50 pixels)
    if (distances[0].distance <= 50) {
        return distances[0].point;
    }
    return null;
}
/**
 * Handles the start of creating a connection
 * @param sourcePoint The source connection point
 * @returns Object containing the source point
 */
export function handleConnectionStart(sourcePoint) {
    return { sourcePoint };
}
/**
 * Handles the completion of creating a connection
 * @param sourcePoint The source connection point
 * @param targetPoint The target connection point
 * @param elements Array of all BPMN elements
 * @returns Object containing source and target element IDs
 */
export function handleConnectionComplete(sourcePoint, targetPoint, elements) {
    if (!sourcePoint || !targetPoint) {
        return null;
    }
    // Find the source and target elements
    const sourceElement = elements.find(el => el.id === sourcePoint.elementId);
    const targetElement = elements.find(el => el.id === targetPoint.elementId);
    if (!sourceElement || !targetElement) {
        return null;
    }
    return {
        sourceId: sourceElement.id,
        targetId: targetElement.id
    };
}
/**
 * Gets all connection points for all elements
 * @param elements Array of all BPMN elements
 * @returns Array of all connection points
 */
export function getAllConnectionPoints(elements) {
    const points = [];
    elements.forEach(element => {
        if (element.type !== 'connection') {
            const elementPoints = calculateConnectionPoints(element);
            points.push(...elementPoints);
        }
    });
    return points;
}
