<script>
  // Props
  export let path;
  export let style = {
    stroke: '#333',
    strokeWidth: 2,
    strokeDasharray: '',
    markerEnd: ''
  };
  export let isSelected = false;

  // Computed
  $: strokeWidth = isSelected ? parseInt(style.strokeWidth) + 1 : style.strokeWidth;
</script>

<path
  d={path}
  fill="none"
  stroke={style.stroke}
  stroke-width={strokeWidth}
  stroke-dasharray={style.strokeDasharray}
  marker-end={style.markerEnd}
  class:selected={isSelected}
/>

<style>
  path {
    pointer-events: stroke;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: stroke-width 0.2s;
  }

  path.selected {
    filter: drop-shadow(0 0 4px rgba(52, 152, 219, 0.7));
    stroke-width: 3px;
  }
</style>
