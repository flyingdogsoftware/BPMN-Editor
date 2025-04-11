<script>
  // Props
  export let startPosition;
  export let endPosition;
  export let isValid = true;

  // Computed
  $: pathData = `M ${startPosition.x} ${startPosition.y} L ${endPosition.x} ${endPosition.y}`;
  $: strokeColor = isValid ? '#3498db' : '#e74c3c';
</script>

<path
  d={pathData}
  class="connection-preview"
  stroke={strokeColor}
  stroke-width="2"
  stroke-dasharray="5,5"
  fill="none"
/>

<style>
  .connection-preview {
    pointer-events: none;
  }
</style>
