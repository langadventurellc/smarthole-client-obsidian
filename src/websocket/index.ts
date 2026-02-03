/**
 * SmartHole WebSocket Module
 *
 * Public exports for WebSocket connection management and protocol types.
 */

// Protocol Types - Outgoing Messages (Client → Server)
export type {
  RegistrationPayload,
  RegistrationMessage,
  ResponseMessage,
  ResponsePayload,
  AckPayload,
  AckResponsePayload,
  RejectPayload,
  RejectResponsePayload,
  NotificationPayload,
  NotificationResponsePayload,
} from "./types";

// Protocol Types - Incoming Messages (Server → Client)
export type {
  RegistrationResponseMessage,
  RegistrationResponsePayload,
  RegistrationSuccessPayload,
  RegistrationFailurePayload,
  RegistrationErrorCode,
  RoutedMessage,
  RoutedMessagePayload,
  MessageMetadata,
} from "./types";

// Protocol Types - Union Types and Utilities
export type {
  OutgoingMessage,
  IncomingMessage,
  ProtocolMessage,
  ResponseType,
  NotificationPriority,
  InputMethod,
} from "./types";

// Type Guards
export {
  isRegistrationResponse,
  isRoutedMessage,
  isRegistrationSuccess,
  isRegistrationFailure,
  isProtocolMessage,
  isIncomingMessage,
} from "./types";
