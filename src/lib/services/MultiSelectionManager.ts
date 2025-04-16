import { writable, get } from 'svelte/store';
import type { BpmnElementUnion, Position } from '../models/bpmnElements';
import { bpmnStore } from '../stores/bpmnStore';
import { snapPositionToGrid } from '../utils/gridUtils';

// Helper function to check if element is a node (any element with position and size)
function isNode(element: BpmnElementUnion): boolean {
  return element.type !== 'connection';
}

// Helper function to check if an element is inside a pool
function isElementInsidePool(element: BpmnElementUnion, pool: BpmnElementUnion): boolean {
  if (!isNode(element) || !isNode(pool)) return false;

  // Check if the element is fully contained within the pool boundaries
  const elementX = element.x;
  const elementY = element.y;
  const elementWidth = element.width;
  const elementHeight = element.height;
  const poolX = pool.x;
  const poolY = pool.y;
  const poolWidth = pool.width;
  const poolHeight = pool.height;

  return elementX >= poolX &&
         elementY >= poolY &&
         elementX + elementWidth <= poolX + poolWidth &&
         elementY + elementHeight <= poolY + poolHeight;
}

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

    // First, find all pools and lanes that contain the selection rectangle
    const containingPoolsAndLanes = elements.filter(element => {
      if (element.type !== 'pool' && element.type !== 'lane') return false;

      // Check if the selection rectangle is completely inside this pool/lane
      return (
        normalizedRect.left >= element.x &&
        normalizedRect.right <= element.x + element.width &&
        normalizedRect.top >= element.y &&
        normalizedRect.bottom <= element.y + element.height
      );
    });

    console.log('DEBUG: Selection rectangle is inside these pools/lanes:',
      containingPoolsAndLanes.map(el => el.id));

    // Now find all elements that overlap with the selection rectangle
    const elementsInRect = elements.filter(element => {
      // Skip connections for now
      if (element.type === 'connection') return false;

      // Always skip pools and lanes - we never want to select them in rectangle selection
      if (element.type === 'pool' || element.type === 'lane') {
        return false;
      }

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
    console.log('DEBUG: selectElement called with elementId:', elementId, 'addToSelection:', addToSelection);

    // Get the element from the store
    const elements = get(bpmnStore);
    const element = elements.find(el => el.id === elementId);
    console.log('DEBUG: Element to select:', element);

    // Skip pools and lanes
    if (element && (element.type === 'pool' || element.type === 'lane')) {
      console.log('DEBUG: Skipping selection of pool/lane:', elementId);
      return;
    }

    // Check if the element is inside a pool
    if (element && element.type !== 'pool' && element.type !== 'lane' && element.type !== 'connection') {
      const pools = elements.filter(el => el.type === 'pool');
      for (const pool of pools) {
        if (isElementInsidePool(element, pool)) {
          console.log('DEBUG: Element is inside pool:', pool.id);
          break;
        }
      }
    }

    if (addToSelection) {
      // Add to existing selection
      this.selectedElementIds.update(ids => {
        console.log('DEBUG: Current selection before update:', ids);
        if (ids.includes(elementId)) {
          // If already selected, deselect it
          const newIds = ids.filter(id => id !== elementId);
          console.log('DEBUG: Element was already selected, deselecting. New selection:', newIds);
          return newIds;
        } else {
          // Otherwise add to selection
          const newIds = [...ids, elementId];
          console.log('DEBUG: Adding element to selection. New selection:', newIds);
          return newIds;
        }
      });
    } else {
      // Replace existing selection
      console.log('DEBUG: Replacing entire selection with:', [elementId]);
      this.selectedElementIds.set([elementId]);
    }

    // Update the isSelected property in the store
    this.updateSelectionInStore();
  }

  /**
   * Select multiple elements
   */
  public selectElements(elementIds: string[], addToSelection: boolean = false): void {
    console.log('DEBUG: selectElements called with elementIds:', elementIds, 'addToSelection:', addToSelection);

    // Get the elements from the store
    const elements = get(bpmnStore);

    // Filter out pools and lanes from the selection
    const filteredElementIds = elementIds.filter(id => {
      const element = elements.find(el => el.id === id);
      if (!element) return false;

      // Skip pools and lanes
      if (element.type === 'pool' || element.type === 'lane') {
        console.log('DEBUG: Filtering out pool/lane from selection:', id, element.type);
        return false;
      }

      return true;
    });

    console.log('DEBUG: Filtered element IDs (no pools/lanes):', filteredElementIds);

    if (addToSelection) {
      // Add to existing selection
      this.selectedElementIds.update(ids => {
        // Combine existing and new IDs, removing duplicates
        const combinedIds = [...ids, ...filteredElementIds];
        const uniqueIds = [...new Set(combinedIds)];
        console.log('DEBUG: Combined selection:', uniqueIds);
        return uniqueIds;
      });
    } else {
      // Replace existing selection
      console.log('DEBUG: Replacing entire selection with filtered IDs');
      this.selectedElementIds.set(filteredElementIds);
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
      .filter(element => element.type !== 'connection' && element.type !== 'pool' && element.type !== 'lane') // Skip connections, pools, and lanes
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

    // Store positions of selected elements
    selectedIds.forEach(id => {
      const element = elements.find(el => el.id === id);
      if (element && element.type !== 'connection') {
        positions[id] = { x: element.x, y: element.y };
      }
    });

    // Store the original positions
    this.originalPositions.set(positions);
  }

  /**
   * Drag selected elements
   */
  public dragSelectedElements(dx: number, dy: number): void {
    const selectedIds = get(this.selectedElementIds);
    const originalPositions = get(this.originalPositions);
    const elements = get(bpmnStore);

    console.log('DEBUG: dragSelectedElements called with dx:', dx, 'dy:', dy);
    console.log('DEBUG: Selected element IDs:', selectedIds);
    console.log('DEBUG: Original positions:', originalPositions);

    if (selectedIds.length === 0 || Object.keys(originalPositions).length === 0) {
      console.log('DEBUG: No selected elements or no original positions, returning');
      return;
    }

    // First, collect all the connections between selected elements
    const internalConnections: string[] = [];
    const externalConnections: string[] = [];

    // Find all connections and categorize them
    elements.forEach(el => {
      if (el.type === 'connection') {
        const sourceSelected = selectedIds.includes(el.sourceId);
        const targetSelected = selectedIds.includes(el.targetId);

        if (sourceSelected && targetSelected) {
          // Both endpoints are selected elements
          internalConnections.push(el.id);
        } else if (sourceSelected || targetSelected) {
          // Only one endpoint is a selected element
          externalConnections.push(el.id);
        }
      }
    });

    // Store original waypoints for connections
    const originalWaypoints: Record<string, Position[]> = {};

    // Store waypoints for internal connections
    internalConnections.forEach(id => {
      const connection = elements.find(el => el.id === id);
      if (connection && connection.type === 'connection' && connection.waypoints) {
        originalWaypoints[id] = JSON.parse(JSON.stringify(connection.waypoints));
      }
    });

    // Find all pools and lanes to check boundaries
    const pools = elements.filter(el => el.type === 'pool');

    // Move each selected element
    selectedIds.forEach(id => {
      const element = elements.find(el => el.id === id);
      const originalPos = originalPositions[id];

      if (!element || !originalPos || element.type === 'connection') {
        return;
      }

      // Calculate new position
      let newX = originalPos.x + dx;
      let newY = originalPos.y + dy;

      // Check if element is inside a pool
      let containingPool = null;
      let containingLane = null;

      // Find the pool and lane that contains this element
      for (const pool of pools) {
        if (isElementInsidePool(element, pool)) {
          containingPool = pool;

          // Check if element is in a lane
          if (pool.lanes && pool.lanes.length > 0) {
            for (const laneId of pool.lanes) {
              const lane = elements.find(el => el.id === laneId && el.type === 'lane');
              if (lane && isElementInsidePool(element, lane)) {
                containingLane = lane;
                break;
              }
            }
          }
          break;
        }
      }

      // If element is inside a pool/lane, ensure it stays within boundaries
      if (containingPool) {
        const container = containingLane || containingPool;

        // Calculate boundaries
        const minX = container.x;
        const minY = container.y;
        const maxX = container.x + container.width - element.width;
        const maxY = container.y + container.height - element.height;

        // Constrain position to stay within boundaries
        newX = Math.max(minX, Math.min(maxX, newX));
        newY = Math.max(minY, Math.min(maxY, newY));
      }

      // Snap to grid
      const [snappedX, snappedY] = snapPositionToGrid(newX, newY);

      // Update the element position
      bpmnStore.updateElement(id, {
        x: snappedX,
        y: snappedY
      });
    });

    // Update internal connections to maintain their relative positions
    internalConnections.forEach(id => {
      const connection = elements.find(el => el.id === id);
      const originalWaypointsForConnection = originalWaypoints[id];

      if (connection && connection.type === 'connection' && originalWaypointsForConnection) {
        // Move all waypoints by the same amount
        const updatedWaypoints = originalWaypointsForConnection.map(wp => ({
          x: wp.x + dx,
          y: wp.y + dy
        }));

        // Update the connection waypoints
        bpmnStore.updateConnectionWaypoints(id, updatedWaypoints);
      }
    });
  }

  /**
   * End dragging selected elements
   */
  public endDragSelectedElements(): void {
    const selectedIds = get(this.selectedElementIds);
    const elements = get(bpmnStore);

    // Find all connections that need to be refreshed
    const connectionsToRefresh: string[] = [];

    elements.forEach(el => {
      if (el.type === 'connection') {
        const sourceSelected = selectedIds.includes(el.sourceId);
        const targetSelected = selectedIds.includes(el.targetId);

        // Refresh connections where at least one endpoint is selected
        if (sourceSelected || targetSelected) {
          connectionsToRefresh.push(el.id);
        }
      }
    });

    // Force a refresh of all affected connections
    if (connectionsToRefresh.length > 0) {
      // Use a small delay to ensure all element positions are updated first
      setTimeout(() => {
        connectionsToRefresh.forEach(id => {
          // This is a no-op update that forces a refresh
          bpmnStore.updateElement(id, { isSelected: false });
          bpmnStore.updateElement(id, { isSelected: selectedIds.includes(id) });
        });

        // Force another refresh after a longer delay to ensure all handles are properly rendered
        setTimeout(() => {
          connectionsToRefresh.forEach(id => {
            bpmnStore.updateElement(id, { isSelected: false });
            bpmnStore.updateElement(id, { isSelected: selectedIds.includes(id) });
          });
        }, 100);
      }, 10);
    }

    // Clear original positions
    this.originalPositions.set({});
  }
}

// Create and export a singleton instance
export const multiSelectionManager = new MultiSelectionManager();
