/**
 * Marketing demo seed — rich data for product video / screenshots.
 *
 * Workspace : Apex Solutions   (slug: apex)
 * Admin     : demo@panelflo.com / demo2026
 * Member    : sarah@apexsolutions.com / demo2026
 *
 * Run:  DATABASE_URL='postgresql://emilabdurahmanli@localhost:5433/panelflo' \
 *         npx tsx scripts/seed-marketing.ts
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const db = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;
const now = new Date();
const ago  = (d: number) => new Date(now.getTime() - d * DAY);
const from = (d: number) => new Date(now.getTime() + d * DAY);

async function main() {
  const password = await hash("demo2026", 12);

  // ─── Workspace ────────────────────────────────────────────────────────────
  const workspace = await db.workspace.upsert({
    where: { slug: "apex" },
    update: { name: "Apex Solutions", plan: "PRO", subscriptionActive: true },
    create: {
      name: "Apex Solutions",
      slug: "apex",
      plan: "PRO",
      subscriptionActive: true,
      trialEndsAt: from(30),
      timezone: "Europe/London",
    },
  });

  // ─── Users ────────────────────────────────────────────────────────────────
  const admin = await db.user.upsert({
    where: { email: "demo@panelflo.com" },
    update: { name: "Alex Morgan", workspaceId: workspace.id },
    create: {
      email: "demo@panelflo.com",
      name: "Alex Morgan",
      password,
      role: "ADMIN",
      workspaceId: workspace.id,
    },
  });

  const member = await db.user.upsert({
    where: { email: "sarah@apexsolutions.com" },
    update: { name: "Sarah Kim", workspaceId: workspace.id },
    create: {
      email: "sarah@apexsolutions.com",
      name: "Sarah Kim",
      password,
      role: "MEMBER",
      workspaceId: workspace.id,
    },
  });

  // ─── Clean slate for demo data ─────────────────────────────────────────────
  await db.activity.deleteMany({ where: { workspaceId: workspace.id } });
  await db.stockMovement.deleteMany({ where: { workspaceId: workspace.id } });
  await db.task.deleteMany({ where: { workspaceId: workspace.id } });
  await db.deal.deleteMany({ where: { workspaceId: workspace.id } });
  await db.product.deleteMany({ where: { workspaceId: workspace.id } });
  await db.contact.deleteMany({ where: { workspaceId: workspace.id } });
  await db.notification.deleteMany({ where: { workspaceId: workspace.id } });

  // ─── Contacts ─────────────────────────────────────────────────────────────
  const contacts = await Promise.all([
    db.contact.create({ data: { workspaceId: workspace.id, firstName: "Marcus",   lastName: "Chen",       email: "marcus@techventure.io",   phone: "+1 415 209 3847", company: "TechVenture Inc",       status: "ACTIVE",   assignedToId: admin.id,  notes: "Key decision maker. Interested in enterprise tier."  } }),
    db.contact.create({ data: { workspaceId: workspace.id, firstName: "Emma",     lastName: "Rodriguez",  email: "emma@globaltrade.co",     phone: "+1 212 874 5512", company: "GlobalTrade Co",        status: "LEAD",     assignedToId: member.id                                    } }),
    db.contact.create({ data: { workspaceId: workspace.id, firstName: "James",    lastName: "Wilson",     email: "james@buildright.com",    phone: "+44 20 7946 0391", company: "BuildRight Construction", status: "ACTIVE",  assignedToId: admin.id,  notes: "Signed annual contract. Very happy with onboarding." } }),
    db.contact.create({ data: { workspaceId: workspace.id, firstName: "Sophia",   lastName: "Patel",      email: "sophia@innovatetech.in",  phone: "+91 98204 67812", company: "InnovateTech",          status: "LEAD",     assignedToId: member.id                                    } }),
    db.contact.create({ data: { workspaceId: workspace.id, firstName: "David",    lastName: "Park",       email: "david@parkassociates.com",phone: "+1 650 334 7821", company: "Park & Associates",     status: "ACTIVE",   assignedToId: admin.id                                     } }),
    db.contact.create({ data: { workspaceId: workspace.id, firstName: "Lisa",     lastName: "Thompson",   email: "lisa@meridianmedia.com",  phone: "+1 310 562 9043", company: "Meridian Media",        status: "INACTIVE", assignedToId: member.id, notes: "Contract not renewed. Follow up in Q1."              } }),
    db.contact.create({ data: { workspaceId: workspace.id, firstName: "Ryan",     lastName: "Foster",     email: "ryan@nexgensystems.com",  phone: "+1 512 748 2936", company: "NexGen Systems",        status: "LEAD",     assignedToId: admin.id                                     } }),
    db.contact.create({ data: { workspaceId: workspace.id, firstName: "Nina",     lastName: "Okonkwo",    email: "nina@vertexcapital.com",  phone: "+44 20 3456 7890", company: "Vertex Capital",       status: "ACTIVE",   assignedToId: member.id, notes: "CFO. Requires quarterly invoices."                   } }),
    db.contact.create({ data: { workspaceId: workspace.id, firstName: "Carlos",   lastName: "Santos",     email: "carlos@sunrisepartners.mx",phone: "+52 55 8764 3210", company: "Sunrise Partners",   status: "LEAD",     assignedToId: admin.id                                     } }),
    db.contact.create({ data: { workspaceId: workspace.id, firstName: "Anna",     lastName: "Kowalski",   email: "anna@eurolink.eu",        phone: "+48 22 567 8901", company: "EuroLink Trading",      status: "ACTIVE",   assignedToId: member.id, notes: "Procurement head. Prefers email."                    } }),
  ]);
  const [marcus, emma, james, sophia, , , ryan, nina, carlos, anna] = contacts;

  // ─── Deals ────────────────────────────────────────────────────────────────
  await db.deal.createMany({
    data: [
      { workspaceId: workspace.id, contactId: marcus.id,  title: "TechVenture Annual Contract",  value: 24000, stage: "PROPOSAL",  assignedToId: admin.id,  lastMovedAt: ago(3) },
      { workspaceId: workspace.id, contactId: emma.id,    title: "GlobalTrade Pilot Program",    value:  8500, stage: "CONTACTED", assignedToId: member.id, lastMovedAt: ago(8) },
      { workspaceId: workspace.id, contactId: james.id,   title: "BuildRight Software Bundle",   value: 18000, stage: "WON",       assignedToId: admin.id,  lastMovedAt: ago(14) },
      { workspaceId: workspace.id, contactId: sophia.id,  title: "InnovateTech SaaS License",    value: 36000, stage: "PROPOSAL",  assignedToId: member.id, lastMovedAt: ago(2) },
      { workspaceId: workspace.id, contactId: ryan.id,    title: "NexGen Enterprise Suite",      value: 52000, stage: "CONTACTED", assignedToId: admin.id,  lastMovedAt: ago(11) },
      { workspaceId: workspace.id, contactId: nina.id,    title: "Vertex Capital Platform",      value: 15000, stage: "WON",       assignedToId: member.id, lastMovedAt: ago(21) },
      { workspaceId: workspace.id, contactId: carlos.id,  title: "Sunrise Partners Onboarding",  value:  6200, stage: "LEAD",      assignedToId: admin.id,  lastMovedAt: ago(5) },
      { workspaceId: workspace.id, contactId: anna.id,    title: "EuroLink Enterprise License",  value: 29000, stage: "LEAD",      assignedToId: member.id, lastMovedAt: ago(1) },
    ],
  });

  // ─── Tasks ────────────────────────────────────────────────────────────────
  await db.task.createMany({
    data: [
      { workspaceId: workspace.id, title: "Send proposal to TechVenture",        dueDate: from(0),  priority: "HIGH",   status: "TODO",        assignedToId: admin.id,  contactId: marcus.id, createdById: admin.id  },
      { workspaceId: workspace.id, title: "Schedule product demo with InnovateTech", dueDate: from(2),  priority: "HIGH",   status: "IN_PROGRESS", assignedToId: member.id, contactId: sophia.id, createdById: admin.id  },
      { workspaceId: workspace.id, title: "Follow up with NexGen — no response",  dueDate: ago(3),   priority: "URGENT", status: "TODO",        assignedToId: admin.id,  contactId: ryan.id,   createdById: admin.id  },
      { workspaceId: workspace.id, title: "Prepare Q3 pipeline report",           dueDate: from(5),  priority: "MEDIUM", status: "IN_PROGRESS", assignedToId: admin.id,                        createdById: admin.id  },
      { workspaceId: workspace.id, title: "Review BuildRight contract terms",      dueDate: ago(10),  priority: "HIGH",   status: "DONE",        assignedToId: admin.id,  contactId: james.id,  createdById: admin.id,  completed: true, completedAt: ago(9)  },
      { workspaceId: workspace.id, title: "Call Sophia — custom pricing request",  dueDate: from(1),  priority: "URGENT", status: "TODO",        assignedToId: member.id, contactId: sophia.id, createdById: admin.id  },
      { workspaceId: workspace.id, title: "Clean up duplicate contacts",           dueDate: from(3),  priority: "LOW",    status: "TODO",        assignedToId: member.id,                       createdById: admin.id  },
      { workspaceId: workspace.id, title: "Team sync — weekly prep",               dueDate: from(2),  priority: "MEDIUM", status: "TODO",        assignedToId: admin.id,                        createdById: admin.id  },
      { workspaceId: workspace.id, title: "Send onboarding kit to Carlos",         dueDate: from(4),  priority: "MEDIUM", status: "IN_PROGRESS", assignedToId: member.id, contactId: carlos.id, createdById: member.id },
      { workspaceId: workspace.id, title: "Invoice Vertex Capital — Q3",           dueDate: ago(2),   priority: "URGENT", status: "TODO",        assignedToId: admin.id,  contactId: nina.id,   createdById: admin.id  },
    ],
  });

  // ─── Stock / Products ─────────────────────────────────────────────────────
  const [saas, starter, enterprise, training, support, apiAddon] = await Promise.all([
    db.product.create({ data: { workspaceId: workspace.id, name: "SaaS Pro License",      sku: "LIC-PRO",  unitPrice: 299,  quantity: 45, lowStockThreshold: 10 } }),
    db.product.create({ data: { workspaceId: workspace.id, name: "Starter Pack",           sku: "PKG-STR",  unitPrice:  89,  quantity:  3, lowStockThreshold:  5 } }),
    db.product.create({ data: { workspaceId: workspace.id, name: "Enterprise Bundle",      sku: "BDL-ENT",  unitPrice: 999,  quantity: 12, lowStockThreshold:  3 } }),
    db.product.create({ data: { workspaceId: workspace.id, name: "Training Module",        sku: "TRN-001",  unitPrice: 149,  quantity: 28, lowStockThreshold:  5 } }),
    db.product.create({ data: { workspaceId: workspace.id, name: "Priority Support",       sku: "SUP-PRI",  unitPrice: 199,  quantity: 67, lowStockThreshold: 10 } }),
    db.product.create({ data: { workspaceId: workspace.id, name: "API Add-on",             sku: "API-ADD",  unitPrice:  49,  quantity:  8, lowStockThreshold:  5 } }),
  ]);

  await db.stockMovement.createMany({
    data: [
      { workspaceId: workspace.id, productId: saas.id,       delta:  50, reason: "Initial stock",        createdById: admin.id },
      { workspaceId: workspace.id, productId: saas.id,       delta:  -5, reason: "Sold — TechVenture",   createdById: admin.id },
      { workspaceId: workspace.id, productId: starter.id,    delta:  15, reason: "Initial stock",        createdById: admin.id },
      { workspaceId: workspace.id, productId: starter.id,    delta: -12, reason: "Bulk client sale",     createdById: member.id },
      { workspaceId: workspace.id, productId: enterprise.id, delta:  12, reason: "Initial stock",        createdById: admin.id },
      { workspaceId: workspace.id, productId: training.id,   delta:  30, reason: "Initial stock",        createdById: admin.id },
      { workspaceId: workspace.id, productId: training.id,   delta:  -2, reason: "Sold — InnovateTech",  createdById: member.id },
      { workspaceId: workspace.id, productId: support.id,    delta:  67, reason: "Initial stock",        createdById: admin.id },
      { workspaceId: workspace.id, productId: apiAddon.id,   delta:  10, reason: "Initial stock",        createdById: admin.id },
      { workspaceId: workspace.id, productId: apiAddon.id,   delta:  -2, reason: "Sold — EuroLink",      createdById: member.id },
    ],
  });

  // ─── Activity feed ─────────────────────────────────────────────────────────
  await db.activity.createMany({
    data: [
      { workspaceId: workspace.id, contactId: marcus.id,  type: "NOTE",           content: "Marcus asked about extending trial to 30 days. Agreed — follow up with contract.",       createdById: admin.id,  createdAt: ago(4) },
      { workspaceId: workspace.id, contactId: james.id,   type: "DEAL_MOVED",     content: "Deal moved to WON — BuildRight Software Bundle ($18,000)",                               createdById: admin.id,  createdAt: ago(14) },
      { workspaceId: workspace.id,                        type: "BOT_MESSAGE",    content: "Weekly digest sent via Telegram: 3 overdue tasks, 2 deals in PROPOSAL",                 createdById: null,      createdAt: ago(7) },
      { workspaceId: workspace.id, contactId: sophia.id,  type: "NOTE",           content: "Sophia wants a custom demo showing AI bot + pipeline together. Schedule for this week.", createdById: member.id, createdAt: ago(2) },
      { workspaceId: workspace.id, contactId: james.id,   type: "TASK_COMPLETED", content: "Task completed: Review BuildRight contract terms",                                        createdById: admin.id,  createdAt: ago(9) },
      { workspaceId: workspace.id, contactId: nina.id,    type: "DEAL_MOVED",     content: "Deal moved to WON — Vertex Capital Platform ($15,000)",                                  createdById: member.id, createdAt: ago(21) },
      { workspaceId: workspace.id,                        type: "STOCK_MOVEMENT", content: "Bulk client sale: Starter Pack −12 — bulk client sale",                                  createdById: member.id, createdAt: ago(3) },
      { workspaceId: workspace.id, contactId: marcus.id,  type: "NOTE",           content: "Demo call went well — Marcus will loop in their CTO for the next meeting.",              createdById: admin.id,  createdAt: ago(1) },
    ],
  });

  // ─── Notifications ────────────────────────────────────────────────────────
  await db.notification.createMany({
    data: [
      { workspaceId: workspace.id, userId: admin.id,  type: "TASK",   title: "3 tasks overdue",             body: "Follow up with NexGen and 2 others are past due.", read: false, link: "/tasks"    },
      { workspaceId: workspace.id, userId: admin.id,  type: "DEAL",   title: "New deal in PROPOSAL",        body: "InnovateTech SaaS License — $36,000",             read: false, link: "/pipeline" },
      { workspaceId: workspace.id, userId: admin.id,  type: "SYSTEM", title: "Low stock: Starter Pack",     body: "3 left (threshold 5)",                            read: false, link: "/stock"    },
      { workspaceId: workspace.id, userId: member.id, type: "TASK",   title: "Task assigned to you",        body: "Call Sophia — custom pricing request",            read: false, link: "/tasks"    },
      { workspaceId: workspace.id, userId: admin.id,  type: "BOT",    title: "Weekly digest sent",          body: "Telegram digest delivered to your workspace",     read: true,  link: "/settings" },
    ],
  });

  // ─── Pipeline columns ─────────────────────────────────────────────────────
  // Ensure default columns exist (upsert by workspaceId+key)
  for (const col of [
    { key: "LEAD",      label: "Lead",      color: "#64748B", order: 0, isSystem: true },
    { key: "CONTACTED", label: "Contacted", color: "#1D4ED8", order: 1, isSystem: true },
    { key: "PROPOSAL",  label: "Proposal",  color: "#B45309", order: 2, isSystem: true },
    { key: "WON",       label: "Won",       color: "#2B5748", order: 3, isSystem: true, isWonStage: true },
    { key: "LOST",      label: "Lost",      color: "#DC2626", order: 4, isSystem: true },
  ]) {
    await db.pipelineColumn.upsert({
      where: { workspaceId_key: { workspaceId: workspace.id, key: col.key } },
      update: {},
      create: { workspaceId: workspace.id, ...col },
    });
  }

  // Task columns
  for (const col of [
    { key: "TODO",        label: "To Do",      color: "#64748B", order: 0, isSystem: true },
    { key: "IN_PROGRESS", label: "In Progress",color: "#1D4ED8", order: 1, isSystem: true },
    { key: "IN_REVIEW",   label: "In Review",  color: "#B45309", order: 2, isSystem: true },
    { key: "DONE",        label: "Done",       color: "#2B5748", order: 3, isSystem: true },
  ]) {
    await db.taskColumn.upsert({
      where: { workspaceId_key: { workspaceId: workspace.id, key: col.key } },
      update: {},
      create: { workspaceId: workspace.id, ...col },
    });
  }

  console.log(`
✅ Marketing demo seeded.

Workspace : Apex Solutions  (slug: apex)
────────────────────────────────────────
Login     : demo@panelflo.com
Password  : demo2026
────────────────────────────────────────
Also      : sarah@apexsolutions.com / demo2026  (MEMBER)
────────────────────────────────────────
Data      : 10 contacts · 8 deals · 10 tasks
           6 stock products (Starter Pack LOW)
           8 activities · 5 notifications
  `);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
