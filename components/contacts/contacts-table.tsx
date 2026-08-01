"use client";

import { ArrowUpDown, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { ContactFormSheet, type WorkspaceUser } from "@/components/contacts/contact-form";
import { CsvImportDialog } from "@/components/contacts/csv-import-dialog";
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
  status: "LEAD" | "ACTIVE" | "INACTIVE";
  assignedTo: { id: string; name: string | null } | null;
};

const STATUS_STYLES: Record<ContactRow["status"], string> = {
  LEAD: "bg-amber-100 text-amber-800",
  ACTIVE: "bg-primary-light text-primary-dark",
  INACTIVE: "bg-slate-100 text-slate-600",
};

type SortKey = "name" | "company" | "status";

export function ContactsTable({
  contacts,
  users,
}: {
  contacts: ContactRow[];
  users: WorkspaceUser[];
}) {
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
            <SelectItem value="LEAD">Lead</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
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
        <div className="ml-auto flex gap-2">
          <CsvImportDialog />
          <ContactFormSheet
            users={users}
            trigger={
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Contact
              </Button>
            }
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 border-b bg-card">
            <tr>
              <th className="w-10 px-3 py-3 text-left text-xs font-medium text-muted-foreground">#</th>
              {(
                [
                  ["name", "Name"],
                  ["company", "Company"],
                ] as [SortKey, string][]
              ).map(([key, label]) => (
                <th key={key} className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">
                  <button
                    className="flex items-center gap-1 hover:text-foreground"
                    onClick={() => toggleSort(key)}
                  >
                    {label}
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
              ))}
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Email</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Phone</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">
                <button
                  className="flex items-center gap-1 hover:text-foreground"
                  onClick={() => toggleSort("status")}
                >
                  Status
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Assigned To</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-muted-foreground">
                  No contacts found. Add your first contact to get started.
                </td>
              </tr>
            ) : (
              filtered.map((c, i) => (
                <tr
                  key={c.id}
                  className="cursor-pointer border-b last:border-0 transition-colors hover:bg-muted/40"
                  onClick={() => router.push(`/contacts/${c.id}`)}
                >
                  <td className="px-3 py-3 text-xs text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-3 font-medium">{c.firstName} {c.lastName ?? ""}</td>
                  <td className="px-3 py-3 text-muted-foreground">{c.company ?? "—"}</td>
                  <td className="px-3 py-3 text-muted-foreground">{c.email ?? "—"}</td>
                  <td className="px-3 py-3 text-muted-foreground">{c.phone ?? "—"}</td>
                  <td className="px-3 py-3">
                    <Badge className={STATUS_STYLES[c.status]} variant="outline">
                      {c.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">
                    {c.assignedTo ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="bg-primary-light text-[10px] text-primary">
                            {(c.assignedTo.name ?? "?")
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{c.assignedTo.name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
