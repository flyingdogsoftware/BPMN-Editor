// BPMN Element Types
// This file defines all the BPMN 2.0 element types and their properties
// Type guard to check if an element is a node (has position and size)
export function isNode(element) {
    return element.type !== 'connection';
}
