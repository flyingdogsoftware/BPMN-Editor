// Grid utilities for BPMN editor
/**
 * Snap a coordinate value to the nearest grid point
 * @param value The coordinate value to snap
 * @param gridSize The size of the grid
 * @returns The snapped coordinate value
 */
export function snapToGrid(value, gridSize = 20) {
    return Math.round(value / gridSize) * gridSize;
}
/**
 * Snap a position to the grid
 * @param x The x coordinate
 * @param y The y coordinate
 * @param gridSize The size of the grid
 * @returns The snapped position as [x, y]
 */
export function snapPositionToGrid(x, y, gridSize = 20) {
    return [snapToGrid(x, gridSize), snapToGrid(y, gridSize)];
}
