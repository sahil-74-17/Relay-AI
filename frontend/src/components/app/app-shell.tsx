"use client";
import { clsx } from "clsx";
import {
  BookOpen, ClipboardCheck, LayoutDashboard, LogOut, Menu as MenuIcon, MessageSquareText, Radar, Settings, Ticket, Users, X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { useSession } from "@/hooks/use-session";
import { ApiError, fetcher } from "@/lib/api";
import type { Dashboard, Role } from "@/lib/types";
import { VerveLogo } from "@/components/verve/logo";
import { Menu } from "../ui/menu";
import { Skeleton } from "../ui/states";
import { ThemeToggle } from "./theme-toggle";

interface NavItem { href: string; label: string; icon: typeof Ticket; roles: Role[]; badge?: "review" | "incidents" }

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["USER", "AGENT", "ADMIN"] },
      { href: "/tickets", label: "Tickets", icon: Ticket, roles: ["USER", "AGENT", "ADMIN"] },
      { href: "/assistant", label: "AI assistant", icon: MessageSquareText, roles: ["USER", "AGENT", "ADMIN"] },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/review", label: "Review queue", icon: ClipboardCheck, roles: ["AGENT", "ADMIN"], badge: "review" },
      { href: "/incidents", label: "Incidents", icon: Radar, roles: ["AGENT", "ADMIN"], badge: "incidents" },
    ],
  },
  {
    label: "Admin",
    items: [
      { href: "/knowledge", label: "Knowledge base", icon: BookOpen, roles: ["ADMIN"] },
      { href: "/admin/users", label: "Users & teams", icon: Users, roles: ["ADMIN"] },
      { href: "/admin/settings", label: "AI settings", icon: Settings, roles: ["ADMIN"] },
    ],
  },
];

