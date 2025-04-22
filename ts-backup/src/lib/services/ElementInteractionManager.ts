import { writable, derived } from 'svelte/store';
import { bpmnStore } from '../stores/bpmnStore';
import type { BpmnElementUnion, Position } from '../models/bpmnElements';
import { isNode } from '../models/bpmnElements';
import { snapPositionToGrid } from '../utils/gridUtils';

/**
 * ElementInteractionManager
 *
 * Manages element interactions such as dragging, selection, and keyboard control.
 * This service is responsible for handling user interactions with BPMN elements.
 */
export class ElementInteractionManager {
  // Dragging state
  private isDragging = writable(false);
  private draggedElementId = writable<string | null>(null);
  private dragStartX = writable(0);
  private dragStartY = writable(0);
  private originalPositions = writable<Record<string, Position>>({});

  // Element selection state
  private selectedElementId = writable<string | null>(null);

  // Bound event handlers to maintain this context
  private boundHandleMouseMove: (event: MouseEvent) => void;
  private boundHandleMouseUp: () => void;

  // Derived stores for external components
  public draggingState = derived(
    [this.isDragging, this.draggedElementId],
    ([$isDragging, $draggedElementId]) => ({
      isDragging: $isDragging,
      draggedElementId: $draggedElementId
    })
  );

  constructor(private elementManagerComponent: any = null) {
    // Bind methods to maintain this context
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandleMouseUp = this.handleMouseUp.bind(this);
  }

  /**
   * Set the ElementManagerComponent reference
   * @param component The ElementManagerComponent instance
   */
  public setElementManagerComponent(component: any) {
    this.elementManagerComponent = component;
  }

  /**
   * Handle mouse down on an element to start dragging
   * @param event The mouse event
   * @param element The element being interacted with
   */
  public handleMouseDown(event: MouseEvent, element: BpmnElementUnion) {
    // Only handle left mouse button
    if (event.button !== 0) return;

    event.preventDefault();

    // Store the dragging state
    this.isDragging.set(true);
    this.draggedElementId.set(element.id);

    // Store the initial mouse position
    this.dragStartX.set(event.clientX);
    this.dragStartY.set(event.clientY);

    // Store original position for dragging
    let positions: Record<string, Position> = {};

    // Get existing positions if any
    this.originalPositions.subscribe(value => { positions = { ...value }; })();

    // Add the current element's position
    positions[element.id] = { x: element.x, y: element.y };

    // Update the positions
    this.originalPositions.set(positions);

    // Add event listeners for mouse move and mouse up
    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', this.boundHandleMouseMove);
      window.addEventListener('mouseup', this.boundHandleMouseUp);
    }

