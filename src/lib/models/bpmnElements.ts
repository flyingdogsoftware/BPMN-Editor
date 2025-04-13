// BPMN Element Types
// This file defines all the BPMN 2.0 element types and their properties

// Element Types
export type ElementType =
  | 'task'
  | 'event'
  | 'gateway'
  | 'connection'
  | 'pool'
  | 'lane'
  | 'subprocess'
  | 'dataobject'
  | 'datastore'
  | 'textannotation'
  | 'group'
  | 'callactivity'
  | 'conversation'
  | 'choreography';

// Position interface
export interface Position {
  x: number;
  y: number;
}

// Size interface
export interface Size {
  width: number;
  height: number;
}

// Base interface for all BPMN elements
export interface BpmnElementBase {
  id: string;
  type: string;
  label: string;
  labelPosition?: Position;
  labelVisible?: boolean;
  documentation?: string; // Documentation for the element
}

// Base interface for all node elements (elements with position and size)
export interface BpmnNodeBase extends BpmnElementBase {
  x: number;
  y: number;
  width: number;
  height: number;
  lanes?: string[]; // For pools
  isHorizontal?: boolean; // For pools and lanes
  parentRef?: string; // For lanes
}

// Union type for all node elements (elements with position and size)
export type BpmnNode =
  | BpmnTask
  | BpmnSubProcess
  | BpmnCallActivity
  | BpmnEvent
  | BpmnGateway
  | BpmnDataObject
  | BpmnDataStore
  | BpmnTextAnnotation
  | BpmnGroup
  | BpmnPool
  | BpmnLane
  | BpmnConversation
  | BpmnChoreography;

// ---- ACTIVITIES ----

// Task Types
export type TaskType =
  | 'task'           // Generic task
  | 'user'           // User task
  | 'service'        // Service task
  | 'send'           // Send task
  | 'receive'        // Receive task
  | 'manual'         // Manual task
  | 'business-rule'  // Business rule task
  | 'script';        // Script task

// Task element
export interface BpmnTask extends BpmnNodeBase {
  type: 'task';
  taskType: TaskType;
  isExpanded?: boolean;
  isMultiInstance?: boolean;
  isLoop?: boolean;
  isCompensation?: boolean;
  implementation?: string; // Implementation details for the task
}

// Subprocess Types
export type SubProcessType =
  | 'embedded'       // Standard embedded subprocess
  | 'event'          // Event subprocess
  | 'transaction'    // Transaction subprocess
  | 'adhoc';         // Ad-hoc subprocess

// Subprocess element
export interface BpmnSubProcess extends BpmnNodeBase {
  type: 'subprocess';
  subProcessType: SubProcessType;
  isExpanded: boolean;
  isMultiInstance?: boolean;
  isLoop?: boolean;
  isCompensation?: boolean;
  children?: string[]; // IDs of child elements
  triggeredByEvent?: boolean; // For event subprocesses
}

// Call Activity element
export interface BpmnCallActivity extends BpmnNodeBase {
  type: 'callactivity';
  calledElement: string;
  isMultiInstance?: boolean;
  isLoop?: boolean;
  isCompensation?: boolean;
}

// ---- EVENTS ----

// Event Types
export type EventType =
  | 'start'
  | 'intermediate-catch'
  | 'intermediate-throw'
  | 'end'
  | 'boundary';

// Event Definitions
export type EventDefinition =
  | 'none'
  | 'message'
  | 'timer'
  | 'error'
  | 'escalation'
  | 'cancel'
  | 'compensation'
  | 'conditional'
  | 'link'
  | 'signal'
  | 'terminate'
  | 'multiple'
  | 'parallel-multiple';

// Event element
export interface BpmnEvent extends BpmnNodeBase {
  type: 'event';
  eventType: EventType;
  eventDefinition: EventDefinition;
  isInterrupting?: boolean; // For start events in subprocesses and boundary events
  attachedToRef?: string;   // For boundary events, ID of the attached element
  cancelActivity?: boolean; // For boundary events
  parallelMultiple?: boolean; // For parallel multiple events
}

// ---- GATEWAYS ----

// Gateway Types
export type GatewayType =
  | 'exclusive'      // XOR gateway
  | 'inclusive'      // OR gateway
  | 'parallel'       // AND gateway
  | 'complex'        // Complex gateway
  | 'event-based'    // Event-based gateway
  | 'parallel-event-based'; // Parallel event-based gateway

