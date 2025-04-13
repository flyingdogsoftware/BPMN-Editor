<script lang="ts">
  import { bpmnStore } from '$lib/stores/bpmnStore';
  import ResizeHandle from '../ResizeHandle.svelte';
  
  // Props
  export let element;
  export let isDragging = false;
  export let onStartResize;
  export let onResizeDrag;
  export let onResizeEnd;
  export let onNodeDoubleClick;
  export let onLaneDoubleClick;
  export let onAddLane;
</script>

<!-- Group for the pool/lane element -->
<g
  class="bpmn-element {isDragging ? 'dragging' : ''}"
  data-element-type={element.type}
>
  {#if element.type === 'pool'}
    <!-- Pool -->
    <rect
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      fill="white"
      stroke="black"
      stroke-width="2"
      class="element-shape"
    />

    <!-- Resize handles for pool -->
    <ResizeHandle
      x={element.x + element.width}
      y={element.y + element.height/2}
      position="right"
      onDragStart={() => onStartResize(element, 'right')}
      onDrag={(dx, dy) => onResizeDrag(dx, dy, 'right', element)}
      onDragEnd={(dx, dy) => onResizeEnd(dx, dy, 'right', element)}
    />

    <ResizeHandle
      x={element.x + element.width/2}
      y={element.y + element.height}
      position="bottom"
      onDragStart={() => onStartResize(element, 'bottom')}
      onDrag={(dx, dy) => onResizeDrag(dx, dy, 'bottom', element)}
      onDragEnd={(dx, dy) => onResizeEnd(dx, dy, 'bottom', element)}
    />

    <ResizeHandle
      x={element.x + element.width}
      y={element.y + element.height}
      position="bottom-right"
      onDragStart={() => onStartResize(element, 'bottom-right')}
      onDrag={(dx, dy) => onResizeDrag(dx, dy, 'bottom-right', element)}
      onDragEnd={(dx, dy) => onResizeEnd(dx, dy, 'bottom-right', element)}
    />

    <!-- Add Lane Button (always visible) -->
    {#if element.isHorizontal}
      <!-- Horizontal pool add lane button -->
      <g
        class="add-lane-button"
        role="button"
        tabindex="0"
        aria-label="Add Lane"
        on:click={() => onAddLane(element.id)}
        on:keydown={e => e.key === 'Enter' && onAddLane(element.id)}
        transform={`translate(${element.x + element.width/2}, ${element.y + element.height - 5})`}
      >
        <rect x="-10" y="-10" width="20" height="20" rx="3" fill="#1890ff" stroke="#0050b3" stroke-width="1.5" />
        <text x="0" y="0" text-anchor="middle" dominant-baseline="middle" font-size="16" font-weight="bold" fill="white">+</text>
        <title>Add Lane</title>
      </g>
    {:else}
      <!-- Vertical pool add lane button -->
      <g
        class="add-lane-button"
        role="button"
        tabindex="0"
        aria-label="Add Lane"
        on:click={() => onAddLane(element.id)}
        on:keydown={e => e.key === 'Enter' && onAddLane(element.id)}
        transform={`translate(${element.x + element.width - 5}, ${element.y + element.height/2})`}
      >
        <rect x="-10" y="-10" width="20" height="20" rx="3" fill="#1890ff" stroke="#0050b3" stroke-width="1.5" />
        <text x="0" y="0" text-anchor="middle" dominant-baseline="middle" font-size="16" font-weight="bold" fill="white">+</text>
        <title>Add Lane</title>
      </g>
    {/if}

    <!-- Pool Label Area -->
    {#if element.isHorizontal}
      <!-- Pool Label Area with clickable rect -->
      <g
        class="pool-label-area"
        on:dblclick|stopPropagation={() => onNodeDoubleClick(element)}
        role="button"
        tabindex="0"
        aria-label="Edit pool label"
      >
        <rect
          x={element.x}
          y={element.y}
          width="30"
          height={element.height}
          fill="white"
          stroke="black"
          stroke-width="1"
        />
        <text
          x={element.x + 15}
          y={element.y + element.height/2}
          text-anchor="middle"
          dominant-baseline="middle"
          transform={`rotate(-90, ${element.x + 15}, ${element.y + element.height/2})`}
          pointer-events="none"
        >
          {element.label}
        </text>
      </g>

      <!-- Render lanes within this pool -->
      {#if element.lanes && element.lanes.length > 0}
        {#each element.lanes as laneId, index}
          {@const lane = $bpmnStore.find(el => el.id === laneId && el.type === 'lane')}
          {#if lane}
            <!-- Lane separator line -->
            <line
              x1={element.x + 30}
              y1={lane.y}
              x2={element.x + element.width}
              y2={lane.y}
              stroke="black"
              stroke-width="1"
            />
            <!-- Lane label with clickable area -->
            <g
              class="lane-label-area"
              on:dblclick|stopPropagation={() => onLaneDoubleClick(lane)}
              role="button"
              tabindex="0"
              aria-label="Edit lane label"
            >
              <rect
                x={element.x + 30}
                y={lane.y}
                width="30"
                height={lane.height}
                fill="transparent"
                stroke="none"
              />
              <text
                x={element.x + 45}
                y={lane.y + lane.height/2}
                text-anchor="middle"
                dominant-baseline="middle"
                transform={`rotate(-90, ${element.x + 45}, ${lane.y + lane.height/2})`}
                pointer-events="none"
              >
                {lane.label}
              </text>
            </g>

            <!-- Resize handle for lane (bottom edge) -->
            {#if index < element.lanes.length - 1}
              <ResizeHandle
                x={element.x + element.width/2}
                y={lane.y + lane.height}
                position="bottom"
                onDragStart={() => onStartResize(lane, 'bottom')}
                onDrag={(dx, dy) => onResizeDrag(dx, dy, 'bottom', lane)}
                onDragEnd={(dx, dy) => onResizeEnd(dx, dy, 'bottom', lane)}
              />
            {/if}
          {/if}
        {/each}
      {/if}
    {:else}
      <!-- Vertical pool rendering -->
      <!-- Vertical pool label area with clickable rect -->
      <g
        class="pool-label-area"
        on:dblclick|stopPropagation={() => onNodeDoubleClick(element)}
        role="button"
        tabindex="0"
        aria-label="Edit pool label"
      >
        <rect
          x={element.x}
          y={element.y}
          width={element.width}
          height="30"
          fill="white"
          stroke="black"
          stroke-width="1"
        />
        <text
          x={element.x + element.width/2}
          y={element.y + 15}
          text-anchor="middle"
          dominant-baseline="middle"
          pointer-events="none"
        >
          {element.label}
        </text>
      </g>

      <!-- Render lanes within this pool -->
      {#if element.lanes && element.lanes.length > 0}
        {#each element.lanes as laneId, index}
          {@const lane = $bpmnStore.find(el => el.id === laneId && el.type === 'lane')}
          {#if lane}
            <!-- Lane separator line -->
            <line
              x1={lane.x}
              y1={element.y + 30}
              x2={lane.x}
              y2={element.y + element.height}
              stroke="black"
              stroke-width="1"
            />
            <!-- Lane label with clickable area -->
            <g
              class="lane-label-area"
              on:dblclick|stopPropagation={() => onLaneDoubleClick(lane)}
              role="button"
              tabindex="0"
              aria-label="Edit lane label"
            >
              <rect
                x={lane.x}
                y={element.y}
                width={lane.width}
                height="30"
                fill="transparent"
                stroke="none"
              />
              <text
                x={lane.x + lane.width/2}
                y={element.y + 21}
                text-anchor="middle"
                dominant-baseline="middle"
                pointer-events="none"
              >
                {lane.label}
              </text>
            </g>

            <!-- Resize handle for lane (right edge) -->
            {#if index < element.lanes.length - 1}
              <ResizeHandle
                x={lane.x + lane.width}
                y={element.y + element.height/2}
                position="right"
                onDragStart={() => onStartResize(lane, 'right')}
                onDrag={(dx, dy) => onResizeDrag(dx, dy, 'right', lane)}
                onDragEnd={(dx, dy) => onResizeEnd(dx, dy, 'right', lane)}
              />
            {/if}
          {/if}
        {/each}
      {/if}
    {/if}
  {:else if element.type === 'lane'}
    <!-- Lane is rendered as part of the pool, not separately -->
    <!-- This is just a placeholder for selection and dragging -->
    <rect
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      fill="none"
      stroke="none"
      stroke-width="0"
      fill-opacity="0.1"
      class="element-shape"
    />
  {/if}
</g>

<style>
  /* Add Lane Button styling */
  .add-lane-button {
    cursor: pointer;
    opacity: 0.9;
    transition: opacity 0.3s ease-in-out;
  }

  .add-lane-button:hover {
    opacity: 1;
  }

  .add-lane-button rect {
    transition: fill 0.3s ease-in-out, stroke 0.3s ease-in-out, filter 0.3s ease-in-out;
    filter: drop-shadow(0px 2px 3px rgba(0, 0, 0, 0.2));
    transform-origin: center;
    transform-box: fill-box;
  }

  .add-lane-button:hover rect {
    fill: #bae7ff;
    stroke: #0050b3;
    filter: drop-shadow(0px 4px 6px rgba(0, 0, 0, 0.3));
    transform: scale(1.1);
  }

  .add-lane-button text {
    pointer-events: none;
    transition: fill 0.3s ease-in-out;
    transform-origin: center;
    transform-box: fill-box;
  }

  .add-lane-button:hover text {
    fill: #0050b3;
    transform: scale(1.1);
  }
</style>