    return true;
  }

  /**
   * Handle keyboard events for accessibility
   * @param event The keyboard event
   * @param element The element being interacted with
   */
  public handleKeyDown(event: KeyboardEvent, element: BpmnElementUnion) {
    // Only handle node elements (not connections)
    if (!isNode(element)) return;

    // Handle different key presses
    const moveDistance = event.shiftKey ? 10 : 20; // Smaller steps with Shift key

    if (event.key === 'Enter' || event.key === ' ') {
      // Enter or Space key - toggle selection
      event.preventDefault();

      // Toggle selection
      let currentDraggedId: string | null = null;
      this.draggedElementId.subscribe(id => { currentDraggedId = id; })();

      if (currentDraggedId === element.id) {
        this.draggedElementId.set(null);
      } else {
        this.draggedElementId.set(element.id);

        // Store original position for dragging
        const positions: Record<string, Position> = {};
        positions[element.id] = { x: element.x, y: element.y };
        this.originalPositions.set(positions);
      }
    } else if (event.key === 'ArrowUp') {
      // Up arrow - move element up
      event.preventDefault();
      this.moveElement(element, 0, -moveDistance);
    } else if (event.key === 'ArrowDown') {
      // Down arrow - move element down
      event.preventDefault();
      this.moveElement(element, 0, moveDistance);
    } else if (event.key === 'ArrowLeft') {
      // Left arrow - move element left
      event.preventDefault();
      this.moveElement(element, -moveDistance, 0);
    } else if (event.key === 'ArrowRight') {
      // Right arrow - move element right
      event.preventDefault();
      this.moveElement(element, moveDistance, 0);
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      // Delete or Backspace key - remove element
      event.preventDefault();
      bpmnStore.removeElement(element.id);
    }

    return true;
  }

  /**
   * Handle mouse movement during drag
   * @param event The mouse event
   */
  private handleMouseMove(event: MouseEvent) {
    let isDraggingValue = false;
    let draggedId: string | null = null;
    let startX = 0;
    let startY = 0;

    // Get current state values
    this.isDragging.subscribe(value => { isDraggingValue = value; })();
    this.draggedElementId.subscribe(value => { draggedId = value; })();
    this.dragStartX.subscribe(value => { startX = value; })();
    this.dragStartY.subscribe(value => { startY = value; })();

    if (isDraggingValue && draggedId) {
      // Calculate the distance moved
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;

      // Use the ElementManagerComponent to handle element dragging
      if (this.elementManagerComponent) {
        this.elementManagerComponent.handleElementDrag(draggedId, dx, dy);
      }
    }
  }

  /**
   * End dragging or resizing
   */
  private handleMouseUp() {
    let isDraggingValue = false;
    let draggedId: string | null = null;

    // Get current state values
    this.isDragging.subscribe(value => { isDraggingValue = value; })();
    this.draggedElementId.subscribe(value => { draggedId = value; })();

    if (isDraggingValue && draggedId) {
      // Use the ElementManagerComponent to handle element drag end
      if (this.elementManagerComponent) {
        this.elementManagerComponent.handleElementDragEnd(draggedId);
      }
    }

    // Reset dragging state
    this.isDragging.set(false);
    this.draggedElementId.set(null);

    // Remove event listeners
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', this.boundHandleMouseMove);
      window.removeEventListener('mouseup', this.boundHandleMouseUp);
    }
  }

  /**
   * Move an element by a specified amount
   * @param element The element to move
   * @param dx The x distance to move
   * @param dy The y distance to move
   */
  private moveElement(element: BpmnElementUnion, dx: number, dy: number) {
    if (!isNode(element)) return;

    // Calculate new position
    const newX = element.x + dx;
    const newY = element.y + dy;

    // Snap to grid
    const [snappedX, snappedY] = snapPositionToGrid(newX, newY);

    // Update the element position
    bpmnStore.updateElement(element.id, {
      x: snappedX,
      y: snappedY
    });
  }

  /**
   * Get the current dragging state
   * @returns Object containing isDragging and draggedElementId
   */
  public getDraggingState() {
    let isDraggingValue = false;
    let draggedId: string | null = null;

    this.isDragging.subscribe(value => { isDraggingValue = value; })();
    this.draggedElementId.subscribe(value => { draggedId = value; })();

    return {
      isDragging: isDraggingValue,
      draggedElementId: draggedId
    };
  }

  /**
   * Get the original positions for dragging
   * @returns Record of element IDs to original positions
   */
  public getOriginalPositions() {
    let positions: Record<string, Position> = {};
    this.originalPositions.subscribe(value => { positions = value; })();
    return positions;
  }

  /**
   * Set the original positions for dragging
   * @param positions Record of element IDs to original positions
   */
  public setOriginalPositions(positions: Record<string, Position>) {
    this.originalPositions.set(positions);
  }

  /**
   * Clean up event listeners
   */
  public cleanup() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', this.boundHandleMouseMove);
      window.removeEventListener('mouseup', this.boundHandleMouseUp);
    }
  }
}

// Create a singleton instance
export const elementInteractionManager = new ElementInteractionManager();