// Gateway element
export interface BpmnGateway extends BpmnNodeBase {
  type: 'gateway';
  gatewayType: GatewayType;
  isInstantiating?: boolean; // For event-based gateways
  defaultFlow?: string; // ID of the default sequence flow
}

// ---- DATA OBJECTS ----

// Data Object element
export interface BpmnDataObject extends BpmnNodeBase {
  type: 'dataobject';
  isCollection?: boolean;
  state?: string;
  isInput?: boolean; // Whether this is a data input
  isOutput?: boolean; // Whether this is a data output
}

// Data Store element
export interface BpmnDataStore extends BpmnNodeBase {
  type: 'datastore';
  isCollection?: boolean;
  capacity?: number; // Optional capacity of the data store
  isUnlimited?: boolean; // Whether the data store has unlimited capacity
}

// ---- ARTIFACTS ----

// Text Annotation element
export interface BpmnTextAnnotation extends BpmnNodeBase {
  type: 'textannotation';
  text: string;
  textFormat?: string; // Format of the text (e.g., 'text/plain')
}

// Group element
export interface BpmnGroup extends BpmnNodeBase {
  type: 'group';
  categoryValue?: string;
}

// ---- SWIMLANES ----
// See the full definitions at the end of this file

// ---- CONNECTIONS ----

// Connection Types
export type ConnectionType =
  | 'sequence'       // Sequence flow
  | 'message'        // Message flow
  | 'association'    // Association
  | 'dataassociation' // Data association
  | 'conversation';  // Conversation link

// Connection Point Position
export type AnchorPosition = 'top' | 'right' | 'bottom' | 'left';

// Connection Point
export interface ConnectionPoint {
  id: string;
  elementId: string;
  position: AnchorPosition;
  x: number;
  y: number;
}

// Association Direction
export type AssociationDirection =
  | 'none'          // No direction
  | 'one'           // Source to target
  | 'both';         // Bidirectional

// Connection element
export interface BpmnConnection extends BpmnElementBase {
  type: 'connection';
  connectionType: ConnectionType;
  sourceId: string;
  targetId: string;
  sourcePointId?: string;
  targetPointId?: string;
  waypoints: Array<Position>;
  condition?: string;
  isDefault?: boolean;
  isConditional?: boolean;
  isSelected?: boolean;
  associationDirection?: AssociationDirection; // For associations
}

// Conversation Types
export type ConversationType =
  | 'conversation'   // Regular conversation
  | 'sub-conversation' // Sub-conversation
  | 'call-conversation'; // Call conversation

// Conversation element
export interface BpmnConversation extends BpmnNodeBase {
  type: 'conversation';
  conversationType: ConversationType;
  isMultiInstance?: boolean;
}

// Choreography Types
export type ChoreographyType =
  | 'task'           // Choreography task
  | 'subprocess'     // Choreography subprocess
  | 'call-choreography'; // Call choreography

// Choreography element
export interface BpmnChoreography extends BpmnNodeBase {
  type: 'choreography';
  choreographyType: ChoreographyType;
  participants: string[]; // IDs of participants
  initiatingParticipantRef?: string; // ID of the initiating participant
  isMultiInstance?: boolean;
}

// Pool element
export interface BpmnPool extends BpmnNodeBase {
  type: 'pool';
  isHorizontal: boolean;
  lanes: string[]; // IDs of lanes contained in this pool
  processRef?: string; // Reference to the process this pool represents
  isExecutable?: boolean; // Whether the process is executable
}

// Lane element
export interface BpmnLane extends BpmnNodeBase {
  type: 'lane';
  isHorizontal: boolean;
  parentRef: string; // ID of the parent pool
  flowNodeRefs: string[]; // IDs of flow nodes contained in this lane
  heightPercentage?: number; // Height as percentage of parent pool (default: divided equally)
  widthPercentage?: number; // Width as percentage of parent pool for vertical pools
}

// Union type for all BPMN elements
export type BpmnElementUnion =
  | BpmnTask
  | BpmnSubProcess
  | BpmnCallActivity
  | BpmnEvent
  | BpmnGateway
  | BpmnDataObject
  | BpmnDataStore
  | BpmnTextAnnotation
  | BpmnGroup
  | BpmnPool
  | BpmnLane
  | BpmnConversation
  | BpmnChoreography
  | BpmnConnection;

// Type guard to check if an element is a node (has position and size)
export function isNode(element: BpmnElementUnion): element is Exclude<BpmnElementUnion, BpmnConnection> {
  return element.type !== 'connection';
}
