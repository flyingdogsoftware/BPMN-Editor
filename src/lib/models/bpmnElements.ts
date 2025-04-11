// BPMN Element Types
// This file defines all the BPMN 2.0 element types and their properties

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
  label: string;
  labelPosition?: Position;
  labelVisible?: boolean;
}

// Base interface for all node elements (elements with position and size)
export interface BpmnNode extends BpmnElementBase {
  x: number;
  y: number;
  width: number;
  height: number;
}

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
export interface BpmnTask extends BpmnNode {
  type: 'task';
  taskType: TaskType;
  isExpanded?: boolean;
  isMultiInstance?: boolean;
  isLoop?: boolean;
  isCompensation?: boolean;
}

// Subprocess element
export interface BpmnSubProcess extends BpmnNode {
  type: 'subprocess';
  isExpanded: boolean;
  isMultiInstance?: boolean;
  isLoop?: boolean;
  isCompensation?: boolean;
  children?: string[]; // IDs of child elements
}

// Call Activity element
export interface BpmnCallActivity extends BpmnNode {
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
  | 'intermediate'
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
export interface BpmnEvent extends BpmnNode {
  type: 'event';
  eventType: EventType;
  eventDefinition: EventDefinition;
  isInterrupting?: boolean; // For start events in subprocesses and boundary events
  attachedToRef?: string;   // For boundary events, ID of the attached element
}

// ---- GATEWAYS ----

// Gateway Types
export type GatewayType =
  | 'exclusive'      // XOR gateway
  | 'inclusive'      // OR gateway
  | 'parallel'       // AND gateway
  | 'complex'        // Complex gateway
  | 'event-based';   // Event-based gateway

// Gateway element
export interface BpmnGateway extends BpmnNode {
  type: 'gateway';
  gatewayType: GatewayType;
  isInstantiating?: boolean; // For event-based gateways
}

// ---- DATA OBJECTS ----

// Data Object element
export interface BpmnDataObject extends BpmnNode {
  type: 'dataobject';
  isCollection?: boolean;
  state?: string;
}

// Data Store element
export interface BpmnDataStore extends BpmnNode {
  type: 'datastore';
  isCollection?: boolean;
}

// ---- ARTIFACTS ----

// Text Annotation element
export interface BpmnTextAnnotation extends BpmnNode {
  type: 'textannotation';
  text: string;
}

// Group element
export interface BpmnGroup extends BpmnNode {
  type: 'group';
  categoryValue?: string;
}

// ---- SWIMLANES ----

// Pool element
export interface BpmnPool extends BpmnNode {
  type: 'pool';
  isHorizontal: boolean;
  participants?: string[]; // IDs of lanes
}

// Lane element
export interface BpmnLane extends BpmnNode {
  type: 'lane';
  isHorizontal: boolean;
  parentRef?: string; // ID of parent pool or lane
}

// ---- CONNECTIONS ----

// Connection Types
export type ConnectionType =
  | 'sequence'       // Sequence flow
  | 'message'        // Message flow
  | 'association'    // Association
  | 'dataassociation'; // Data association

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

// Connection element
export interface BpmnConnection extends BpmnElementBase {
  type: 'connection';
  connectionType: ConnectionType;
  sourceId: string;
  targetId: string;
  sourcePointId: string;
  targetPointId: string;
  waypoints: Array<Position>;
  condition?: string;
  isDefault?: boolean;
  isConditional?: boolean;
  isSelected?: boolean;
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
  | BpmnConnection;
