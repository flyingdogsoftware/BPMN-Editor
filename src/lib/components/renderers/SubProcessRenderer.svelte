<script>
  // Props
  export let element;
  export let isDragging = false;
  export let isSelected = false;

  // Helper function to get the appropriate styling for different subprocess types
  function getSubProcessStyling(subProcessType) {
    switch(subProcessType) {
      case 'event':
        return {
          strokeDasharray: '3,3',
          rx: 10,
          ry: 10
        };
      case 'transaction':
        return {
          strokeWidth: 2,
          secondBorder: true,
          rx: 5,
          ry: 5
        };
      case 'adhoc':
        return {
          rx: 5,
          ry: 5,
          showAdhocMarker: true
        };
      default: // embedded
        return {
          rx: 5,
          ry: 5
        };
    }
  }

  // Get styling based on subprocess type
  $: styling = getSubProcessStyling(element.subProcessType);
</script>

<!-- Base subprocess rectangle -->
<rect
  x={element.x}
  y={element.y}
  width={element.width}
  height={element.height}
  rx={styling.rx}
  ry={styling.ry}
  fill="white"
  stroke={isSelected ? "#007bff" : "black"}
  stroke-width={isDragging || isSelected ? "2" : styling.strokeWidth || "1.5"}
  stroke-dasharray={styling.strokeDasharray || "none"}
  class="subprocess-element {isSelected ? 'selected' : ''}"
/>

<!-- Second border for transaction subprocess -->
{#if styling.secondBorder}
  <rect
    x={element.x + 3}
    y={element.y + 3}
    width={element.width - 6}
    height={element.height - 6}
    rx={styling.rx - 1}
    ry={styling.ry - 1}
    fill="none"
    stroke={isSelected ? "#007bff" : "black"}
    stroke-width="1"
    class="subprocess-inner-border"
  />
{/if}

<!-- Ad-hoc marker (wavy line) -->
{#if styling.showAdhocMarker}
  <path
    d={`M${element.x + element.width/4},${element.y + element.height - 15} 
        c5,-7 10,0 15,-7 s10,0 15,-7`}
    fill="none"
    stroke={isSelected ? "#007bff" : "black"}
    stroke-width="1.5"
    class="adhoc-marker"
  />
{/if}

<!-- Subprocess label -->
<text
  x={element.x + element.width / 2}
  y={element.y + element.height / 2}
  text-anchor="middle"
  dominant-baseline="middle"
  class="subprocess-label"
>
  {#each element.label.split('\n') as line, i}
    <tspan
      x={element.x + element.width / 2}
      dy={i === 0 ? 0 : 16}
      font-size="12px"
    >
      {line}
    </tspan>
  {/each}
</text>

<!-- Collapsed/Expanded indicator (plus/minus sign) - for future implementation -->
<!-- This would be added if you implement collapsible subprocesses -->
