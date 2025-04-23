/**
 * BPMN XML Exporter
 *
 * This module provides functionality to export the internal BPMN data model
 * to a standard BPMN 2.0 XML format.
 */

/**
 * Convert line breaks to XML entities
 * @param {string} text The text to process
 * @returns {string} Text with line breaks converted to XML entities
 */
function processTextForXml(text) {
  if (!text) return '';

  // Replace line breaks with XML line break entity
  return text.replace(/\n/g, '&#10;');
}

/**
 * Escape special characters in XML
 * @param {string} text The text to escape
 * @returns {string} Escaped text
 */
function escapeXml(text) {
  if (!text) return '';

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate a unique ID for BPMN elements if needed
 * @param {string} prefix Prefix for the ID
 * @returns {string} A unique ID
 */
function generateId(prefix = 'id_') {
  return `${prefix}${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create the XML header with all required namespaces
 * @returns {string} XML header string
 */
function createXmlHeader() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  id="Definitions_${generateId()}"
  targetNamespace="http://bpmn.io/schema/bpmn">`;
}

/**
 * Create the XML footer
 * @returns {string} XML footer string
 */
function createXmlFooter() {
  return '</bpmn:definitions>';
}

/**
 * Create the Collaboration section with participants
 * @param {Array} elements Array of BPMN elements
 * @returns {string} XML string for the collaboration section
 */
function createCollaborationSection(elements) {
  // Find all pools
  const pools = elements.filter(el => el.type === 'pool');

  if (pools.length === 0) {
    return '';
  }

  // Create a unique collaboration ID
  const collaborationId = `Collaboration_${generateId()}`;

  let xml = `  <bpmn:collaboration id="${collaborationId}">\n`;

  // Add participants (pools)
  for (const pool of pools) {
    // Create a process reference for this pool if not exists
    const processRef = pool.processRef || `Process_${pool.id.replace('Participant_', '')}`;

    xml += `    <bpmn:participant id="${pool.id}" name="${escapeXml(processTextForXml(pool.label))}" processRef="${processRef}" />\n`;
  }

  // Add message flows between pools
  const messageFlows = elements.filter(el =>
    el.type === 'connection' &&
    el.connectionType === 'message'
  );

  for (const flow of messageFlows) {
    // Check if source and target exist
    const sourceElement = elements.find(el => el.id === flow.sourceId);
    const targetElement = elements.find(el => el.id === flow.targetId);

    if (!sourceElement || !targetElement) {
      continue;
    }

    xml += `    <bpmn:messageFlow id="${flow.id}" sourceRef="${flow.sourceId}" targetRef="${flow.targetId}"`;

    if (flow.label) {
      xml += ` name="${escapeXml(processTextForXml(flow.label))}"`;
    }

    xml += ' />\n';
  }

  xml += '  </bpmn:collaboration>\n';

  return xml;
}

/**
 * Create the Process section with lanes and flow elements
 * @param {Array} elements Array of BPMN elements
 * @param {Object} pool The pool element
 * @returns {string} XML string for the process section
 */
function createProcessSection(elements, pool) {
  // Create a process ID based on the pool
  const processId = pool.processRef || `Process_${pool.id.replace('Participant_', '')}`;

  let xml = `  <bpmn:process id="${processId}" isExecutable="false">\n`;

  // Find lanes for this pool
  const lanes = elements.filter(el => el.type === 'lane' && el.parentRef === pool.id);

  // Add lane set if there are lanes
  if (lanes.length > 0) {
    xml += '    <bpmn:laneSet>\n';

    for (const lane of lanes) {
      xml += `      <bpmn:lane id="${lane.id}" name="${escapeXml(processTextForXml(lane.label))}">\n`;

      // Add flow node references
      if (lane.flowNodeRefs && lane.flowNodeRefs.length > 0) {
        for (const nodeRef of lane.flowNodeRefs) {
          xml += `        <bpmn:flowNodeRef>${nodeRef}</bpmn:flowNodeRef>\n`;
        }
      }

      xml += '      </bpmn:lane>\n';
    }

    xml += '    </bpmn:laneSet>\n';
  }

  // Add sequence flows
  const sequenceFlows = elements.filter(el =>
    el.type === 'connection' &&
    el.connectionType === 'sequence'
  );

  for (const flow of sequenceFlows) {
    // Check if source and target are in this process
    const sourceElement = elements.find(el => el.id === flow.sourceId);
    const targetElement = elements.find(el => el.id === flow.targetId);

    // Skip if source or target is missing or not in this process
    if (!sourceElement || !targetElement) {
      continue;
    }

    xml += `    <bpmn:sequenceFlow id="${flow.id}" sourceRef="${flow.sourceId}" targetRef="${flow.targetId}"`;

    if (flow.label) {
      xml += ` name="${escapeXml(processTextForXml(flow.label))}"`;
    }

    if (flow.isDefault) {
      xml += ' isDefault="true"';
    }

    xml += ' />\n';
  }

  // Add tasks
  const tasks = elements.filter(el => el.type === 'task');

  for (const task of tasks) {
    xml += `    <bpmn:task id="${task.id}"`;

    if (task.label) {
      xml += ` name="${escapeXml(processTextForXml(task.label))}"`;
    }

    xml += '>\n';

    // Add incoming sequence flows
    const incomingFlows = sequenceFlows.filter(flow => flow.targetId === task.id);
    for (const flow of incomingFlows) {
      xml += `      <bpmn:incoming>${flow.id}</bpmn:incoming>\n`;
    }

    // Add outgoing sequence flows
    const outgoingFlows = sequenceFlows.filter(flow => flow.sourceId === task.id);
    for (const flow of outgoingFlows) {
      xml += `      <bpmn:outgoing>${flow.id}</bpmn:outgoing>\n`;
    }

    xml += '    </bpmn:task>\n';
  }

  // Add events
  const events = elements.filter(el => el.type === 'event');

  for (const event of events) {
    // Determine event type tag
    let eventTag = 'bpmn:startEvent';
    if (event.eventType === 'end') {
      eventTag = 'bpmn:endEvent';
    } else if (event.eventType === 'intermediate') {
      if (event.eventDefinition === 'throw') {
        eventTag = 'bpmn:intermediateThrowEvent';
      } else {
        eventTag = 'bpmn:intermediateCatchEvent';
      }
    } else if (event.eventType === 'boundary') {
      eventTag = 'bpmn:boundaryEvent';
    }

    xml += `    <${eventTag} id="${event.id}"`;

    if (event.label) {
      xml += ` name="${escapeXml(processTextForXml(event.label))}"`;
    }

    if (event.eventType === 'boundary' && event.attachedToRef) {
      xml += ` attachedToRef="${event.attachedToRef}"`;
    }

    if (event.eventType === 'boundary' && event.cancelActivity !== undefined) {
      xml += ` cancelActivity="${event.cancelActivity}"`;
    }

    xml += '>\n';

    // Add incoming sequence flows (except for start events)
    if (event.eventType !== 'start') {
      const incomingFlows = sequenceFlows.filter(flow => flow.targetId === event.id);
      for (const flow of incomingFlows) {
        xml += `      <bpmn:incoming>${flow.id}</bpmn:incoming>\n`;
      }
    }

    // Add outgoing sequence flows (except for end events)
    if (event.eventType !== 'end') {
      const outgoingFlows = sequenceFlows.filter(flow => flow.sourceId === event.id);
      for (const flow of outgoingFlows) {
        xml += `      <bpmn:outgoing>${flow.id}</bpmn:outgoing>\n`;
      }
    }

    xml += `    </${eventTag}>\n`;
  }

  // Add gateways
  const gateways = elements.filter(el => el.type === 'gateway');

  for (const gateway of gateways) {
    // Determine gateway type tag
    let gatewayTag = 'bpmn:exclusiveGateway';
    if (gateway.gatewayType === 'inclusive') {
      gatewayTag = 'bpmn:inclusiveGateway';
    } else if (gateway.gatewayType === 'parallel') {
      gatewayTag = 'bpmn:parallelGateway';
    } else if (gateway.gatewayType === 'complex') {
      gatewayTag = 'bpmn:complexGateway';
    } else if (gateway.gatewayType === 'event-based') {
      gatewayTag = 'bpmn:eventBasedGateway';
    } else if (gateway.gatewayType === 'parallel-event-based') {
      gatewayTag = 'bpmn:parallelEventBasedGateway';
    }

    xml += `    <${gatewayTag} id="${gateway.id}"`;

    if (gateway.label) {
      xml += ` name="${escapeXml(processTextForXml(gateway.label))}"`;
    }

    if (gateway.gatewayType === 'event-based' && gateway.isInstantiating !== undefined) {
      xml += ` instantiate="${gateway.isInstantiating}"`;
    }

    if (gateway.defaultFlow) {
      xml += ` default="${gateway.defaultFlow}"`;
    }

    xml += '>\n';

    // Add incoming sequence flows
    const incomingFlows = sequenceFlows.filter(flow => flow.targetId === gateway.id);
    for (const flow of incomingFlows) {
      xml += `      <bpmn:incoming>${flow.id}</bpmn:incoming>\n`;
    }

    // Add outgoing sequence flows
    const outgoingFlows = sequenceFlows.filter(flow => flow.sourceId === gateway.id);
    for (const flow of outgoingFlows) {
      xml += `      <bpmn:outgoing>${flow.id}</bpmn:outgoing>\n`;
    }

    xml += `    </${gatewayTag}>\n`;
  }

  xml += '  </bpmn:process>\n';

  return xml;
}

/**
 * Create the BPMNDiagram section with shapes and edges
 * @param {Array} elements Array of BPMN elements
 * @returns {string} XML string for the diagram section
 */
function createDiagramSection(elements) {
  // Create a unique diagram ID
  const diagramId = `BPMNDiagram_${generateId()}`;
  const planeId = `BPMNPlane_${generateId()}`;

  // Find the collaboration ID if it exists
  const pools = elements.filter(el => el.type === 'pool');
  let bpmnElement = 'Process_1';

  if (pools.length > 0) {
    // Use the collaboration as the root element
    bpmnElement = `Collaboration_${generateId()}`;
  }

  let xml = `  <bpmndi:BPMNDiagram id="${diagramId}">\n`;
  xml += `    <bpmndi:BPMNPlane id="${planeId}" bpmnElement="${bpmnElement}">\n`;

  // Add shapes for all node elements
  for (const element of elements) {
    if (element.type !== 'connection') {
      // Skip elements without position or size
      if (element.x === undefined || element.y === undefined ||
          element.width === undefined || element.height === undefined) {
        continue;
      }

      xml += `      <bpmndi:BPMNShape id="${element.id}_di" bpmnElement="${element.id}">\n`;
      xml += `        <dc:Bounds x="${element.x}" y="${element.y}" width="${element.width}" height="${element.height}" />\n`;

      // Add label if it exists and has a position
      if (element.label && element.labelPosition) {
        xml += '        <bpmndi:BPMNLabel>\n';
        xml += `          <dc:Bounds x="${element.labelPosition.x}" y="${element.labelPosition.y}" width="90" height="20" />\n`;
        xml += '        </bpmndi:BPMNLabel>\n';
      }

      xml += '      </bpmndi:BPMNShape>\n';
    }
  }

  // Add edges for all connections
  for (const element of elements) {
    if (element.type === 'connection') {
      xml += `      <bpmndi:BPMNEdge id="${element.id}_di" bpmnElement="${element.id}">\n`;

      // Add waypoints
      for (const waypoint of element.waypoints) {
        xml += `        <di:waypoint xsi:type="dc:Point" x="${waypoint.x}" y="${waypoint.y}" />\n`;
      }

      // Add label if it exists and has a position
      if (element.label && element.labelOffset) {
        xml += '        <bpmndi:BPMNLabel>\n';
        xml += `          <dc:Bounds x="${element.labelOffset.x}" y="${element.labelOffset.y}" width="90" height="20" />\n`;
        xml += '        </bpmndi:BPMNLabel>\n';
      }

      xml += '      </bpmndi:BPMNEdge>\n';
    }
  }

  xml += '    </bpmndi:BPMNPlane>\n';
  xml += '  </bpmndi:BPMNDiagram>\n';

  return xml;
}

/**
 * Export the internal BPMN data model to BPMN 2.0 XML
 * @param {Array} elements Array of BPMN elements
 * @returns {string} BPMN 2.0 XML string
 */
export function exportBpmnXml(elements) {
  let xml = createXmlHeader();

  // Add collaboration section if there are pools
  const pools = elements.filter(el => el.type === 'pool');
  if (pools.length > 0) {
    xml += createCollaborationSection(elements);

    // Create a process section for each pool
    for (const pool of pools) {
      xml += createProcessSection(elements, pool);
    }
  } else {
    // If there are no pools, create a single process
    xml += createProcessSection(elements, { id: 'Process_1', processRef: 'Process_1' });
  }

  // Add diagram section
  xml += createDiagramSection(elements);

  // Add footer
  xml += createXmlFooter();

  return xml;
}

/**
 * Create a downloadable file with the BPMN XML
 * @param {string} xml The BPMN XML string
 * @param {string} filename The name of the file to download
 */
export function downloadBpmnXml(xml, filename = 'diagram.bpmn') {
  // Create a blob with the XML content
  const blob = new Blob([xml], { type: 'application/xml' });

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
