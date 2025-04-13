<script>
  import ConnectionPoint from './ConnectionPoint.svelte';
  
  export let point;
  export let isVisible;
  export let isHighlighted;
  export let onMouseDown;
</script>

<ConnectionPoint
  point={point}
  isVisible={isVisible}
  isHighlighted={isHighlighted}
  onMouseDown={onMouseDown}
/>
