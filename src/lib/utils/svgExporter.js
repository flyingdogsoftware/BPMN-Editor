/**
 * SVG Exporter
 *
 * This module provides functionality to export the BPMN diagram as an SVG file.
 */

/**
 * Export the current SVG diagram to a downloadable SVG file
 * @param {string} filename The name of the file to download
 */
export function exportSvg(filename = 'diagram.svg') {
  // Get the SVG element from the DOM
  const svgElement = document.querySelector('.canvas');
  
  if (!svgElement) {
    throw new Error('SVG element not found');
  }
  
  // Create a clone of the SVG to avoid modifying the original
  const svgClone = svgElement.cloneNode(true);
  
  // Remove grid pattern from the clone
  const gridRect = svgClone.querySelector('rect[fill="url(#grid)"]');
  if (gridRect) {
    gridRect.remove();
  }
  
  // Remove selection rectangles and other interactive elements
  const selectionRects = svgClone.querySelectorAll('rect[stroke-dasharray="5,5"]');
  selectionRects.forEach(rect => rect.remove());
  
  // Remove any other interactive elements or UI components that shouldn't be in the export
  // For example, connection points, resize handles, etc.
  const connectionPoints = svgClone.querySelectorAll('.connection-point');
  connectionPoints.forEach(point => point.remove());
  
  const resizeHandles = svgClone.querySelectorAll('.resize-handle');
  resizeHandles.forEach(handle => handle.remove());
  
  // Set proper attributes for standalone SVG
  svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svgClone.setAttribute('version', '1.1');
  
  // Remove transform style to reset the view
  svgClone.style.transform = '';
  
  // Create SVG content as a string
  const svgContent = svgClone.outerHTML;
  
  // Create a blob with the SVG content
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  
  // Create a download link
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  
  // Trigger the download
  document.body.appendChild(link);
  link.click();
  
  // Clean up
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
