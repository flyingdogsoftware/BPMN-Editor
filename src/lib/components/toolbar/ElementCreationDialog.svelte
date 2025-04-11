<script>
  import { createEventDispatcher } from 'svelte';
  import ElementCategory from './ElementCategory.svelte';
  
  const dispatch = createEventDispatcher();
  let searchQuery = '';
  
  // Element definitions with categories, names, and rendering info
  const elementCategories = [
    {
      name: 'Tasks',
      elements: [
        { type: 'task', subtype: 'task', name: 'Task' },
        { type: 'task', subtype: 'user', name: 'User Task' },
        { type: 'task', subtype: 'service', name: 'Service Task' },
        { type: 'task', subtype: 'send', name: 'Send Task' },
        { type: 'task', subtype: 'receive', name: 'Receive Task' },
        { type: 'task', subtype: 'manual', name: 'Manual Task' },
        { type: 'task', subtype: 'business-rule', name: 'Business Rule Task' },
        { type: 'task', subtype: 'script', name: 'Script Task' }
      ]
    },
    {
      name: 'Subprocesses',
      elements: [
        { type: 'subprocess', subtype: 'embedded', name: 'Subprocess' },
        { type: 'subprocess', subtype: 'event', name: 'Event Subprocess' },
        { type: 'subprocess', subtype: 'transaction', name: 'Transaction' },
        { type: 'subprocess', subtype: 'adhoc', name: 'Ad-hoc Subprocess' }
      ]
    },
    {
      name: 'Events',
      elements: [
        { type: 'event', subtype: 'start', eventDefinition: 'none', name: 'Start Event' },
        { type: 'event', subtype: 'start', eventDefinition: 'message', name: 'Message Start Event' },
        { type: 'event', subtype: 'start', eventDefinition: 'timer', name: 'Timer Start Event' },
        { type: 'event', subtype: 'start', eventDefinition: 'signal', name: 'Signal Start Event' },
        { type: 'event', subtype: 'start', eventDefinition: 'conditional', name: 'Conditional Start Event' },
        { type: 'event', subtype: 'intermediate-catch', eventDefinition: 'none', name: 'Intermediate Catch Event' },
        { type: 'event', subtype: 'intermediate-catch', eventDefinition: 'message', name: 'Message Catch Event' },
        { type: 'event', subtype: 'intermediate-catch', eventDefinition: 'timer', name: 'Timer Catch Event' },
        { type: 'event', subtype: 'intermediate-throw', eventDefinition: 'none', name: 'Intermediate Throw Event' },
        { type: 'event', subtype: 'intermediate-throw', eventDefinition: 'message', name: 'Message Throw Event' },
        { type: 'event', subtype: 'intermediate-throw', eventDefinition: 'signal', name: 'Signal Throw Event' },
        { type: 'event', subtype: 'end', eventDefinition: 'none', name: 'End Event' },
        { type: 'event', subtype: 'end', eventDefinition: 'terminate', name: 'Terminate End Event' },
        { type: 'event', subtype: 'end', eventDefinition: 'error', name: 'Error End Event' },
        { type: 'event', subtype: 'end', eventDefinition: 'message', name: 'Message End Event' }
      ]
    },
    {
      name: 'Gateways',
      elements: [
        { type: 'gateway', subtype: 'exclusive', name: 'Exclusive Gateway' },
        { type: 'gateway', subtype: 'inclusive', name: 'Inclusive Gateway' },
        { type: 'gateway', subtype: 'parallel', name: 'Parallel Gateway' },
        { type: 'gateway', subtype: 'complex', name: 'Complex Gateway' },
        { type: 'gateway', subtype: 'event-based', name: 'Event-based Gateway' }
      ]
    },
    {
      name: 'Data',
      elements: [
        { type: 'dataobject', subtype: 'default', name: 'Data Object' },
        { type: 'dataobject', subtype: 'input', name: 'Data Input' },
        { type: 'dataobject', subtype: 'output', name: 'Data Output' },
        { type: 'datastore', subtype: 'default', name: 'Data Store' }
      ]
    },
    {
      name: 'Artifacts',
      elements: [
        { type: 'textannotation', subtype: 'default', name: 'Text Annotation' },
        { type: 'group', subtype: 'default', name: 'Group' }
      ]
    },
    {
      name: 'Swimlanes',
      elements: [
        { type: 'pool', subtype: 'horizontal', name: 'Pool' },
        { type: 'lane', subtype: 'horizontal', name: 'Lane' }
      ]
    }
  ];
  
  $: filteredCategories = searchQuery 
    ? elementCategories.map(category => ({
        ...category,
        elements: category.elements.filter(el => 
          el.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(category => category.elements.length > 0)
    : elementCategories;
    
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      dispatch('close');
    }
  }
  
  function handleAdd(event) {
    dispatch('add', event.detail);
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      dispatch('close');
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="dialog-backdrop" on:click={handleBackdropClick}>
  <div class="element-dialog" on:click|stopPropagation>
    <div class="dialog-header">
      <h2>Create Element</h2>
      <div class="search-container">
        <input 
          type="text" 
          placeholder="Search elements..." 
          bind:value={searchQuery}
          autofocus
        />
        {#if searchQuery}
          <button class="clear-search" on:click={() => searchQuery = ''}>×</button>
        {/if}
      </div>
    </div>
    
    <div class="dialog-content">
      {#each filteredCategories as category}
        <ElementCategory 
          name={category.name}
          elements={category.elements}
          on:add={handleAdd}
          on:dragstart={() => setTimeout(() => dispatch('close'), 0)}
        />
      {/each}

      {#if filteredCategories.length === 0}
        <div class="no-results">
          No elements found matching "{searchQuery}"
        </div>
      {/if}
    </div>

    <div class="dialog-footer">
      <button on:click={() => dispatch('close')}>Cancel</button>
    </div>
  </div>
</div>

<style>
  .dialog-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }
  
  .element-dialog {
    background: white;
    border-radius: 4px;
    width: 400px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  .dialog-header {
    padding: 16px;
    border-bottom: 1px solid #eee;
  }

  .dialog-header h2 {
    margin: 0 0 12px 0;
    font-size: 18px;
    color: #333;
  }
  
  .search-container {
    position: relative;
  }

  input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
  }

  input:focus {
    outline: none;
    border-color: #1890ff;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
  }

  .clear-search {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    font-size: 18px;
    color: #999;
    cursor: pointer;
    padding: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .clear-search:hover {
    color: #666;
  }
  
  .dialog-content {
    padding: 16px;
    overflow-y: auto;
    flex: 1;
  }

  .no-results {
    padding: 20px;
    text-align: center;
    color: #999;
    font-style: italic;
  }

  .dialog-footer {
    padding: 12px 16px;
    border-top: 1px solid #eee;
    display: flex;
    justify-content: flex-end;
  }

  .dialog-footer button {
    padding: 6px 16px;
    background-color: #f5f5f5;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  }

  .dialog-footer button:hover {
    background-color: #e6e6e6;
    border-color: #ccc;
  }
</style>
