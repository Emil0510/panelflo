import { Prisma } from "@prisma/client";
import { format } from "date-fns";

import { getWorkspaceContactColumns } from "@/lib/columns";
import { db } from "@/lib/db";
import { complete } from "@/lib/openai";
import { adjustStock, isLowStock, StockError } from "@/lib/stock";

export const ACTIONS = [
  // contacts
  "ADD_CONTACT",
  "UPDATE_CONTACT",
  "DELETE_CONTACT",
  "LIST_CONTACTS",
  "LOOKUP_CONTACT",
  "AI_SUMMARY",
  // tasks
  "CREATE_TASK",
  "COMPLETE_TASK",
  "DELETE_TASK",
  "ASSIGN_TASK",
  "LIST_TASKS",
  // deals
  "CREATE_DEAL",
  "MOVE_DEAL",
  "UPDATE_DEAL",
  "LIST_DEALS",
  // notes & reports
  "ADD_NOTE",
  "DAILY_BRIEF",
  "WEEKLY_STATS",
  // stock
  "ADD_STOCK",
  "ADJUST_STOCK",
  "CHECK_STOCK",
  "LIST_STOCK",
  // meta
  "GREETING",
  "HELP",
  "UNKNOWN",
] as const;

const DEAL_STAGES = ["LEAD", "CONTACTED", "PROPOSAL", "WON", "LOST"] as const;

export type BotAction = (typeof ACTIONS)[number];

export type BotUser = { id: string; workspaceId: string; role: "ADMIN" | "MEMBER" };

export const HELP_TEXT = [
  "Here's everything I can do:",
  "",
  "📇 Contacts",
  '• "add contact John Smith from Acme, email john@acme.com"',
  '• "update Sara\'s status to active" / "change John\'s phone to +99450…"',
  '• "show my contacts" / "list lead contacts"',
  '• "who is John Smith" / "summarize Acme John"',
  '• "delete contact John" (asks to confirm)',
  "",
  "✅ Tasks",
  '• "remind me to call Sara tomorrow at 3pm"',
  '• "show active tasks" / "what\'s overdue?"',
  '• "done: send proposal"',
  '• "assign send proposal to Maya"',
  '• "delete task send proposal" (asks to confirm)',
  "",
  "💼 Deals",
  '• "new deal Acme contract $12000 with John"',
  '• "move Acme contract to proposal" / "we won the Acme deal"',
  '• "show pipeline" / "list deals in proposal"',
  "",
  "📊 Reports",
  '• "what\'s my day look like" — daily brief',
  '• "how did we do this week" — weekly stats',
  "",
  "📦 Stock",
  '• "add product Widget, 50 pcs, price 12"',
  '• "stock out 3 Widget" / "add 20 Widgets to stock"',
  '• "how many Widgets left?"',
  '• "show stock" / "show low stock"',
  "",
  '📝 Notes — "note on John: asked for discount"',
].join("\n");

export function str(data: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return undefined;
}

function num(data: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const n = Number(value.replace(/[$,\s]/g, ""));
      if (!isNaN(n)) return n;
    }
  }
  return undefined;
}

async function findContactByName(workspaceId: string, name: string) {
  const [first, ...rest] = name.trim().split(/\s+/);
  return (
    (await db.contact.findFirst({
      where: {
        workspaceId,
        firstName: { contains: first, mode: "insensitive" },
        ...(rest.length
          ? { lastName: { contains: rest.join(" "), mode: "insensitive" } }
          : {}),
      },
    })) ??
    // fall back to company-name match ("the Acme contact")
    db.contact.findFirst({
      where: { workspaceId, company: { contains: name, mode: "insensitive" } },
    })
  );
}

async function findProductByName(workspaceId: string, query: string) {
  return (
    (await db.product.findFirst({
      where: {
        workspaceId,
        deleted: false,
        sku: { equals: query.trim(), mode: "insensitive" },
      },
    })) ??
    db.product.findFirst({
      where: {
        workspaceId,
        deleted: false,
        name: { contains: query.trim(), mode: "insensitive" },
      },
    })
  );
}

async function findUserByName(workspaceId: string, name: string) {
  return db.user.findFirst({
    where: { workspaceId, name: { contains: name, mode: "insensitive" } },
  });
}

async function findDealByTitle(workspaceId: string, title: string) {
  return db.deal.findFirst({
    where: { workspaceId, title: { contains: title, mode: "insensitive" } },
    include: { contact: true },
  });
}

