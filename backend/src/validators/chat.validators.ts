import { z } from "zod";
import { trimmed } from "./common";

export const sendMessageSchema = z.object({ content: trimmed(1, 2000) });
export const createConversationSchema = z.object({ title: trimmed(1, 120).optional() });

export const messageFeedbackSchema = z
  .object({
    vote: z.enum(["HELPFUL", "NOT_HELPFUL"]),
    reason: z.enum(["INCORRECT", "NOT_RELEVANT", "MISSING_INFORMATION", "OTHER"]).optional(),
  })
  .refine((v) => v.vote !== "NOT_HELPFUL" || !!v.reason, {
    message: "Choose a reason for the negative feedback",
    path: ["reason"],
  });

export const messageParam = z.object({ id: z.string().min(1).max(64), messageId: z.string().min(1).max(64) });

export type MessageFeedbackDto = z.infer<typeof messageFeedbackSchema>;
