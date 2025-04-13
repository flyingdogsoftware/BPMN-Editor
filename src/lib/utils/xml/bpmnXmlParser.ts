/**
 * BPMN XML Parser
 *
 * This module provides functionality to parse BPMN 2.0 XML files and convert them
 * to the internal data model used by the BPMN editor.
 */

import { XMLParser, XMLValidator } from 'fast-xml-parser';
import type { BpmnElementUnion } from '$lib/models/bpmnElements';
import { mapXmlToModel } from './xmlToModelMapper';

// XML Parser options
const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: true,
  allowBooleanAttributes: true,
  isArray: (name: string, jpath: string) => {
    // Elements that should always be treated as arrays even when there's only one
    const arrayElements = [
      'bpmn:task', 'bpmn:userTask', 'bpmn:serviceTask', 'bpmn:sendTask', 'bpmn:receiveTask',
      'bpmn:manualTask', 'bpmn:businessRuleTask', 'bpmn:scriptTask',
      'bpmn:startEvent', 'bpmn:endEvent', 'bpmn:intermediateThrowEvent', 'bpmn:intermediateCatchEvent',
      'bpmn:boundaryEvent', 'bpmn:sequenceFlow', 'bpmn:messageFlow', 'bpmn:association',
      'bpmn:exclusiveGateway', 'bpmn:inclusiveGateway', 'bpmn:parallelGateway', 'bpmn:complexGateway',
      'bpmn:eventBasedGateway', 'bpmn:participant', 'bpmn:lane', 'bpmn:dataObject',
      'bpmn:dataObjectReference', 'bpmn:dataStore', 'bpmn:dataStoreReference',
      'bpmn:textAnnotation', 'bpmn:group', 'bpmn:subProcess', 'bpmn:callActivity',
      'bpmn:process', 'bpmn:collaboration', 'bpmn:choreography', 'bpmn:waypoint',
      'di:waypoint', 'bpmn:flowNodeRef', 'bpmn:laneSet'
    ];

    // Special case for bpmn:participant in a collaboration
    if (name === 'bpmn:participant' && jpath.includes('bpmn:collaboration')) {
      return true;
    }

    return arrayElements.includes(name);
  },
  textNodeName: "#text"
};

/**
 * Parse BPMN XML string into a JavaScript object
 * @param xmlString The BPMN XML string to parse
 * @returns The parsed XML as a JavaScript object
 * @throws Error if the XML is invalid
 */
export function parseBpmnXml(xmlString: string): any {
  // Validate the XML
  const validationResult = XMLValidator.validate(xmlString);
  if (validationResult !== true) {
    throw new Error(`Invalid XML: ${validationResult.err.msg}`);
  }

  // Parse the XML
  const parser = new XMLParser(parserOptions);
  return parser.parse(xmlString);
}

/**
 * Convert BPMN XML to the internal data model
 * @param xmlString The BPMN XML string to convert
 * @returns Array of BPMN elements in the internal data model format
 */
export function importBpmnXml(xmlString: string): BpmnElementUnion[] {
  try {
    // Parse the XML
    const parsedXml = parseBpmnXml(xmlString);

    // Map the XML to the internal data model
    return mapXmlToModel(parsedXml);
  } catch (error) {
    console.error('Error importing BPMN XML:', error);
    throw new Error(`Failed to import BPMN XML: ${error.message}`);
  }
}

/**
 * Extract the process definition from the parsed XML
 * @param parsedXml The parsed BPMN XML
 * @returns The process definition object
 */
export function extractProcessDefinition(parsedXml: any): any {
  // Check if we have a definitions element
  if (!parsedXml['bpmn:definitions']) {
    throw new Error('Invalid BPMN XML: Missing bpmn:definitions element');
  }

  const definitions = parsedXml['bpmn:definitions'];

  // Extract process
  if (definitions['bpmn:process']) {
    return definitions['bpmn:process'];
  }

  // If no process is found, check for collaboration
  if (definitions['bpmn:collaboration']) {
    // Collaboration might reference processes
    if (definitions['bpmn:process']) {
      return definitions['bpmn:process'];
    }
  }

  throw new Error('Invalid BPMN XML: No process or collaboration found');
}

/**
 * Extract the diagram information from the parsed XML
 * @param parsedXml The parsed BPMN XML
 * @returns The diagram information object
 */
export function extractDiagramInfo(parsedXml: any): any {
  // Check if we have a definitions element
  if (!parsedXml['bpmn:definitions']) {
    throw new Error('Invalid BPMN XML: Missing bpmn:definitions element');
  }

  const definitions = parsedXml['bpmn:definitions'];

  // Extract BPMNDiagram
  if (definitions['bpmndi:BPMNDiagram']) {
    return definitions['bpmndi:BPMNDiagram'];
  }

  throw new Error('Invalid BPMN XML: No diagram information found');
}
