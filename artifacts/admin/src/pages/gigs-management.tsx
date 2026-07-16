import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Search, Trash2, ShieldOff, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

const BASE = "/api/admin";
const PAGE_SIZE = 30;

type GigJob = {
  id: number; title: string; hirerId: string; hirerName: string;
  category: string; payAmountCents: number; payType: string;
  status: string; city: string; stateCode: string; applicationCount: number;
  createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  open: "default", in_progress: "secondary", completed: "outline",
  cancelled: "destructive", flagged: "destructive",
};

export default function GigsManagement() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [offset, setOffset] = useState(0);

  async function authFetch(url: string, opts?: RequestInit) {
    const token = await getToken();
    return fetch(url, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts?.headers ?? {}) } });
  }

  const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
  if (status !== "all") params.set("status", status);
  if (search.trim()) params.set("q", search.trim());

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-gigs", status, search, offset],
    queryFn: async () => {
      const res = await authFetch(`${BASE}/gigs?${params}`);
      return res.json() as Promise<{ items: GigJob[]; total: number }>;
    },
  });

  const patchMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: number; newStatus: string }) => {
      const res = await authFetch(`${BASE}/gigs/${id}`, { method: "PATCH", body: JSON.stringify({ status: newStatus }) });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-gigs"] }); toast({ title: "Gig updated" }); },
    onError: () => toast({ title: "Error", description: "Could not update gig", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await authFetch(`${BASE}/gigs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-gigs"] }); toast({ title: "Gig deleted" }); },
    onError: () => toast({ title: "Error", description: "Could not delete gig", variant: "destructive" }),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gig Management</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{total} total gig jobs</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by title…" value={search} onChange={e => { setSearch(e.target.value); setOffset(0); }} />
        </div>
        <Select value={status} onValueChange={v => { setStatus(v); setOffset(0); }}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="flagged">Flagged</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Hirer</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Pay</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Apps</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 10 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
            )) : items.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-12">No gig jobs found</TableCell></TableRow>
            ) : items.map(g => (
              <TableRow key={g.id}>
                <TableCell className="font-mono text-xs">{g.id}</TableCell>
                <TableCell className="max-w-[180px] truncate font-medium">{g.title}</TableCell>
                <TableCell className="text-sm text-muted-foreground truncate max-w-[120px]">{g.hirerName}</TableCell>
                <TableCell className="text-sm">{g.category}</TableCell>
                <TableCell className="text-sm">${(g.payAmountCents / 100).toFixed(0)}</TableCell>
                <TableCell className="text-sm">{g.city}, {g.stateCode}</TableCell>
                <TableCell className="text-sm">{g.applicationCount}</TableCell>
                <TableCell>
                  <Badge variant={(STATUS_COLORS[g.status] ?? "default") as any}>{g.status}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{format(new Date(g.createdAt), "MMM d, yy")}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" title="Flag/suspend"
                      onClick={() => patchMutation.mutate({ id: g.id, newStatus: g.status === "flagged" ? "open" : "flagged" })}
                    >
                      <ShieldOff className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" title="Delete" className="text-destructive hover:text-destructive"
                      onClick={() => { if (confirm("Delete this gig job?")) deleteMutation.mutate(g.id); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
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
