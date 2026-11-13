-- Migration 004: responses, answers with duplicate prevention and validation constraints

CREATE TABLE "responses" (
    "id" SERIAL NOT NULL,
    "survey_id" INTEGER NOT NULL,
    "respondent_id" INTEGER NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "responses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "responses_survey_id_respondent_id_key" ON "responses"("survey_id", "respondent_id");
ALTER TABLE "responses" ADD CONSTRAINT "responses_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "responses" ADD CONSTRAINT "responses_respondent_id_fkey" FOREIGN KEY ("respondent_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "answers" (
    "id" SERIAL NOT NULL,
    "response_id" INTEGER NOT NULL,
    "question_id" INTEGER NOT NULL,
    "option_id" INTEGER,
    "rating_value" INTEGER,

    CONSTRAINT "answers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "answers_response_id_question_id_key" ON "answers"("response_id", "question_id");
ALTER TABLE "answers" ADD CONSTRAINT "answers_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "answers" ADD CONSTRAINT "answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "answers" ADD CONSTRAINT "answers_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "question_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "answers" ADD CONSTRAINT "answers_value_check" CHECK (("option_id" IS NULL) <> ("rating_value" IS NULL));
ALTER TABLE "answers" ADD CONSTRAINT "answers_rating_check" CHECK ("rating_value" IS NULL OR ("rating_value" >= 1 AND "rating_value" <= 5));
