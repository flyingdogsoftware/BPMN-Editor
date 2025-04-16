<script>
  import { onMount } from 'svelte';
  import { runTests } from '../../lib/tests/connectionOptimizationTest';
  
  let testResults = null;
  
  onMount(() => {
    // Run the tests when the component is mounted
    testResults = runTests();
  });
</script>

<div class="test-container">
  <h1>Connection Optimization Tests</h1>
  
  {#if testResults}
    <div class="results">
      <h2>Test Results</h2>
      <p class="summary">
        <span class="passed">{testResults.passedTests} tests passed</span>
        <span class="failed">{testResults.failedTests} tests failed</span>
      </p>
    </div>
  {:else}
    <p>Running tests...</p>
  {/if}
  
  <p>Check the browser console for detailed test results.</p>
</div>

<style>
  .test-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    font-family: Arial, sans-serif;
  }
  
  h1 {
    color: #333;
    border-bottom: 1px solid #ddd;
    padding-bottom: 10px;
  }
  
  .results {
    background-color: #f5f5f5;
    padding: 15px;
    border-radius: 5px;
    margin-top: 20px;
  }
  
  .summary {
    font-size: 18px;
    margin-top: 10px;
  }
  
  .passed {
    color: green;
    font-weight: bold;
    margin-right: 20px;
  }
  
  .failed {
    color: red;
    font-weight: bold;
  }
</style>
