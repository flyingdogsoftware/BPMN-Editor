/**
 * XML to Model Mapper for BPMN 2.0
 * 
 * This module provides the mapXmlToModel function, which converts parsed BPMN XML
 * objects into the internal BPMN model representation used by the editor.
 */

import type { BpmnElementUnion } from '$lib/models/bpmnElements';

/**
 * Map parsed BPMN XML to the internal data model.
 * @param parsedXml The parsed BPMN XML object
 * @returns Array of BPMN elements in the internal data model format
 */
export function mapXmlToModel(parsedXml: any): BpmnElementUnion[] {
  // TODO: Implement full mapping logic for all BPMN elements

  // Example: Extract process and its flow elements
  const elements: BpmnElementUnion[] = [];

  const definitions = parsedXml['bpmn:definitions'];
  if (!definitions) {
    throw new Error('Missing bpmn:definitions in parsed XML');
  }

  // Handle single or multiple processes
  const processes = Array.isArray(definitions['bpmn:process'])
    ? definitions['bpmn:process']
    : [definitions['bpmn:process']].filter(Boolean);

  for (const process of processes) {
    // Map tasks
    if (process['bpmn:task']) {
      const tasks = Array.isArray(process['bpmn:task'])
        ? process['bpmn:task']
        : [process['bpmn:task']];
      for (const task of tasks) {
        const mappedTask = {
          id: task['@_id'],
          type: "task",
          taskType: "task",
          label: task['@_name'] || '',
          x: 0,
          y: 0,
          width: 120,
          height: 60,
        } as import("$lib/models/bpmnElements").BpmnTask;
        elements.push(mappedTask);
      }
    }

    // Map start events
    if (process['bpmn:startEvent']) {
      const startEvents = Array.isArray(process['bpmn:startEvent'])
        ? process['bpmn:startEvent']
        : [process['bpmn:startEvent']];
      for (const event of startEvents) {
        const mappedEvent = {
          id: event['@_id'],
          type: "event",
          eventType: "start",
          eventDefinition: "none",
          label: event['@_name'] || '',
          x: 0,
          y: 0,
          width: 36,
          height: 36,
        } as import("$lib/models/bpmnElements").BpmnEvent;
        elements.push(mappedEvent);
      }
    }

    // Map end events
    if (process['bpmn:endEvent']) {
      const endEvents = Array.isArray(process['bpmn:endEvent'])
        ? process['bpmn:endEvent']
        : [process['bpmn:endEvent']];
      for (const event of endEvents) {
        const mappedEvent = {
          id: event['@_id'],
          type: "event",
          eventType: "end",
          eventDefinition: "none",
          label: event['@_name'] || '',
          x: 0,
          y: 0,
          width: 36,
          height: 36,
        } as import("$lib/models/bpmnElements").BpmnEvent;
        elements.push(mappedEvent);
      }
    }

    // Map exclusive gateways
    if (process['bpmn:exclusiveGateway']) {
      const gateways = Array.isArray(process['bpmn:exclusiveGateway'])
        ? process['bpmn:exclusiveGateway']
        : [process['bpmn:exclusiveGateway']];
      for (const gateway of gateways) {
        const mappedGateway = {
          id: gateway['@_id'],
          type: "gateway",
          gatewayType: "exclusive",
          label: gateway['@_name'] || '',
          x: 0,
          y: 0,
          width: 50,
          height: 50,
        } as import("$lib/models/bpmnElements").BpmnGateway;
        elements.push(mappedGateway);
      }
    }

    // Map sequence flows
    if (process['bpmn:sequenceFlow']) {
      const flows = Array.isArray(process['bpmn:sequenceFlow'])
        ? process['bpmn:sequenceFlow']
        : [process['bpmn:sequenceFlow']];
      for (const flow of flows) {
        // Note: Connections are not nodes and do not have x/y/width/height
        const mappedConnection = {
          id: flow['@_id'],
          type: "connection",
          connectionType: "sequence",
          sourceId: flow['@_sourceRef'],
          targetId: flow['@_targetRef'],
          sourcePointId: '',
          targetPointId: '',
          waypoints: [],
          label: flow['@_name'] || '',
        } as import("$lib/models/bpmnElements").BpmnConnection;
        elements.push(mappedConnection);
      }
    }
  }

  // TODO: Map diagram/graphical information if needed

  return elements;
}
