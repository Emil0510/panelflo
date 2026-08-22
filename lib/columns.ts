import { db } from "@/lib/db";

export const DEFAULT_PIPELINE_COLUMNS = [
  { key: "LEAD", label: "Lead", color: "#64748B", order: 0, isSystem: true },
  { key: "CONTACTED", label: "Contacted", color: "#1D4ED8", order: 1, isSystem: true },
  { key: "PROPOSAL", label: "Proposal", color: "#B45309", order: 2, isSystem: true },
  { key: "WON", label: "Won", color: "#2B5748", order: 3, isSystem: true, isWonStage: true },
  { key: "LOST", label: "Lost", color: "#DC2626", order: 4, isSystem: true },
];

export const DEFAULT_TASK_COLUMNS = [
  { key: "TODO", label: "To Do", color: "#64748B", order: 0, isSystem: true },
  { key: "IN_PROGRESS", label: "In Progress", color: "#1D4ED8", order: 1, isSystem: true },
  { key: "IN_REVIEW", label: "In Review", color: "#B45309", order: 2, isSystem: true },
  { key: "DONE", label: "Done", color: "#2B5748", order: 3, isSystem: true },
];

export const DEFAULT_CONTACT_COLUMNS = [
  { key: "LEAD", label: "Lead", color: "#B45309", order: 0, isSystem: true },
  { key: "ACTIVE", label: "Active", color: "#2B5748", order: 1, isSystem: true },
  { key: "INACTIVE", label: "Inactive", color: "#64748B", order: 2, isSystem: true },
];

export async function getWorkspacePipelineColumns(workspaceId: string) {
  let cols = await db.pipelineColumn.findMany({
    where: { workspaceId },
    orderBy: { order: "asc" },
  });

  if (cols.length === 0) {
    await db.pipelineColumn.createMany({
      data: DEFAULT_PIPELINE_COLUMNS.map((c) => ({ ...c, workspaceId })),
    });
    cols = await db.pipelineColumn.findMany({
      where: { workspaceId },
      orderBy: { order: "asc" },
    });
  }

  return cols;
}

export async function getWorkspaceTaskColumns(workspaceId: string) {
  let cols = await db.taskColumn.findMany({
    where: { workspaceId },
    orderBy: { order: "asc" },
  });

  if (cols.length === 0) {
    await db.taskColumn.createMany({
      data: DEFAULT_TASK_COLUMNS.map((c) => ({ ...c, workspaceId })),
    });
    cols = await db.taskColumn.findMany({
      where: { workspaceId },
      orderBy: { order: "asc" },
    });
  }

  return cols;
}

export async function getWorkspaceContactColumns(workspaceId: string) {
  let cols = await db.contactColumn.findMany({
    where: { workspaceId },
    orderBy: { order: "asc" },
  });

  if (cols.length === 0) {
    await db.contactColumn.createMany({
      data: DEFAULT_CONTACT_COLUMNS.map((c) => ({ ...c, workspaceId })),
    });
    cols = await db.contactColumn.findMany({
      where: { workspaceId },
      orderBy: { order: "asc" },
    });
  }

  return cols;
}
