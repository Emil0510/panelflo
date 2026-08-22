-- Convert Contact.status from enum to text
ALTER TABLE "Contact" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Contact" ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT;
ALTER TABLE "Contact" ALTER COLUMN "status" SET DEFAULT 'LEAD';
DROP TYPE IF EXISTS "ContactStatus" CASCADE;

-- Create ContactColumn table
CREATE TABLE "ContactColumn" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT '#64748B',
  "order" INTEGER NOT NULL,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "ContactColumn_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ContactColumn_workspaceId_key_key" ON "ContactColumn"("workspaceId", "key");
CREATE INDEX "ContactColumn_workspaceId_idx" ON "ContactColumn"("workspaceId");
ALTER TABLE "ContactColumn" ADD CONSTRAINT "ContactColumn_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
