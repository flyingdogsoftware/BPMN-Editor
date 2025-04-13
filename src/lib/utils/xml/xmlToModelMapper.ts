/**
 * XML to Model Mapper for BPMN 2.0
 *
 * This module provides the mapXmlToModel function, which converts parsed BPMN XML
 * objects into the internal BPMN model representation used by the editor.
 */

import type { BpmnElementUnion, ConnectionPoint, Position } from '$lib/models/bpmnElements';
import { calculateConnectionPoints } from '$lib/utils/connectionUtils';

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

  // --- Extract BPMN DI (Diagram Interchange) info ---
  // Find BPMNDiagram and BPMNPlane
  const diagram = definitions['bpmndi:BPMNDiagram'];
  const plane = diagram && diagram['bpmndi:BPMNPlane'];

  // Helper: always return array
  const toArray = (val: any) => (Array.isArray(val) ? val : val ? [val] : []);

  // Build shape lookup: bpmnElement id -> { x, y, width, height, labelBounds? }
  const shapeMap: Record<string, { x: number; y: number; width: number; height: number; labelBounds?: { x: number; y: number; width: number; height: number } }> = {};
  for (const shape of toArray(plane && plane['bpmndi:BPMNShape'])) {
    const bpmnElement = shape['@_bpmnElement'];
    const bounds = shape['dc:Bounds'];
    if (bpmnElement && bounds) {
      shapeMap[bpmnElement] = {
        x: Number(bounds['@_x']),
        y: Number(bounds['@_y']),
        width: Number(bounds['@_width']),
        height: Number(bounds['@_height']),
        labelBounds: shape['bpmndi:BPMNLabel'] && shape['bpmndi:BPMNLabel']['dc:Bounds']
          ? {
              x: Number(shape['bpmndi:BPMNLabel']['dc:Bounds']['@_x']),
              y: Number(shape['bpmndi:BPMNLabel']['dc:Bounds']['@_y']),
              width: Number(shape['bpmndi:BPMNLabel']['dc:Bounds']['@_width']),
              height: Number(shape['bpmndi:BPMNLabel']['dc:Bounds']['@_height']),
            }
          : undefined,
      };
    }
  }

  // Build edge lookup: bpmnElement id -> waypoints[]
  const edgeMap: Record<string, Array<{ x: number; y: number }>> = {};
  for (const edge of toArray(plane && plane['bpmndi:BPMNEdge'])) {
    const bpmnElement = edge['@_bpmnElement'];
    const waypoints = toArray(edge['di:waypoint']).map((wp: any) => ({
      x: Number(wp['@_x']),
      y: Number(wp['@_y']),
    }));
    if (bpmnElement && waypoints.length) {
      edgeMap[bpmnElement] = waypoints;
    }
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
        // Get graphical info if available
        const shape = shapeMap[task['@_id']];
        const mappedTask = {
          id: task['@_id'],
          type: "task",
          taskType: "task",
          label: task['@_name'] || '',
          x: shape ? shape.x : 0,
          y: shape ? shape.y : 0,
          width: shape ? shape.width : 120,
          height: shape ? shape.height : 60,
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
        const shape = shapeMap[event['@_id']];
        const mappedEvent = {
          id: event['@_id'],
          type: "event",
          eventType: "start",
          eventDefinition: "none",
          label: event['@_name'] || '',
          x: shape ? shape.x : 0,
          y: shape ? shape.y : 0,
          width: shape ? shape.width : 36,
          height: shape ? shape.height : 36,
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
        const shape = shapeMap[event['@_id']];
        const mappedEvent = {
          id: event['@_id'],
          type: "event",
          eventType: "end",
          eventDefinition: "none",
          label: event['@_name'] || '',
          x: shape ? shape.x : 0,
          y: shape ? shape.y : 0,
          width: shape ? shape.width : 36,
          height: shape ? shape.height : 36,
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
        const shape = shapeMap[gateway['@_id']];
        const mappedGateway = {
          id: gateway['@_id'],
          type: "gateway",
          gatewayType: "exclusive",
          label: gateway['@_name'] || '',
          x: shape ? shape.x : 0,
          y: shape ? shape.y : 0,
          width: shape ? shape.width : 50,
          height: shape ? shape.height : 50,
        } as import("$lib/models/bpmnElements").BpmnGateway;
        elements.push(mappedGateway);
      }
    }

    // Map sequence flows
    if (process['bpmn:sequenceFlow']) {
      const flows = Array.isArray(process['bpmn:sequenceFlow'])
        ? process['bpmn:sequenceFlow']
        : [process['bpmn:sequenceFlow']];

      // First pass: create all nodes before creating connections
      // This ensures all nodes exist when we calculate connection points

      // Second pass: create connections with proper connection points
      for (const flow of flows) {
        // Note: Connections are not nodes and do not have x/y/width/height
        // Get waypoints if available
        const waypoints = edgeMap[flow['@_id']];

        // Find source and target elements
        const sourceId = flow['@_sourceRef'];
        const targetId = flow['@_targetRef'];

        // Create the connection with empty connection points for now
        const mappedConnection = {
          id: flow['@_id'],
          type: "connection",
          connectionType: "sequence",
          sourceId: sourceId,
          targetId: targetId,
          sourcePointId: '',
          targetPointId: '',
          waypoints: waypoints ? waypoints : [],
          label: flow['@_name'] || '',
        } as import("$lib/models/bpmnElements").BpmnConnection;

        elements.push(mappedConnection);
      }
    }
  }

  // Post-processing: Assign connection points to connections
  console.log('Before assigning connection points:', JSON.parse(JSON.stringify(elements)));
  assignConnectionPoints(elements);
  console.log('After assigning connection points:', JSON.parse(JSON.stringify(elements)));

  return elements;
}

