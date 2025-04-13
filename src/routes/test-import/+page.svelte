<script>
  import { onMount } from 'svelte';
  import { importBpmnXml } from '$lib/utils/xml/bpmnXmlParser';
  
  let importedElements = [];
  let pools = [];
  let lanes = [];
  let error = null;
  
  async function loadTestFile() {
    try {
      // Fetch the test file
      const response = await fetch('/test-pools.bpmn');
      if (!response.ok) {
        throw new Error(`Failed to fetch test file: ${response.statusText}`);
      }
      
      const xmlString = await response.text();
      console.log('Importing test BPMN XML...');
      console.log('XML content:', xmlString);
      
      importedElements = importBpmnXml(xmlString);
      console.log('Imported elements:', importedElements);

      // Extract pools and lanes
      pools = importedElements.filter(el => el.type === 'pool');
      lanes = importedElements.filter(el => el.type === 'lane');
      
      console.log('Imported pools:', JSON.stringify(pools, null, 2));
      console.log('Imported lanes:', JSON.stringify(lanes, null, 2));
    } catch (err) {
      console.error('Failed to import test BPMN XML:', err);
      error = err.message;
    }
  }
  
  onMount(() => {
    loadTestFile();
  });
</script>

<div class="test-import">
  <h1>BPMN Import Test</h1>
  
  {#if error}
    <div class="error">
      <h2>Error</h2>
      <p>{error}</p>
    </div>
  {/if}
  
  <div class="section">
    <h2>Imported Pools ({pools.length})</h2>
    {#if pools.length > 0}
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Label</th>
            <th>Position</th>
            <th>Size</th>
            <th>Lanes</th>
            <th>Process Ref</th>
          </tr>
        </thead>
        <tbody>
          {#each pools as pool}
            <tr>
              <td>{pool.id}</td>
              <td>{pool.label}</td>
              <td>({pool.x}, {pool.y})</td>
              <td>{pool.width}x{pool.height}</td>
              <td>{pool.lanes ? pool.lanes.join(', ') : 'None'}</td>
              <td>{pool.processRef || 'None'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {:else}
      <p>No pools imported</p>
    {/if}
  </div>
  
  <div class="section">
    <h2>Imported Lanes ({lanes.length})</h2>
    {#if lanes.length > 0}
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Label</th>
            <th>Position</th>
            <th>Size</th>
            <th>Parent Pool</th>
            <th>Flow Node Refs</th>
          </tr>
        </thead>
        <tbody>
          {#each lanes as lane}
            <tr>
              <td>{lane.id}</td>
              <td>{lane.label}</td>
              <td>({lane.x}, {lane.y})</td>
              <td>{lane.width}x{lane.height}</td>
              <td>{lane.parentRef || 'None'}</td>
              <td>{lane.flowNodeRefs ? lane.flowNodeRefs.join(', ') : 'None'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {:else}
      <p>No lanes imported</p>
    {/if}
  </div>
  
  <div class="section">
    <h2>Raw Imported Elements</h2>
    <pre>{JSON.stringify(importedElements, null, 2)}</pre>
  </div>
</div>

<style>
  .test-import {
    padding: 20px;
    font-family: Arial, sans-serif;
  }
  
  .error {
    background-color: #ffeeee;
    border: 1px solid #ff0000;
    padding: 10px;
    margin-bottom: 20px;
    border-radius: 4px;
  }
  
  .section {
    margin-bottom: 30px;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
  }
  
  th, td {
    border: 1px solid #ddd;
    padding: 8px;
    text-align: left;
  }
  
  th {
    background-color: #f2f2f2;
  }
  
  pre {
    background-color: #f5f5f5;
    padding: 10px;
    border-radius: 4px;
    overflow: auto;
    max-height: 400px;
  }
</style>
