<script>
  import { bpmnStore } from '$lib/stores/bpmnStore';
  import { calculateConnectionPath, calculateLabelPosition } from '$lib/utils/connectionUtils';

  // Props
  export let connection;
  export let sourcePosition;
  export let targetPosition;
  export let onSelect;

  // Computed
  $: pathData = calculateConnectionPath(
    sourcePosition,
    targetPosition,
    connection.waypoints,
    'orthogonal'
  );

  $: labelPosition = calculateLabelPosition(
    sourcePosition,
    targetPosition,
    connection.waypoints
  );

  // Connection styling based on type
  $: {
    switch (connection.connectionType) {
      case 'sequence':
        strokeColor = '#333';
        strokeWidth = 2;
        strokeDasharray = '';
        markerEnd = 'url(#sequenceFlowMarker)';
        break;
      case 'message':
        strokeColor = '#3498db';
        strokeWidth = 2;
        strokeDasharray = '5,5';
        markerEnd = 'url(#messageFlowMarker)';
        break;
      case 'association':
        strokeColor = '#999';
        strokeWidth = 1.5;
        strokeDasharray = '3,3';
        markerEnd = '';
        break;
      default:
        strokeColor = '#333';
        strokeWidth = 2;
        strokeDasharray = '';
        markerEnd = 'url(#sequenceFlowMarker)';
    }
  }

  let strokeColor;
  let strokeWidth;
  let strokeDasharray;
  let markerEnd;

  // Event handlers
  function handleClick(event) {
    event.stopPropagation();
    onSelect(connection.id);
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(connection.id);
    }
  }
</script>

<g
  class="connection"
  class:selected={connection.isSelected}
  on:click={handleClick}
  on:keydown={handleKeyDown}
  role="button"
  tabindex="0"
  aria-label="Connection"
>
  <path
    d={pathData}
    fill="none"
    stroke={strokeColor}
    stroke-width={strokeWidth}
    stroke-dasharray={strokeDasharray}
    marker-end={markerEnd}
  />

  {#if connection.label}
    <text
      x={labelPosition.x}
      y={labelPosition.y}
      text-anchor="middle"
      dominant-baseline="middle"
      class="connection-label"
    >
      {connection.label}
    </text>
  {/if}

  {#if connection.isSelected}
    <!-- Show control points when selected -->
    {#if connection.waypoints}
      {#each connection.waypoints as waypoint, i}
        <circle
          cx={waypoint.x}
          cy={waypoint.y}
          r="5"
          class="waypoint"
          data-index={i}
        />
      {/each}
    {/if}
  {/if}
</g>

<style>
  .connection path {
    cursor: pointer;
    pointer-events: stroke;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .connection.selected path {
    stroke-width: 3;
    filter: drop-shadow(0 0 2px rgba(52, 152, 219, 0.5));
  }

  .connection-label {
    font-size: 12px;
    fill: #333;
    pointer-events: none;
    user-select: none;
  }

  .waypoint {
    fill: white;
    stroke: #3498db;
    stroke-width: 2;
    cursor: move;
  }
</style>
