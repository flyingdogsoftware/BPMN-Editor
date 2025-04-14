<script lang="ts">
  import { elementManager } from '$lib/services/ElementManager';
  import { createEventDispatcher } from 'svelte';
  import type {
    Position,
    Size,
    BpmnElementUnion,
    BpmnTask,
    BpmnEvent,
    BpmnGateway,
    BpmnSubProcess,
    BpmnDataObject,
    BpmnDataStore,
    BpmnTextAnnotation,
    BpmnPool,
    BpmnLane
  } from '$lib/types/bpmn';

  // Create event dispatcher
  const dispatch = createEventDispatcher();

  // Props
  export let originalPositions: Record<string, Position> = {};
  let originalSizes: Record<string, Size> = {};

  // Element creation methods
  function addTask(
    taskType: string = 'user',
    x: number = 200,
    y: number = 200
  ): BpmnElementUnion {
    const newTask = elementManager.addTask(taskType, x, y);
    dispatch('elementCreated', { element: newTask });
    return newTask;
  }

  function addEvent(
    eventType: string = 'start',
    eventDefinition: string = 'none',
    x: number = 400,
    y: number = 200
  ): BpmnElementUnion {
    const newEvent = elementManager.addEvent(eventType, eventDefinition, x, y);
    dispatch('elementCreated', { element: newEvent });
    return newEvent;
  }

  function addGateway(
    gatewayType: string = 'exclusive',
    x: number = 300,
    y: number = 300
  ): BpmnElementUnion {
    const newGateway = elementManager.addGateway(gatewayType, x, y);
    dispatch('elementCreated', { element: newGateway });
    return newGateway;
  }

  function addSubProcess(
    subProcessType: string = 'embedded',
    x: number = 200,
    y: number = 300
  ): BpmnElementUnion {
    const newSubProcess = elementManager.addSubProcess(subProcessType, x, y);
    dispatch('elementCreated', { element: newSubProcess });
    return newSubProcess;
  }

  function addDataObject(
    isInput: boolean = false,
    isOutput: boolean = false,
    x: number = 500,
    y: number = 200
  ): BpmnElementUnion {
    const newDataObject = elementManager.addDataObject(isInput, isOutput, x, y);
    dispatch('elementCreated', { element: newDataObject });
    return newDataObject;
  }

  function addDataStore(
    x: number = 500,
    y: number = 300
  ): BpmnElementUnion {
    const newDataStore = elementManager.addDataStore(x, y);
    dispatch('elementCreated', { element: newDataStore });
    return newDataStore;
  }

  function addTextAnnotation(
    x: number = 600,
    y: number = 200
  ): BpmnElementUnion {
    const newTextAnnotation = elementManager.addTextAnnotation(x, y);
    dispatch('elementCreated', { element: newTextAnnotation });
    return newTextAnnotation;
  }

  function addPool(
    x: number = 100,
    y: number = 100,
    isHorizontal: boolean = true
  ): BpmnElementUnion {
    const newPool = elementManager.addPool(x, y, isHorizontal);
    dispatch('elementCreated', { element: newPool });
    return newPool;
  }

  function addLane(
    poolId: string,
    label: string = 'New Lane'
  ): BpmnElementUnion | null {
    const newLane = elementManager.addLane(poolId, label);
    if (newLane) {
      dispatch('elementCreated', { element: newLane });
    }
    return newLane;
  }

  // Element manipulation methods
  function handleElementDrag(
    elementId: string,
    dx: number,
    dy: number
  ): void {
    elementManager.handleElementDrag(elementId, dx, dy, originalPositions);
    dispatch('elementDragged', { elementId, dx, dy });
  }

  function handleElementDragEnd(elementId: string): void {
    elementManager.handleElementDragEnd(elementId);
    dispatch('elementDragEnd', { elementId });
  }

  function handleElementResize(
    elementId: string,
    dx: number,
    dy: number,
    position: string
  ): void {
    const originalSize = originalSizes[elementId];
    const originalPos = originalPositions[elementId];

    if (originalSize && originalPos) {
      elementManager.handleElementResize(
        elementId,
        dx,
        dy,
        position,
        originalSize,
        originalPos
      );
      dispatch('elementResized', { elementId, dx, dy, position });
    }
  }

  function handleElementResizeEnd(
    elementId: string,
    dx: number,
    dy: number,
    position: string
  ): void {
    const originalSize = originalSizes[elementId];
    const originalPos = originalPositions[elementId];

    if (originalSize && originalPos) {
      elementManager.handleElementResizeEnd(
        elementId,
        dx,
        dy,
        position,
        originalSize,
        originalPos
      );
      dispatch('elementResizeEnd', { elementId, dx, dy, position });
    }
  }

  // Expose methods to parent component
  export {
    addTask,
    addEvent,
    addGateway,
    addSubProcess,
    addDataObject,
    addDataStore,
    addTextAnnotation,
    addPool,
    addLane,
    handleElementDrag,
    handleElementDragEnd,
    handleElementResize,
    handleElementResizeEnd
  };
</script>

<!-- This is a logic-only component with no UI -->
