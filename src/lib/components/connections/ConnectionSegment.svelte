<script>
  import { onMount } from 'svelte';
  import ConnectionHandle from './ConnectionHandle.svelte';
  import { calculateSegmentMidpoints } from '../../utils/connectionRouting';

  // Props
  export let path;
  export let style = {
    stroke: '#333',
    strokeWidth: 2,
    strokeDasharray: '',
    markerEnd: ''
  };
  export let isSelected = false;
  export let start = { x: 0, y: 0 };
  export let end = { x: 0, y: 0 };
  export let waypoints = [];
  export let onHandleDragStart = (index, event) => {};
  export let onDoubleClick = (event) => {};

  // State
  let isHovering = false;
  let segmentMidpoints = [];

  // Force recalculation when waypoints change
  $: waypointsKey = JSON.stringify({ start, end, waypoints });

  // Computed
  $: strokeWidth = isSelected ? parseInt(style.strokeWidth) + 1 : style.strokeWidth;
  $: segmentMidpoints = waypointsKey && calculateCustomMidpoints(start, end, waypoints);

  // Use the standard function for midpoints
  function calculateCustomMidpoints(start, end, waypoints) {
    const result = calculateSegmentMidpoints(start, end, waypoints);
    return result;
  }

  // Function to log midpoints (for debugging)
  function logMidpoints() {
    // Log for debugging
    console.log('Connection segment midpoints:', segmentMidpoints);
    console.log('Start:', start, 'End:', end, 'Waypoints:', waypoints);
  }

  // Handle mouse enter/leave for hover state
  function handleMouseEnter() {
    isHovering = true;
    // Log midpoints for debugging
    logMidpoints();
  }

  function handleMouseLeave() {
    // Only set isHovering to false if we're not dragging
    // This prevents the handle from disappearing during drag
    if (!document.querySelector('.connection-handle:active')) {
      isHovering = false;
    }
  }

  // Handle drag start for a segment handle
  function handleSegmentHandleDragStart(index, event) {
    console.log('ConnectionSegment: Handle drag start', { index });
    onHandleDragStart(index, event);
  }
</script>

<g
  class="connection-segment"
  on:mouseenter={handleMouseEnter}
  on:mouseleave={handleMouseLeave}
  on:dblclick={(e) => onDoubleClick(e)}
  role="group"
  aria-label="Connection segment"
>
  <path
    d={path}
    fill="none"
    stroke={style.stroke}
    stroke-width={strokeWidth}
    stroke-dasharray={style.strokeDasharray}
    marker-end={style.markerEnd}
    class:selected={isSelected}
  />

  <!-- Show handles when hovering or selected -->
  {#if (isHovering || isSelected) && segmentMidpoints && segmentMidpoints.length > 0}
    {#each segmentMidpoints as midpoint, i}
      <ConnectionHandle
        x={midpoint.position.x}
        y={midpoint.position.y}
        orientation={midpoint.orientation}
        onDragStart={(event) => handleSegmentHandleDragStart(i, event)}
        isVisible={true}
      />
    {/each}

    <!-- Debug points are removed to avoid visual clutter -->
  {/if}
</g>

<style>
  .connection-segment {
    pointer-events: all;
  }

  path {
    pointer-events: stroke;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: stroke-width 0.2s;
  }

  path.selected {
    filter: drop-shadow(0 0 4px rgba(0, 123, 255, 0.7));
    stroke: #007bff;
    stroke-width: 3px;
  }
</style>