function NavLinks({ role }: { role: Role }) {
  const pathname = usePathname();
  const staff = role !== "USER";
  const { data } = useSWR<Dashboard>(staff ? "/dashboard" : null, fetcher, { refreshInterval: 30_000 });
  const counts = data && data.role !== "USER" ? data.counts : undefined;

  return (
    <div className="space-y-5">
      {NAV_GROUPS.map((group) => {
        const items = group.items.filter((item) => item.roles.includes(role));
        if (!items.length) return null;
        return (
          <div key={group.label}>
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-verve-onForest/50">{group.label}</p>
            <ul className="space-y-1">
              {items.map(({ href, label, icon: Icon, badge }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);
                const count = badge === "review" ? counts?.reviewQueue : badge === "incidents" ? counts?.activeIncidents : undefined;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={clsx(
                        "group flex items-center gap-3 rounded-full px-3 py-2 text-[12.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-verve-lime",
                        active
                          ? "bg-verve-lime font-semibold text-verve-forest"
                          : "font-medium text-verve-onForest/65 hover:bg-white/[0.07] hover:text-verve-onForest",
                      )}
                    >
                      <Icon className={clsx("h-4 w-4 shrink-0", active ? "text-verve-forest" : "text-verve-onForest/50 group-hover:text-verve-lime")} aria-hidden />
                      <span className="flex-1 truncate">{label}</span>
                      {!!count && (
                        <span
                          className={clsx(
                            "rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold",
                            active ? "bg-verve-forest/10 text-verve-forest" : "bg-verve-lime/20 text-verve-lime",
                          )}
                          aria-label={`${count} pending`}
                        >
                          {count}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

const ROLE_LABEL: Record<Role, string> = { USER: "Customer", AGENT: "Support agent", ADMIN: "Administrator" };

/** Forest texture shared by the fixed sidebar and the mobile drawer. */
function SidebarBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-verve-lime/10 blur-3xl" />
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(246,242,231,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(246,242,231,.8) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, isLoading, error, logout } = useSession();
  const [drawer, setDrawer] = useState(false);
  const drawerClose = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  // The assistant is a full-bleed split view: it cancels the main padding itself.
  const flush = pathname.startsWith("/assistant");
  useEffect(() => setDrawer(false), [pathname]);
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    document.addEventListener("keydown", onKey);
    drawerClose.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [drawer]);
  useEffect(() => {
    if (!error) return;
    // An expired or stale session cookie must be cleared server-side; otherwise the
    // middleware sees a cookie and keeps bouncing /login back to /dashboard.
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      void logout();
      return;
    }
    router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [error, router, pathname]);

  const sidebar = (
    <div className="relative flex h-full flex-col px-3 pb-3 pt-5">
      <div className="px-2.5">
        <Link href="/dashboard" aria-label="Relay home" className="inline-flex rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-verve-lime">
          <VerveLogo onDark />
        </Link>
      </div>

      <nav aria-label="Main" className="mt-7 flex-1 overflow-y-auto pr-0.5">
        {user ? (
          <NavLinks role={user.role} />
        ) : (
          <div className="space-y-2 px-3" aria-hidden>
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-8 animate-pulse rounded-full bg-white/10" />)}
          </div>
        )}
      </nav>

      <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
        <div className="flex items-center justify-between gap-2 px-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-verve-onForest/50">Theme</span>
          <ThemeToggle onDark />
        </div>
        {user && (
          <Menu
            label="Account menu"
            align="start"
            placement="top"
            triggerClassName="w-full text-left"
            trigger={
              <span className="flex w-full items-center gap-2.5 rounded-2xl px-2.5 py-2 text-left transition-colors hover:bg-white/[0.06]">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-verve-lime text-[12px] font-bold text-verve-forest" aria-hidden>
                  {user.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-semibold text-verve-onForest">{user.name}</span>
                  <span className="block truncate text-[11px] text-verve-onForest/55">{ROLE_LABEL[user.role]}{user.team ? `, ${user.team.name}` : ""}</span>
                </span>
              </span>
            }
            items={[{ label: "Sign out", onSelect: logout, icon: <LogOut className="h-4 w-4" aria-hidden /> }]}
          />
        )}
      </div>
    </div>
  );

  return (
    <div className="verve-app min-h-dvh bg-verve-bg text-verve-ink lg:pl-[264px]">
      <a href="#main" className="sr-only z-50 rounded-full bg-verve-lime px-4 py-2 text-[13px] font-semibold text-verve-forest focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Skip to content
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] overflow-hidden bg-verve-forest lg:block">
        <SidebarBackdrop />
        {sidebar}
      </aside>

      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-verve-line bg-verve-bg/85 px-4 backdrop-blur lg:hidden">
        <button
          onClick={() => setDrawer(true)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-verve-line bg-verve-surface text-verve-ink transition-colors hover:bg-verve-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-verve-forest dark:focus-visible:ring-verve-lime"
          aria-label="Open navigation"
          aria-expanded={drawer}
        >
          <MenuIcon className="h-[18px] w-[18px]" aria-hidden />
        </button>
        <Link href="/dashboard" aria-label="Relay home" className="inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-verve-forest dark:focus-visible:ring-verve-lime">
          <VerveLogo />
        </Link>
        <ThemeToggle className="ml-auto" />
      </header>

      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 animate-fade-in bg-verve-ink/40 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-[284px] max-w-[86%] animate-rise-in overflow-hidden bg-verve-forest shadow-pop">
            <SidebarBackdrop />
            <button
              ref={drawerClose}
              onClick={() => setDrawer(false)}
              className="absolute right-3 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-verve-onForest/70 transition-colors hover:bg-white/10 hover:text-verve-onForest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-verve-lime"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <main
        id="main"
        className={clsx(
          "px-4 py-6 sm:px-6 lg:px-10 lg:py-10",
          !flush && "mx-auto max-w-[1180px]",
        )}
      >
        {isLoading || !user ? (
          <div className="space-y-4" role="status" aria-label="Loading">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-28" />
            <Skeleton className="h-64" />
          </div>
        ) : children}
      </main>
    </div>
  );
}
