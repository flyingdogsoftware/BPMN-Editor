<script>
  import { bpmnStore } from '../../stores/bpmnStore';
  
  // Props
  export let connectionId = null;
  export let selectedConnectionId = null;
  
  // Function to fix connection segments without changing the routing
  function handleFixSegments() {
    if (!connectionId) {
      console.error('No connection selected for optimization');
      return;
    }
    
    // Get the connection from the store
    let connection;
    bpmnStore.subscribe(store => {
      connection = store.find(el => el.id === connectionId);
    })();
    
    if (!connection) {
      console.error('Connection not found');
      return;
    }
    
    // Get source and target elements
    let source, target;
    bpmnStore.subscribe(store => {
      source = store.find(el => el.id === connection.sourceId);
      target = store.find(el => el.id === connection.targetId);
    })();
    
    if (!source || !target) {
      console.error('Source or target element not found');
      return;
    }
    
    // Calculate source and target centers
    const sourceCenter = {
      x: source.x + source.width / 2,
      y: source.y + source.height / 2
    };
    
    const targetCenter = {
      x: target.x + target.width / 2,
      y: target.y + target.height / 2
    };
    
    console.log('DEBUG: Fixing segments for connection', connectionId);
    console.log('DEBUG: Source center:', sourceCenter);
    console.log('DEBUG: Target center:', targetCenter);
    
    // Create a new L-shaped connection with a single waypoint
    const dx = targetCenter.x - sourceCenter.x;
    const dy = targetCenter.y - sourceCenter.y;
    const goHorizontalFirst = Math.abs(dx) > Math.abs(dy);
    
    let waypoint;
    if (goHorizontalFirst) {
      // Horizontal first, then vertical
      waypoint = {
        x: targetCenter.x,
        y: sourceCenter.y
      };
    } else {
      // Vertical first, then horizontal
      waypoint = {
        x: sourceCenter.x,
        y: targetCenter.y
      };
    }
    
    // Update the connection with the new waypoint
    bpmnStore.updateConnectionWaypoints(connectionId, [waypoint]);
    
    console.log('DEBUG: Fixed L-shape waypoint:', JSON.stringify([waypoint]));
    
    // Force a refresh of the connection to ensure proper rendering
    setTimeout(() => {
      // This is a no-op update that forces a refresh
      bpmnStore.updateElement(connectionId, { isSelected: true });
      bpmnStore.updateElement(connectionId, { isSelected: selectedConnectionId === connectionId });
    }, 10);
  }
</script>

<button
  class="fix-segments-button"
  on:click={handleFixSegments}
  title="Fix connection to L-shape"
>
  Fix to L-Shape
</button>

<style>
  .fix-segments-button {
    position: fixed;
    top: 190px;
    left: 20px;
    background-color: #9b59b6;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 8px 12px;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    z-index: 9999;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  }

  .fix-segments-button:hover {
    background-color: #8e44ad;
  }
</style>
