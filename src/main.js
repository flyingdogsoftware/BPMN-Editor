// Main entry point for the BPMN Editor library
import BpmnEditor from './lib/components/BpmnEditor.svelte';
import './styles/global.css';

// Export the main component as default
export default BpmnEditor;

// Export stores and utilities that might be useful for external consumers
export { bpmnStore } from './lib/stores/bpmnStore';
export {
	importBpmnXml,
	importBpmnDiagram,
	parseBpmnXml,
	setBpmnImportDebug,
} from './lib/utils/xml/bpmnXmlParser';
export { exportBpmnXml } from './lib/utils/xml/bpmnXmlExporter';
export { exportSvg } from './lib/utils/svgExporter';
export {
	notifications,
	notify,
	notifyInfo,
	notifySuccess,
	notifyWarning,
	notifyError,
	confirmAction,
} from './lib/stores/notificationStore';

// For development mode, instantiate the component if we're in a browser environment
if (typeof window !== 'undefined' && document.getElementById('editor')) {
	new BpmnEditor({
		target: document.getElementById('editor')
	});
}
