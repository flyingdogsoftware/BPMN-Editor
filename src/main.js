// Main entry point for the BPMN Editor library
import BpmnEditor from './lib/components/BpmnEditor.svelte';
import './styles/global.css';

// Export the main component as default and named export
export default BpmnEditor;
export { BpmnEditor };

// Export stores and utilities that might be useful for external consumers
export { bpmnStore } from './lib/stores/bpmnStore';
export { importBpmnXml } from './lib/utils/xml/bpmnXmlParser';
export { exportBpmnXml } from './lib/utils/xml/bpmnXmlExporter';
export { exportSvg } from './lib/utils/svgExporter';
