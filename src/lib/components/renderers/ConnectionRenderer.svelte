<script>
  import { bpmnStore } from '$lib/stores/bpmnStore';
  import { calculateConnectionPoints } from '$lib/utils/connectionUtils';
  import Connection from '../Connection.svelte';
  import ConnectionPreview from '../ConnectionPreview.svelte';

  // Props
  export let onConnectionSelect;
  export let onConnectionEndpointAdjustment;
  export let onEditLabel;
  export let isCreatingConnection = false;
  export let connectionStartPoint = null;
  export let connectionEndPosition = null;
  export let connectionPreviewValid = true;

  // Filter connections
  $: connections = $bpmnStore.filter(el => el.type === 'connection');

  // Get source and target positions for connections
  $: connectionPositions = connections.map(connection => {
    // Find the source and target elements
    const sourceElement = $bpmnStore.find(el => el.id === connection.sourceId);
    const targetElement = $bpmnStore.find(el => el.id === connection.targetId);

    // Calculate current connection points for these elements
    let sourcePoints = [];
    let targetPoints = [];

    if (sourceElement && sourceElement.type !== 'connection') {
      sourcePoints = calculateConnectionPoints(sourceElement);
    }

    if (targetElement && targetElement.type !== 'connection') {
      targetPoints = calculateConnectionPoints(targetElement);
    }

    // Find the specific connection points by ID
    const sourcePoint = sourcePoints.find(p => p.id === connection.sourcePointId);
    const targetPoint = targetPoints.find(p => p.id === connection.targetPointId);

    return {
      id: connection.id,
      source: sourcePoint ? { x: sourcePoint.x, y: sourcePoint.y } : { x: 0, y: 0 },
      target: targetPoint ? { x: targetPoint.x, y: targetPoint.y } : { x: 0, y: 0 }
    };
  });

  // Handle connection selection
  function handleConnectionSelect(connectionId) {
    if (onConnectionSelect) {
      onConnectionSelect(connectionId);
    }
  }
</script>

<!-- Define markers for connections -->
<defs>
  <marker
    id="sequenceFlowMarker"
    viewBox="0 0 10 10"
    refX="10"
    refY="5"
    markerWidth="6"
    markerHeight="6"
    orient="auto"
  >
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#333" />
  </marker>

  <marker
    id="messageFlowMarker"
    viewBox="0 0 10 10"
    refX="10"
    refY="5"
    markerWidth="6"
    markerHeight="6"
    orient="auto"
  >
    <circle cx="5" cy="5" r="4" fill="white" stroke="#3498db" stroke-width="1" />
  </marker>
</defs>

<!-- Draw connections -->
{#each connections as connection (connection.id)}
  {#if connection.type === 'connection'}
    {@const posInfo = connectionPositions.find(p => p.id === connection.id)}
    {#if posInfo}
      <Connection
        connection={connection}
        sourcePosition={posInfo.source}
        targetPosition={posInfo.target}
        onSelect={handleConnectionSelect}
        onEndpointAdjustment={onConnectionEndpointAdjustment}
        onEditLabel={onEditLabel}
      />
    {/if}
  {/if}
{/each}

<!-- Connection preview when creating a new connection -->
{#if isCreatingConnection && connectionStartPoint && connectionEndPosition}
  <ConnectionPreview
    startPosition={connectionStartPoint}
    endPosition={connectionEndPosition}
    isValid={connectionPreviewValid}
  />
{/if}
