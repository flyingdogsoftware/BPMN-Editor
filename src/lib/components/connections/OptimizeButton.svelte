<script>
  import { bpmnStore } from '../../stores/bpmnStore';
  import { removeNonCornerWaypoints } from '../../utils/connectionRouting';

  // Props
  export let connectionId = null;
  export let selectedConnectionId = null;
  export let elements = [];

  // Function to optimize the connection waypoints
  function handleOptimize() {
    if (!connectionId) {
      console.error('No connection selected for optimization');
      return;
    }

    // Get the connection from the store
    let connection;
    bpmnStore.subscribe(store => {
      connection = store.find(el => el.id === connectionId);
    })();

    if (!connection || !connection.waypoints || connection.waypoints.length === 0) {
      console.error('Connection not found or has no waypoints');
      return;
    }

    // Find source and target elements
    const source = elements.find(el => el.id === connection.sourceId);
    const target = elements.find(el => el.id === connection.targetId);

    if (!source || !target) {
      console.error('Source or target element not found');
      return;
    }

    // Calculate source and target positions
    const sourceCenter = {
      x: source.x + source.width / 2,
      y: source.y + source.height / 2
    };

    const targetCenter = {
      x: target.x + target.width / 2,
      y: target.y + target.height / 2
    };

    console.log('DEBUG: Direct optimizing for connection', connectionId);
    console.log('DEBUG: Original waypoints:', JSON.stringify(connection.waypoints));
    console.log('DEBUG: Source center:', JSON.stringify(sourceCenter));
    console.log('DEBUG: Target center:', JSON.stringify(targetCenter));

    // Make a deep copy of the waypoints
    const waypoints = JSON.parse(JSON.stringify(connection.waypoints));

    // Use the simplified optimization function that ONLY removes redundant waypoints
    // without changing the path structure
    const optimizedWaypoints = removeNonCornerWaypoints(sourceCenter, targetCenter, waypoints);

    // Update the connection with optimized waypoints
    bpmnStore.updateConnectionWaypoints(connectionId, optimizedWaypoints);

    // Force a refresh of the connection to ensure proper rendering
    setTimeout(() => {
      // This is a no-op update that forces a refresh
      bpmnStore.updateElement(connectionId, { isSelected: true });
      bpmnStore.updateElement(connectionId, { isSelected: selectedConnectionId === connectionId });
    }, 10);

    // Log completion
    console.log('DEBUG: Connection optimization complete');
  }
</script>

<button
  class="optimize-button"
  on:click={handleOptimize}
  title="Optimize connection waypoints"
>
  Direct Optimize
</button>

<style>
  .optimize-button {
    position: fixed;
    top: 35px;
    left: 20px;
    background-color: #e74c3c;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 8px 12px;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    z-index: 9999;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    pointer-events: auto; /* Ensure the button can be clicked */
  }

  .optimize-button:hover {
    background-color: #c0392b;
  }
</style>
