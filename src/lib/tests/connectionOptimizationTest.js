// Test script for connection optimization
import { optimizeWaypoints } from '../utils/connectionRouting';

// Test cases for connection optimization
const testCases = [
  {
    name: 'Horizontal line with multiple points',
    input: [
      { x: 100, y: 100 },
      { x: 150, y: 100 },
      { x: 200, y: 100 },
      { x: 250, y: 100 },
      { x: 300, y: 100 }
    ],
    expectedOutput: [
      { x: 100, y: 100 },
      { x: 300, y: 100 }
    ]
  },
  {
    name: 'Vertical line with multiple points',
    input: [
      { x: 100, y: 100 },
      { x: 100, y: 150 },
      { x: 100, y: 200 },
      { x: 100, y: 250 },
      { x: 100, y: 300 }
    ],
    expectedOutput: [
      { x: 100, y: 100 },
      { x: 100, y: 300 }
    ]
  },
  {
    name: 'L-shaped connection',
    input: [
      { x: 100, y: 100 },
      { x: 300, y: 100 },
      { x: 300, y: 300 }
    ],
    expectedOutput: [
      { x: 100, y: 100 },
      { x: 300, y: 100 },
      { x: 300, y: 300 }
    ]
  },
  {
    name: 'Z-shaped connection',
    input: [
      { x: 100, y: 100 },
      { x: 300, y: 100 },
      { x: 300, y: 200 },
      { x: 500, y: 200 }
    ],
    expectedOutput: [
      { x: 100, y: 100 },
      { x: 300, y: 100 },
      { x: 300, y: 200 },
      { x: 500, y: 200 }
    ]
  },
  {
    name: 'Complex path with redundant points',
    input: [
      { x: 100, y: 100 },
      { x: 200, y: 100 },
      { x: 300, y: 100 }, // Redundant point on horizontal line
      { x: 400, y: 100 },
      { x: 400, y: 200 },
      { x: 400, y: 300 }, // Redundant point on vertical line
      { x: 400, y: 400 },
      { x: 500, y: 400 },
      { x: 600, y: 400 }  // Redundant point on horizontal line
    ],
    expectedOutput: [
      { x: 100, y: 100 },
      { x: 400, y: 100 },
      { x: 400, y: 400 },
      { x: 600, y: 400 }
    ]
  }
];

// Run the tests
function runTests() {
  console.log('Running connection optimization tests...');
  
  let passedTests = 0;
  let failedTests = 0;
  
  testCases.forEach((testCase, index) => {
    console.log(`\nTest ${index + 1}: ${testCase.name}`);
    console.log('Input:', JSON.stringify(testCase.input));
    
    const result = optimizeWaypoints(testCase.input);
    console.log('Output:', JSON.stringify(result));
    console.log('Expected:', JSON.stringify(testCase.expectedOutput));
    
    // Check if the result matches the expected output
    const isCorrect = compareWaypoints(result, testCase.expectedOutput);
    
    if (isCorrect) {
      console.log('✅ PASSED');
      passedTests++;
    } else {
      console.log('❌ FAILED');
      failedTests++;
    }
  });
  
  console.log(`\nTest Results: ${passedTests} passed, ${failedTests} failed`);
  return { passedTests, failedTests };
}

// Helper function to compare waypoints
function compareWaypoints(waypoints1, waypoints2) {
  if (waypoints1.length !== waypoints2.length) {
    return false;
  }
  
  for (let i = 0; i < waypoints1.length; i++) {
    if (Math.abs(waypoints1[i].x - waypoints2[i].x) > 0.001 ||
        Math.abs(waypoints1[i].y - waypoints2[i].y) > 0.001) {
      return false;
    }
  }
  
  return true;
}

// Export the test function
export { runTests };
