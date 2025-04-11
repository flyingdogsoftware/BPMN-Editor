import { writable } from 'svelte/store';
import type { BpmnConnection, BpmnElementUnion, ConnectionPoint, Position } from '$lib/types/bpmn';
import { calculateConnectionPoints } from '$lib/utils/connectionUtils';

// Initial elements
const initialElements: BpmnElementUnion[] = [
  {
    id: 'task1',
    type: 'task',
    label: 'Sample Task',
    x: 100,
    y: 100,
    width: 120,
    height: 80,
    taskType: 'user'
  },
  {
    id: 'event1',
    type: 'event',
    label: 'Start Event',
    x: 300,
    y: 100,
    width: 36,
    height: 36,
    eventType: 'start',
    eventDefinition: 'none'
  }
];

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
        const updatedElements = elements.map(el => el.id === id ? { ...el, ...changes } : el);

        // If the element is a node and its position changed, update any connected connections
        const updatedElement = updatedElements.find(el => el.id === id);
        if (updatedElement && (updatedElement.type === 'task' || updatedElement.type === 'event' || updatedElement.type === 'gateway')) {
          // Recalculate connection points for this element
          const connectionPoints = calculateConnectionPoints(updatedElement);

          // Update any connections that use this element
          updatedElements.forEach(el => {
            if (el.type === 'connection') {
              if (el.sourceId === id || el.targetId === id) {
                // Clear waypoints to force recalculation of the path
                // This ensures the orthogonal path is recalculated correctly
                el.waypoints = [];
              }
            }
          });
        }

        return updatedElements;
      }),
    // Add a new connection
    addConnection: (connection: BpmnConnection) => update(elements => [...elements, connection]),
    // Update connection waypoints
    updateConnectionWaypoints: (id: string, waypoints: Position[]) =>
      update(elements =>
        elements.map(el => el.id === id && el.type === 'connection' ? { ...el, waypoints } : el)
      ),
    // Get connection points for an element
    getConnectionPoints: (elements: BpmnElementUnion[], elementId: string): ConnectionPoint[] => {
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
            const updates: Partial<BpmnConnection> = {};
            if (sourcePointId !== undefined) updates.sourcePointId = sourcePointId;
            if (targetPointId !== undefined) updates.targetPointId = targetPointId;

            // Clear waypoints to force recalculation of the path
            // This ensures the orthogonal path is recalculated correctly
            updates.waypoints = [];

            console.log('Connection updates:', updates);
            return { ...el, ...updates };
          }
          return el;
        });
      }),
    // Update connection label
    updateConnectionLabel: (id: string, label: string) =>
      update(elements =>
        elements.map(el => el.id === id && el.type === 'connection' ? { ...el, label } : el)
      ),
    // Update connection label position
    updateConnectionLabelPosition: (id: string, position: Position) =>
      update(elements =>
        elements.map(el => el.id === id && el.type === 'connection' ? { ...el, labelPosition: position } : el)
      ),
    // Update connection condition
    updateConnectionCondition: (id: string, condition: string) =>
      update(elements =>
        elements.map(el => el.id === id && el.type === 'connection' ? { ...el, condition } : el)
      ),
    // Reset to initial state
    reset: () => set(initialElements)
  };
};

// Export the store
export const bpmnStore = createBpmnStore();
