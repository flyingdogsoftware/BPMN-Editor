import type { BpmnElementUnion } from '$lib/models/bpmnElements';
import { isNode } from '$lib/models/bpmnElements';
import { snapToGrid } from './gridUtils';

/**
 * Handles the start of resizing an element
 * @param element The element being resized
 * @param position The resize handle position
 * @returns Object containing the original size and position
 */
export function handleResizeStart(element: BpmnElementUnion) {
  // Check if the element is a node (has position and size)
  if (!isNode(element)) {
    throw new Error('Cannot resize a connection');
  }
  
  // Store original size and position
  const originalSize = { width: element.width, height: element.height };
  const originalPos = { x: element.x, y: element.y };
  
  return { originalSize, originalPos };
}

/**
 * Calculates the new size and position during resizing
 * @param originalSize The original size of the element
 * @param originalPos The original position of the element
 * @param dx The change in x position
 * @param dy The change in y position
 * @param position The resize handle position
 * @returns The new size and position
 */
export function calculateResizeValues(
  originalSize: { width: number, height: number },
  originalPos: { x: number, y: number },
  dx: number,
  dy: number,
  position: string
) {
  let newWidth = originalSize.width;
  let newHeight = originalSize.height;
  let newX = originalPos.x;
  let newY = originalPos.y;
  
  // Calculate new size and position based on the handle being dragged
  switch (position) {
    case 'right':
      newWidth = Math.max(100, originalSize.width + dx);
      break;
    case 'bottom':
      newHeight = Math.max(100, originalSize.height + dy);
      break;
    case 'bottom-right':
      newWidth = Math.max(100, originalSize.width + dx);
      newHeight = Math.max(100, originalSize.height + dy);
      break;
    case 'left':
      newWidth = Math.max(100, originalSize.width - dx);
      newX = originalPos.x + originalSize.width - newWidth;
      break;
    case 'top':
      newHeight = Math.max(100, originalSize.height - dy);
      newY = originalPos.y + originalSize.height - newHeight;
      break;
    case 'top-left':
      newWidth = Math.max(100, originalSize.width - dx);
      newHeight = Math.max(100, originalSize.height - dy);
      newX = originalPos.x + originalSize.width - newWidth;
      newY = originalPos.y + originalSize.height - newHeight;
      break;
    case 'top-right':
      newWidth = Math.max(100, originalSize.width + dx);
      newHeight = Math.max(100, originalSize.height - dy);
      newY = originalPos.y + originalSize.height - newHeight;
      break;
    case 'bottom-left':
      newWidth = Math.max(100, originalSize.width - dx);
      newHeight = Math.max(100, originalSize.height + dy);
      newX = originalPos.x + originalSize.width - newWidth;
      break;
  }
  
  // Snap to grid
  newX = snapToGrid(newX);
  newY = snapToGrid(newY);
  newWidth = snapToGrid(newWidth);
  newHeight = snapToGrid(newHeight);
  
  return { width: newWidth, height: newHeight, x: newX, y: newY };
}
