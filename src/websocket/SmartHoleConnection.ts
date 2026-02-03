/**
 * SmartHoleConnection - Core WebSocket connection class for SmartHole protocol.
 *
 * Handles connection lifecycle, registration, message parsing, responses,
 * and automatic reconnection with exponential backoff.
 */

import type { ConnectionStatus } from "../types";
import {
  isIncomingMessage,
  isProtocolMessage,
  isRegistrationFailure,
  isRegistrationResponse,
  isRegistrationSuccess,
  isRoutedMessage,
  type NotificationPayload,
  type NotificationPriority,
  type OutgoingMessage,
  type RegistrationFailurePayload,
  type RoutedMessage,
} from "./types";

/** SmartHole WebSocket server URL (localhost only for security) */
const SMARTHOLE_URL = "ws://127.0.0.1:9473";

/** Base delay for reconnection backoff (1 second) */
const RECONNECT_BASE_DELAY = 1000;

/** Maximum delay for reconnection backoff (30 seconds) */
const RECONNECT_MAX_DELAY = 30000;

/** Options for creating a SmartHoleConnection */
export interface SmartHoleConnectionOptions {
  /** Client name for registration (must be unique, alphanumeric with hyphens/underscores) */
  name: string;
  /** Natural language description for LLM routing */
  description: string;
  /** Client version for debugging (defaults to "1.0.0") */
  version?: string;
  /** Structured capability hints (optional) */
  capabilities?: string[];
}

/** Options for sending a notification response */
export interface NotificationOptions {
  /** Notification title (defaults to client name) */
  title?: string;
  /** Notification body text */
  body?: string;
  /** Priority level (defaults to "normal") */
  priority?: NotificationPriority;
}

/** Registration error information */
export interface RegistrationError {
  code: string;
  message: string;
}

/** Callbacks for SmartHoleConnection events */
export interface SmartHoleConnectionCallbacks {
  /** Called when connection state changes */
  onStateChange?: (state: ConnectionStatus) => void;
  /** Called when registration completes (success or failure) */
  onRegistrationResult?: (success: boolean, error?: RegistrationError) => void;
  /** Called when a routed message is received */
  onMessage?: (message: RoutedMessage) => void;
  /** Called when an error occurs */
  onError?: (error: Error) => void;
}

export class SmartHoleConnection {
  private ws: WebSocket | null = null;
  private state: ConnectionStatus = "disconnected";
  private options: Required<Pick<SmartHoleConnectionOptions, "name" | "description">> &
    Pick<SmartHoleConnectionOptions, "version" | "capabilities">;

  // Reconnection state
  private reconnectionEnabled = false;
  private reconnectAttempts = 0;
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // Callbacks
  onStateChange: ((state: ConnectionStatus) => void) | null = null;
  onRegistrationResult: ((success: boolean, error?: RegistrationError) => void) | null = null;
  onMessage: ((message: RoutedMessage) => void) | null = null;
  onError: ((error: Error) => void) | null = null;

  constructor(options: SmartHoleConnectionOptions) {
    this.options = {
      name: options.name,
      description: options.description,
      version: options.version,
      capabilities: options.capabilities,
    };
  }

  /** Returns the current connection state */
  getState(): ConnectionStatus {
    return this.state;
  }

  /** Enables automatic reconnection on disconnect */
  enableReconnection(): void {
    this.reconnectionEnabled = true;
  }

  /** Disables automatic reconnection and cancels any pending reconnect */
  disableReconnection(): void {
    this.reconnectionEnabled = false;
    this.cancelPendingReconnect();
  }

  /** Returns true if a reconnection attempt is pending */
  isReconnecting(): boolean {
    return this.reconnectTimeoutId !== null;
  }

  /** Returns the number of reconnection attempts since last successful connection */
  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  /** Establishes WebSocket connection to SmartHole server */
  connect(): void {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    ) {
      console.warn("SmartHoleConnection: Already connected or connecting");
      return;
    }

    this.setState("connecting");

    try {
      this.ws = new WebSocket(SMARTHOLE_URL);
      this.setupEventHandlers();
    } catch (error) {
      this.setState("error");
      this.emitError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /** Gracefully closes the WebSocket connection and disables reconnection */
  disconnect(): void {
    // Disable reconnection when manually disconnecting
    this.disableReconnection();

    if (!this.ws) {
      return;
    }

    // Remove event handlers before closing to prevent close event from firing
    this.ws.onopen = null;
    this.ws.onclose = null;
    this.ws.onerror = null;
    this.ws.onmessage = null;

    if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
      this.ws.close(1000, "Client disconnect");
    }

    this.ws = null;
    this.setState("disconnected");
  }

  /** Sends an acknowledgment response for a message */
  sendAck(messageId: string): void {
    this.sendResponse({
      type: "response",
      payload: {
        messageId,
        type: "ack",
        payload: {},
      },
    });
  }

