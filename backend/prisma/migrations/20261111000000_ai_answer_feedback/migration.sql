-- Reader feedback on grounded AI answers (small talk and "no answer" messages are never rated).

CREATE TYPE "MessageFeedbackVote" AS ENUM ('HELPFUL', 'NOT_HELPFUL');
CREATE TYPE "MessageFeedbackReason" AS ENUM ('INCORRECT', 'NOT_RELEVANT', 'MISSING_INFORMATION', 'OTHER');

ALTER TABLE "Message"
  ADD COLUMN "feedbackVote" "MessageFeedbackVote",
  ADD COLUMN "feedbackReason" "MessageFeedbackReason",
  ADD COLUMN "feedbackAt" TIMESTAMP(3),
  ADD COLUMN "feedbackById" TEXT;

CREATE INDEX "Message_feedbackVote_idx" ON "Message"("feedbackVote");

ALTER TABLE "Message"
  ADD CONSTRAINT "Message_feedbackById_fkey"
  FOREIGN KEY ("feedbackById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
