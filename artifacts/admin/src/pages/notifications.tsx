import { useState } from "react";
import {
  useAdminSendNotification,
  useAdminListNotificationCampaigns,
  useAdminListUsers,
  getAdminListNotificationCampaignsQueryKey,
  getAdminListUsersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Send, Users, User, History, ChevronLeft, ChevronRight } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

const SEGMENTS = [
  { value: "all", label: "All users", description: "Every registered user receives this notification." },
  { value: "pro", label: "Pro subscribers only", description: "Only users on the Pro plan." },
  { value: "free", label: "Free users only", description: "Users who have not upgraded to Pro." },
];

const SEGMENT_COLORS: Record<string, string> = {
  all: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  pro: "bg-primary/10 text-primary border-primary/20",
  free: "bg-muted text-muted-foreground border-border",
  individual: "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

const SEGMENT_LABELS: Record<string, string> = {
  all: "All users",
  pro: "Pro only",
  free: "Free only",
  individual: "Individual",
};

export default function Notifications() {
  const queryClient = useQueryClient();
  const { mutateAsync: sendNotification, isPending } = useAdminSendNotification();

  const [tab, setTab] = useState("compose");
  const [targetType, setTargetType] = useState<"broadcast" | "individual">("broadcast");
  const [segment, setSegment] = useState("all");
  const [userId, setUserId] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const [historyPage, setHistoryPage] = useState(1);
  const historyLimit = 20;

  const { data: usersData } = useAdminListUsers(
    { limit: 50 },
    { query: { queryKey: getAdminListUsersQueryKey({ limit: 50 }), enabled: targetType === "individual" } }
  );

  const { data: historyData, isLoading: historyLoading } = useAdminListNotificationCampaigns(
    { page: historyPage, limit: historyLimit },
    {
      query: {
        queryKey: getAdminListNotificationCampaignsQueryKey({ page: historyPage, limit: historyLimit }),
        enabled: tab === "history",
      }
    }
  );

  const filteredUsers = (usersData?.users ?? []).filter(u =>
    !userSearch ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.displayName?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const selectedSegment = SEGMENTS.find(s => s.value === segment);
  const totalHistoryPages = Math.ceil((historyData?.total ?? 0) / historyLimit);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast({ title: "Title and message are required", variant: "destructive" });
      return;
    }
    if (targetType === "individual" && !userId) {
      toast({ title: "Select a user to send to", variant: "destructive" });
      return;
    }
    try {
      const result = await sendNotification({
        data: {
          userId: targetType === "individual" ? userId : null,
          title: title.trim(),
          message: message.trim(),
          segment: targetType === "broadcast" ? segment : undefined,
        },
      });
      await queryClient.invalidateQueries({ queryKey: getAdminListNotificationCampaignsQueryKey({ page: 1, limit: historyLimit }) });
      setTitle("");
      setMessage("");
      if (targetType === "individual") { setUserId(""); setUserSearch(""); }
      const count = (result as any)?.recipientCount ?? 0;
      toast({
        title: targetType === "individual"
          ? "Notification sent"
          : `Broadcast sent to ${count} user${count !== 1 ? "s" : ""}`,
        description: title,
      });
    } catch {
      toast({ title: "Failed to send notification", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Send in-app notifications to users. Broadcast to all, target by tier, or message individuals.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="compose" className="gap-2"><Send className="w-3.5 h-3.5" /> Compose</TabsTrigger>
          <TabsTrigger value="history" className="gap-2"><History className="w-3.5 h-3.5" /> Campaign History</TabsTrigger>
        </TabsList>

        {/* ── Compose Tab ── */}
        <TabsContent value="compose" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compose Notification</CardTitle>
              <CardDescription>
                Notifications appear in the user's notification tray in the mobile app.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Target type toggle */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setTargetType("broadcast")}
                  className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                    targetType === "broadcast" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                  }`}
                >
                  <Users className={`w-4 h-4 ${targetType === "broadcast" ? "text-primary" : "text-muted-foreground"}`} />
                  <div>
                    <p className="text-sm font-medium">Broadcast</p>
                    <p className="text-xs text-muted-foreground">Target a user segment</p>
                  </div>
                </button>
                <button
                  onClick={() => setTargetType("individual")}
                  className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                    targetType === "individual" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                  }`}
                >
                  <User className={`w-4 h-4 ${targetType === "individual" ? "text-primary" : "text-muted-foreground"}`} />
                  <div>
                    <p className="text-sm font-medium">Individual</p>
                    <p className="text-xs text-muted-foreground">One specific user</p>
                  </div>
                </button>
              </div>

              {/* Segment selector */}
              {targetType === "broadcast" && (
                <div className="space-y-2">
                  <Label>Audience</Label>
                  <Select value={segment} onValueChange={setSegment}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark">
                      {SEGMENTS.map(s => (
                        <SelectItem key={s.value} value={s.value}>
                          <div className="flex flex-col">
                            <span>{s.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedSegment && (
                    <p className="text-xs text-muted-foreground">{selectedSegment.description}</p>
                  )}
                </div>
              )}

              {/* User picker */}
              {targetType === "individual" && (
                <div className="space-y-2">
                  <Label>User</Label>
                  <Input
                    placeholder="Search by email or name…"
                    value={userSearch}
                    onChange={e => { setUserSearch(e.target.value); if (userId) setUserId(""); }}
                  />
                  {userSearch && filteredUsers.length > 0 && !userId && (
                    <div className="border rounded-md max-h-40 overflow-y-auto">
                      {filteredUsers.slice(0, 8).map(u => (
                        <button
                          key={u.id}
                          className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm flex items-center justify-between"
                          onClick={() => { setUserId(u.id); setUserSearch(u.email || u.displayName || u.id); }}
                        >
                          <span>{u.email || u.displayName}</span>
                          {u.isPro && <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">Pro</Badge>}
                        </button>
                      ))}
                    </div>
                  )}
                  {userId && (
                    <div className="flex items-center gap-2 text-sm text-emerald-500">
                      <span>✓ Sending to: {userSearch}</span>
                      <button
                        className="text-muted-foreground hover:text-foreground underline text-xs"
                        onClick={() => { setUserId(""); setUserSearch(""); }}
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  placeholder="New feature available, Platform update…"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  placeholder="Write your notification message…"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  onClick={handleSend}
                  disabled={!title.trim() || !message.trim() || isPending || (targetType === "individual" && !userId)}
                  className="gap-2"
                >
                  <Send className="w-4 h-4" />
                  {isPending
                    ? "Sending…"
                    : targetType === "individual"
                      ? "Send Notification"
                      : `Broadcast to ${SEGMENTS.find(s => s.value === segment)?.label ?? "All"}`
                  }
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── History Tab ── */}
        <TabsContent value="history" className="mt-4 space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sent</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Audience</TableHead>
                  <TableHead className="text-right">Recipients</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : !historyData?.campaigns?.length ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                      No notifications sent yet. Use the Compose tab to send your first broadcast.
                    </TableCell>
                  </TableRow>
                ) : (
                  historyData.campaigns.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        <span title={format(new Date(c.sentAt), "MMM d, yyyy HH:mm:ss")}>
                          {formatDistanceToNow(new Date(c.sentAt), { addSuffix: true })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{c.title}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-xs">{c.message}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${SEGMENT_COLORS[c.segment] ?? "bg-muted text-muted-foreground"}`}>
                          {SEGMENT_LABELS[c.segment] ?? c.segment}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="text-xs">
                          {c.recipientCount}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalHistoryPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Page {historyPage} of {totalHistoryPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={historyPage <= 1} onClick={() => setHistoryPage(p => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={historyPage >= totalHistoryPages} onClick={() => setHistoryPage(p => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