  /** Sends a rejection response for a message */
  sendReject(messageId: string, reason?: string): void {
    this.sendResponse({
      type: "response",
      payload: {
        messageId,
        type: "reject",
        payload: reason ? { reason } : {},
      },
    });
  }

  /** Sends a notification response for a message */
  sendNotification(messageId: string, options: NotificationOptions): void {
    const payload: NotificationPayload = {};
    if (options.title !== undefined) payload.title = options.title;
    if (options.body !== undefined) payload.body = options.body;
    if (options.priority !== undefined) payload.priority = options.priority;

    this.sendResponse({
      type: "response",
      payload: {
        messageId,
        type: "notification",
        payload,
      },
    });
  }

  private setState(newState: ConnectionStatus): void {
    if (this.state !== newState) {
      this.state = newState;
      this.onStateChange?.(newState);
    }
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.sendRegistration();
    };

    this.ws.onclose = (event) => {
      // Only update state if we didn't initiate the disconnect
      if (this.ws) {
        console.log(
          `SmartHoleConnection: WebSocket closed (code: ${event.code}, reason: ${event.reason})`
        );
        this.ws = null;
        this.setState("disconnected");

        // Schedule reconnection if enabled
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (event) => {
      console.error("SmartHoleConnection: WebSocket error", event);
      this.setState("error");
      this.emitError(new Error("WebSocket connection error"));
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };
  }

  private sendRegistration(): void {
    const registration = {
      type: "registration",
      payload: {
        name: this.options.name,
        description: this.options.description,
        ...(this.options.version && { version: this.options.version }),
        ...(this.options.capabilities && { capabilities: this.options.capabilities }),
      },
    };

    this.send(registration);
  }

  private handleMessage(data: unknown): void {
    // Parse JSON
    let parsed: unknown;
    try {
      if (typeof data !== "string") {
        console.warn("SmartHoleConnection: Received non-string message, ignoring");
        return;
      }
      parsed = JSON.parse(data);
    } catch (error) {
      console.warn("SmartHoleConnection: Failed to parse message as JSON", error);
      return;
    }

    // Validate basic protocol structure
    if (!isProtocolMessage(parsed)) {
      console.warn("SmartHoleConnection: Received malformed protocol message", parsed);
      return;
    }

    // Validate it's a known incoming message type
    if (!isIncomingMessage(parsed)) {
      console.warn(`SmartHoleConnection: Received unknown message type: ${parsed.type}`);
      return;
    }

    // Handle registration response
    if (isRegistrationResponse(parsed)) {
      this.handleRegistrationResponse(parsed.payload);
      return;
    }

    // Handle routed message
    if (isRoutedMessage(parsed)) {
      this.onMessage?.(parsed);
      return;
    }
  }

  private handleRegistrationResponse(
    payload: import("./types").RegistrationSuccessPayload | RegistrationFailurePayload
  ): void {
    if (isRegistrationSuccess(payload)) {
      console.log(`SmartHoleConnection: Registration successful (clientId: ${payload.clientId})`);
      this.setState("connected");
      // Reset backoff on successful connection AND registration
      this.resetReconnectState();
      this.onRegistrationResult?.(true);
    } else if (isRegistrationFailure(payload)) {
      console.error(
        `SmartHoleConnection: Registration failed (${payload.code}): ${payload.message}`
      );
      this.setState("error");
      this.onRegistrationResult?.(false, {
        code: payload.code,
        message: payload.message,
      });
      // Close connection to trigger reconnection via onclose handler
      if (this.ws) {
        this.ws.close(4000, "Registration failed");
      }
    }
  }

  private sendResponse(message: OutgoingMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("SmartHoleConnection: Cannot send response, WebSocket not open");
      return;
    }
    this.send(message);
  }

  private send(message: object): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("SmartHoleConnection: Cannot send message, WebSocket not open");
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error("SmartHoleConnection: Failed to send message", error);
      this.emitError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private emitError(error: Error): void {
    this.onError?.(error);
  }

  /** Calculates delay for next reconnection attempt using exponential backoff */
  private calculateReconnectDelay(): number {
    return Math.min(
      RECONNECT_BASE_DELAY * Math.pow(2, this.reconnectAttempts),
      RECONNECT_MAX_DELAY
    );
  }

  /** Cancels any pending reconnection timeout */
  private cancelPendingReconnect(): void {
    if (this.reconnectTimeoutId !== null) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
  }

  /** Schedules a reconnection attempt after the appropriate backoff delay */
  private scheduleReconnect(): void {
    if (!this.reconnectionEnabled) {
      return;
    }

    this.cancelPendingReconnect();

    const delay = this.calculateReconnectDelay();
    console.log(
      `SmartHoleConnection: Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts + 1})`
    );

    this.reconnectTimeoutId = setTimeout(() => {
      this.reconnectTimeoutId = null;
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  /** Resets reconnection state after successful connection and registration */
  private resetReconnectState(): void {
    this.reconnectAttempts = 0;
    this.cancelPendingReconnect();
  }
}
