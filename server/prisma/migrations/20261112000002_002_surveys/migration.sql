-- Migration 002: surveys, questions, question_options with constraints

CREATE TABLE "surveys" (
    "id" SERIAL NOT NULL,
    "owner_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "mode" TEXT NOT NULL DEFAULT 'identified',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "surveys_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "surveys" ADD CONSTRAINT "surveys_status_check" CHECK ("status" IN ('draft', 'published', 'closed'));
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_mode_check" CHECK ("mode" = 'identified');
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "questions" (
    "id" SERIAL NOT NULL,
    "survey_id" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "questions_survey_id_position_key" ON "questions"("survey_id", "position");
ALTER TABLE "questions" ADD CONSTRAINT "questions_type_check" CHECK ("type" IN ('single_choice', 'rating'));
ALTER TABLE "questions" ADD CONSTRAINT "questions_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "question_options" (
    "id" SERIAL NOT NULL,
    "question_id" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "question_options_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "question_options_question_id_position_key" ON "question_options"("question_id", "position");
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

