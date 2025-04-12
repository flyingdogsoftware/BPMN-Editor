<script>
  import { createEventDispatcher } from 'svelte';
  
  export let x = 0;
  export let y = 0;
  export let items = [];
  export let visible = false;
  
  const dispatch = createEventDispatcher();
  
  function handleItemClick(item) {
    dispatch('select', item);
    visible = false;
  }
  
  function handleClickOutside(event) {
    if (visible && !event.target.closest('.context-menu')) {
      visible = false;
    }
  }
</script>

<svelte:window on:click={handleClickOutside} />

{#if visible}
  <div 
    class="context-menu" 
    style="left: {x}px; top: {y}px;"
  >
    <ul>
      {#each items as item}
        <li on:click={() => handleItemClick(item)}>
          {item.label}
        </li>
      {/each}
    </ul>
  </div>
{/if}

<style>
  .context-menu {
    position: absolute;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    min-width: 150px;
  }
  
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  
  li {
    padding: 8px 12px;
    cursor: pointer;
    user-select: none;
  }
  
  li:hover {
    background-color: #f5f5f5;
  }
</style>
