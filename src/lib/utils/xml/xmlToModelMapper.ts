/**
 * XML to Model Mapper for BPMN 2.0
 *
 * This module provides the mapXmlToModel function, which converts parsed BPMN XML
 * objects into the internal BPMN model representation used by the editor.
 */

import type { BpmnElementUnion, BpmnPool, BpmnLane, ConnectionPoint, Position } from '$lib/models/bpmnElements';
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

  // Build shape lookup: bpmnElement id -> { x, y, width, height, labelBounds?, isHorizontal? }
  const shapeMap: Record<string, {
    x: number;
    y: number;
    width: number;
    height: number;
    isHorizontal?: boolean;
    labelBounds?: { x: number; y: number; width: number; height: number }
  }> = {};

  // Extract all shapes from the diagram
  const shapes = toArray(plane && plane['bpmndi:BPMNShape']);
  console.log(`Found ${shapes.length} shapes in the diagram`);

  // Debug the raw shapes
  console.log('Raw shapes:', JSON.stringify(shapes, null, 2));

  // Debug the raw collaboration
  if (definitions['bpmn:collaboration']) {
    console.log('Raw collaboration:', JSON.stringify(definitions['bpmn:collaboration'], null, 2));
  }

  // Create a map of element IDs to their normalized versions
  const normalizedIdMap: Record<string, string> = {};

  // Special case for the example XML with Participant_1, Participant_2, Lane_1, Lane_2
  // These IDs might not be in the shape map with these exact names
  for (const shape of shapes) {
    const bpmnElement = shape['@_bpmnElement'];
    if (bpmnElement) {
      // Check if this is a participant or lane shape
      if (bpmnElement.includes('Participant') || bpmnElement.includes('Lane')) {
        // Map common IDs to this shape's ID
        if (bpmnElement.includes('Participant')) {
          // Extract the participant number if possible
          const match = bpmnElement.match(/Participant[_]?(\d+)/i);
          if (match && match[1]) {
            const num = match[1];
            normalizedIdMap[`Participant_${num}`] = bpmnElement;
            normalizedIdMap[`Participant${num}`] = bpmnElement;
          }
        } else if (bpmnElement.includes('Lane')) {
          // Extract the lane number if possible
          const match = bpmnElement.match(/Lane[_]?(\d+)/i);
          if (match && match[1]) {
            const num = match[1];
            normalizedIdMap[`Lane_${num}`] = bpmnElement;
            normalizedIdMap[`Lane${num}`] = bpmnElement;
          }
        }
      }
    }
  }

  // First pass: process all shapes
  for (const shape of shapes) {
    const bpmnElement = shape['@_bpmnElement'];
    const bounds = shape['dc:Bounds'];
    if (bpmnElement && bounds) {
      // Check if this is a pool or lane by looking at the element ID pattern
      // Note: Some BPMN tools use Participant_X and Lane_X, others just use the IDs directly
      const isPoolOrLane = bpmnElement.includes('Participant') ||
                          bpmnElement.includes('Lane') ||
                          bpmnElement === 'Participant_1' ||
                          bpmnElement === 'Participant_2' ||
                          bpmnElement === 'Lane_1' ||
                          bpmnElement === 'Lane_2';

      // Log extra information for pools and lanes
      if (isPoolOrLane) {
        console.log(`Found shape for ${bpmnElement}:`, JSON.stringify(shape, null, 2));

        // Store normalized versions of the ID
        if (bpmnElement.includes('Participant')) {
          normalizedIdMap[bpmnElement.replace('Participant_', 'Participant')] = bpmnElement;
          normalizedIdMap[bpmnElement.replace('Participant', 'Participant_')] = bpmnElement;
          normalizedIdMap[`Participant_${bpmnElement.replace('Participant_', '')}`] = bpmnElement;
        } else if (bpmnElement.includes('Lane')) {
          normalizedIdMap[bpmnElement.replace('Lane_', 'Lane')] = bpmnElement;
          normalizedIdMap[bpmnElement.replace('Lane', 'Lane_')] = bpmnElement;
          normalizedIdMap[`Lane_${bpmnElement.replace('Lane_', '')}`] = bpmnElement;
        }
      }

      shapeMap[bpmnElement] = {
        x: Number(bounds['@_x']),
        y: Number(bounds['@_y']),
        width: Number(bounds['@_width']),
        height: Number(bounds['@_height']),
        // Check if isHorizontal attribute exists
        isHorizontal: shape['@_isHorizontal'] !== undefined ? Boolean(shape['@_isHorizontal']) : true,
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

  // Log all shapes for pools and lanes
  console.log('Shape map for pools and lanes:');
  for (const [id, shape] of Object.entries(shapeMap)) {
    if (id.includes('Participant') ||
        id.includes('Lane') ||
        id === 'Participant_1' ||
        id === 'Participant_2' ||
        id === 'Lane_1' ||
        id === 'Lane_2') {
      console.log(`- ${id}:`, JSON.stringify(shape, null, 2));
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

  // First, check for collaboration (which contains pools)
  if (definitions['bpmn:collaboration']) {
    console.log('Found collaboration:', definitions['bpmn:collaboration']);

    // Special case for the XML structure provided by the user
    // Sometimes the collaboration is an array with a single object that has a bpmn:participant property
    if (Array.isArray(definitions['bpmn:collaboration']) &&
        definitions['bpmn:collaboration'].length === 1 &&
        definitions['bpmn:collaboration'][0]['bpmn:participant']) {
      console.log('Found special case collaboration structure');
      const specialParticipants = toArray(definitions['bpmn:collaboration'][0]['bpmn:participant']);
      console.log('Special participants:', JSON.stringify(specialParticipants, null, 2));
    }

    // The collaboration might be an array or a single object
    const collaborations = toArray(definitions['bpmn:collaboration']);
    console.log(`Found ${collaborations.length} collaborations`);

    // Process each collaboration (usually just one)
    let allParticipants: any[] = [];

    for (const collaboration of collaborations) {
      // Debug the raw collaboration structure
      console.log('Processing collaboration:', JSON.stringify(collaboration, null, 2));

      // Check if participants exist in the collaboration
      if (!collaboration['bpmn:participant']) {
        console.error('No participants found in this collaboration');
        continue;
      }

      // Extract participants, ensuring we get an array
      const participants = toArray(collaboration['bpmn:participant']);
      console.log(`Found ${participants.length} participants in this collaboration:`,
                 JSON.stringify(participants, null, 2));

      // Add these participants to our collection
      allParticipants = allParticipants.concat(participants);
    }

    // Use all participants from all collaborations
    const participants = allParticipants;
    console.log('All participants:', JSON.stringify(participants, null, 2));

    // If we have no participants, try to extract them directly from the XML
    if (participants.length === 0) {
      console.log('No participants found in collaborations, trying direct extraction');

      // Try to find participants directly in the XML
      for (const collab of collaborations) {
        if (typeof collab === 'object') {
          for (const key in collab) {
            if (key.includes('participant') || key.includes('Participant')) {
              console.log(`Found potential participants in key ${key}:`, collab[key]);
              const extractedParticipants = toArray(collab[key]);
              allParticipants = allParticipants.concat(extractedParticipants);
            }
          }
        }
      }

      // Update participants after direct extraction
      if (allParticipants.length > 0) {
        console.log('Extracted participants directly:', JSON.stringify(allParticipants, null, 2));
      }
    }

    // If we have participants but no shapes for them, create default shapes
    if (participants.length > 0) {
      for (const participant of participants) {
        const participantId = participant['@_id'];

        // Check if we have a shape for this participant
        let hasShape = false;
        for (const id of Object.keys(shapeMap)) {
          if (id === participantId || normalizedIdMap[participantId] === id) {
            hasShape = true;
            break;
          }
        }

        // If no shape found, create a default one
        if (!hasShape) {
          console.log(`No shape found for participant ${participantId}, creating default shape`);

          // Create a default shape for this participant
          shapeMap[participantId] = {
            x: 100,
            y: 100 + (Object.keys(shapeMap).length * 20), // Offset each new pool to avoid overlap
            width: 600,
            height: 200,
            isHorizontal: true
          };

          // Add to normalized ID map
          normalizedIdMap[`Participant_${participantId.replace('Participant_', '')}`] = participantId;
          normalizedIdMap[participantId.replace('Participant_', 'Participant')] = participantId;
          normalizedIdMap[participantId.replace('Participant', 'Participant_')] = participantId;
        }
      }
    }

    // Map for storing process IDs to their corresponding pool IDs
    const processToPoolMap: Record<string, string> = {};

    // Process all participants (pools)
    for (const participant of participants) {
      const poolId = participant['@_id'];
      const processRef = participant['@_processRef'];

      console.log(`Processing participant: ${poolId} with processRef: ${processRef}`);

      // Store the process-to-pool mapping
      if (processRef) {
        processToPoolMap[processRef] = poolId;
        console.log(`Mapped process ${processRef} to pool ${poolId}`);
      }

      // Try to find the shape for this pool
      let shape = shapeMap[poolId];

      // If shape not found, try using the normalized ID map
      if (!shape && normalizedIdMap[poolId]) {
        const normalizedId = normalizedIdMap[poolId];
        console.log(`Shape not found for ${poolId}, using normalized ID ${normalizedId}`);
        shape = shapeMap[normalizedId];
      }

      // If still not found, try alternative IDs that might be used in the diagram
      if (!shape) {
        // Some BPMN tools use different ID formats for the same element
        const alternativeIds = [
          `Participant_${poolId.replace('Participant_', '')}`,
          poolId.replace('Participant_', 'Participant'),
          poolId.replace('Participant', 'Participant_')
        ];

        for (const altId of alternativeIds) {
          if (shapeMap[altId]) {
            console.log(`Shape not found for ${poolId}, using alternative ID ${altId}`);
            shape = shapeMap[altId];
            break;
          }
        }
      }

      console.log('Processing pool:', JSON.stringify({ poolId, processRef, shape }, null, 2));

      // Create the pool, even if no shape is found (we'll use default values)
      let poolX = 100;
      let poolY = 100;
      let poolWidth = 600;
      let poolHeight = 200;
      let isHorizontal = true;

      if (shape) {
        poolX = shape.x;
        poolY = shape.y;
        poolWidth = shape.width;
        poolHeight = shape.height;
        isHorizontal = shape.isHorizontal !== undefined ? shape.isHorizontal : true;
      } else {
        console.warn(`No shape found for pool ${poolId}, using default values`);
      }

      // Create the pool
      const pool: BpmnPool = {
        id: poolId,
        type: 'pool' as const,
        label: participant['@_name'] || 'Pool',
        x: poolX,
        y: poolY,
        width: poolWidth,
        height: poolHeight,
        isHorizontal: isHorizontal,
        lanes: [], // Will be populated when we process lanes
        processRef: processRef || ''
      };

      console.log('Created pool:', JSON.stringify(pool, null, 2));
      elements.push(pool);
    }

    // Now process all processes to find lanes
    console.log('Process to pool map:', JSON.stringify(processToPoolMap, null, 2));
    console.log('Processes:', JSON.stringify(definitions['bpmn:process'], null, 2));

    // Handle processes - either as array or single object
    const processes = Array.isArray(definitions['bpmn:process'])
      ? definitions['bpmn:process']
      : [definitions['bpmn:process']].filter(Boolean);

    console.log(`Found ${processes.length} processes to process`);

    // Process each process that has a corresponding pool
    for (const process of processes) {
      const processId = process['@_id'];
      console.log(`Processing process ${processId}`);

      // Check if this process is referenced by a pool
      let poolId = processToPoolMap[processId];

      // If no direct match, try to find a pool that references this process
      if (!poolId) {
        console.log(`No direct pool reference found for process ${processId}, checking all pools...`);

        // Look through all pools to find one that might reference this process
        const poolElements = elements.filter(el => el.type === 'pool') as BpmnPool[];
        for (const pool of poolElements) {
          if (pool.processRef === processId) {
            poolId = pool.id;
            console.log(`Found pool ${poolId} referencing process ${processId}`);
            break;
          }
        }

        // If still no pool found, check if there's a participant in the XML that references this process
        if (!poolId && definitions['bpmn:collaboration']) {
          const collaboration = definitions['bpmn:collaboration'];
          const participants = toArray(collaboration['bpmn:participant']);

          for (const participant of participants) {
            if (participant['@_processRef'] === processId) {
              // We found a participant that references this process, but we don't have a pool for it
              // This could happen if the shape information is missing
              const participantId = participant['@_id'];
              console.log(`Found participant ${participantId} referencing process ${processId}, but no shape information`);

              // Check if we have any shape information for this participant
              const shape = shapeMap[participantId];
              if (!shape) {
                console.log(`No shape information found for participant ${participantId}, creating default shape`);

                // Create a default shape for this participant
                shapeMap[participantId] = {
                  x: 100,
                  y: 100 + (elements.length * 20), // Offset each new pool to avoid overlap
                  width: 600,
                  height: 200,
                  isHorizontal: true
                };

                // Now create the pool
                const pool: BpmnPool = {
                  id: participantId,
                  type: 'pool' as const,
                  label: participant['@_name'] || 'Pool',
                  x: shapeMap[participantId].x,
                  y: shapeMap[participantId].y,
                  width: shapeMap[participantId].width,
                  height: shapeMap[participantId].height,
                  isHorizontal: true,
                  lanes: [],
                  processRef: processId
                };

                console.log(`Created default pool for participant ${participantId}:`, JSON.stringify(pool, null, 2));
                elements.push(pool);

                // Update the process-to-pool map
                processToPoolMap[processId] = participantId;
                poolId = participantId;
              }
            }
          }
        }
      }

      if (!poolId) {
        console.log(`Process ${processId} is not referenced by any pool, skipping lane processing`);
        continue;
      }

      const pool = elements.find(el => el.id === poolId && el.type === 'pool') as BpmnPool | undefined;
      if (!pool) {
        console.error(`Pool ${poolId} not found for process ${processId}, skipping lane processing`);
        continue;
      }

      console.log(`Found pool ${poolId} for process ${processId}`);

      // Handle lane sets
      if (process['bpmn:laneSet']) {
        console.log('Process has lane set:', JSON.stringify(process['bpmn:laneSet'], null, 2));
        const laneSets = toArray(process['bpmn:laneSet']);

        for (const laneSet of laneSets) {
          console.log('Processing lane set:', JSON.stringify(laneSet, null, 2));

          // Handle different lane formats
          let lanes = [];
          if (laneSet['bpmn:lane']) {
            lanes = toArray(laneSet['bpmn:lane']);
          } else if (Array.isArray(laneSet)) {
            // Sometimes the lane set is directly an array of lanes
            lanes = laneSet;
          }

          console.log(`Found ${lanes.length} lanes in lane set`);

          // First pass: create all lanes to ensure they all exist before positioning
          const createdLanes: BpmnLane[] = [];

          for (const lane of lanes) {
            const laneId = lane['@_id'];

            // Try to find the shape for this lane
            let shape = shapeMap[laneId];

            // If shape not found, try using the normalized ID map
            if (!shape && normalizedIdMap[laneId]) {
              const normalizedId = normalizedIdMap[laneId];
              console.log(`Shape not found for ${laneId}, using normalized ID ${normalizedId}`);
              shape = shapeMap[normalizedId];
            }

            // If still not found, try alternative IDs that might be used in the diagram
            if (!shape) {
              // Some BPMN tools use different ID formats for the same element
              const alternativeIds = [
                `Lane_${laneId.replace('Lane_', '')}`,
                laneId.replace('Lane_', 'Lane'),
                laneId.replace('Lane', 'Lane_')
              ];

              for (const altId of alternativeIds) {
                if (shapeMap[altId]) {
                  console.log(`Shape not found for ${laneId}, using alternative ID ${altId}`);
                  shape = shapeMap[altId];
                  break;
                }
              }
            }

            console.log('Processing lane:', JSON.stringify({ laneId, shape }, null, 2));

            // Get flow node references
            const flowNodeRefs: string[] = [];
            if (lane['bpmn:flowNodeRef']) {
              // Handle the case where flowNodeRef is directly a string
              if (typeof lane['bpmn:flowNodeRef'] === 'string') {
                flowNodeRefs.push(lane['bpmn:flowNodeRef']);
                console.log('Direct string flowNodeRef:', lane['bpmn:flowNodeRef']);
              } else {
                const refs = toArray(lane['bpmn:flowNodeRef']);
                console.log('Flow node refs raw:', JSON.stringify(refs, null, 2));

                for (const ref of refs) {
                  if (typeof ref === 'string') {
                    flowNodeRefs.push(ref);
                  } else if (ref['#text']) {
                    flowNodeRefs.push(ref['#text']);
                  } else if (typeof ref === 'object') {
                    // Try to extract the text content directly
                    const textContent = Object.values(ref).find(val => typeof val === 'string');
                    if (textContent) {
                      flowNodeRefs.push(textContent as string);
                    } else {
                      console.warn('Could not extract text from flowNodeRef:', ref);
                    }
                  } else {
                    console.warn('Unexpected flowNodeRef format:', ref);
                  }
                }
              }
              console.log('Processed flow node refs:', flowNodeRefs);
            }

            // Create the lane, even if no shape is found (we'll use default values)
            let laneX = pool.x + 30; // Default: account for pool label area
            let laneY = pool.y + (createdLanes.length * 100); // Default: stack lanes vertically
            let laneWidth = pool.width - 30; // Default: pool width minus label area
            let laneHeight = 100; // Default height

            if (shape) {
              laneX = shape.x;
              laneY = shape.y;
              laneWidth = shape.width;
              laneHeight = shape.height;
            } else {
              console.warn(`No shape found for lane ${laneId}, using default values`);
            }

            // Create the lane with original coordinates from the shape
            // We'll adjust positions in a second pass
            const mappedLane: BpmnLane = {
              id: laneId,
              type: 'lane' as const,
              label: lane['@_name'] || 'Lane',
              x: laneX,
              y: laneY,
              width: laneWidth,
              height: laneHeight,
              isHorizontal: pool.isHorizontal,
              parentRef: poolId,
              flowNodeRefs: flowNodeRefs
            };

            console.log('Created lane:', JSON.stringify(mappedLane, null, 2));
            elements.push(mappedLane);
            createdLanes.push(mappedLane);

            // Add lane to pool's lanes array
            pool.lanes.push(laneId);
          }

          // Second pass: adjust lane positions based on pool orientation and size
          if (createdLanes.length > 0) {
            console.log(`Adjusting positions for ${createdLanes.length} lanes in pool ${poolId}`);

            if (pool.isHorizontal) {
              // For horizontal pools, sort lanes by y-coordinate
              createdLanes.sort((a, b) => a.y - b.y);

              // Calculate lane height based on pool height and number of lanes
              const laneHeight = pool.height / createdLanes.length;

              // Adjust each lane's position and size
              createdLanes.forEach((lane, index) => {
                const laneElement = elements.find(el => el.id === lane.id && el.type === 'lane') as BpmnLane;
                if (laneElement) {
                  laneElement.x = pool.x + 30; // Account for pool label area (30px)
                  laneElement.y = pool.y + (index * laneHeight);
                  laneElement.width = pool.width - 30; // Pool width minus label area
                  laneElement.height = laneHeight;
                  console.log(`Adjusted horizontal lane ${lane.id} position to:`,
                    JSON.stringify({ x: laneElement.x, y: laneElement.y, width: laneElement.width, height: laneElement.height }, null, 2));
                }
              });
            } else {
              // For vertical pools, sort lanes by x-coordinate
              createdLanes.sort((a, b) => a.x - b.x);

              // Calculate lane width based on pool width and number of lanes
              const laneWidth = pool.width / createdLanes.length;

              // Adjust each lane's position and size
              createdLanes.forEach((lane, index) => {
                const laneElement = elements.find(el => el.id === lane.id && el.type === 'lane') as BpmnLane;
                if (laneElement) {
                  laneElement.x = pool.x + (index * laneWidth);
                  laneElement.y = pool.y + 30; // Account for pool label area (30px)
                  laneElement.width = laneWidth;
                  laneElement.height = pool.height - 30; // Pool height minus label area
                  console.log(`Adjusted vertical lane ${lane.id} position to:`,
                    JSON.stringify({ x: laneElement.x, y: laneElement.y, width: laneElement.width, height: laneElement.height }, null, 2));
                }
              });
            }
          }
        }
      } else {
        console.log(`Process ${processId} has no lane sets`);
      }
    }
  } else {
    console.log('No collaboration found in the BPMN XML');
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

  // Post-processing: Validate and fix pool-lane relationships
  console.log('Validating pool-lane relationships...');
  validatePoolLaneRelationships(elements);

  // Post-processing: Assign connection points to connections
  console.log('Before assigning connection points:', JSON.parse(JSON.stringify(elements)));
  assignConnectionPoints(elements);
  console.log('After assigning connection points:', JSON.parse(JSON.stringify(elements)));

  return elements;
}

/**
 * Validate and fix pool-lane relationships
 * @param elements Array of BPMN elements
 */
function validatePoolLaneRelationships(elements: BpmnElementUnion[]): void {
  console.log('Starting pool-lane relationship validation');

  // Get all pools and lanes
  const pools = elements.filter(el => el.type === 'pool') as BpmnPool[];
  const lanes = elements.filter(el => el.type === 'lane') as BpmnLane[];

  console.log(`Found ${pools.length} pools and ${lanes.length} lanes`);

  // Check each pool
  for (const pool of pools) {
    console.log(`Validating pool ${pool.id} (${pool.label})`);

    // Ensure pool has a lanes array
    if (!pool.lanes) {
      console.warn(`Pool ${pool.id} has no lanes array, creating empty array`);
      pool.lanes = [];
    }

    // Check if all referenced lanes exist
    const missingLanes: string[] = [];
    for (const laneId of pool.lanes) {
      const lane = lanes.find(l => l.id === laneId);
      if (!lane) {
        console.warn(`Lane ${laneId} referenced by pool ${pool.id} not found, will be removed from pool`);
        missingLanes.push(laneId);
      }
    }

    // Remove missing lanes from pool's lanes array
    if (missingLanes.length > 0) {
      pool.lanes = pool.lanes.filter(id => !missingLanes.includes(id));
    }

    // Check for lanes that should be in this pool but aren't referenced
    for (const lane of lanes) {
      if (lane.parentRef === pool.id && !pool.lanes.includes(lane.id)) {
        console.warn(`Lane ${lane.id} references pool ${pool.id} but is not in pool's lanes array, adding it`);
        pool.lanes.push(lane.id);
      }
    }

    // Adjust lane positions if needed
    if (pool.lanes.length > 0) {
      const poolLanes = lanes.filter(lane => pool.lanes.includes(lane.id));

      // Sort lanes by y position for horizontal pools, or x position for vertical pools
      if (pool.isHorizontal) {
        poolLanes.sort((a, b) => a.y - b.y);
      } else {
        poolLanes.sort((a, b) => a.x - b.x);
      }

      // Adjust lane positions and sizes to fit within the pool
      // and ensure they don't overlap
      if (pool.isHorizontal) {
        // For horizontal pools, lanes should be stacked vertically
        const laneHeight = pool.height / poolLanes.length;
        poolLanes.forEach((lane, index) => {
          lane.x = pool.x + 30; // Account for pool label area
          lane.y = pool.y + (index * laneHeight);
          lane.width = pool.width - 30;
          lane.height = laneHeight;
          lane.isHorizontal = true;
        });
      } else {
        // For vertical pools, lanes should be arranged horizontally
        const laneWidth = pool.width / poolLanes.length;
        poolLanes.forEach((lane, index) => {
          lane.x = pool.x + (index * laneWidth);
          lane.y = pool.y + 30; // Account for pool label area
          lane.width = laneWidth;
          lane.height = pool.height - 30;
          lane.isHorizontal = false;
        });
      }
    }
  }

  // Check each lane
  for (const lane of lanes) {
    // Ensure lane has a parentRef
    if (!lane.parentRef) {
      console.warn(`Lane ${lane.id} has no parentRef, trying to find a matching pool`);

      // Try to find a pool that includes this lane
      const matchingPool = pools.find(pool => pool.lanes && pool.lanes.includes(lane.id));
      if (matchingPool) {
        console.log(`Found matching pool ${matchingPool.id} for lane ${lane.id}, setting parentRef`);
        lane.parentRef = matchingPool.id;
      } else {
        console.error(`Could not find a matching pool for lane ${lane.id}, this lane may not render correctly`);
      }
    }

    // Ensure lane has flowNodeRefs array
    if (!lane.flowNodeRefs) {
      lane.flowNodeRefs = [];
    }
  }

  console.log('Pool-lane relationship validation complete');
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
