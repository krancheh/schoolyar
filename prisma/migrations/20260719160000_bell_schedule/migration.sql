-- CreateTable
CREATE TABLE "BellSchedule" (
    "id" SERIAL NOT NULL,
    "lessonNumber" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BellSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BellSchedule_lessonNumber_key" ON "BellSchedule"("lessonNumber");

