import { unlink } from "node:fs/promises";
import { logger } from "../config/logger";
import type { EventBus } from "../events/event-bus";
import { extractorFor } from "../integrations/text-extractors";
import type { DocumentRepository } from "../repositories/document.repository";
import type { AuthUser } from "../types/auth";
import { BadRequestError, NotFoundError } from "../utils/errors";

export class DocumentService {
  constructor(private readonly documents: DocumentRepository, private readonly events: EventBus) {}

  list() {
    return this.documents.list();
  }

  async upload(user: AuthUser, file: Express.Multer.File | undefined, title?: string) {
    if (!file) throw new BadRequestError("Attach a file to upload");
    try {
      extractorFor(file.originalname, file.mimetype);
    } catch (err) {
      await unlink(file.path).catch(() => undefined);
      throw err;
    }
    const document = await this.documents.create({
      title: title ?? file.originalname.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
      fileName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      storagePath: file.path,
      uploadedById: user.id,
    });
    // Processing is async: the admin gets an immediate response and watches the status.
    this.events.emit("document.uploaded", { documentId: document.id });
    return document;
  }

  async remove(id: string) {
    const document = await this.documents.findById(id);
    if (!document) throw new NotFoundError("Document");
    await this.documents.delete(id); // chunks cascade
    await unlink(document.storagePath).catch((err) => logger.warn({ err, id }, "Could not delete stored file"));
  }

  async reprocess(id: string) {
    const document = await this.documents.findById(id);
    if (!document) throw new NotFoundError("Document");
    await this.documents.setStatus(id, "PENDING", { error: null });
    this.events.emit("document.uploaded", { documentId: id });
    return { queued: true };
  }
}
