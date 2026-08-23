"use client";

import { ArrowUpDown, Plus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { ContactFormSheet, type WorkspaceUser } from "@/components/contacts/contact-form";
import { CsvImportDialog } from "@/components/contacts/csv-import-dialog";
import { ManageStatusesPopover } from "@/components/contacts/manage-statuses-popover";
import { EmptyState } from "@/components/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ContactRow = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: string;
  assignedTo: { id: string; name: string | null } | null;
};

export type ContactStatusOption = {
  id: string;
  key: string;
  label: string;
  color: string;
};

type SortKey = "name" | "company" | "status";

const AVATAR_PALETTE = [
  "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
];

function avatarClass(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ContactsTable({
  contacts,
  users,
  statuses,
}: {
  contacts: ContactRow[];
  users: WorkspaceUser[];
  statuses: ContactStatusOption[];
}) {
  const statusByKey = new Map(statuses.map((s) => [s.key, s]));
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const rows = contacts.filter((c) => {
      const matchesSearch =
        !q ||
        `${c.firstName} ${c.lastName ?? ""}`.toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.company ?? "").toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      const matchesAssignee =
        assigneeFilter === "all" || c.assignedTo?.id === assigneeFilter;
      return matchesSearch && matchesStatus && matchesAssignee;
    });

    const dir = sortAsc ? 1 : -1;
    return rows.sort((a, b) => {
      const va =
        sortKey === "name"
          ? `${a.firstName} ${a.lastName ?? ""}`
          : sortKey === "company"
            ? (a.company ?? "")
            : a.status;
      const vb =
        sortKey === "name"
          ? `${b.firstName} ${b.lastName ?? ""}`
          : sortKey === "company"
            ? (b.company ?? "")
            : b.status;
      return va.localeCompare(vb) * dir;
    });
  }, [contacts, search, statusFilter, assigneeFilter, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">Contacts</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {contacts.length}
          </span>
        </div>
        <div className="flex gap-2">
          <CsvImportDialog />
          <ContactFormSheet
            users={users}
            statuses={statuses}
            trigger={
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Contact
              </Button>
            }
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search name, email, company…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-64"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s.key} value={s.key}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ManageStatusesPopover statuses={statuses} />
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All assignees</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name ?? "Unnamed"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 border-b bg-card">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                <button
                  className="flex items-center gap-1 hover:text-foreground"
                  onClick={() => toggleSort("name")}
                >
                  Contact
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                <button
                  className="flex items-center gap-1 hover:text-foreground"
                  onClick={() => toggleSort("company")}
                >
                  Company
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Phone</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                <button
                  className="flex items-center gap-1 hover:text-foreground"
                  onClick={() => toggleSort("status")}
                >
                  Status
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Assigned To</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-0">
                  <EmptyState
                    icon={Users}
                    title={contacts.length === 0 ? "No contacts yet" : "No contacts match your filters"}
                    description={
                      contacts.length === 0
                        ? "Add your first contact to start building your CRM."
                        : "Try adjusting your search or filters."
                    }
                  />
                </td>
              </tr>
            ) : (
              filtered.map((c) => {
                const fullName = `${c.firstName} ${c.lastName ?? ""}`.trim();
                return (
                  <tr
                    key={c.id}
                    className="cursor-pointer border-b last:border-0 transition-colors hover:bg-muted/40"
                    onClick={() => router.push(`/contacts/${c.id}`)}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarFallback className={`text-xs font-semibold ${avatarClass(c.id)}`}>
                            {initials(fullName) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium leading-tight">{fullName || "Unnamed"}</p>
                          <p className="truncate text-xs text-muted-foreground">{c.email ?? "No email"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">{c.company ?? "—"}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">{c.phone ?? "—"}</td>
                    <td className="px-4 py-3.5">
                      <Badge
                        variant="outline"
                        style={{
                          backgroundColor: `${statusByKey.get(c.status)?.color ?? "#64748B"}1a`,
                          color: statusByKey.get(c.status)?.color ?? "#64748B",
                          borderColor: "transparent",
                        }}
                      >
                        {statusByKey.get(c.status)?.label ?? c.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      {c.assignedTo ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="bg-primary-light text-[10px] text-primary">
                              {initials(c.assignedTo.name ?? "?") || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{c.assignedTo.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
