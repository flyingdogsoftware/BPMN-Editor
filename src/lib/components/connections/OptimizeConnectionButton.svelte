<script>
  import { bpmnStore } from '../../stores/bpmnStore';
  import { optimizeWaypoints } from '../../utils/connectionRouting';

  // Props
  export let connectionId = null;
  export let waypoints = [];

  // Function to optimize the connection waypoints
  function handleOptimize() {
    if (!connectionId) {
      console.error('No connection selected for optimization');
      return;
    }

    console.log('DEBUG: Optimizing connection', connectionId);
    console.log('DEBUG: Original waypoints:', JSON.stringify(waypoints));

    // Call the optimize function
    const optimizedWaypoints = optimizeWaypoints(waypoints);

    console.log('DEBUG: Optimized waypoints:', JSON.stringify(optimizedWaypoints));
    console.log('DEBUG: Waypoints reduced from', waypoints.length, 'to', optimizedWaypoints.length);

    // Update the connection with optimized waypoints
    bpmnStore.updateConnectionWaypoints(connectionId, optimizedWaypoints);
  }
</script>

<button
  class="optimize-button"
  on:click={handleOptimize}
  title="Optimize connection waypoints"
>
  Optimize Connection
</button>

<style>
  .optimize-button {
    position: fixed;
    top: 70px;
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
  }

  .optimize-button:hover {
    background-color: #c0392b;
  }
</style>
