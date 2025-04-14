import type { BpmnElementUnion } from '$lib/models/bpmnElements';
import { isNode } from '$lib/models/bpmnElements';
import { snapPositionToGrid } from './gridUtils';

/**
 * Handles the start of dragging an element
 * @param element The element being dragged
 * @param event The mouse event
 * @returns Object containing the original position and mouse position
 */
export function handleDragStart(element: BpmnElementUnion, event: MouseEvent) {
  // Check if the element is a node (has position and size)
  if (!isNode(element)) {
    throw new Error('Cannot drag a connection');
  }
  
  // Store original position and mouse position
  const originalPos = { x: element.x, y: element.y };
  const mousePos = { x: event.clientX, y: event.clientY };
  
  return { originalPos, mousePos };
}

/**
 * Calculates the new position during dragging
 * @param originalPos The original position of the element
 * @param mousePos The original mouse position
 * @param event The current mouse event
 * @returns The new position
 */
export function calculateDragPosition(originalPos: { x: number, y: number }, mousePos: { x: number, y: number }, event: MouseEvent) {
  // Calculate the distance moved
  const dx = event.clientX - mousePos.x;
  const dy = event.clientY - mousePos.y;
  
  // Calculate new position
  const newX = originalPos.x + dx;
  const newY = originalPos.y + dy;
  
  // Snap to grid
  const [snappedX, snappedY] = snapPositionToGrid(newX, newY);
  
  return { x: snappedX, y: snappedY };
}

/**
 * Handles the drop of an element from the toolbar
 * @param event The drop event
 * @param canvasRect The bounding rectangle of the canvas
 * @param viewportX The viewport X offset
 * @param viewportY The viewport Y offset
 * @returns The drop position
 */
export function handleElementDrop(event: DragEvent, canvasRect: DOMRect, viewportX: number, viewportY: number) {
  // Calculate drop position relative to the canvas
  const dropX = event.clientX - canvasRect.left - viewportX;
  const dropY = event.clientY - canvasRect.top - viewportY;
  
  // Snap to grid
  const [snappedX, snappedY] = snapPositionToGrid(dropX, dropY);
  
  return { x: snappedX, y: snappedY };
}
