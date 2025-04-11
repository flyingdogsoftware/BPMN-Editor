// BPMN Element Types
export type ElementType = 'task' | 'event' | 'gateway' | 'connection';

// Connection Types
export type ConnectionType = 'sequence' | 'message' | 'association';

// Base interface for all BPMN elements
export interface BpmnElement {
  id: string;
  type: ElementType;
  label: string;
}

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

// Node element (task, event, gateway)
export interface BpmnNode extends BpmnElement, Position, Size {
  // Additional properties specific to nodes
}

// Task element
export interface BpmnTask extends BpmnNode {
  type: 'task';
  taskType?: 'user' | 'service' | 'script' | 'manual' | 'business-rule';
}

// Event element
export interface BpmnEvent extends BpmnNode {
  type: 'event';
  eventType?: 'start' | 'end' | 'intermediate';
  eventDefinition?: 'message' | 'timer' | 'error' | 'signal' | 'none';
}

// Gateway element
export interface BpmnGateway extends BpmnNode {
  type: 'gateway';
  gatewayType?: 'exclusive' | 'parallel' | 'inclusive' | 'event-based';
}

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
export interface BpmnConnection extends BpmnElement {
  type: 'connection';
  sourceId: string;
  targetId: string;
  sourcePointId?: string;
  targetPointId?: string;
  connectionType: ConnectionType;
  waypoints?: Position[];
  isSelected?: boolean;
  label?: string;
  condition?: string;
}

// Union type for all BPMN elements
export type BpmnElementUnion = BpmnTask | BpmnEvent | BpmnGateway | BpmnConnection;
