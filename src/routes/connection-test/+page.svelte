<script>
  import { onMount } from 'svelte';

  // Define a simple Position type
  /**
   * @typedef {Object} Position
   * @property {number} x - The x coordinate
   * @property {number} y - The y coordinate
   */

  // Test connection data
  let testConnections = [
    {
      id: 'connection-1',
      name: 'L-shaped connection',
      waypoints: [
        { x: 100, y: 100 },
        { x: 300, y: 100 },
        { x: 300, y: 300 }
      ]
    },
    {
      id: 'connection-2',
      name: 'Connection with collinear points',
      waypoints: [
        { x: 100, y: 400 },
        { x: 200, y: 400 },
        { x: 300, y: 400 },
        { x: 300, y: 500 },
        { x: 300, y: 600 }
      ]
    },
    {
      id: 'connection-3',
      name: 'Complex connection',
      waypoints: [
        { x: 500, y: 100 },
        { x: 600, y: 100 },
        { x: 600, y: 200 },
        { x: 700, y: 200 },
        { x: 700, y: 300 }
      ]
    }
  ];

  // Create a copy for optimized connections
  let optimizedConnections = JSON.parse(JSON.stringify(testConnections));

  // Canvas context
  let canvas;
  let ctx;

  onMount(() => {
    ctx = canvas.getContext('2d');
    drawConnections();
  });

  // Function to draw all connections
  function drawConnections() {
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    drawGrid();

    // Draw original connections on the left
    ctx.save();
    ctx.translate(0, 0);
    drawConnectionSet(testConnections, 'Original');
    ctx.restore();

    // Draw optimized connections on the right
    ctx.save();
    ctx.translate(800, 0);
    drawConnectionSet(optimizedConnections, 'Optimized');
    ctx.restore();
  }

  // Function to draw a set of connections
  function drawConnectionSet(connections, title) {
    // Draw title
    ctx.font = '20px Arial';
    ctx.fillStyle = 'black';
    ctx.fillText(title, 300, 30);

    // Draw each connection
    connections.forEach(connection => {
      drawConnection(connection);
    });
  }

  // Function to draw a single connection
  function drawConnection(connection) {
    const waypoints = connection.waypoints;

    // Draw the connection path
    ctx.beginPath();
    ctx.moveTo(waypoints[0].x, waypoints[0].y);

    // If we only have two points but they're not aligned horizontally or vertically,
    // we need to draw an L-shaped path instead of a direct line
    if (waypoints.length === 2) {
      const p1 = waypoints[0];
      const p2 = waypoints[1];

      // Check if the points are aligned horizontally or vertically
      if (Math.abs(p1.x - p2.x) > 0.001 && Math.abs(p1.y - p2.y) > 0.001) {
        // Not aligned, draw an L-shape
        ctx.lineTo(p1.x, p2.y); // First go vertically
        ctx.lineTo(p2.x, p2.y); // Then go horizontally
      } else {
        // Aligned, draw a direct line
        ctx.lineTo(p2.x, p2.y);
      }
    } else {
      // More than two points, draw the path normally
      for (let i = 1; i < waypoints.length; i++) {
        ctx.lineTo(waypoints[i].x, waypoints[i].y);
      }
    }

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw waypoints as circles
    waypoints.forEach((point, index) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = index === 0 || index === waypoints.length - 1 ? 'blue' : 'red';
      ctx.fill();

      // Add point coordinates as text
      ctx.font = '12px Arial';
      ctx.fillStyle = 'black';
      ctx.fillText(`(${point.x},${point.y})`, point.x + 10, point.y - 10);
    });

    // Draw connection name
    ctx.font = '16px Arial';
    ctx.fillStyle = 'black';
    ctx.fillText(connection.name, waypoints[0].x, waypoints[0].y - 20);
  }

  // Function to draw a grid
  function drawGrid() {
    const gridSize = 50;
    const width = canvas.width;
    const height = canvas.height;

    ctx.beginPath();
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 0.5;

    // Draw vertical lines
    for (let x = 0; x <= width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }

    // Draw horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }

    ctx.stroke();
  }

  // Function to optimize waypoints
  function optimizeWaypoints() {
    // Make a deep copy of the connections
    optimizedConnections = JSON.parse(JSON.stringify(testConnections));

    // Optimize each connection
    optimizedConnections.forEach(connection => {
      connection.waypoints = optimizeConnectionWaypoints(connection.waypoints);
    });

    // Redraw connections
    drawConnections();
  }

  /**
   * Optimize waypoints by removing unnecessary points
   * @param {Array<Position>} waypoints - The waypoints to optimize
   * @returns {Array<Position>} - The optimized waypoints
   */
  function optimizeConnectionWaypoints(waypoints) {
    if (!waypoints || waypoints.length <= 1) {
      console.log('No waypoints to optimize or only one waypoint');
      return waypoints;
    }

    console.log('Starting waypoint optimization with', waypoints.length, 'points');
    console.log('Original waypoints:', JSON.stringify(waypoints));

    // Make a deep copy to avoid modifying the original array
    let optimized = JSON.parse(JSON.stringify(waypoints));

    // Define a small epsilon for floating point comparisons
    const EPSILON = 0.001;

    // For all cases, merge collinear segments
    const result = [];

    // Always keep the first point
    result.push(optimized[0]);

    // Process each point
    for (let i = 1; i < optimized.length - 1; i++) {
      const prev = result[result.length - 1]; // Last point in our result so far
      const current = optimized[i];           // Current point we're evaluating
      const next = optimized[i + 1];          // Next point in the sequence

      // Check if the current point is on a straight line (horizontal or vertical)
      const isHorizontalLine = Math.abs(prev.y - current.y) < EPSILON && Math.abs(current.y - next.y) < EPSILON;
      const isVerticalLine = Math.abs(prev.x - current.x) < EPSILON && Math.abs(current.x - next.x) < EPSILON;

      console.log(`Point ${i}:`, current, 'isHorizontal:', isHorizontalLine, 'isVertical:', isVerticalLine);

      // If the point is on a straight line, skip it
      if (isHorizontalLine || isVerticalLine) {
        console.log(`Point ${i} is on a straight line - skipping`);
        // Skip this point (don't add to result)
      } else {
        // Otherwise, it's a corner point that changes direction, so keep it
        console.log(`Point ${i} is a corner - keeping`);
        result.push(current);
      }
    }

    // Always keep the last point
    result.push(optimized[optimized.length - 1]);

    console.log('Final optimized waypoints:', JSON.stringify(result));
    console.log('Reduced from', waypoints.length, 'to', result.length, 'points');

    return result;
  }

  // Reset to original connections
  function resetConnections() {
    optimizedConnections = JSON.parse(JSON.stringify(testConnections));
    drawConnections();
  }

  // Add a random point to a connection
  function addRandomPoint() {
    testConnections.forEach(connection => {
      if (connection.waypoints.length > 1) {
        const index = Math.floor(Math.random() * (connection.waypoints.length - 1)) + 1;
        const prev = connection.waypoints[index - 1];
        const next = connection.waypoints[index];

        // Add a point on the same line
        if (Math.abs(prev.y - next.y) < 0.001) {
          // Horizontal line
          const x = (prev.x + next.x) / 2;
          connection.waypoints.splice(index, 0, { x, y: prev.y });
        } else if (Math.abs(prev.x - next.x) < 0.001) {
          // Vertical line
          const y = (prev.y + next.y) / 2;
          connection.waypoints.splice(index, 0, { x: prev.x, y });
        }
      }
    });

    // Update optimized connections
    optimizedConnections = JSON.parse(JSON.stringify(testConnections));
    drawConnections();
  }
