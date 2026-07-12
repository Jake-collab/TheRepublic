import { useState } from "react";
import { useAdminListAuditLogs, getAdminListAuditLogsQueryKey } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, formatDistanceToNow } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  create_category:       { label: "Created Category",       color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  update_category:       { label: "Updated Category",       color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  reorder_categories:    { label: "Reordered Categories",   color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  create_website:        { label: "Added Website",          color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  update_website:        { label: "Updated Website",        color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  update_user_membership:{ label: "Changed Membership",     color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
  update_ticket:         { label: "Updated Ticket",         color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  send_notification:     { label: "Sent Notification",      color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  update_webview_settings:{ label: "WebView Settings",      color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  update_stripe_settings:{ label: "Stripe Settings",        color: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  create_talk_category:  { label: "Created Talk Category",  color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  update_talk_category:  { label: "Updated Talk Category",  color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  delete_talk_category:  { label: "Deleted Talk Category",  color: "bg-destructive/10 text-destructive border-destructive/20" },
  delete_talk_post:      { label: "Deleted Talk Post",      color: "bg-destructive/10 text-destructive border-destructive/20" },
  delete_talk_comment:   { label: "Deleted Comment",        color: "bg-destructive/10 text-destructive border-destructive/20" },
};

const ACTION_CATEGORIES = [
  { value: "all", label: "All actions" },
  { value: "create", label: "Creates" },
  { value: "update", label: "Updates" },
  { value: "delete", label: "Deletes" },
  { value: "send", label: "Notifications" },
  { value: "stripe", label: "Stripe" },
  { value: "talk", label: "Discussions" },
];

function formatDetails(details: string | null | undefined): string {
  if (!details) return "—";
  return details
    .split(",")
    .map(part => {
      const [key, val] = part.split("=");
      if (!val) return part;
      if (key === "userId") return `User: ${val.slice(0, 12)}…`;
      if (key === "plan") return `Plan: ${val}`;
      if (key === "status") return `Status: ${val}`;
      if (key === "name") return val;
      if (key === "title") return val;
      if (key === "id") return `#${val}`;
      return `${key}: ${val}`;
    })
    .join(" · ");
}

export default function AuditLogs() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const limit = 50;

  const { data, isLoading } = useAdminListAuditLogs(
    { page, limit },
    { query: { queryKey: getAdminListAuditLogsQueryKey({ page, limit }) } }
  );

  const logs = (data?.logs ?? []).filter(l => {
    const matchesSearch = !search || l.action.includes(search.toLowerCase()) || l.details?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || l.action.includes(categoryFilter);
    return matchesSearch && matchesCategory;
  });

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Full history of every admin action taken in this panel.
          </p>
        </div>
        {total > 0 && (
          <span className="text-sm text-muted-foreground mt-1">{total} total entries</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search actions or details…"
          className="max-w-xs"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="dark">
            {ACTION_CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                </TableRow>
              ))
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  {search || categoryFilter !== "all" ? "No logs match your filters." : "No audit logs yet."}
                </TableCell>
              </TableRow>
            ) : (
              logs.map(log => {
                const meta = ACTION_LABELS[log.action];
                return (
                  <TableRow key={log.id}>
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                      <span title={format(new Date(log.createdAt), "MMM d, yyyy HH:mm:ss")}>
                        {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${meta?.color ?? "bg-muted text-muted-foreground"}`}>
                        {meta?.label ?? log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-sm truncate">
                      {formatDetails(log.details)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
