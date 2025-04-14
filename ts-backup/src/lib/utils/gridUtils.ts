// Grid utilities for BPMN editor

/**
 * Snap a coordinate value to the nearest grid point
 * @param value The coordinate value to snap
 * @param gridSize The size of the grid
 * @returns The snapped coordinate value
 */
export function snapToGrid(value: number, gridSize: number = 20): number {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Snap a position to the grid
 * @param x The x coordinate
 * @param y The y coordinate
 * @param gridSize The size of the grid
 * @returns The snapped position as [x, y]
 */
export function snapPositionToGrid(x: number, y: number, gridSize: number = 20): [number, number] {
  return [snapToGrid(x, gridSize), snapToGrid(y, gridSize)];
}