</script>

<div class="container">
  <h1>Connection Optimization Test</h1>

  <div class="controls">
    <button on:click={optimizeWaypoints}>Optimize Waypoints</button>
    <button on:click={resetConnections}>Reset</button>
    <button on:click={addRandomPoint}>Add Random Points</button>
  </div>

  <div class="canvas-container">
    <canvas bind:this={canvas} width="1600" height="800"></canvas>
  </div>

  <div class="description">
    <h2>How it works:</h2>
    <p>This test visualizes connection optimization. The left side shows the original connections with all waypoints, and the right side shows the optimized connections.</p>
    <p>The optimization algorithm:</p>
    <ol>
      <li>For L-shaped connections with 3 points, it removes the middle point and creates a direct L-shape.</li>
      <li>For other connections, it removes points that are on a straight line (collinear points).</li>
    </ol>
    <p>Red dots are intermediate waypoints that might be removed during optimization. Blue dots are the start and end points that are always kept.</p>
  </div>
</div>

<style>
  .container {
    font-family: Arial, sans-serif;
    max-width: 1600px;
    margin: 0 auto;
    padding: 20px;
  }

  h1 {
    text-align: center;
    margin-bottom: 20px;
  }

  .controls {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin-bottom: 20px;
  }

  button {
    padding: 10px 20px;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
  }

  button:hover {
    background-color: #45a049;
  }

  .canvas-container {
    border: 1px solid #ddd;
    margin-bottom: 20px;
  }

  canvas {
    display: block;
    background-color: #f9f9f9;
  }

  .description {
    background-color: #f0f0f0;
    padding: 20px;
    border-radius: 4px;
  }

  h2 {
    margin-top: 0;
  }

  ol {
    margin-left: 20px;
  }
</style>
