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
    <div className="-m-4 flex h-[calc(100%+2rem)] flex-col md:-m-6 md:h-[calc(100%+3rem)]">
      <NotificationFeed notifications={notifications} />
    </div>
  );
}
