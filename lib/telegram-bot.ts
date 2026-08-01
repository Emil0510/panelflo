import { format } from "date-fns";
import { Bot, InlineKeyboard } from "grammy";

import { db } from "@/lib/db";
import { triggerN8n } from "@/lib/n8n";
import { kv } from "@/lib/redis";

/**
 * Flo — @panelflo_bot. Commands are handled here; anything else is
 * forwarded to the n8n intent-detection workflow, which calls back to
 * POST /api/webhooks/bot-action with the parsed action + reply.
 */

let botInstance: Bot | null = null;

export function getTelegramBot(): Bot {
  if (botInstance) return botInstance;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || token === "replace-me") {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }

  const bot = new Bot(token);

  const HELP = [
    "Here's what I can do:",
    "",
    "/connect [code] — link this chat to your Panelflo account",
    "/tasks — your tasks due today",
    "/contacts — your latest contacts",
    "/help — this message",
    "",
    "Or just talk to me naturally:",
    "📇 \"add contact John from Acme\", \"update Sara's status to active\", \"show my contacts\", \"who is John?\"",
    "✅ \"show active tasks\", \"what's overdue?\", \"remind me to call Sara tomorrow 3pm\", \"done: send proposal\", \"assign it to Maya\"",
    "💼 \"new deal Acme contract $12000\", \"we won the Acme deal\", \"show pipeline\"",
    "📊 \"what's my day look like\", \"how did we do this week\"",
    "📝 \"note on John: asked for discount\"",
  ].join("\n");

  async function linkedUser(chatId: string) {
    const session = await db.botSession.findFirst({
      where: { platform: "TELEGRAM", chatId },
      include: { user: true },
    });
    return session?.user ?? null;
  }

  bot.command("start", (ctx) =>
    ctx.reply(
      `Hi, I'm Flo 🌿 — your Panelflo assistant.\n\n` +
        `Connect your account first: open Panelflo → Connect Bot, ` +
        `then send me /connect [code].\n\n${HELP}`
    )
  );

  bot.command("help", (ctx) => ctx.reply(HELP));

  bot.command("connect", async (ctx) => {
    const code = ctx.match?.trim();
    const chatId = String(ctx.chat.id);
    if (!code) {
      await ctx.reply("Usage: /connect 123456 — get your code from the Panelflo dashboard.");
      return;
    }

    const userId = await kv.get<string>(`tg-connect:${code}`);
    if (!userId) {
      await ctx.reply("That code is invalid or expired. Generate a new one in Panelflo → Connect Bot.");
      return;
    }

    await db.$transaction([
      db.botSession.upsert({
        where: { userId_platform: { userId, platform: "TELEGRAM" } },
        create: { userId, platform: "TELEGRAM", chatId },
        update: { chatId, lastActivity: new Date() },
      }),
      db.user.update({ where: { id: userId }, data: { telegramChatId: chatId } }),
    ]);
    await kv.del(`tg-connect:${code}`);

    await ctx.reply("Connected! You're now linked to Panelflo. Say hi! 👋");
  });

  bot.command("tasks", async (ctx) => {
    const user = await linkedUser(String(ctx.chat.id));
    if (!user) {
      await ctx.reply("Not connected yet — send /connect [code] first.");
      return;
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const tasks = await db.task.findMany({
      where: {
        assignedToId: user.id,
        deleted: false,
        completed: false,
        dueDate: { gte: startOfDay, lt: endOfDay },
      },
      orderBy: { dueDate: "asc" },
      take: 10,
    });

    if (tasks.length === 0) {
      await ctx.reply("No tasks due today — you're all caught up 🎉");
      return;
    }

    const list = tasks
      .map(
        (t, i) =>
          `${i + 1}. ${t.title}${t.dueDate ? ` (${format(t.dueDate, "HH:mm")})` : ""}`
      )
      .join("\n");

    const keyboard = new InlineKeyboard();
    tasks.forEach((t, i) => {
      keyboard.text(`✅ ${i + 1}`, `complete_task:${t.id}`);
      if ((i + 1) % 5 === 0) keyboard.row();
    });

    await ctx.reply(`Tasks due today:\n\n${list}`, { reply_markup: keyboard });
  });

  bot.command("contacts", async (ctx) => {
    const user = await linkedUser(String(ctx.chat.id));
    if (!user) {
      await ctx.reply("Not connected yet — send /connect [code] first.");
      return;
    }

    const contacts = await db.contact.findMany({
      where: { workspaceId: user.workspaceId },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    if (contacts.length === 0) {
      await ctx.reply("No contacts yet. Try: \"add contact John Smith from Acme\"");
      return;
    }

    const keyboard = new InlineKeyboard();
    contacts.forEach((c) => {
      keyboard
        .text(
          `${c.firstName} ${c.lastName ?? ""}`.trim(),
          `lookup_contact:${c.id}`
        )
        .row();
    });

    await ctx.reply("Your latest contacts:", { reply_markup: keyboard });
  });

  bot.callbackQuery(/complete_task:(.+)/, async (ctx) => {
    const taskId = ctx.match[1];
    const user = await linkedUser(String(ctx.chat?.id));
    if (!user) {
      await ctx.answerCallbackQuery({ text: "Not connected." });
      return;
    }

    const task = await db.task.findFirst({
      where: { id: taskId, workspaceId: user.workspaceId, deleted: false },
    });
    if (!task) {
      await ctx.answerCallbackQuery({ text: "Task not found." });
      return;
    }

    await db.task.update({
      where: { id: task.id },
      data: { completed: true, completedAt: new Date(), status: "DONE" },
    });
    await db.activity.create({
      data: {
        workspaceId: user.workspaceId,
        contactId: task.contactId,
        type: "TASK_COMPLETED",
        content: `Task completed via Telegram: "${task.title}"`,
        createdById: user.id,
      },
    });

    await ctx.answerCallbackQuery({ text: "Done ✅" });
    await ctx.reply(`Marked complete: "${task.title}"`);
  });

  bot.callbackQuery(/lookup_contact:(.+)/, async (ctx) => {
    const contactId = ctx.match[1];
    const user = await linkedUser(String(ctx.chat?.id));
    if (!user) {
      await ctx.answerCallbackQuery({ text: "Not connected." });
      return;
    }

    const contact = await db.contact.findFirst({
      where: { id: contactId, workspaceId: user.workspaceId },
      include: { deals: { where: { stage: { notIn: ["WON", "LOST"] } } } },
    });
    await ctx.answerCallbackQuery();
    if (!contact) {
      await ctx.reply("Contact not found.");
      return;
    }

    await ctx.reply(
      [
        `${contact.firstName} ${contact.lastName ?? ""}`.trim(),
        contact.company ? `🏢 ${contact.company}` : null,
        contact.email ? `✉️ ${contact.email}` : null,
        contact.phone ? `📞 ${contact.phone}` : null,
        `Status: ${contact.status}`,
        contact.deals.length
          ? `Open deals: ${contact.deals.map((d) => d.title).join(", ")}`
          : null,
      ]
        .filter(Boolean)
        .join("\n")
    );
  });

  // Everything else → n8n intent detection.
  bot.on("message:text", async (ctx) => {
    const chatId = String(ctx.chat.id);
    const user = await linkedUser(chatId);
    if (!user) {
      await ctx.reply("I don't know you yet 🙂 Send /connect [code] from your Panelflo dashboard.");
      return;
    }

    await db.botSession.updateMany({
      where: { userId: user.id, platform: "TELEGRAM" },
      data: { lastActivity: new Date() },
    });

    await triggerN8n({
      event: "bot-message",
      userId: user.id,
      platform: "telegram",
      chatId,
      message: ctx.message.text,
      workspaceId: user.workspaceId,
    });
  });

  botInstance = bot;
  return bot;
}

export async function sendTelegramMessage(chatId: string, text: string) {
  const bot = getTelegramBot();
  await bot.api.sendMessage(chatId, text);
}
