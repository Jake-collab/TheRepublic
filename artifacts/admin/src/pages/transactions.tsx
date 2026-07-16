import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCw, Briefcase, Code2, ShoppingBag, DollarSign } from "lucide-react";
import { format } from "date-fns";

const BASE = "/api/admin";

type TransactionData = {
  summary: {
    gigs: { completedCount: number; totalVolumeCents: number; platformFeeCents: number };
    freelance: { completedCount: number; totalVolumeCents: number; platformFeeCents: number };
    marketplace: { completedCount: number; totalVolumeCents: number; platformFeeCents: number };
  };
  recentActivity: Array<{ id: number; adminId: string; action: string; details?: string; createdAt: string }>;
};

function fmtUSD(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function SummaryCard({
  icon: Icon, label, count, volume, fee, feeRate,
}: {
  icon: React.ElementType; label: string; count: number; volume: number; fee: number; feeRate: string;
}) {
  return (
    <div className="bg-card border rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-xs text-muted-foreground">{feeRate} platform fee</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Completed</p>
          <p className="font-bold text-lg">{count}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Volume</p>
          <p className="font-semibold">{fmtUSD(volume)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Est. Fees</p>
          <p className="font-semibold text-green-500">{fmtUSD(fee)}</p>
        </div>
      </div>
    </div>
  );
}

export default function Transactions() {
  const { getToken } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-transactions"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`${BASE}/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json() as Promise<TransactionData>;
    },
  });

  const s = data?.summary;
  const totalFees = (s?.gigs.platformFeeCents ?? 0) + (s?.freelance.platformFeeCents ?? 0) + (s?.marketplace.platformFeeCents ?? 0);
  const totalVolume = (s?.gigs.totalVolumeCents ?? 0) + (s?.freelance.totalVolumeCents ?? 0) + (s?.marketplace.totalVolumeCents ?? 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transaction & Fee Audit</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Platform fee estimates from completed transactions</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
      </div>

      {/* Total bar */}
      <div className="bg-card border rounded-xl p-5 flex items-center gap-6">
        <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
          <DollarSign className="w-6 h-6 text-green-500" />
        </div>
        <div>
          <p className="text-muted-foreground text-sm">Total Platform Revenue (est.)</p>
          {isLoading ? <Skeleton className="h-8 w-40 mt-1" /> : <p className="text-3xl font-bold text-green-500">{fmtUSD(totalFees)}</p>}
        </div>
        <div className="ml-auto text-right">
          <p className="text-muted-foreground text-sm">Total Volume</p>
          {isLoading ? <Skeleton className="h-6 w-32 mt-1" /> : <p className="text-xl font-semibold">{fmtUSD(totalVolume)}</p>}
        </div>
      </div>

      {/* Category cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SummaryCard icon={Briefcase} label="Gig Jobs" count={s?.gigs.completedCount ?? 0}
            volume={s?.gigs.totalVolumeCents ?? 0} fee={s?.gigs.platformFeeCents ?? 0} feeRate="10%" />
          <SummaryCard icon={Code2} label="Freelance Projects" count={s?.freelance.completedCount ?? 0}
            volume={s?.freelance.totalVolumeCents ?? 0} fee={s?.freelance.platformFeeCents ?? 0} feeRate="8%" />
          <SummaryCard icon={ShoppingBag} label="Marketplace" count={s?.marketplace.completedCount ?? 0}
            volume={s?.marketplace.totalVolumeCents ?? 0} fee={s?.marketplace.platformFeeCents ?? 0} feeRate="1% (cap $20)" />
        </div>
      )}

      {/* Recent audit activity */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Recent Activity</h2>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>{[0,1,2,3].map(j => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
              )) : (data?.recentActivity ?? []).length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-10">No recent activity</TableCell></TableRow>
              ) : (data?.recentActivity ?? []).map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs">{a.action}</TableCell>
                  <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">{a.details ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs truncate max-w-[130px]">{a.adminId}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(a.createdAt), "MMM d, yy HH:mm")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
