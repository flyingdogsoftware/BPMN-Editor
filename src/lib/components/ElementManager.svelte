<script>
  import { elementManager } from '../services/ElementManager';
  import { createEventDispatcher } from 'svelte';

  // Create event dispatcher
  const dispatch = createEventDispatcher();

  // Props
  export let originalPositions = {};
  let originalSizes = {};

  // Element creation methods
  function addTask(
    taskType = 'user',
    x = 200,
    y = 200
  ) {
    const newTask = elementManager.addTask(taskType, x, y);
    dispatch('elementCreated', { element: newTask });
    return newTask;
  }

  function addEvent(
    eventType = 'start',
    eventDefinition = 'none',
    x = 400,
    y = 200
  ) {
    const newEvent = elementManager.addEvent(eventType, eventDefinition, x, y);
    dispatch('elementCreated', { element: newEvent });
    return newEvent;
  }

  function addGateway(
    gatewayType = 'exclusive',
    x = 300,
    y = 300
  ) {
    const newGateway = elementManager.addGateway(gatewayType, x, y);
    dispatch('elementCreated', { element: newGateway });
    return newGateway;
  }

  function addSubProcess(
    subProcessType = 'embedded',
    x = 200,
    y = 300
  ) {
    const newSubProcess = elementManager.addSubProcess(subProcessType, x, y);
    dispatch('elementCreated', { element: newSubProcess });
    return newSubProcess;
  }

  function addDataObject(
    isInput = false,
    isOutput = false,
    x = 500,
    y = 200
  ) {
    const newDataObject = elementManager.addDataObject(isInput, isOutput, x, y);
    dispatch('elementCreated', { element: newDataObject });
    return newDataObject;
  }

  function addDataStore(
    x = 500,
    y = 300
  ) {
    const newDataStore = elementManager.addDataStore(x, y);
    dispatch('elementCreated', { element: newDataStore });
    return newDataStore;
  }

  function addTextAnnotation(
    x = 600,
    y = 200
  ) {
    const newTextAnnotation = elementManager.addTextAnnotation(x, y);
    dispatch('elementCreated', { element: newTextAnnotation });
    return newTextAnnotation;
  }

  function addPool(
    x = 100,
    y = 100,
    isHorizontal = true
  ) {
    const newPool = elementManager.addPool(x, y, isHorizontal);
    dispatch('elementCreated', { element: newPool });
    return newPool;
  }

  function addLane(
    poolId,
    label = 'New Lane'
  ) {
    const newLane = elementManager.addLane(poolId, label);
    if (newLane) {
      dispatch('elementCreated', { element: newLane });
    }
    return newLane;
  }

  // Element manipulation methods
  function handleElementDrag(
    elementId,
    dx,
    dy
  ) {
    elementManager.handleElementDrag(elementId, dx, dy, originalPositions);
    dispatch('elementDragged', { elementId, dx, dy });
  }

  function handleElementDragEnd(elementId) {
    elementManager.handleElementDragEnd(elementId);
    dispatch('elementDragEnd', { elementId });
  }

  function handleElementResize(
    elementId,
    dx,
    dy,
    position
  ) {
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
    elementId,
    dx,
    dy,
    position
  ) {
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
