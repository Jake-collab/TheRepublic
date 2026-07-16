import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { useAdminResyncSubscription } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { RefreshCw, ChevronLeft, ChevronRight, Crown, RefreshCcw, XCircle } from "lucide-react";
import { format } from "date-fns";

const BASE = "/api/admin";
const PAGE_SIZE = 40;

type MembershipRow = {
  userId: string; userEmail: string; userDisplayName: string;
  plan: string; tier: string; status: string;
  stripeCustomerId: string | null; stripeSubscriptionId: string | null;
  createdAt: string; updatedAt: string;
};

const TIER_COLORS: Record<string, "default" | "secondary" | "outline"> = {
  free: "outline", web: "secondary", pro: "default",
};

const STATUS_COLORS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  active: "default", none: "outline", cancelled: "destructive", past_due: "destructive",
};

export default function Memberships() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const [tier, setTier] = useState("all");
  const [status, setStatus] = useState("all");
  const [offset, setOffset] = useState(0);

  async function authFetch(url: string, opts?: RequestInit) {
    const token = await getToken();
    return fetch(url, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts?.headers ?? {}) } });
  }

  const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
  if (tier !== "all") params.set("tier", tier);
  if (status !== "all") params.set("status", status);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-memberships", tier, status, offset],
    queryFn: async () => {
      const res = await authFetch(`${BASE}/memberships/list?${params}`);
      return res.json() as Promise<{ items: MembershipRow[]; total: number }>;
    },
  });

  const resync = useAdminResyncSubscription();

  async function handleDowngrade(userId: string) {
    if (!confirm("Downgrade this user to free tier?")) return;
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/users/${userId}/membership`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan: "free", tier: "free", status: "none" }),
      });
      if (!res.ok) throw new Error("Failed");
      qc.invalidateQueries({ queryKey: ["admin-memberships"] });
      toast({ title: "Downgraded to free" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  }

  function handleResync(userId: string) {
    resync.mutate(
      { userId },
      {
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-memberships"] }); toast({ title: "Subscription re-synced" }); },
        onError: () => toast({ title: "Error", variant: "destructive" }),
      },
    );
  }

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const tierCounts = items.reduce<Record<string, number>>((acc, r) => {
    acc[r.tier] = (acc[r.tier] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Membership Management</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{total} total memberships</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
      </div>

      {/* Summary chips */}
      {!isLoading && (
        <div className="flex gap-3 flex-wrap">
          {["free", "web", "pro"].map(t => (
            <div key={t} className="bg-card border rounded-lg px-4 py-2 flex items-center gap-2">
              <Crown className={`w-4 h-4 ${t === "pro" ? "text-yellow-400" : t === "web" ? "text-blue-400" : "text-muted-foreground"}`} />
              <span className="text-sm font-medium capitalize">{t}</span>
              <Badge variant={TIER_COLORS[t]}>{tierCounts[t] ?? 0}</Badge>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={tier} onValueChange={v => { setTier(v); setOffset(0); }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Tier" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tiers</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="web">Web</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={v => { setStatus(v); setOffset(0); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="past_due">Past due</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Stripe Sub</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? Array.from({ length: 10 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 8 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
            )) : items.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-12">No memberships found</TableCell></TableRow>
            ) : items.map(m => (
              <TableRow key={m.userId}>
                <TableCell className="font-medium truncate max-w-[130px]">{m.userDisplayName || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground truncate max-w-[160px]">{m.userEmail || "—"}</TableCell>
                <TableCell className="text-sm capitalize">{m.plan}</TableCell>
                <TableCell>
                  <Badge variant={TIER_COLORS[m.tier] ?? "outline"}>{m.tier}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_COLORS[m.status] ?? "outline"}>{m.status || "none"}</Badge>
                </TableCell>
                <TableCell className="font-mono text-xs truncate max-w-[140px]">
                  {m.stripeSubscriptionId ? <span title={m.stripeSubscriptionId}>{m.stripeSubscriptionId.slice(0, 14)}…</span> : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{format(new Date(m.updatedAt), "MMM d, yy")}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {m.stripeSubscriptionId && (
                      <Button variant="ghost" size="sm" title="Re-sync subscription" onClick={() => handleResync(m.userId)}>
                        <RefreshCcw className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {m.tier !== "free" && (
                      <Button variant="ghost" size="sm" title="Downgrade to free" className="text-destructive hover:text-destructive" onClick={() => handleDowngrade(m.userId)}>
                        <XCircle className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {page} of {totalPages} ({total} total)</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(o => Math.max(0, o - PAGE_SIZE))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(o => o + PAGE_SIZE)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
