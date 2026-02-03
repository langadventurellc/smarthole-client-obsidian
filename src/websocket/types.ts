/**
 * SmartHole WebSocket Protocol Types
 *
 * Type definitions for all SmartHole WebSocket protocol messages.
 * Based on protocol specification: reference-docs/smarthole-client-docs/protocol-reference.md
 */

// =============================================================================
// Registration (Client → Server)
// =============================================================================

export interface RegistrationPayload {
  /** Unique identifier for the client (required) */
  name: string;
  /** Natural language description for LLM routing (required) */
  description: string;
  /** Client version for debugging (optional) */
  version?: string;
  /** Structured capability hints (optional) */
  capabilities?: string[];
}

export interface RegistrationMessage {
  type: "registration";
  payload: RegistrationPayload;
}

// =============================================================================
// Registration Response (Server → Client)
// =============================================================================

export type RegistrationErrorCode =
  | "INVALID_NAME"
  | "INVALID_DESCRIPTION"
  | "DUPLICATE_NAME"
  | "ALREADY_REGISTERED"
  | "VALIDATION_ERROR";

export interface RegistrationSuccessPayload {
  success: true;
  /** Assigned client ID from the server */
  clientId: string;
  /** Optional success message */
  message?: string;
}

export interface RegistrationFailurePayload {
  success: false;
  /** Error code indicating the failure reason */
  code: RegistrationErrorCode;
  /** Human-readable error message */
  message: string;
}

export type RegistrationResponsePayload = RegistrationSuccessPayload | RegistrationFailurePayload;

export interface RegistrationResponseMessage {
  type: "registration_response";
  payload: RegistrationResponsePayload;
}

// =============================================================================
// Routed Message (Server → Client)
// =============================================================================

export type InputMethod = "voice" | "text";

export interface MessageMetadata {
  /** How the user provided input */
  inputMethod: InputMethod;
  /** True if user used "clientname: message" syntax to bypass LLM routing */
  directRouted?: boolean;
  /** STT confidence score (0-1), only present for voice input */
  confidence?: number;
  /** LLM's explanation for choosing this client */
  routingReason?: string;
  /** Source of the message: "direct" for sidebar input, "websocket" for SmartHole server */
  source?: "direct" | "websocket";
}

export interface RoutedMessagePayload {
  /** Unique message ID (use in responses) */
  id: string;
  /** The user's transcribed or typed input */
  text: string;
  /** ISO 8601 timestamp when message was created */
  timestamp: string;
  /** Additional metadata about the message */
  metadata: MessageMetadata;
}

export interface RoutedMessage {
  type: "message";
  payload: RoutedMessagePayload;
}

// =============================================================================
// Response (Client → Server)
// =============================================================================

export type ResponseType = "ack" | "reject" | "notification";

export type NotificationPriority = "low" | "normal" | "high";

/** Acknowledge - indicates successful receipt/processing (empty object) */
export type AckPayload = Record<string, never>;

/** Reject - indicates you cannot or choose not to handle the message */
export interface RejectPayload {
  /** Explanation of why you're rejecting (optional) */
  reason?: string;
}

/** Notification - request SmartHole to show a system notification */
export interface NotificationPayload {
  /** Notification title (defaults to client name) */
  title?: string;
  /** Notification body text */
  body?: string;
  /** Priority level (defaults to "normal") */
  priority?: NotificationPriority;
}

export interface AckResponsePayload {
  messageId: string;
  type: "ack";
  payload: AckPayload;
}

export interface RejectResponsePayload {
  messageId: string;
  type: "reject";
  payload: RejectPayload;
}

export interface NotificationResponsePayload {
  messageId: string;
  type: "notification";
  payload: NotificationPayload;
}

export type ResponsePayload =
  | AckResponsePayload
  | RejectResponsePayload
  | NotificationResponsePayload;

export interface ResponseMessage {
  type: "response";
  payload: ResponsePayload;
}

// =============================================================================
// Union Types
// =============================================================================

/** All messages that can be sent from client to server */
export type OutgoingMessage = RegistrationMessage | ResponseMessage;

/** All messages that can be received from server to client */
export type IncomingMessage = RegistrationResponseMessage | RoutedMessage;

/** Base interface for all protocol messages */
export interface ProtocolMessage {
  type: string;
  payload: unknown;
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if a message is a registration response
 */
export function isRegistrationResponse(msg: IncomingMessage): msg is RegistrationResponseMessage {
  return msg.type === "registration_response";
}

/**
 * Type guard to check if a message is a routed message
 */
export function isRoutedMessage(msg: IncomingMessage): msg is RoutedMessage {
  return msg.type === "message";
}

/**
 * Type guard to check if a registration response indicates success
 */
export function isRegistrationSuccess(
  payload: RegistrationResponsePayload
): payload is RegistrationSuccessPayload {
  return payload.success === true;
}

/**
 * Type guard to check if a registration response indicates failure
 */
export function isRegistrationFailure(
  payload: RegistrationResponsePayload
): payload is RegistrationFailurePayload {
  return payload.success === false;
}

/**
 * Type guard to check if a parsed message is a valid protocol message
 */
export function isProtocolMessage(value: unknown): value is ProtocolMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof (value as ProtocolMessage).type === "string" &&
    "payload" in value &&
    typeof (value as ProtocolMessage).payload === "object" &&
    (value as ProtocolMessage).payload !== null
  );
}

/**
 * Type guard to check if a value is a valid incoming message
 */
export function isIncomingMessage(value: unknown): value is IncomingMessage {
  if (!isProtocolMessage(value)) {
    return false;
  }
  return value.type === "registration_response" || value.type === "message";
}
