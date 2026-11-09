-- CreateTable
CREATE TABLE "login_throttles" (
    "email_hash" CHAR(64) NOT NULL,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "last_failed_at" TIMESTAMP(3) NOT NULL,
    "locked_until" TIMESTAMP(3),

    CONSTRAINT "login_throttles_pkey" PRIMARY KEY ("email_hash")
);
