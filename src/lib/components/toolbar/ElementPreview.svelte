<script>
  import { createEventDispatcher } from 'svelte';
  
  export let element;
  
  const dispatch = createEventDispatcher();
  
  function handleClick() {
    dispatch('add', element);
  }
  
  function handleDragStart(event) {
    event.dataTransfer.setData('application/bpmn-element', JSON.stringify(element));
    event.dataTransfer.effectAllowed = 'copy';
  }

  // Helper function to determine the SVG content based on element type
  function getElementSvg(element) {
    switch(element.type) {
      case 'task':
        return getTaskSvg(element.subtype);
      case 'event':
        return getEventSvg(element.subtype, element.eventDefinition);
      case 'gateway':
        return getGatewaySvg(element.subtype);
      case 'dataobject':
        return getDataObjectSvg(element.subtype);
      case 'datastore':
        return getDataStoreSvg();
      case 'textannotation':
        return getTextAnnotationSvg();
      case 'group':
        return getGroupSvg();
      case 'pool':
      case 'lane':
        return getSwimlanesSvg(element.type, element.subtype);
      case 'subprocess':
        return getSubprocessSvg(element.subtype);
      default:
        return '';
    }
  }

  function getTaskSvg(subtype) {
    let taskIcon = '';
    
    switch(subtype) {
      case 'user':
        taskIcon = '<path d="M12,7 a3,3 0 1,0 0,6 a3,3 0 1,0 0,-6 M8,17 h8 a4,4 0 0,0 -8,0" stroke="black" fill="none" />';
        break;
      case 'service':
        taskIcon = '<path d="M7,10 h10 M7,14 h10" stroke="black" /><circle cx="12" cy="12" r="5" stroke="black" fill="none" />';
        break;
      case 'send':
        taskIcon = '<path d="M7,9 h10 l-5,5 z" stroke="black" fill="none" />';
        break;
      case 'receive':
        taskIcon = '<path d="M7,9 h10 l-5,5 z" stroke="black" fill="none" stroke-dasharray="2,1" />';
        break;
      case 'manual':
        taskIcon = '<path d="M8,10 c0,-1 1,-2 2,-2 h1 c1,0 1,0.5 1,1 v1 c0,0.5 0.5,1 1,1 h1 c0.5,0 1,0.5 1,1 v1 c0,0.5 -0.5,1 -1,1 h-5 c-1,0 -2,-1 -2,-2 z" stroke="black" fill="none" />';
        break;
      case 'business-rule':
        taskIcon = '<path d="M7,9 h10 M7,12 h10 M7,15 h10" stroke="black" />';
        break;
      case 'script':
        taskIcon = '<path d="M7,8 l2,0 l1,1 l-1,1 l-2,0 z M10,8 l4,0 M10,10 l4,0 M7,12 l7,0 M7,14 l7,0" stroke="black" fill="none" />';
        break;
    }
    
    return `
      <rect x="2" y="4" width="20" height="16" rx="2" ry="2" fill="white" stroke="black" stroke-width="1.5" />
      ${taskIcon}
    `;
  }

  function getEventSvg(subtype, eventDefinition) {
    let eventBorder = '';
    let eventIcon = '';
    
    // Determine border style based on event type
    switch(subtype) {
      case 'start':
        eventBorder = '<circle cx="12" cy="12" r="10" fill="white" stroke="black" stroke-width="1.5" />';
        break;
      case 'end':
        eventBorder = '<circle cx="12" cy="12" r="10" fill="white" stroke="black" stroke-width="3" />';
        break;
      case 'intermediate-catch':
      case 'intermediate-throw':
        eventBorder = `
          <circle cx="12" cy="12" r="10" fill="white" stroke="black" stroke-width="1.5" />
          <circle cx="12" cy="12" r="7" fill="white" stroke="black" stroke-width="1.5" />
        `;
        break;
      default:
        eventBorder = '<circle cx="12" cy="12" r="10" fill="white" stroke="black" stroke-width="1.5" />';
    }
    
    // Add event definition icon
    switch(eventDefinition) {
      case 'message':
        eventIcon = '<path d="M7,9 h10 v6 h-10 z M7,9 l5,3 l5,-3" fill="none" stroke="black" />';
        break;
      case 'timer':
        eventIcon = `
          <circle cx="12" cy="12" r="6" fill="none" stroke="black" />
          <path d="M12,8 v4 h3" fill="none" stroke="black" />
        `;
        break;
      case 'error':
        eventIcon = '<path d="M9,8 l6,8 M15,8 l-6,8" stroke="black" fill="none" />';
        break;
      case 'signal':
        eventIcon = '<polygon points="12,7 16,14 8,14" fill="none" stroke="black" />';
        break;
      case 'terminate':
        eventIcon = '<circle cx="12" cy="12" r="6" fill="black" />';
        break;
      case 'conditional':
        eventIcon = `
          <rect x="8" y="8" width="8" height="8" fill="none" stroke="black" />
          <path d="M9,10 h6 M9,12 h6 M9,14 h6" stroke="black" />
        `;
        break;
    }
    
    return `${eventBorder}${eventIcon}`;
  }

  function getGatewaySvg(subtype) {
    let gatewayIcon = '';
    
    switch(subtype) {
      case 'exclusive':
        gatewayIcon = '<path d="M8,8 L16,16 M16,8 L8,16" stroke="black" stroke-width="1.5" />';
        break;
      case 'parallel':
        gatewayIcon = '<path d="M12,6 L12,18 M6,12 L18,12" stroke="black" stroke-width="1.5" />';
        break;
      case 'inclusive':
        gatewayIcon = '<circle cx="12" cy="12" r="5" fill="none" stroke="black" stroke-width="1.5" />';
        break;
      case 'complex':
        gatewayIcon = `
          <path d="M12,6 L12,18 M6,12 L18,12 M8,8 L16,16 M16,8 L8,16" 
                stroke="black" stroke-width="1" />
        `;
        break;
      case 'event-based':
        gatewayIcon = `
          <circle cx="12" cy="12" r="5" fill="none" stroke="black" />
          <circle cx="12" cy="12" r="3" fill="none" stroke="black" />
          <path d="M12,7 l4,3 l-1.5,4.5 h-5 l-1.5,-4.5 z" fill="none" stroke="black" />
        `;
        break;
    }
    
    return `
      <polygon points="12,2 22,12 12,22 2,12" fill="white" stroke="black" stroke-width="1.5" />
      ${gatewayIcon}
    `;
  }

  function getDataObjectSvg(subtype) {
    let marker = '';
    
    if (subtype === 'input') {
      marker = '<path d="M12,3 v-3 h-3 l3,3 l3,-3 h-3" fill="black" />';
    } else if (subtype === 'output') {
      marker = '<path d="M12,3 v-3 h3 l-3,3 l-3,-3 h3" fill="black" />';
    }
    
    return `
      <path d="M6,5 h8 l4,4 v10 h-12 z M14,5 v4 h4" fill="white" stroke="black" stroke-width="1.5" />
      ${marker}
    `;
  }

  function getDataStoreSvg() {
    return `
      <path d="M6,8 a6,3 0 0,1 12,0 v8 a6,3 0 0,1 -12,0 z" fill="white" stroke="black" stroke-width="1.5" />
      <path d="M6,8 a6,3 0 0,0 12,0" fill="none" stroke="black" stroke-width="1.5" />
    `;
  }

  function getTextAnnotationSvg() {
    return `
      <path d="M6,4 l-4,4 v12 l4,4" fill="none" stroke="black" stroke-width="1.5" stroke-dasharray="3,2" />
      <rect x="6" y="4" width="14" height="16" fill="white" stroke="black" stroke-width="1.5" stroke-dasharray="3,2" />
      <path d="M9,8 h8 M9,12 h8 M9,16 h5" stroke="black" stroke-width="1.5" />
    `;
  }

  function getGroupSvg() {
    return `
      <rect x="4" y="4" width="16" height="16" fill="none" stroke="black" stroke-width="1.5" stroke-dasharray="3,2" />
    `;
  }

  function getSwimlanesSvg(type, subtype) {
    if (type === 'pool') {
      return `
        <rect x="2" y="4" width="20" height="16" fill="white" stroke="black" stroke-width="1.5" />
        <rect x="2" y="4" width="4" height="16" fill="white" stroke="black" stroke-width="1.5" />
        <text x="4" y="12" font-size="8" transform="rotate(270, 4, 12)" text-anchor="middle">Pool</text>
      `;
    } else { // lane
      return `
        <rect x="2" y="4" width="20" height="16" fill="white" stroke="black" stroke-width="1.5" />
        <rect x="2" y="4" width="4" height="16" fill="white" stroke="black" stroke-width="1.5" />
        <text x="4" y="12" font-size="8" transform="rotate(270, 4, 12)" text-anchor="middle">Lane</text>
      `;
    }
  }

  function getSubprocessSvg(subtype) {
    let icon = '';
    
    switch(subtype) {
      case 'event':
        icon = '<rect x="6" y="8" width="12" height="8" fill="none" stroke="black" stroke-width="1" stroke-dasharray="3,1" />';
        break;
      case 'transaction':
        icon = '<rect x="4" y="6" width="16" height="12" fill="none" stroke="black" stroke-width="1" rx="1" ry="1" />';
        break;
      case 'adhoc':
        icon = '<path d="M8,14 c2,-4 4,0 6,-2 s2,2 4,-1" fill="none" stroke="black" stroke-width="1" />';
        break;
      default: // embedded
        icon = '<rect x="6" y="8" width="12" height="8" fill="none" stroke="black" stroke-width="1" />';
    }
    
    return `
      <rect x="2" y="4" width="20" height="16" rx="2" ry="2" fill="white" stroke="black" stroke-width="1.5" />
      <path d="M12,20 v-4 M10,18 h4" stroke="black" stroke-width="1.5" />
      ${icon}
    `;
  }
</script>

<div 
  class="element-preview"
  draggable="true"
  on:click={handleClick}
  on:dragstart={handleDragStart}
  title="Click to add or drag to position"
>
  <div class="element-icon">
    <svg width="24" height="24" viewBox="0 0 24 24">
      {@html getElementSvg(element)}
    </svg>
  </div>
  <div class="element-name">{element.name}</div>
</div>

<style>
  .element-preview {
    display: flex;
    align-items: center;
    padding: 8px;
    border-radius: 4px;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 0.2s;
  }
  
  .element-preview:hover {
    background-color: #f0f0f0;
    border-color: #d9d9d9;
  }
  
  .element-icon {
    margin-right: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .element-name {
    font-size: 14px;
    color: #333;
  }
</style>
