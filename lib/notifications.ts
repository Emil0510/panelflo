import { NotificationType } from "@prisma/client";

import { db } from "@/lib/db";

export async function createNotification(opts: {
  userId: string;
  workspaceId: string;
  title: string;
  body?: string;
  type?: NotificationType;
  link?: string;
}) {
  return db.notification.create({
    data: {
      userId: opts.userId,
      workspaceId: opts.workspaceId,
      title: opts.title,
      body: opts.body ?? null,
      type: opts.type ?? "INFO",
      link: opts.link ?? null,
    },
  });
}
