import { useState } from "react";
import {
  useAdminListSupportTickets,
  useAdminUpdateSupportTicket,
  useAdminSendTicketEmail,
  useAdminAutoCloseTickets,
  useAdminSendNotification,
  useAdminListCannedResponses,
  useAdminCreateCannedResponse,
  useAdminUpdateCannedResponse,
  useAdminDeleteCannedResponse,
  getAdminListSupportTicketsQueryKey,
  getAdminListCannedResponsesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import {
  Bug, Sparkles, LifeBuoy, MessageSquare, Mail, MailCheck,
  Pencil, Trash2, Plus, AlertTriangle, AlertCircle, ChevronDown, Clock,
} from "lucide-react";

type Ticket = {
  id: number;
  userId?: string | null;
  userEmail?: string | null;
  type: "support" | "bug" | "feature";
  subject: string;
  message: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "critical";
  adminReply?: string | null;
  emailedAt?: string | null;
  assignedTo?: string | null;
  createdAt: string;
  updatedAt: string;
};

type CannedResponse = { id: number; title: string; body: string; category: string; createdAt: string; updatedAt: string };

const STATUS_COLORS: Record<string, string> = {
  open: "bg-destructive/10 text-destructive border-destructive/20",
  in_progress: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  resolved: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  closed: "bg-muted text-muted-foreground",
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  critical: { label: "Critical", color: "bg-destructive text-destructive-foreground border-destructive/20", icon: <AlertCircle className="w-3 h-3" /> },
  high:     { label: "High",     color: "bg-orange-500/15 text-orange-500 border-orange-500/20",           icon: <AlertTriangle className="w-3 h-3" /> },
  medium:   { label: "Medium",   color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",           icon: <ChevronDown className="w-3 h-3" /> },
  low:      { label: "Low",      color: "bg-muted text-muted-foreground",                                  icon: <ChevronDown className="w-3 h-3 opacity-50" /> },
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  bug: <Bug className="w-3 h-3" />,
  feature: <Sparkles className="w-3 h-3" />,
  support: <LifeBuoy className="w-3 h-3" />,
};

// ── Ticket Detail Sheet ────────────────────────────────────────────────────────
function TicketSheet({
  ticket, open, onOpenChange,
}: { ticket: Ticket; open: boolean; onOpenChange: (v: boolean) => void }) {
  const queryClient = useQueryClient();
  const { mutateAsync: updateTicket, isPending: isSaving } = useAdminUpdateSupportTicket();
  const { mutateAsync: sendEmail, isPending: isSendingEmail } = useAdminSendTicketEmail();
  const { mutateAsync: sendNotification, isPending: isSendingNotif } = useAdminSendNotification();
  const { data: cannedList } = useAdminListCannedResponses({ query: { queryKey: getAdminListCannedResponsesQueryKey() } });

  const [status, setStatus] = useState<Ticket["status"]>(ticket.status);
  const [priority, setPriority] = useState<Ticket["priority"]>(ticket.priority);
  const [reply, setReply] = useState(ticket.adminReply ?? "");
  const [emailedAt, setEmailedAt] = useState<string | null | undefined>(ticket.emailedAt);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [showCanned, setShowCanned] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: getAdminListSupportTicketsQueryKey({}) });

  const handleSave = async () => {
    try {
      await updateTicket({ id: ticket.id, data: { status, priority, adminReply: reply || null } });
      await refresh();
      toast({ title: "Ticket saved" });
    } catch {
      toast({ title: "Failed to save ticket", variant: "destructive" });
    }
  };

  const handleSendEmail = async () => {
    try {
      const result = await sendEmail({ id: ticket.id });
      if (result.sent) {
        setEmailedAt(new Date().toISOString());
        toast({ title: "Email sent", description: result.message ?? undefined });
      } else {
        toast({ title: result.message ?? "Could not send email", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to send email", variant: "destructive" });
    }
  };

  const handleSendNotif = async () => {
    if (!notifTitle.trim() || !notifMessage.trim() || !ticket.userId) return;
    try {
      await sendNotification({ data: { userId: ticket.userId, title: notifTitle.trim(), message: notifMessage.trim() } });
      setNotifTitle(""); setNotifMessage("");
      toast({ title: "In-app notification sent" });
    } catch {
      toast({ title: "Failed to send notification", variant: "destructive" });
    }
  };

  const canned = (cannedList ?? []) as CannedResponse[];
  const cannedByCategory = canned.reduce<Record<string, CannedResponse[]>>((acc, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {});

  const pCfg = PRIORITY_CONFIG[priority];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="dark w-full sm:max-w-xl overflow-y-auto space-y-5">
        <SheetHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="capitalize gap-1">{TYPE_ICONS[ticket.type]} {ticket.type}</Badge>
            <Badge className={`${STATUS_COLORS[ticket.status]} capitalize`}>{ticket.status.replace("_", " ")}</Badge>
            <Badge className={`${pCfg.color} gap-1`}>{pCfg.icon}{pCfg.label}</Badge>
          </div>
          <SheetTitle className="text-left mt-1">{ticket.subject}</SheetTitle>
          <p className="text-sm text-muted-foreground">
            {ticket.userEmail ? <span className="font-medium text-foreground">{ticket.userEmail}</span> : "Anonymous"}
            {" · "}{format(new Date(ticket.createdAt), "MMM d, yyyy 'at' h:mm a")}
          </p>
        </SheetHeader>

        {/* User message */}
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">User Message</Label>
          <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap border">{ticket.message}</div>
        </div>

        {/* Admin reply + canned responses */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Admin Reply</Label>
            {canned.length > 0 && (
              <button
                className="text-xs text-primary hover:underline flex items-center gap-1"
                onClick={() => setShowCanned(v => !v)}
              >
                <MessageSquare className="w-3 h-3" />
                {showCanned ? "Hide templates" : `Use template (${canned.length})`}
              </button>
            )}
          </div>

          {showCanned && (
            <div className="border rounded-md max-h-52 overflow-y-auto bg-muted/30 divide-y">
              {Object.entries(cannedByCategory).map(([cat, items]) => (
                <div key={cat}>
                  <p className="px-3 py-1.5 text-xs uppercase tracking-wide text-muted-foreground font-medium bg-muted/50">{cat}</p>
                  {items.map(r => (
                    <button
                      key={r.id}
                      className="w-full text-left px-3 py-2.5 hover:bg-muted/60 text-sm"
                      onClick={() => { setReply(r.body); setShowCanned(false); }}
                    >
                      <p className="font-medium">{r.title}</p>
                      <p className="text-muted-foreground text-xs truncate mt-0.5">{r.body}</p>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}

          <Textarea placeholder="Write a reply…" value={reply} onChange={e => setReply(e.target.value)} rows={5} />
        </div>

        {/* Status + Priority + Save row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Status</Label>
            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="dark">
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Priority</Label>
            <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="dark">
                <SelectItem value="critical">🔴 Critical</SelectItem>
                <SelectItem value="high">🟠 High</SelectItem>
                <SelectItem value="medium">🟡 Medium</SelectItem>
                <SelectItem value="low">⚪ Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button className="w-full" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving…" : "Save Changes"}
        </Button>

        {/* Email reply */}
        {ticket.userEmail && (
          <div className="border-t pt-4 space-y-3">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Mail className="w-3 h-3" /> Email Reply
            </Label>
            {emailedAt ? (
              <div className="flex items-center gap-2 text-sm text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-3 py-2">
                <MailCheck className="w-4 h-4 flex-shrink-0" />
                Email reply sent {format(new Date(emailedAt), "MMM d 'at' h:mm a")}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Sends the reply above to <span className="font-medium text-foreground">{ticket.userEmail}</span> via email.
                  {!reply && <span className="text-destructive"> Write a reply first.</span>}
                </p>
                <Button variant="outline" className="w-full gap-2" onClick={handleSendEmail}
                  disabled={!reply.trim() || isSendingEmail}>
                  <Mail className="w-4 h-4" />
                  {isSendingEmail ? "Sending…" : "Send Email Reply"}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* In-app notification */}
        {ticket.userId && (
          <div className="border-t pt-4 space-y-2.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <MessageSquare className="w-3 h-3" /> In-App Notification
            </Label>
            <Input placeholder="Notification title" value={notifTitle} onChange={e => setNotifTitle(e.target.value)} />
            <Textarea placeholder="Message…" value={notifMessage} onChange={e => setNotifMessage(e.target.value)} rows={2} />
            <Button variant="outline" className="w-full" onClick={handleSendNotif}
              disabled={!notifTitle.trim() || !notifMessage.trim() || isSendingNotif}>
              {isSendingNotif ? "Sending…" : "Send Notification"}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ── Canned Responses Editor ───────────────────────────────────────────────────
function CannedResponsesTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useAdminListCannedResponses({ query: { queryKey: getAdminListCannedResponsesQueryKey() } });
  const { mutateAsync: create, isPending: isCreating } = useAdminCreateCannedResponse();
  const { mutateAsync: update, isPending: isUpdating } = useAdminUpdateCannedResponse();
  const { mutateAsync: remove } = useAdminDeleteCannedResponse();

  const [editId, setEditId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("general");
  const [showForm, setShowForm] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: getAdminListCannedResponsesQueryKey() });

  const resetForm = () => { setEditId(null); setTitle(""); setBody(""); setCategory("general"); setShowForm(false); };

  const startEdit = (r: CannedResponse) => {
    setEditId(r.id); setTitle(r.title); setBody(r.body); setCategory(r.category); setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) return;
    try {
      if (editId) {
        await update({ id: editId, data: { title: title.trim(), body: body.trim(), category: category.trim() || "general" } });
        toast({ title: "Template updated" });
      } else {
        await create({ data: { title: title.trim(), body: body.trim(), category: category.trim() || "general" } });
        toast({ title: "Template created" });
      }
      await refresh();
      resetForm();
    } catch {
      toast({ title: "Failed to save template", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await remove({ id });
      await refresh();
      toast({ title: "Template deleted" });
    } catch {
      toast({ title: "Failed to delete template", variant: "destructive" });
    }
  };

  const list = (data ?? []) as CannedResponse[];
  const byCategory = list.reduce<Record<string, CannedResponse[]>>((acc, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Reply Templates</p>
          <p className="text-sm text-muted-foreground">Pre-written responses you can insert into ticket replies with one click.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="w-3.5 h-3.5" /> New Template
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{editId ? "Edit Template" : "New Template"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Title (e.g. 'Thank you for your report')" value={title} onChange={e => setTitle(e.target.value)} />
            <Input placeholder="Category (e.g. 'billing', 'bugs', 'general')" value={category} onChange={e => setCategory(e.target.value)} />
            <Textarea placeholder="Response body…" value={body} onChange={e => setBody(e.target.value)} rows={4} />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={resetForm}>Cancel</Button>
              <Button size="sm" onClick={handleSubmit} disabled={!title.trim() || !body.trim() || isCreating || isUpdating}>
                {isCreating || isUpdating ? "Saving…" : editId ? "Save Changes" : "Create Template"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : list.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No templates yet. Create one to speed up your replies.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byCategory).map(([cat, items]) => (
            <div key={cat}>
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-2">{cat}</p>
              <div className="space-y-2">
                {items.map(r => (
                  <div key={r.id} className="flex items-start gap-3 border rounded-lg p-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{r.title}</p>
                      <p className="text-muted-foreground text-xs mt-0.5 line-clamp-2">{r.body}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(r)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(r.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Settings Tab ──────────────────────────────────────────────────────────────
function SettingsTab() {
  const [daysOld, setDaysOld] = useState("7");
  const [result, setResult] = useState<number | null>(null);
  const { mutateAsync: autoClose, isPending } = useAdminAutoCloseTickets();

  const handleAutoClose = async () => {
    const days = Number(daysOld);
    if (!days || days < 1) { toast({ title: "Enter a valid number of days", variant: "destructive" }); return; }
    try {
      const res = await autoClose({ data: { daysOld: days } });
      setResult(res.closed);
      toast({ title: `${res.closed} ticket${res.closed === 1 ? "" : "s"} auto-closed` });
    } catch {
      toast({ title: "Auto-close failed", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-5 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Clock className="w-4 h-4" /> Auto-Close Resolved Tickets</CardTitle>
          <CardDescription>
            Automatically close tickets that have been in "Resolved" status for longer than the specified number of days.
            Useful to keep the queue clean without manual housekeeping.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Close tickets resolved more than N days ago</Label>
            <div className="flex items-center gap-3">
              <Input type="number" min={1} value={daysOld} onChange={e => setDaysOld(e.target.value)} className="w-28" />
              <span className="text-sm text-muted-foreground">days</span>
            </div>
          </div>
          <Button onClick={handleAutoClose} disabled={isPending} className="gap-2">
            <Clock className="w-4 h-4" />
            {isPending ? "Running…" : "Run Auto-Close Now"}
          </Button>
          {result !== null && (
            <p className="text-sm text-emerald-500">
              ✓ {result} ticket{result === 1 ? "" : "s"} closed.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Only "Resolved" tickets are affected — open and in-progress tickets are never touched.
            This runs on demand; you can automate it by calling the API on a schedule.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Support() {
  const [mainTab, setMainTab] = useState("tickets");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const { data: tickets, isLoading } = useAdminListSupportTickets(
    {
      status: statusFilter !== "all" ? statusFilter : undefined,
      type: typeFilter !== "all" ? typeFilter : undefined,
    },
    {
      query: {
        queryKey: getAdminListSupportTicketsQueryKey({
          status: statusFilter !== "all" ? statusFilter : undefined,
          type: typeFilter !== "all" ? typeFilter : undefined,
        }),
      },
    }
  );

  const list = ((tickets ?? []) as Ticket[]).filter(t =>
    priorityFilter === "all" || t.priority === priorityFilter
  );

  const openCount = ((tickets ?? []) as Ticket[]).filter(t => t.status === "open").length;
  const criticalCount = ((tickets ?? []) as Ticket[]).filter(t => t.priority === "critical" && t.status !== "closed").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage tickets, reply templates, and queue settings.</p>
        </div>
        <div className="flex gap-2 mt-1">
          {criticalCount > 0 && <Badge className="bg-destructive text-destructive-foreground">{criticalCount} critical</Badge>}
          {openCount > 0 && <Badge variant="outline" className="text-destructive border-destructive/30">{openCount} open</Badge>}
        </div>
      </div>

      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="canned">Reply Templates</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="mt-5 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="open">Open</TabsTrigger>
                <TabsTrigger value="in_progress">In Progress</TabsTrigger>
                <TabsTrigger value="resolved">Resolved</TabsTrigger>
                <TabsTrigger value="closed">Closed</TabsTrigger>
              </TabsList>
            </Tabs>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="All types" /></SelectTrigger>
              <SelectContent className="dark">
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="support">Support</SelectItem>
                <SelectItem value="bug">Bug</SelectItem>
                <SelectItem value="feature">Feature</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="All priorities" /></SelectTrigger>
              <SelectContent className="dark">
                <SelectItem value="all">All priorities</SelectItem>
                <SelectItem value="critical">🔴 Critical</SelectItem>
                <SelectItem value="high">🟠 High</SelectItem>
                <SelectItem value="medium">🟡 Medium</SelectItem>
                <SelectItem value="low">⚪ Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                  ))
                ) : !list.length ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No tickets found.</TableCell>
                  </TableRow>
                ) : (
                  list.map(ticket => {
                    const pCfg = PRIORITY_CONFIG[ticket.priority];
                    return (
                      <TableRow key={ticket.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setSelectedTicket(ticket)}>
                        <TableCell className="font-medium max-w-[180px]">
                          <span className="line-clamp-1">{ticket.subject}</span>
                          {ticket.adminReply && <span className="text-xs text-muted-foreground">Replied{ticket.emailedAt ? " · Emailed" : ""}</span>}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{ticket.userEmail || "—"}</TableCell>
                        <TableCell>
                          <Badge className={`${pCfg.color} gap-1 text-xs`}>{pCfg.icon}{pCfg.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize gap-1 text-xs">{TYPE_ICONS[ticket.type]} {ticket.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${STATUS_COLORS[ticket.status]} capitalize text-xs`}>{ticket.status.replace("_", " ")}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{format(new Date(ticket.createdAt), "MMM d, yyyy")}</TableCell>
                        <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedTicket(ticket)}>View</Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="canned" className="mt-5">
          <CannedResponsesTab />
        </TabsContent>

        <TabsContent value="settings" className="mt-5">
          <SettingsTab />
        </TabsContent>
      </Tabs>

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
