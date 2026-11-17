"use client";
import { Plus, Search, Users } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { useDebounce } from "@/hooks/use-debounce";
import { useSession } from "@/hooks/use-session";
import { api, fetcher, qs } from "@/lib/api";
import { CATEGORIES, CATEGORY_LABEL } from "@/lib/format";
import type { Category, Paginated, Role, Team, User } from "@/lib/types";

const ROLES: Role[] = ["USER", "AGENT", "ADMIN"];
const ROLE_LABEL: Record<Role, string> = { USER: "Customer", AGENT: "Agent", ADMIN: "Admin" };

function TeamModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await api("/teams", { method: "POST", body: { name, category: category || null } });
      toast.success(`${name} created`);
      setName(""); setCategory("");
      onSaved(); onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create the team");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="Create team" description="A team that owns a category receives tickets the model classifies into it."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} loading={saving} disabled={name.trim().length < 2}>Create team</Button></>}>
      <div className="space-y-4">
        <Field label="Name">{(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
        <Field label="Routes category" optional hint="Each category can belong to one team.">
          {(p) => <Select {...p} value={category} onChange={(e) => setCategory(e.target.value as Category)}><option value="">None</option>{CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}</Select>}
        </Field>
      </div>
    </Modal>
  );
}

export default function UsersPage() {
  const toast = useToast();
  const { user: me } = useSession();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [page, setPage] = useState(1);
  const [teamModal, setTeamModal] = useState(false);
  const q = useDebounce(search);
  const users = useSWR<Paginated<User>>(`/users${qs({ q, role, page, pageSize: 20 })}`, fetcher, { keepPreviousData: true });
  const teams = useSWR<Team[]>("/teams", fetcher);

  const update = async (u: User, body: Record<string, unknown>, msg: string) => {
    try {
      await api(`/users/${u.id}`, { method: "PATCH", body });
      await Promise.all([users.mutate(), teams.mutate()]);
      toast.success(msg);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  return (
    <>
      <PageHeader title="Users & teams" description="Manage roles, team membership and which team owns each AI category." actions={<Button onClick={() => setTeamModal(true)}><Plus className="h-4 w-4" />New team</Button>} />

      <Card className="mb-6">
        <CardHeader title="Teams" description="Routing table: predicted category to owning team" />
        {teams.error ? <ErrorState onRetry={() => teams.mutate()} /> : !teams.data ? <SkeletonRows rows={3} /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead><tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.13em] text-ink-muted">
                <th scope="col" className="px-4 py-2.5 font-semibold sm:px-5">Team</th><th scope="col" className="px-3 py-2.5 font-semibold">Routes category</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Members</th><th scope="col" className="px-4 py-2.5 text-right font-semibold sm:px-5">Open tickets</th>
              </tr></thead>
              <tbody className="divide-y divide-line">
                {teams.data.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-2.5 sm:px-5"><p className="font-medium">{t.name}</p>{t.description && <p className="text-xs text-ink-muted">{t.description}</p>}</td>
                    <td className="px-3 py-2.5 text-ink-soft">{t.category ? CATEGORY_LABEL[t.category] : "—"}</td>
                    <td className="px-3 py-2.5 text-ink-soft">{t.members.map((m) => m.name).join(", ") || <span className="text-ink-faint">No members</span>}</td>
                    <td className="px-4 py-2.5 text-right font-mono sm:px-5">{t._count.tickets}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex flex-col gap-2 border-b border-line p-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
            <Input aria-label="Search users" placeholder="Search by name or email" className="pl-8" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select aria-label="Filter by role" className="sm:w-44" value={role} onChange={(e) => { setRole(e.target.value as Role); setPage(1); }}>
            <option value="">All roles</option>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </Select>
        </div>
        {users.error ? <ErrorState message={users.error.message} onRetry={() => users.mutate()} />
          : !users.data ? <SkeletonRows />
          : !users.data.items.length ? <EmptyState icon={Users} title="No users match" />
          : (
            <>
              <ul className="divide-y divide-line">
                {users.data.items.map((u) => (
                  <li key={u.id} className="flex flex-col gap-3 px-4 py-3 sm:px-5 md:flex-row md:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{u.name}{u.id === me?.id && <span className="ml-1.5 text-xs font-normal text-ink-muted">(you)</span>}{!u.isActive && <span className="ml-2 rounded-full bg-ink/[0.06] px-2 py-0.5 text-xs text-ink-muted">Deactivated</span>}</p>
                      <p className="truncate text-xs text-ink-muted">{u.email}{u.role !== "USER" && u._count ? `, ${u._count.assignedTickets} open assigned` : ""}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 md:flex md:w-auto">
                      <Select aria-label={`Role for ${u.name}`} className="md:w-32" value={u.role} disabled={u.id === me?.id} onChange={(e) => update(u, { role: e.target.value }, `${u.name} is now ${ROLE_LABEL[e.target.value as Role].toLowerCase()}`)}>
                        {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                      </Select>
                      <Select aria-label={`Team for ${u.name}`} className="md:w-44" value={u.teamId ?? ""} disabled={u.role === "USER"} onChange={(e) => update(u, { teamId: e.target.value || null }, "Team updated")}>
                        <option value="">No team</option>{teams.data?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </Select>
                      <Button variant="ghost" size="sm" className="col-span-2 md:col-span-1" disabled={u.id === me?.id} onClick={() => update(u, { isActive: !u.isActive }, u.isActive ? `${u.name} deactivated` : `${u.name} reactivated`)}>
                        {u.isActive ? "Deactivate" : "Reactivate"}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
              <Pagination page={users.data.page} totalPages={users.data.totalPages} total={users.data.total} onPage={setPage} />
            </>
          )}
      </Card>
      <TeamModal open={teamModal} onClose={() => setTeamModal(false)} onSaved={() => teams.mutate()} />
    </>
  );
}