/**
 * Assign connection points to connections based on source and target elements
 * @param elements Array of BPMN elements
 */
function assignConnectionPoints(elements: BpmnElementUnion[]): void {
  // Process all connections
  for (const element of elements) {
    if (element.type === 'connection') {
      // Find source and target elements
      const sourceElement = elements.find(el => el.id === element.sourceId);
      const targetElement = elements.find(el => el.id === element.targetId);

      if (sourceElement && targetElement &&
          sourceElement.type !== 'connection' && targetElement.type !== 'connection') {

        // Calculate connection points for source and target
        const sourcePoints = calculateConnectionPoints(sourceElement);
        const targetPoints = calculateConnectionPoints(targetElement);

        if (sourcePoints.length > 0 && targetPoints.length > 0) {
          // Get the first and last waypoints to determine best connection points
          let firstWaypoint, lastWaypoint;

          if (element.waypoints && element.waypoints.length > 1) {
            // If we have waypoints, use the first and last ones
            firstWaypoint = element.waypoints[0];
            lastWaypoint = element.waypoints[element.waypoints.length - 1];
          } else {
            // If no waypoints, use the center of the target/source elements
            firstWaypoint = { x: targetElement.x + targetElement.width / 2, y: targetElement.y + targetElement.height / 2 };
            lastWaypoint = { x: sourceElement.x + sourceElement.width / 2, y: sourceElement.y + sourceElement.height / 2 };
          }

          console.log('Connection waypoints:', element.waypoints);
          console.log('Using firstWaypoint:', firstWaypoint, 'lastWaypoint:', lastWaypoint);

          // Find the best connection points based on waypoints or relative positions
          // For source, we use the last waypoint (or target center)
          // For target, we use the first waypoint (or source center)
          const bestSourcePoint = findBestConnectionPoint(sourcePoints, lastWaypoint);
          const bestTargetPoint = findBestConnectionPoint(targetPoints, firstWaypoint);

          // Assign the connection points
          element.sourcePointId = bestSourcePoint.id;
          element.targetPointId = bestTargetPoint.id;
        }
      }
    }
  }
}

/**
 * Find the best connection point based on target position
 * @param points Array of connection points
 * @param targetPosition Target position to connect to
 * @returns The best connection point
 */
function findBestConnectionPoint(points: ConnectionPoint[], targetPosition: Position): ConnectionPoint {
  // Find the closest connection point to the target position
  let bestPoint = points[0];
  let minDistance = Number.MAX_VALUE;

  for (const point of points) {
    const dx = point.x - targetPosition.x;
    const dy = point.y - targetPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < minDistance) {
      minDistance = distance;
      bestPoint = point;
    }
  }

  console.log('Found best connection point:', bestPoint, 'for target position:', targetPosition);
  return bestPoint;
}
