import { writable } from 'svelte/store';
import type { BpmnConnection, BpmnElementUnion, ConnectionPoint, Position } from '../models/bpmnElements';
import { calculateConnectionPoints, adjustWaypointsForElementMove } from '../utils/connectionRouting';

// Initial elements - empty array for a blank canvas
const initialElements: BpmnElementUnion[] = [];

// Create a writable store
const createBpmnStore = () => {
  const { subscribe, set, update } = writable<BpmnElementUnion[]>(initialElements);

  return {
    subscribe,
    // Add a new element
    addElement: (element: BpmnElementUnion) => update(elements => [...elements, element]),
    // Remove an element by id
    removeElement: (id: string) => update(elements => {
      // First, remove any connections that use this element
      const filteredElements = elements.filter(el => {
        if (el.type === 'connection') {
          return el.sourceId !== id && el.targetId !== id;
        }
        return true;
      });
      // Then remove the element itself
      return filteredElements.filter(el => el.id !== id);
    }),
    // Update an element
    updateElement: (id: string, changes: Partial<BpmnElementUnion>) =>
      update(elements => {
        const updatedElements = elements.map(el => el.id === id ? { ...el, ...changes } as BpmnElementUnion : el);

        // If the element is a node and its position changed, update any connected connections
        const updatedElement = updatedElements.find(el => el.id === id);
        if (updatedElement && updatedElement.type !== 'connection' && 'x' in updatedElement && 'y' in updatedElement && 'width' in updatedElement && 'height' in updatedElement) {
          // Recalculate connection points for this element
          // We've already checked that this element has x, y, width, and height properties
          calculateConnectionPoints(updatedElement as any);

          // Get the position change if this is a position update
          let dx = 0;
          let dy = 0;

          // Find the old element to compare positions
          const oldElement = elements.find(el => el.id === id);

          // Check if the position has changed by comparing old and new positions
          if (oldElement && 'x' in oldElement && 'y' in oldElement && 'x' in updatedElement && 'y' in updatedElement) {
            // Calculate the actual movement
            dx = updatedElement.x - oldElement.x;
            dy = updatedElement.y - oldElement.y;

            // Log position changes
            if (dx !== 0 || dy !== 0) {
              console.log(`Element ${id} moved: dx=${dx}, dy=${dy}`);
              console.log(`  Old position: x=${oldElement.x}, y=${oldElement.y}`);
              console.log(`  New position: x=${updatedElement.x}, y=${updatedElement.y}`);
            }
          }

          // Update any connections that use this element
          updatedElements.forEach(el => {
            if (el.type === 'connection') {
              if (el.sourceId === id || el.targetId === id) {
                console.log(`Connection ${el.id} affected by element ${id} movement`);
                console.log(`  Has waypoints: ${el.waypoints && el.waypoints.length > 0 ? 'Yes' : 'No'}`);
                console.log(`  Waypoints count: ${el.waypoints ? el.waypoints.length : 0}`);
                console.log(`  Movement: dx=${dx}, dy=${dy}`);

                // Check if there was any movement
                if (dx !== 0 || dy !== 0) {
                  const isSource = el.sourceId === id;
                  
                  // Check if the moved element is a pool
                  const isPool = updatedElement.type === 'pool';
                  
                  if (isPool) {
                    // For pools, use a simple delta-x,y approach instead of rerouting
                    // This is much more efficient and prevents the long delay after pool movement
                    console.log(`  Using delta-x,y approach for pool movement`);
                    
                    // If we have existing waypoints, just shift them by the same delta
                    if (el.waypoints && el.waypoints.length > 0) {
                      // Apply the delta to all waypoints while preserving their full structure
                      el.waypoints = el.waypoints.map(wp => ({
                        ...wp, // Preserve all existing properties
                        x: wp.x + dx,
                        y: wp.y + dy
                      }));
                      
                      console.log(`  Updated waypoints with delta: dx=${dx}, dy=${dy}`);
                    } else {
                      // If no waypoints exist, create a simple path
                      // Find source and target elements
                      const source = updatedElements.find(e => e.id === el.sourceId);
                      const target = updatedElements.find(e => e.id === el.targetId);
                      
                      if (source && target && 'x' in source && 'y' in source && 'width' in source && 'height' in source &&
                          'x' in target && 'y' in target && 'width' in target && 'height' in target) {
                        // Calculate centers
                        const sourceCenter = {
                          x: source.x + source.width / 2,
                          y: source.y + source.height / 2
                        };
                        
                        const targetCenter = {
                          x: target.x + target.width / 2,
                          y: target.y + target.height / 2
                        };
                        
                        // Create a simple L-shaped path
                        const dxCenters = targetCenter.x - sourceCenter.x;
                        const dyCenters = targetCenter.y - sourceCenter.y;
                        const goHorizontalFirst = Math.abs(dxCenters) > Math.abs(dyCenters);
                        
                        // Create waypoints with just x and y properties as defined in the model
                        if (goHorizontalFirst) {
                          el.waypoints = [{ 
                            x: targetCenter.x, 
                            y: sourceCenter.y 
                          }];
                        } else {
                          el.waypoints = [{ 
                            x: sourceCenter.x, 
                            y: targetCenter.y 
                          }];
                        }
                      }
                    }
                  } else {
                    // For non-pool elements, use the original rerouting approach
                    // Completely reset the waypoints and recalculate the path
                    console.log(`  Resetting connection path for ${isSource ? 'source' : 'target'} movement`);

                    // Find source and target elements
                    const source = updatedElements.find(e => e.id === el.sourceId);
                    const target = updatedElements.find(e => e.id === el.targetId);

                    if (source && target && 'x' in source && 'y' in source && 'width' in source && 'height' in source &&
                        'x' in target && 'y' in target && 'width' in target && 'height' in target) {
                      // Calculate centers
                      const sourceCenter = {
                        x: source.x + source.width / 2,
                        y: source.y + source.height / 2
                      };

                      const targetCenter = {
                        x: target.x + target.width / 2,
                        y: target.y + target.height / 2
                      };

                      // Determine whether to go horizontal or vertical first
                      const dx = targetCenter.x - sourceCenter.x;
                      const dy = targetCenter.y - sourceCenter.y;
                      const goHorizontalFirst = Math.abs(dx) > Math.abs(dy);

                      // Create a new path with one waypoint
                      if (goHorizontalFirst) {
                        // Create a waypoint that goes horizontal first
                        el.waypoints = [
                          { x: targetCenter.x, y: sourceCenter.y }
                        ];
                      } else {
                        // Create a waypoint that goes vertical first
                        el.waypoints = [
                          { x: sourceCenter.x, y: targetCenter.y }
                        ];
                      }

                      console.log(`  Created new waypoints:`, el.waypoints);
                    } else {
                      // If we can't find the elements, reset the path
                      console.log(`  Could not find source or target elements, resetting path`);
                      el.waypoints = [];
                    }
                    
                    // Force a refresh of the connection to ensure proper rendering of handles
                    // This is important to ensure that the segment midpoints are recalculated
                    // and the handles are positioned correctly
                    setTimeout(() => {
                      // Make a copy of the waypoints to trigger a reactive update
                      if (el.waypoints) {
                        const refreshedWaypoints = [...el.waypoints];
                        update(elements =>
                          elements.map(element =>
                            element.id === el.id ? { ...element, waypoints: refreshedWaypoints } : element
                          )
                        );
                      }
                    }, 0);
                  }
                } else {
                  // If there was no movement, keep existing path
                  console.log(`  No movement detected, keeping existing path`);
                }
              }
            }
          });
        }

        return updatedElements;
      }),
    // Add a new connection
    addConnection: (connection: BpmnConnection) => update(elements => [...elements, connection]),
    // Update connection waypoints
    updateConnectionWaypoints: (id: string, waypoints: Position[]) => {
      // Log the update operation
      console.log('DEBUG: Updating connection waypoints for', id);
      console.log('DEBUG: New waypoints:', JSON.stringify(waypoints));

      // Update the element with the provided waypoints
      // Note: We assume the waypoints are already optimized if needed
      return update(elements =>
        elements.map(el => {
          if (el.id === id && el.type === 'connection') {
            return { ...el, waypoints: waypoints as any };
          }
          return el;
        })
      );
    },
    // Get connection points for an element
    getConnectionPoints: (elements: BpmnElementUnion[], elementId: string): any[] => {
      const element = elements.find(el => el.id === elementId);
      if (!element || element.type === 'connection') return [];
      return calculateConnectionPoints(element);
    },
    // Toggle connection selection
    toggleConnectionSelection: (id: string) =>
      update(elements =>
        elements.map(el => {
          if (el.id === id && el.type === 'connection') {
            return { ...el, isSelected: !el.isSelected };
          } else if (el.type === 'connection' && el.isSelected) {
            // Deselect other connections
            return { ...el, isSelected: false };
          }
          return el;
        })
      ),
    // Update connection endpoints
    updateConnectionEndpoints: (id: string, sourcePointId?: string, targetPointId?: string) =>
      update(elements => {
        console.log(`Updating connection ${id} endpoints:`, { sourcePointId, targetPointId });

        return elements.map(el => {
          if (el.id === id && el.type === 'connection') {
            // Create a new connection object with updated properties
            const updatedConnection = { ...el };
            
            // Update the source and target point IDs if provided
            if (sourcePointId !== undefined) updatedConnection.sourcePointId = sourcePointId;
            if (targetPointId !== undefined) updatedConnection.targetPointId = targetPointId;
            
            // Clear waypoints to force recalculation of the path
            // This ensures the orthogonal path is recalculated correctly
            updatedConnection.waypoints = [];
            
            console.log('Connection updates:', { 
              sourcePointId: updatedConnection.sourcePointId, 
              targetPointId: updatedConnection.targetPointId,
              waypoints: updatedConnection.waypoints
            });
            
            return updatedConnection;
          }
          return el;
        });
      }),
    // Update connection label
    updateConnectionLabel: (id: string, label: string) =>
      update(elements =>
        elements.map(el => el.id === id && el.type === 'connection' ? { ...el, label } : el)
      ),
    // Update connection label offset
    updateConnectionLabelOffset: (id: string, offset: Position) =>
      update(elements =>
        elements.map(el => el.id === id && el.type === 'connection' ? { ...el, labelOffset: offset } : el)
      ),
    // Update connection label position (legacy - kept for backward compatibility)
    updateConnectionLabelPosition: (id: string, position: Position) =>
      update(elements =>
        elements.map(el => el.id === id && el.type === 'connection' ? { ...el, labelPosition: position } : el)
      ),
    // Update connection condition
    updateConnectionCondition: (id: string, condition: string) =>
      update(elements =>
        elements.map(el => el.id === id && el.type === 'connection' ? { ...el, condition } : el)
      ),
    // Update node label
    updateNodeLabel: (id: string, label: string) =>
      update(elements =>
        elements.map(el => {
          if (el.id === id && (el.type === 'task' || el.type === 'event' || el.type === 'gateway' || el.type === 'pool' || el.type === 'lane')) {
            return { ...el, label };
          }
          return el;
        })
      ),
    // Update node label position
    updateNodeLabelPosition: (id: string, position: Position) =>
      update(elements =>
        elements.map(el => {
          if (el.id === id && (el.type === 'task' || el.type === 'event' || el.type === 'gateway' || el.type === 'pool' || el.type === 'lane')) {
            return { ...el, labelPosition: position };
          }
          return el;
        })
      ),
    // Toggle node label visibility
    toggleNodeLabelVisibility: (id: string) =>
      update(elements =>
        elements.map(el => {
          if (el.id === id && (el.type === 'task' || el.type === 'event' || el.type === 'gateway' || el.type === 'pool' || el.type === 'lane')) {
            return { ...el, labelVisible: el.labelVisible === undefined ? false : !el.labelVisible };
          }
          return el;
        })
      ),
    // Reset to initial state
    reset: () => set(initialElements)
  };
};

// Export the store
export const bpmnStore = createBpmnStore();
