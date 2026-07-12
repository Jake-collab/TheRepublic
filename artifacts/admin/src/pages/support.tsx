import { useState } from "react";
import {
  useAdminListSupportTickets,
  useAdminUpdateSupportTicket,
  useAdminSendNotification,
  getAdminListSupportTicketsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { Bug, Sparkles, LifeBuoy, MessageSquare } from "lucide-react";

type Ticket = {
  id: number;
  userId: string;
  userEmail: string | null;
  type: "support" | "bug" | "feature";
  subject: string;
  message: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  adminReply: string | null;
  createdAt: string;
  updatedAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-destructive/10 text-destructive border-destructive/20",
  in_progress: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  resolved: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  closed: "bg-muted text-muted-foreground",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  bug: <Bug className="w-3 h-3" />,
  feature: <Sparkles className="w-3 h-3" />,
  support: <LifeBuoy className="w-3 h-3" />,
};

function TicketSheet({
  ticket,
  open,
  onOpenChange,
}: {
  ticket: Ticket;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { mutateAsync: updateTicket, isPending: isSaving } = useAdminUpdateSupportTicket();
  const { mutateAsync: sendNotification, isPending: isSendingNotif } = useAdminSendNotification();

  const [status, setStatus] = useState(ticket.status);
  const [reply, setReply] = useState(ticket.adminReply ?? "");
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: getAdminListSupportTicketsQueryKey({}) });

  const handleSave = async () => {
    try {
      await updateTicket({ id: ticket.id, data: { status, adminReply: reply || null } });
      await refresh();
      toast({ title: "Ticket updated" });
    } catch {
      toast({ title: "Failed to update ticket", variant: "destructive" });
    }
  };

  const handleSendNotif = async () => {
    if (!notifTitle.trim() || !notifMessage.trim()) return;
    try {
      await sendNotification({ data: { userId: ticket.userId, title: notifTitle.trim(), message: notifMessage.trim() } });
      setNotifTitle("");
      setNotifMessage("");
      toast({ title: "Notification sent to user" });
    } catch {
      toast({ title: "Failed to send notification", variant: "destructive" });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="dark w-full sm:max-w-xl overflow-y-auto space-y-6">
        <SheetHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="capitalize gap-1">
              {TYPE_ICONS[ticket.type]} {ticket.type}
            </Badge>
            <Badge className={`${STATUS_COLORS[ticket.status]} capitalize`}>
              {ticket.status.replace("_", " ")}
            </Badge>
          </div>
          <SheetTitle className="text-left mt-2">{ticket.subject}</SheetTitle>
          <p className="text-sm text-muted-foreground">
            From <span className="font-medium text-foreground">{ticket.userEmail || ticket.userId}</span>
            {" · "}{format(new Date(ticket.createdAt), "MMM d, yyyy 'at' h:mm a")}
          </p>
        </SheetHeader>

        {/* User's message */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">User Message</Label>
          <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap border">
            {ticket.message}
          </div>
        </div>

        {/* Admin reply */}
        <div className="space-y-3">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Admin Reply</Label>
          <Textarea
            placeholder="Write a reply to this ticket…"
            value={reply}
            onChange={e => setReply(e.target.value)}
            rows={4}
          />
        </div>

        {/* Status + save */}
        <div className="space-y-3">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Status</Label>
          <div className="flex gap-3 items-center">
            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dark">
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSave} disabled={isSaving} className="flex-1">
              {isSaving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>

        {/* Send notification to this user */}
        <div className="border-t pt-5 space-y-3">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <MessageSquare className="w-3 h-3" /> Send Notification to User
          </Label>
          <input
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="Notification title"
            value={notifTitle}
            onChange={e => setNotifTitle(e.target.value)}
          />
          <Textarea
            placeholder="Message…"
            value={notifMessage}
            onChange={e => setNotifMessage(e.target.value)}
            rows={2}
          />
          <Button
            variant="outline"
            className="w-full"
            onClick={handleSendNotif}
            disabled={!notifTitle.trim() || !notifMessage.trim() || isSendingNotif}
          >
            {isSendingNotif ? "Sending…" : "Send Notification"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function Support() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const { data: tickets, isLoading } = useAdminListSupportTickets(
    { status: statusFilter !== "all" ? statusFilter : undefined, type: typeFilter !== "all" ? typeFilter : undefined },
    { query: { queryKey: getAdminListSupportTicketsQueryKey({ status: statusFilter !== "all" ? statusFilter : undefined, type: typeFilter !== "all" ? typeFilter : undefined }) } }
  );

  const list = (tickets ?? []) as Ticket[];
  const openCount = list.filter(t => t.status === "open").length;
  const inProgressCount = list.filter(t => t.status === "in_progress").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support Tickets</h1>
          <p className="text-muted-foreground text-sm mt-1">
            View, reply to, and resolve tickets submitted by users.
          </p>
        </div>
        {openCount > 0 && (
          <Badge variant="destructive" className="mt-1">{openCount} open</Badge>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="open">Open {openCount > 0 ? `(${openCount})` : ""}</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress {inProgressCount > 0 ? `(${inProgressCount})` : ""}</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
            <TabsTrigger value="closed">Closed</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent className="dark">
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="support">Support</SelectItem>
            <SelectItem value="bug">Bug</SelectItem>
            <SelectItem value="feature">Feature</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : !list.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No tickets found.
                </TableCell>
              </TableRow>
            ) : (
              list.map(ticket => (
                <TableRow key={ticket.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setSelectedTicket(ticket)}>
                  <TableCell className="font-medium max-w-[200px]">
                    <span className="line-clamp-1">{ticket.subject}</span>
                    {ticket.adminReply && (
                      <span className="text-xs text-muted-foreground block">Replied</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{ticket.userEmail || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize gap-1 text-xs">
                      {TYPE_ICONS[ticket.type]} {ticket.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${STATUS_COLORS[ticket.status]} capitalize text-xs`}>
                      {ticket.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(ticket.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedTicket(ticket)}>View</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedTicket && (
        <TicketSheet
          ticket={selectedTicket}
          open={!!selectedTicket}
          onOpenChange={v => { if (!v) setSelectedTicket(null); }}
        />
      )}
    </div>
  );
}
