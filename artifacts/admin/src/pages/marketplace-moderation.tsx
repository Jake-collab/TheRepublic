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
import { Search, Trash2, ShieldOff, RefreshCw, ChevronLeft, ChevronRight, Image } from "lucide-react";
import { format } from "date-fns";

const BASE = "/api/admin";
const PAGE_SIZE = 30;

type Listing = {
  id: number; title: string; sellerId: string; sellerName: string;
  category: string; priceCents: number; status: string;
  city: string; stateCode: string; photos: string[]; createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  active: "default", sold: "secondary", removed: "outline",
  suspended: "destructive",
};

export default function MarketplaceModeration() {
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
    queryKey: ["admin-marketplace", status, search, offset],
    queryFn: async () => {
      const res = await authFetch(`${BASE}/marketplace?${params}`);
      return res.json() as Promise<{ items: Listing[]; total: number }>;
    },
  });

  const patchMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: number; newStatus: string }) => {
      const res = await authFetch(`${BASE}/marketplace/${id}`, { method: "PATCH", body: JSON.stringify({ status: newStatus }) });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-marketplace"] }); toast({ title: "Listing updated" }); },
    onError: () => toast({ title: "Error", description: "Could not update listing", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await authFetch(`${BASE}/marketplace/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-marketplace"] }); toast({ title: "Listing deleted" }); },
    onError: () => toast({ title: "Error", description: "Could not delete listing", variant: "destructive" }),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Marketplace Moderation</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{total} total listings</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by title…" value={search} onChange={e => { setSearch(e.target.value); setOffset(0); }} />
        </div>
        <Select value={status} onValueChange={v => { setStatus(v); setOffset(0); }}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="removed">Removed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Seller</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Photos</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Listed</TableHead>
              <TableHead className="w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 10 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
            )) : items.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-12">No listings found</TableCell></TableRow>
            ) : items.map(l => (
              <TableRow key={l.id}>
                <TableCell className="font-mono text-xs">{l.id}</TableCell>
                <TableCell className="max-w-[160px] truncate font-medium">{l.title}</TableCell>
                <TableCell className="text-sm text-muted-foreground truncate max-w-[110px]">{l.sellerName}</TableCell>
                <TableCell className="text-sm">{l.category}</TableCell>
                <TableCell className="text-sm font-medium">${(l.priceCents / 100).toFixed(2)}</TableCell>
                <TableCell className="text-sm">{l.city}, {l.stateCode}</TableCell>
                <TableCell className="text-sm">
                  <span className="flex items-center gap-1"><Image className="w-3 h-3" />{l.photos.length}</span>
                </TableCell>
                <TableCell>
                  <Badge variant={(STATUS_COLORS[l.status] ?? "default") as any}>{l.status}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{format(new Date(l.createdAt), "MMM d, yy")}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" title={l.status === "suspended" ? "Restore" : "Suspend"}
                      onClick={() => patchMutation.mutate({ id: l.id, newStatus: l.status === "suspended" ? "active" : "suspended" })}
                    >
                      <ShieldOff className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" title="Delete" className="text-destructive hover:text-destructive"
                      onClick={() => { if (confirm("Delete this listing?")) deleteMutation.mutate(l.id); }}
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
