import { redirect } from "next/navigation";

import { NotificationFeed } from "@/components/notifications/notification-feed";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const notifications = await db.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="flex h-full flex-col">
      <NotificationFeed notifications={notifications} />
    </div>
  );
}
