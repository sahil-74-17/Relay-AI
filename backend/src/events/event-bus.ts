import { EventEmitter } from "node:events";
import { logger } from "../config/logger";

/** Domain events. Services publish facts; subscribers decide what to do (Observer). */
export interface DomainEvents {
  "ticket.created": { ticketId: string };
  "ticket.triaged": { ticketId: string };
  "ticket.reanalyze": { ticketId: string };
  "document.uploaded": { documentId: string };
}

type Handler<K extends keyof DomainEvents> = (payload: DomainEvents[K]) => Promise<void> | void;

export class EventBus {
  private readonly emitter = new EventEmitter();

  on<K extends keyof DomainEvents>(event: K, handler: Handler<K>): void {
    this.emitter.on(event, (payload: DomainEvents[K]) => {
      Promise.resolve(handler(payload)).catch((err) => logger.error({ err, event }, "Event handler failed"));
    });
  }

  emit<K extends keyof DomainEvents>(event: K, payload: DomainEvents[K]): void {
    this.emitter.emit(event, payload);
  }
}
