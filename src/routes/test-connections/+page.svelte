<script>
  import { onMount } from 'svelte';
  import { bpmnStore } from '$lib/stores/bpmnStore';
  import BpmnEditor from '$lib/components/BpmnEditor.svelte';
  
  // Create some test elements
  function createTestElements() {
    // Clear existing elements
    bpmnStore.reset();
    
    // Add a start event
    bpmnStore.addElement({
      id: 'StartEvent_1',
      type: 'event',
      eventType: 'start',
      x: 150,
      y: 150,
      width: 36,
      height: 36,
      label: 'Start'
    });
    
    // Add a task
    bpmnStore.addElement({
      id: 'Task_1',
      type: 'task',
      taskType: 'default',
      x: 250,
      y: 140,
      width: 100,
      height: 80,
      label: 'Task 1'
    });
    
    // Add another task
    bpmnStore.addElement({
      id: 'Task_2',
      type: 'task',
      taskType: 'default',
      x: 400,
      y: 140,
      width: 100,
      height: 80,
      label: 'Task 2'
    });
    
    // Add an end event
    bpmnStore.addElement({
      id: 'EndEvent_1',
      type: 'event',
      eventType: 'end',
      x: 550,
      y: 150,
      width: 36,
      height: 36,
      label: 'End'
    });
    
    // Add a gateway
    bpmnStore.addElement({
      id: 'Gateway_1',
      type: 'gateway',
      gatewayType: 'exclusive',
      x: 250,
      y: 300,
      width: 50,
      height: 50,
      label: 'Gateway'
    });
    
    // Add connections
    bpmnStore.addConnection({
      id: 'Connection_1',
      type: 'connection',
      connectionType: 'sequence',
      sourceId: 'StartEvent_1',
      targetId: 'Task_1',
      waypoints: []
    });
    
    bpmnStore.addConnection({
      id: 'Connection_2',
      type: 'connection',
      connectionType: 'sequence',
      sourceId: 'Task_1',
      targetId: 'Task_2',
      waypoints: []
    });
    
    bpmnStore.addConnection({
      id: 'Connection_3',
      type: 'connection',
      connectionType: 'sequence',
      sourceId: 'Task_2',
      targetId: 'EndEvent_1',
      waypoints: []
    });
  }
  
  onMount(() => {
    createTestElements();
  });
</script>

<div class="test-page">
  <h1>Connection Endpoint Drag Test</h1>
  <p>
    Click on a connection to select it, then drag the source (green) or target (red) endpoint 
    to reconnect it to a different element.
  </p>
  
  <div class="editor-container">
    <BpmnEditor />
  </div>
</div>

<style>
  .test-page {
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
  }
  
  h1 {
    margin: 0;
    padding: 10px;
    font-size: 24px;
  }
  
  p {
    margin: 0;
    padding: 0 10px 10px;
  }
  
  .editor-container {
    flex: 1;
    border: 1px solid #ccc;
    overflow: hidden;
  }
</style>
