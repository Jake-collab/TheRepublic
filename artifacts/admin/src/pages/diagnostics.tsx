import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, CheckCircle2, XCircle, Zap, Database, Users, Briefcase, Code2, ShoppingBag, Activity, Monitor } from "lucide-react";
import { format } from "date-fns";

const BASE = "/api/admin";

type DiagData = {
  status: "healthy" | "unhealthy";
  timestamp: string;
  latency: { dbMs: number; totalMs: number };
  database: { status: string; userCount: number };
  activity: { actionsLast24h: number; actionsLast7d: number };
  gigs: { open: number; inProgress: number; completed: number };
  freelance: { open: number; completed: number };
  marketplace: { active: number; sold: number };
  memberships: { free: number; pro: number; web: number };
  webviewPool: { poolSize: number; note: string };
};

function StatCard({ icon: Icon, label, value, sub, color = "text-foreground" }: {
  icon: React.ElementType; label: string; value: React.ReactNode; sub?: string; color?: string;
}) {
  return (
    <div className="bg-card border rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide font-medium">
        <Icon className="w-3.5 h-3.5" />{label}
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function LatencyBar({ ms, label }: { ms: number; label: string }) {
  const color = ms < 50 ? "bg-green-500" : ms < 200 ? "bg-yellow-500" : "bg-red-500";
  const pct = Math.min((ms / 500) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-semibold">{ms}ms</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Diagnostics() {
  const { getToken } = useAuth();

  const { data, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["admin-diagnostics"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`${BASE}/diagnostics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json() as Promise<DiagData>;
    },
    refetchInterval: 30_000,
  });

  const isHealthy = data?.status === "healthy";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Platform Diagnostics</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Auto-refreshes every 30 seconds</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
      </div>

      {/* Overall health */}
      <div className="bg-card border rounded-xl p-5 flex items-center gap-4">
        {isLoading ? <Skeleton className="h-12 w-12 rounded-full" /> : isHealthy
          ? <CheckCircle2 className="w-12 h-12 text-green-500 flex-shrink-0" />
          : <XCircle className="w-12 h-12 text-red-500 flex-shrink-0" />}
        <div className="flex-1">
          {isLoading ? <Skeleton className="h-6 w-40" /> : (
            <>
              <p className="text-xl font-bold capitalize">{data?.status ?? "—"}</p>
              <p className="text-muted-foreground text-sm">
                {data?.timestamp ? `Last checked: ${format(new Date(data.timestamp), "HH:mm:ss")}` : "—"}
              </p>
            </>
          )}
        </div>
        <Badge variant={isHealthy ? "default" : "destructive"} className="text-sm px-3 py-1">
          {isHealthy ? "All systems go" : "Degraded"}
        </Badge>
      </div>

      {/* Latency */}
      <div className="bg-card border rounded-xl p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400" />API Latency</h2>
        {isLoading ? <div className="space-y-3">{[0,1].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div> : (
          <div className="space-y-3">
            <LatencyBar ms={data?.latency.dbMs ?? 0} label="Database query" />
            <LatencyBar ms={data?.latency.totalMs ?? 0} label="Total response" />
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isLoading ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />) : (
          <>
            <StatCard icon={Database} label="DB Status" value={data?.database.status ?? "—"}
              sub={`${data?.database.userCount ?? 0} users`} color={data?.database.status === "connected" ? "text-green-500" : "text-red-500"} />
            <StatCard icon={Activity} label="Actions (24h)" value={data?.activity.actionsLast24h ?? 0} sub="Admin audit events" />
            <StatCard icon={Activity} label="Actions (7d)" value={data?.activity.actionsLast7d ?? 0} sub="Admin audit events" />
            <StatCard icon={Monitor} label="WebView Pool" value={data?.webviewPool.poolSize ?? 0} sub={data?.webviewPool.note} />
          </>
        )}
      </div>

      {/* Marketplace + Gigs + Freelance overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />) : (
          <>
            <div className="bg-card border rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold"><Briefcase className="w-4 h-4 text-primary" />Gig Jobs</div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div><p className="text-muted-foreground text-xs">Open</p><p className="font-bold">{data?.gigs.open ?? 0}</p></div>
                <div><p className="text-muted-foreground text-xs">Active</p><p className="font-bold">{data?.gigs.inProgress ?? 0}</p></div>
                <div><p className="text-muted-foreground text-xs">Done</p><p className="font-bold">{data?.gigs.completed ?? 0}</p></div>
              </div>
            </div>
            <div className="bg-card border rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold"><Code2 className="w-4 h-4 text-blue-400" />Freelance</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><p className="text-muted-foreground text-xs">Open</p><p className="font-bold">{data?.freelance.open ?? 0}</p></div>
                <div><p className="text-muted-foreground text-xs">Done</p><p className="font-bold">{data?.freelance.completed ?? 0}</p></div>
              </div>
            </div>
            <div className="bg-card border rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold"><ShoppingBag className="w-4 h-4 text-orange-400" />Marketplace</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><p className="text-muted-foreground text-xs">Active</p><p className="font-bold">{data?.marketplace.active ?? 0}</p></div>
                <div><p className="text-muted-foreground text-xs">Sold</p><p className="font-bold">{data?.marketplace.sold ?? 0}</p></div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Membership breakdown */}
      <div className="bg-card border rounded-xl p-5 space-y-3">
        <h2 className="font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-primary" />Membership Breakdown</h2>
        {isLoading ? <div className="flex gap-4">{[0,1,2].map(i => <Skeleton key={i} className="h-16 flex-1 rounded-lg" />)}</div> : (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Free", count: data?.memberships.free ?? 0, color: "text-muted-foreground" },
              { label: "Web", count: data?.memberships.web ?? 0, color: "text-blue-400" },
              { label: "Pro", count: data?.memberships.pro ?? 0, color: "text-yellow-400" },
            ].map(t => (
              <div key={t.label} className="bg-muted/50 rounded-lg p-3 text-center">
                <p className={`text-2xl font-bold ${t.color}`}>{t.count}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {dataUpdatedAt > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          Last updated: {format(new Date(dataUpdatedAt), "HH:mm:ss")}
        </p>
      )}
    </div>
  );
}
