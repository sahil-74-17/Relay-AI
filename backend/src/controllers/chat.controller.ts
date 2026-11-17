import type { Container } from "../container";
import { currentUser } from "../middleware/auth";
import { dto } from "../middleware/validate";
import { asyncHandler } from "../utils/async-handler";
import { createConversationSchema, messageFeedbackSchema, messageParam, sendMessageSchema } from "../validators/chat.validators";
import { idParam } from "../validators/common";

export const chatController = ({ chat }: Container) => ({
  list: asyncHandler(async (req, res) => {
    res.json(await chat.list(currentUser(req)));
  }),
  create: asyncHandler(async (req, res) => {
    res.status(201).json(await chat.create(currentUser(req), dto(res, "body", createConversationSchema).title));
  }),
  get: asyncHandler(async (req, res) => {
    res.json(await chat.get(currentUser(req), dto(res, "params", idParam).id));
  }),
  send: asyncHandler(async (req, res) => {
    res.status(201).json(await chat.send(currentUser(req), dto(res, "params", idParam).id, dto(res, "body", sendMessageSchema).content));
  }),
  clear: asyncHandler(async (req, res) => {
    await chat.clear(currentUser(req), dto(res, "params", idParam).id);
    res.status(204).end();
  }),
  remove: asyncHandler(async (req, res) => {
    await chat.remove(currentUser(req), dto(res, "params", idParam).id);
    res.status(204).end();
  }),
  feedback: asyncHandler(async (req, res) => {
    const { id, messageId } = dto(res, "params", messageParam);
    res.json(await chat.rateMessage(currentUser(req), id, messageId, dto(res, "body", messageFeedbackSchema)));
  }),
  escalate: asyncHandler(async (req, res) => {
    res.status(201).json(await chat.escalate(currentUser(req), dto(res, "params", idParam).id));
  }),
});
