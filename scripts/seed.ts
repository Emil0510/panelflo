/**
 * Demo seed: one workspace, two users, contacts, deals, tasks.
 * Run: npx tsx scripts/seed.ts  (or: npx ts-node scripts/seed.ts)
 * Login: demo@panelflo.com / password123
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const password = await hash("password123", 12);

  const workspace = await db.workspace.upsert({
    where: { slug: "demo" },
    update: {},
    create: {
      name: "Demo Workspace",
      slug: "demo",
      plan: "GROWTH",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      timezone: "Asia/Baku",
    },
  });

  const admin = await db.user.upsert({
    where: { email: "demo@panelflo.com" },
    update: {},
    create: {
      email: "demo@panelflo.com",
      name: "Demo Admin",
      password,
      role: "ADMIN",
      workspaceId: workspace.id,
    },
  });

  const member = await db.user.upsert({
    where: { email: "member@panelflo.com" },
    update: {},
    create: {
      email: "member@panelflo.com",
      name: "Maya Member",
      password,
      role: "MEMBER",
      workspaceId: workspace.id,
    },
  });

  const acme = await db.contact.create({
    data: {
      workspaceId: workspace.id,
      firstName: "John",
      lastName: "Smith",
      email: "john@acme.com",
      phone: "+994501234567",
      company: "Acme Corp",
      status: "ACTIVE",
      assignedToId: admin.id,
    },
  });

  const globex = await db.contact.create({
    data: {
      workspaceId: workspace.id,
      firstName: "Sara",
      lastName: "Lee",
      email: "sara@globex.com",
      company: "Globex",
      status: "LEAD",
      assignedToId: member.id,
    },
  });

  await db.deal.createMany({
    data: [
      {
        workspaceId: workspace.id,
        contactId: acme.id,
        title: "Acme annual contract",
        value: 12000,
        stage: "PROPOSAL",
        assignedToId: admin.id,
        lastMovedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
      },
      {
        workspaceId: workspace.id,
        contactId: globex.id,
        title: "Globex pilot",
        value: 3500,
        stage: "CONTACTED",
        assignedToId: member.id,
      },
    ],
  });

  await db.task.createMany({
    data: [
      {
        workspaceId: workspace.id,
        title: "Send proposal to Acme",
        dueDate: new Date(),
        assignedToId: admin.id,
        contactId: acme.id,
        createdById: admin.id,
      },
      {
        workspaceId: workspace.id,
        title: "Follow up with Sara",
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        assignedToId: member.id,
        contactId: globex.id,
        createdById: admin.id,
      },
    ],
  });

  await db.activity.create({
    data: {
      workspaceId: workspace.id,
      contactId: acme.id,
      type: "NOTE",
      content: "John asked for updated pricing on the annual plan.",
      createdById: admin.id,
    },
  });

  const widget = await db.product.create({
    data: {
      workspaceId: workspace.id,
      name: "Widget Pro",
      sku: "WGT-1",
      unitPrice: 24.5,
      quantity: 50,
      lowStockThreshold: 10,
    },
  });
  const starterKit = await db.product.create({
    data: {
      workspaceId: workspace.id,
      name: "Starter Kit",
      unitPrice: 89,
      quantity: 4,
      lowStockThreshold: 5,
    },
  });
  await db.product.create({
    data: {
      workspaceId: workspace.id,
      name: "Cable Pack",
      unitPrice: 6.99,
      quantity: 120,
      lowStockThreshold: 20,
    },
  });
  await db.stockMovement.createMany({
    data: [
      {
        workspaceId: workspace.id,
        productId: widget.id,
        delta: 50,
        reason: "Initial stock",
        createdById: admin.id,
      },
      {
        workspaceId: workspace.id,
        productId: starterKit.id,
        delta: 10,
        reason: "Initial stock",
        createdById: admin.id,
      },
      {
        workspaceId: workspace.id,
        productId: starterKit.id,
        delta: -6,
        reason: "Sold to Acme",
        createdById: admin.id,
      },
    ],
  });

  console.log("Seeded demo workspace. Login: demo@panelflo.com / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
