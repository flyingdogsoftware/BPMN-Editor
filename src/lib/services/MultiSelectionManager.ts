import { writable, get } from 'svelte/store';
import type { BpmnElementUnion } from '../models/bpmnElements';
import { bpmnStore } from '../stores/bpmnStore';
import { snapPositionToGrid } from '../utils/gridUtils';

/**
 * MultiSelectionManager
 *
 * Manages the selection of multiple BPMN elements and operations on the selection.
 */
export class MultiSelectionManager {
  // Store for selected element IDs
  private selectedElementIds = writable<string[]>([]);

  // Store for original positions when dragging multiple elements
  private originalPositions = writable<Record<string, { x: number, y: number }>>({});

  // Selection mode flag
  private selectionMode = writable<boolean>(false);

  // Selection rectangle coordinates
  private selectionRect = writable<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    isActive: boolean;
  }>({
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
    isActive: false
  });

  constructor() {}

  /**
   * Get the current selection mode
   */
  public getSelectionMode(): boolean {
    return get(this.selectionMode);
  }

  /**
   * Toggle selection mode
   */
  public toggleSelectionMode(): boolean {
    this.selectionMode.update(mode => !mode);
    return get(this.selectionMode);
  }

  /**
   * Set selection mode
   */
  public setSelectionMode(mode: boolean): void {
    this.selectionMode.set(mode);
  }

  /**
   * Get the selection mode store
   */
  public getSelectionModeStore() {
    return { subscribe: this.selectionMode.subscribe };
  }

  /**
   * Get the selection rectangle store
   */
  public getSelectionRectStore() {
    return { subscribe: this.selectionRect.subscribe };
  }

  /**
   * Start a selection rectangle
   */
  public startSelectionRect(x: number, y: number): void {
    this.selectionRect.set({
      startX: x,
      startY: y,
      endX: x,
      endY: y,
      isActive: true
    });
  }

  /**
   * Update a selection rectangle
   */
  public updateSelectionRect(x: number, y: number): void {
    this.selectionRect.update(rect => ({
      ...rect,
      endX: x,
      endY: y
    }));
  }

  /**
   * End a selection rectangle and select elements within it
   */
  public endSelectionRect(): void {
    console.log('DEBUG: endSelectionRect called');
    const rect = get(this.selectionRect);
    console.log('DEBUG: Current selection rectangle:', rect);

    // If the rectangle is not active, just reset it and return
    if (!rect.isActive) {
      console.log('DEBUG: Selection rectangle is not active, resetting');
      this.selectionRect.set({
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0,
        isActive: false
      });
      return;
    }

    // Normalize rectangle coordinates (in case of dragging in different directions)
    const normalizedRect = {
      left: Math.min(rect.startX, rect.endX),
      top: Math.min(rect.startY, rect.endY),
      right: Math.max(rect.startX, rect.endX),
      bottom: Math.max(rect.startY, rect.endY)
    };
    console.log('DEBUG: Normalized rectangle:', normalizedRect);

    // Select elements within the rectangle
    const elements = get(bpmnStore);
    const elementsInRect = elements.filter(element => {
      // Skip connections for now
      if (element.type === 'connection') return false;

      // Check if element overlaps with the selection rectangle
      // An element is considered selected if any part of it is within the selection rectangle
      return (
        element.x < normalizedRect.right &&
        element.x + element.width > normalizedRect.left &&
        element.y < normalizedRect.bottom &&
        element.y + element.height > normalizedRect.top
      );
    });

    // Select the elements
    const elementIds = elementsInRect.map(element => element.id);
    console.log('DEBUG: Elements in rectangle:', elementsInRect.length, 'elements');
    console.log('DEBUG: Element IDs to select:', elementIds);
    this.selectElements(elementIds);

    // Reset the selection rectangle completely
    console.log('DEBUG: Resetting selection rectangle completely');
    this.selectionRect.set({
      startX: 0,
      startY: 0,
      endX: 0,
      endY: 0,
      isActive: false
    });
    console.log('DEBUG: Selection rectangle after reset:', get(this.selectionRect));
  }

  /**
   * Cancel a selection rectangle
   */
  public cancelSelectionRect(): void {
    this.selectionRect.update(rect => ({
      ...rect,
      isActive: false
    }));
  }

  /**
   * Get the currently selected element IDs
   */
  public getSelectedElementIds(): string[] {
    return get(this.selectedElementIds);
  }

  /**
   * Get the selected elements store
   */
  public getSelectedElementIdsStore() {
    return { subscribe: this.selectedElementIds.subscribe };
  }

  /**
   * Select a single element
   */
  public selectElement(elementId: string, addToSelection: boolean = false): void {
    if (addToSelection) {
      // Add to existing selection
      this.selectedElementIds.update(ids => {
        if (ids.includes(elementId)) {
          // If already selected, deselect it
          return ids.filter(id => id !== elementId);
        } else {
          // Otherwise add to selection
          return [...ids, elementId];
        }
      });
    } else {
      // Replace existing selection
      this.selectedElementIds.set([elementId]);
    }

    // Update the isSelected property in the store
    this.updateSelectionInStore();
  }

  /**
   * Select multiple elements
   */
  public selectElements(elementIds: string[], addToSelection: boolean = false): void {
    if (addToSelection) {
      // Add to existing selection
      this.selectedElementIds.update(ids => {
        // Combine existing and new IDs, removing duplicates
        const combinedIds = [...ids, ...elementIds];
        return [...new Set(combinedIds)];
      });
    } else {
      // Replace existing selection
      this.selectedElementIds.set(elementIds);
    }

    // Update the isSelected property in the store
    this.updateSelectionInStore();
  }

  /**
   * Deselect a single element
   */
  public deselectElement(elementId: string): void {
    this.selectedElementIds.update(ids => ids.filter(id => id !== elementId));

    // Update the isSelected property in the store
    this.updateSelectionInStore();
  }

  /**
   * Deselect all elements
   */
  public deselectAll(): void {
    this.selectedElementIds.set([]);

    // Update the isSelected property in the store
    this.updateSelectionInStore();
  }

  /**
   * Select all elements
   */
  public selectAll(): void {
    const elements = get(bpmnStore);
    const elementIds = elements
      .filter(element => element.type !== 'connection') // Skip connections for now
      .map(element => element.id);

    this.selectedElementIds.set(elementIds);

    // Update the isSelected property in the store
    this.updateSelectionInStore();
  }

  /**
   * Update the isSelected property in the store
   */
  private updateSelectionInStore(): void {
    const selectedIds = get(this.selectedElementIds);
    console.log('DEBUG: Updating selection in store with IDs:', selectedIds);

    // Get current elements from the store
    const elements = get(bpmnStore);

    // Update each element individually using the store's updateElement method
    elements.forEach(element => {
      const isSelected = selectedIds.includes(element.id);

      // Only update if the selection state has changed
      if (element.isSelected !== isSelected) {
        bpmnStore.updateElement(element.id, { isSelected });
      }
    });
  }

  /**
   * Start dragging selected elements
   */
  public startDragSelectedElements(): void {
    const selectedIds = get(this.selectedElementIds);
    const elements = get(bpmnStore);

    // Store original positions
    const positions: Record<string, { x: number, y: number }> = {};

    selectedIds.forEach(id => {
      const element = elements.find(el => el.id === id);
      if (element && element.type !== 'connection') {
        positions[id] = { x: element.x, y: element.y };
      }
    });

    this.originalPositions.set(positions);
  }

  /**
   * Drag selected elements
   */
  public dragSelectedElements(dx: number, dy: number): void {
    const selectedIds = get(this.selectedElementIds);
    const originalPositions = get(this.originalPositions);

    // Move each selected element
    selectedIds.forEach(id => {
      const originalPos = originalPositions[id];
      if (originalPos) {
        // Calculate new position
        const newX = originalPos.x + dx;
        const newY = originalPos.y + dy;

        // Snap to grid
        const [snappedX, snappedY] = snapPositionToGrid(newX, newY);

        // Update the element position
        bpmnStore.updateElement(id, {
          x: snappedX,
          y: snappedY
        });
      }
    });
  }

  /**
   * End dragging selected elements
   */
  public endDragSelectedElements(): void {
    // Clear original positions
    this.originalPositions.set({});
  }
}

// Create and export a singleton instance
export const multiSelectionManager = new MultiSelectionManager();
