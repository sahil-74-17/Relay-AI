import type { Container } from "../container";
import { currentUser } from "../middleware/auth";
import { dto } from "../middleware/validate";
import { asyncHandler } from "../utils/async-handler";
import { idParam, pageQuery } from "../validators/common";
import { commentSchema, createTicketSchema, listTicketsSchema, reviewSchema, updateTicketSchema } from "../validators/ticket.validators";

export const ticketController = ({ tickets, review, replySuggestions }: Container) => ({
  list: asyncHandler(async (req, res) => {
    res.json(await tickets.list(currentUser(req), dto(res, "query", listTicketsSchema)));
  }),
  create: asyncHandler(async (req, res) => {
    res.status(201).json(await tickets.create(currentUser(req), dto(res, "body", createTicketSchema)));
  }),
  get: asyncHandler(async (req, res) => {
    res.json(await tickets.get(currentUser(req), dto(res, "params", idParam).id));
  }),
  update: asyncHandler(async (req, res) => {
    res.json(await tickets.update(currentUser(req), dto(res, "params", idParam).id, dto(res, "body", updateTicketSchema)));
  }),
  comment: asyncHandler(async (req, res) => {
    res.status(201).json(await tickets.addComment(currentUser(req), dto(res, "params", idParam).id, dto(res, "body", commentSchema)));
  }),
  reanalyze: asyncHandler(async (req, res) => {
    res.status(202).json(await tickets.reanalyze(currentUser(req), dto(res, "params", idParam).id));
  }),
  suggestReply: asyncHandler(async (req, res) => {
    res.json(await replySuggestions.suggest(currentUser(req), dto(res, "params", idParam).id));
  }),
  reviewQueue: asyncHandler(async (_req, res) => {
    res.json(await review.queue(dto(res, "query", pageQuery)));
  }),
  review: asyncHandler(async (req, res) => {
    res.json(await review.review(currentUser(req), dto(res, "params", idParam).id, dto(res, "body", reviewSchema)));
  }),
  recentFeedback: asyncHandler(async (_req, res) => {
    res.json(await review.recentFeedback());
  }),
});