function normalizeStage(raw: string): (typeof DEAL_STAGES)[number] | null {
  const up = raw.toUpperCase().trim();
  if ((DEAL_STAGES as readonly string[]).includes(up)) return up as never;
  if (up.includes("WON") || up.includes("CLOSE")) return "WON";
  if (up.includes("LOST")) return "LOST";
  if (up.includes("PROPOS")) return "PROPOSAL";
  if (up.includes("CONTACT")) return "CONTACTED";
  if (up.includes("LEAD") || up.includes("NEW")) return "LEAD";
  return null;
}

function fmtDue(d: Date | null): string {
  return d ? ` (${format(d, "MMM d, HH:mm")})` : "";
}

/** Execute the action; return the message to send back. Null → use Gemini's reply. */
export async function executeBotAction(
  action: (typeof ACTIONS)[number],
  data: Record<string, unknown>,
  user: BotUser
): Promise<string | null> {
  const { workspaceId } = user;

  switch (action) {
    // ---------------- contacts ----------------
    case "ADD_CONTACT": {
      const name = str(data, "name", "firstName", "contactName");
      if (!name) return "I couldn't catch the contact's name — try again?";
      const [firstName, ...rest] = name.split(/\s+/);
      const contact = await db.contact.create({
        data: {
          workspaceId,
          firstName,
          lastName: rest.join(" ") || null,
          email: str(data, "email") ?? null,
          phone: str(data, "phone") ?? null,
          company: str(data, "company") ?? null,
          assignedToId: user.id,
        },
      });
      await db.activity.create({
        data: {
          workspaceId,
          contactId: contact.id,
          type: "BOT_MESSAGE",
          content: `Contact added via bot: ${name}`,
          createdById: user.id,
        },
      });
      return `Added contact: ${name}${contact.company ? ` (${contact.company})` : ""} ✅`;
    }

    case "UPDATE_CONTACT": {
      const name = str(data, "name", "contactName", "contact");
      if (!name) return "Which contact should I update?";
      const contact = await findContactByName(workspaceId, name);
      if (!contact) return `No contact found matching "${name}".`;

      const changes: Record<string, unknown> = {};
      const rawStatus = str(data, "status");
      if (rawStatus) {
        const statusCols = await getWorkspaceContactColumns(workspaceId);
        const matchedStatus = statusCols.find(
          (c) =>
            c.key.toLowerCase() === rawStatus.toLowerCase() ||
            c.label.toLowerCase() === rawStatus.toLowerCase()
        );
        if (matchedStatus) changes.status = matchedStatus.key;
      }
      const email = str(data, "email");
      const phone = str(data, "phone");
      const company = str(data, "company");
      if (email) changes.email = email;
      if (phone) changes.phone = phone;
      if (company) changes.company = company;
      if (Object.keys(changes).length === 0) {
        return "What should I change? (status, email, phone, or company)";
      }

      await db.contact.update({ where: { id: contact.id }, data: changes });
      const summary = Object.entries(changes)
        .map(([k, v]) => `${k} → ${v}`)
        .join(", ");
      return `Updated ${contact.firstName} ${contact.lastName ?? ""}: ${summary} ✅`;
    }

    case "DELETE_CONTACT": {
      const name = str(data, "name", "contactName", "contact");
      if (!name) return "Which contact should I delete?";
      const contact = await findContactByName(workspaceId, name);
      if (!contact) return `No contact found matching "${name}".`;
      await db.contact.delete({ where: { id: contact.id } });
      return `Deleted contact ${contact.firstName} ${contact.lastName ?? ""} 🗑️`;
    }

    case "LIST_CONTACTS": {
      const rawStatus = str(data, "status", "filter");
      let matchedStatusKey: string | undefined;
      if (rawStatus) {
        const statusCols = await getWorkspaceContactColumns(workspaceId);
        matchedStatusKey = statusCols.find(
          (c) =>
            c.key.toLowerCase() === rawStatus.toLowerCase() ||
            c.label.toLowerCase() === rawStatus.toLowerCase()
        )?.key;
      }
      const search = str(data, "search", "query");
      const contacts = await db.contact.findMany({
        where: {
          workspaceId,
          ...(matchedStatusKey ? { status: matchedStatusKey } : {}),
          ...(search
            ? {
                OR: [
                  { firstName: { contains: search, mode: "insensitive" } },
                  { lastName: { contains: search, mode: "insensitive" } },
                  { company: { contains: search, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
      });
      if (contacts.length === 0) return "No contacts found.";
      const lines = contacts.map(
        (c, i) =>
          `${i + 1}. ${c.firstName} ${c.lastName ?? ""}`.trim() +
          `${c.company ? ` — ${c.company}` : ""} [${c.status}]`
      );
      return `Contacts${rawStatus ? ` (${rawStatus})` : ""}:\n\n${lines.join("\n")}`;
    }

    case "LOOKUP_CONTACT": {
      const name = str(data, "name", "contactName", "contact");
      if (!name) return "Who are you looking for?";
      const contact = await findContactByName(workspaceId, name);
      if (!contact) return `No contact found matching "${name}".`;
      return [
        `${contact.firstName} ${contact.lastName ?? ""}`.trim(),
        contact.company ? `🏢 ${contact.company}` : null,
        contact.email ? `✉️ ${contact.email}` : null,
        contact.phone ? `📞 ${contact.phone}` : null,
        `Status: ${contact.status}`,
      ]
        .filter(Boolean)
        .join("\n");
    }

    case "AI_SUMMARY": {
      const name = str(data, "name", "contactName", "contact");
      if (!name) return "Which contact should I summarize?";
      const contact = await findContactByName(workspaceId, name);
      if (!contact) return `No contact found matching "${name}".`;
      const activities = await db.activity.findMany({
        where: { contactId: contact.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      try {
        return await complete({
          system:
            "Summarize this customer in 3 bullet points for a sales rep. " +
            "Max 50 words. Be specific.",
          user: [
            `Contact: ${contact.firstName} ${contact.lastName ?? ""} (${contact.status})`,
            ...activities.map((a) => `- [${a.type}] ${a.content}`),
          ].join("\n"),
          maxTokens: 150,
        });
      } catch {
        return "AI summary is unavailable right now.";
      }
    }

    // ---------------- tasks ----------------
    case "CREATE_TASK": {
      const title = str(data, "title", "task");
      if (!title) return "What should the task say?";
      const dueRaw = str(data, "dueDate", "due");
      const dueDate = dueRaw ? new Date(dueRaw) : null;

      let contactId: string | null = null;
      const contactName = str(data, "contactName", "contact");
      if (contactName) {
        contactId = (await findContactByName(workspaceId, contactName))?.id ?? null;
      }

      let assignedToId = user.id;
      const assigneeName = str(data, "assigneeName", "assignee");
      if (assigneeName) {
        const assignee = await findUserByName(workspaceId, assigneeName);
        if (assignee) assignedToId = assignee.id;
      }

      const task = await db.task.create({
        data: {
          workspaceId,
          title,
          dueDate: dueDate && !isNaN(dueDate.getTime()) ? dueDate : null,
          assignedToId,
          createdById: user.id,
          contactId,
          source: "BOT",
        },
      });
      return `Task created: "${title}"${fmtDue(task.dueDate)} ✅`;
    }

    case "COMPLETE_TASK": {
      const title = str(data, "title", "task");
      if (!title) return "Which task should I complete?";
      const task = await db.task.findFirst({
        where: {
          workspaceId,
          deleted: false,
          completed: false,
          title: { contains: title, mode: "insensitive" },
        },
      });
      if (!task) return `I couldn't find an open task matching "${title}".`;
      await db.task.update({
        where: { id: task.id },
        data: { completed: true, completedAt: new Date(), status: "DONE" },
      });
      await db.activity.create({
        data: {
          workspaceId,
          contactId: task.contactId,
          type: "TASK_COMPLETED",
          content: `Task completed via bot: "${task.title}"`,
          createdById: user.id,
        },
      });
      return `Marked complete: "${task.title}" ✅`;
    }

    case "DELETE_TASK": {
      const title = str(data, "title", "task");
      if (!title) return "Which task should I delete?";
      const task = await db.task.findFirst({
        where: {
          workspaceId,
          deleted: false,
          title: { contains: title, mode: "insensitive" },
        },
      });
      if (!task) return `No task found matching "${title}".`;
      await db.task.update({ where: { id: task.id }, data: { deleted: true } });
      return `Deleted task "${task.title}" 🗑️`;
    }

    case "ASSIGN_TASK": {
      const title = str(data, "title", "task");
      const assigneeName = str(data, "assigneeName", "assignee");
      if (!title || !assigneeName) return "Tell me the task and who to assign it to.";
      const [task, assignee] = await Promise.all([
        db.task.findFirst({
          where: {
            workspaceId,
            deleted: false,
            completed: false,
            title: { contains: title, mode: "insensitive" },
          },
        }),
        findUserByName(workspaceId, assigneeName),
      ]);
      if (!task) return `No open task found matching "${title}".`;
      if (!assignee) return `No teammate found matching "${assigneeName}".`;
      await db.task.update({
        where: { id: task.id },
        data: { assignedToId: assignee.id },
      });
      return `Assigned "${task.title}" to ${assignee.name} ✅`;
    }

    case "LIST_TASKS": {
      const filter = (str(data, "filter", "status") ?? "active").toLowerCase();
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

      const where = {
        workspaceId,
        deleted: false,
        ...(filter.includes("complete") || filter.includes("done")
          ? { completed: true }
          : { completed: false }),
        ...(filter.includes("today")
          ? { dueDate: { gte: startOfDay, lt: endOfDay } }
          : {}),
        ...(filter.includes("overdue") ? { dueDate: { lt: startOfDay } } : {}),
        ...(filter.includes("my") ? { assignedToId: user.id } : {}),
      };

      const tasks = await db.task.findMany({
        where,
        include: { assignedTo: { select: { name: true } } },
        orderBy: { dueDate: "asc" },
        take: 15,
      });
      if (tasks.length === 0) {
        return filter.includes("overdue")
          ? "Nothing overdue 🎉"
          : "No tasks found for that filter 🎉";
      }
      const label = filter.includes("complete")
        ? "Completed tasks"
        : filter.includes("overdue")
          ? "Overdue tasks"
          : filter.includes("today")
            ? "Tasks due today"
            : "Active tasks";
      const lines = tasks.map(
        (t, i) =>
          `${i + 1}. ${t.title}${fmtDue(t.dueDate)}` +
          (t.assignedTo?.name ? ` — ${t.assignedTo.name}` : "")
      );
      return `${label} (${tasks.length}):\n\n${lines.join("\n")}`;
    }

    // ---------------- deals ----------------
    case "CREATE_DEAL": {
      const title = str(data, "title", "dealTitle", "name");
      if (!title) return "What should the deal be called?";
      const value = num(data, "value", "amount") ?? 0;
      const stage = normalizeStage(str(data, "stage") ?? "LEAD") ?? "LEAD";

      let contactId: string | null = null;
      const contactName = str(data, "contactName", "contact");
      if (contactName) {
        contactId = (await findContactByName(workspaceId, contactName))?.id ?? null;
      }

      await db.deal.create({
        data: {
          workspaceId,
          title,
          value,
          stage,
          contactId,
          assignedToId: user.id,
        },
      });
      return `Deal created: "${title}" ($${value.toLocaleString()}) in ${stage} 💼`;
    }

    case "MOVE_DEAL": {
      const title = str(data, "title", "dealTitle", "deal", "name");
      const rawStage = str(data, "stage");
      if (!title) return "Which deal should I move?";
      if (!rawStage) return "Which stage should it move to?";
      const stage = normalizeStage(rawStage);
      if (!stage) return `"${rawStage}" isn't a stage. Use: lead, contacted, proposal, won, lost.`;

      const deal = await findDealByTitle(workspaceId, title);
      if (!deal) return `No deal found matching "${title}".`;
      if (deal.stage === stage) return `"${deal.title}" is already in ${stage}.`;

      await db.deal.update({
        where: { id: deal.id },
        data: { stage, lastMovedAt: new Date() },
      });
      await db.activity.create({
        data: {
          workspaceId,
          contactId: deal.contactId,
          type: "DEAL_MOVED",
          content: `Deal "${deal.title}" moved from ${deal.stage} to ${stage} via bot`,
          createdById: user.id,
        },
      });
      return stage === "WON"
        ? `🎉 "${deal.title}" marked WON ($${Number(deal.value).toLocaleString()})!`
        : `Moved "${deal.title}" → ${stage} ✅`;
    }

    case "UPDATE_DEAL": {
      const title = str(data, "title", "dealTitle", "deal", "name");
      const value = num(data, "value", "amount");
      if (!title) return "Which deal should I update?";
      if (value === undefined) return "What's the new value?";
      const deal = await findDealByTitle(workspaceId, title);
      if (!deal) return `No deal found matching "${title}".`;
      await db.deal.update({ where: { id: deal.id }, data: { value } });
      return `Updated "${deal.title}" value → $${value.toLocaleString()} ✅`;
    }

    case "LIST_DEALS": {
      const rawStage = str(data, "stage", "filter");
      const stage = rawStage ? normalizeStage(rawStage) : null;
      const deals = await db.deal.findMany({
        where: {
          workspaceId,
          ...(stage ? { stage } : { stage: { notIn: ["WON", "LOST"] } }),
        },
        include: { contact: { select: { firstName: true, lastName: true } } },
        orderBy: { value: "desc" },
        take: 15,
      });
      if (deals.length === 0) return "No deals found.";

      if (!stage) {
        // pipeline overview grouped by stage
        const groups = new Map<string, { count: number; total: number }>();
        for (const d of deals) {
          const g = groups.get(d.stage) ?? { count: 0, total: 0 };
          g.count++;
          g.total += Number(d.value);
          groups.set(d.stage, g);
        }
        const overview = ["LEAD", "CONTACTED", "PROPOSAL"]
          .filter((s) => groups.has(s))
          .map((s) => {
            const g = groups.get(s)!;
            return `${s}: ${g.count} deal(s), $${g.total.toLocaleString()}`;
          })
          .join("\n");
        const list = deals
          .slice(0, 8)
          .map(
            (d, i) =>
              `${i + 1}. ${d.title} — $${Number(d.value).toLocaleString()} [${d.stage}]`
          )
          .join("\n");
        return `Open pipeline:\n${overview}\n\nTop deals:\n${list}`;
      }

      const lines = deals.map(
        (d, i) =>
          `${i + 1}. ${d.title} — $${Number(d.value).toLocaleString()}` +
          (d.contact ? ` (${d.contact.firstName} ${d.contact.lastName ?? ""})` : "")
      );
      return `Deals in ${stage} (${deals.length}):\n\n${lines.join("\n")}`;
    }

    // ---------------- notes & reports ----------------
    case "ADD_NOTE": {
      const note = str(data, "note", "content", "text");
      const contactName = str(data, "contactName", "contact", "name");
      if (!note) return "What should the note say?";
      const contact = contactName
        ? await findContactByName(workspaceId, contactName)
        : null;
      if (contactName && !contact) return `I couldn't find a contact named "${contactName}".`;
      await db.activity.create({
        data: {
          workspaceId,
          contactId: contact?.id ?? null,
          type: "NOTE",
          content: note,
          createdById: user.id,
        },
      });
      return `Note saved${contact ? ` on ${contact.firstName}` : ""} 📝`;
    }

    case "DAILY_BRIEF": {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

      const [tasksToday, overdueCount, topDeal] = await Promise.all([
        db.task.findMany({
          where: {
            workspaceId,
            assignedToId: user.id,
            deleted: false,
            completed: false,
            dueDate: { gte: startOfDay, lt: endOfDay },
          },
          orderBy: { dueDate: "asc" },
        }),
        db.task.count({
          where: {
            workspaceId,
            assignedToId: user.id,
            deleted: false,
            completed: false,
            dueDate: { lt: startOfDay },
          },
        }),
        db.deal.findFirst({
          where: { workspaceId, stage: { notIn: ["WON", "LOST"] } },
          orderBy: { value: "desc" },
        }),
      ]);

      let msg = `Your ${format(new Date(), "EEEE, MMM d")} brief:\n\n`;
      msg +=
        tasksToday.length > 0
          ? `Tasks due today (${tasksToday.length}):\n` +
            tasksToday.map((t, i) => `${i + 1}. ${t.title}${fmtDue(t.dueDate)}`).join("\n")
          : "No tasks due today 🎉";
      if (overdueCount > 0) msg += `\n\n⚠️ Overdue: ${overdueCount} task(s)`;
      if (topDeal)
        msg += `\n\n💼 Top deal: ${topDeal.title} ($${Number(topDeal.value).toLocaleString()}, ${topDeal.stage})`;
      return msg;
    }

    case "WEEKLY_STATS": {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const staleCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const [tasksCompleted, tasksCreated, wonDeals, newContacts, staleCount] =
        await Promise.all([
          db.task.count({ where: { workspaceId, completedAt: { gte: weekAgo } } }),
          db.task.count({
            where: { workspaceId, createdAt: { gte: weekAgo }, deleted: false },
          }),
          db.deal.findMany({
            where: { workspaceId, stage: "WON", lastMovedAt: { gte: weekAgo } },
            select: { value: true },
          }),
          db.contact.count({ where: { workspaceId, createdAt: { gte: weekAgo } } }),
          db.deal.count({
            where: {
              workspaceId,
              lastMovedAt: { lt: staleCutoff },
              stage: { notIn: ["WON", "LOST"] },
            },
          }),
        ]);
      const wonValue = wonDeals.reduce((s, d) => s + Number(d.value), 0);
      return [
        "📊 Last 7 days:",
        "",
        `Tasks: ${tasksCompleted} completed / ${tasksCreated} created`,
        `Deals won: ${wonDeals.length} ($${wonValue.toLocaleString()})`,
        `New contacts: ${newContacts}`,
        `Stale deals: ${staleCount}`,
      ].join("\n");
    }

    case "ADD_STOCK": {
      const name = str(data, "name", "product", "title");
      if (!name) return "What's the product called? e.g. \"add product Widget, 50 pcs\"";
      const quantity = num(data, "quantity", "qty", "pcs") ?? 0;
      const price = num(data, "price", "unitPrice") ?? 0;
      const threshold = num(data, "threshold", "lowStockThreshold") ?? 0;
      const sku = str(data, "sku");

      try {
        const product = await db.$transaction(async (tx) => {
          const created = await tx.product.create({
            data: {
              workspaceId,
              name,
              sku: sku ?? null,
              unitPrice: price,
              quantity,
              lowStockThreshold: threshold,
            },
          });
          if (quantity > 0) {
            await tx.stockMovement.create({
              data: {
                workspaceId,
                productId: created.id,
                delta: quantity,
                reason: "Initial stock",
                createdById: user.id,
              },
            });
          }
          return created;
        });
        return `Added product: ${product.name} — ${product.quantity} in stock${
          sku ? ` (SKU ${sku})` : ""
        } 📦`;
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002"
        ) {
          return `A product with SKU ${sku} already exists.`;
        }
        throw err;
      }
    }

    case "ADJUST_STOCK": {
      const name = str(data, "name", "product");
      if (!name) return "Which product should I adjust?";
      const delta = num(data, "delta", "change", "amount");
      if (!delta) return `How many units in or out for ${name}? e.g. "stock out 3 ${name}"`;

      const product = await findProductByName(workspaceId, name);
      if (!product) return `I couldn't find a product matching "${name}".`;

      try {
        const updated = await adjustStock({
          product,
          delta,
          actorUserId: user.id,
        });
        const low = isLowStock(updated)
          ? `\n⚠️ Low stock — ${updated.quantity} left (threshold ${updated.lowStockThreshold})`
          : "";
        return `${updated.name}: ${delta > 0 ? "+" : ""}${delta} → ${
          updated.quantity
        } in stock ✅${low}`;
      } catch (err) {
        if (err instanceof StockError) return `${err.message} (${product.name})`;
        throw err;
      }
    }

    case "CHECK_STOCK": {
      const name = str(data, "name", "product");
      if (!name) return "Which product should I check?";
      const product = await findProductByName(workspaceId, name);
      if (!product) return `I couldn't find a product matching "${name}".`;
      const low = isLowStock(product) ? " ⚠️ LOW" : "";
      return `${product.name}: ${product.quantity} in stock (threshold ${product.lowStockThreshold})${low}`;
    }

    case "LIST_STOCK": {
      const lowOnly = data.lowOnly === true || data.low === true;
      const products = await db.product.findMany({
        where: { workspaceId, deleted: false },
      });
      const rows = (lowOnly ? products.filter(isLowStock) : products).sort(
        (a, b) =>
          Number(isLowStock(b)) - Number(isLowStock(a)) ||
          a.quantity - b.quantity
      );
      if (rows.length === 0)
        return lowOnly
          ? "No low-stock products 👍"
          : "No products yet. Say \"add product Widget, 50 pcs\" to create one.";
      const lines = rows
        .slice(0, 15)
        .map(
          (p, i) =>
            `${i + 1}. ${p.name} — ${p.quantity} pcs${
              isLowStock(p) ? " ⚠️" : ""
            }${p.sku ? ` (SKU ${p.sku})` : ""}`
        );
      const more = rows.length > 15 ? `\n…and ${rows.length - 15} more` : "";
      return `📦 ${lowOnly ? "Low stock" : "Stock"}:\n\n${lines.join("\n")}${more}`;
    }

    case "HELP":
      return HELP_TEXT;

    case "GREETING":
    case "UNKNOWN":
    default:
      return null; // use Gemini's conversational reply
  }
}

