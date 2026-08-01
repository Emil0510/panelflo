-- Convert Deal.stage from enum to text
ALTER TABLE "Deal" ALTER COLUMN "stage" TYPE TEXT USING "stage"::TEXT;
DROP TYPE IF EXISTS "DealStage";

-- Convert Task.status from enum to text
ALTER TABLE "Task" ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT;
DROP TYPE IF EXISTS "TaskStatus";

-- Create PipelineColumn table
CREATE TABLE "PipelineColumn" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT '#64748B',
  "order" INTEGER NOT NULL,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "PipelineColumn_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PipelineColumn_workspaceId_key_key" ON "PipelineColumn"("workspaceId", "key");
CREATE INDEX "PipelineColumn_workspaceId_idx" ON "PipelineColumn"("workspaceId");
ALTER TABLE "PipelineColumn" ADD CONSTRAINT "PipelineColumn_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create TaskColumn table
CREATE TABLE "TaskColumn" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT '#64748B',
  "order" INTEGER NOT NULL,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "TaskColumn_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TaskColumn_workspaceId_key_key" ON "TaskColumn"("workspaceId", "key");
CREATE INDEX "TaskColumn_workspaceId_idx" ON "TaskColumn"("workspaceId");
ALTER TABLE "TaskColumn" ADD CONSTRAINT "TaskColumn_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
