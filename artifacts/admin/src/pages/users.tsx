import { useState } from "react";
import {
  useAdminListUsers,
  useAdminUpdateUserMembership,
  useAdminSendNotification,
  useAdminBanUser,
  useAdminUnbanUser,
  useAdminGetUserActivity,
  useAdminResyncSubscription,
  useAdminClearUserSession,
  useAdminForceRefreshWebsites,
  getAdminListUsersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "@/hooks/use-toast";
import {
  Search, Crown, MessageSquare, ChevronLeft, ChevronRight,
  Download, Ban, CheckCircle, LifeBuoy, FileText, AlertTriangle,
  RefreshCw, Trash2, Wifi,
} from "lucide-react";

type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  isPro: boolean;
  isBanned: boolean;
  bannedAt?: string | null;
  banReason?: string | null;
  membershipPlan: string;
  membershipStatus: string;
  stripeCustomerId?: string | null;
  createdAt: string;
};

function ActivityTab({ userId }: { userId: string }) {
  const { data, isLoading } = useAdminGetUserActivity(userId);

  if (isLoading) return (
    <div className="space-y-2 py-2">
      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
    </div>
  );

  const posts = data?.posts ?? [];
  const tickets = data?.tickets ?? [];
  const sub = data?.subscription;

  return (
    <div className="space-y-5">
      {/* Subscription history */}
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium flex items-center gap-1.5">
          <Crown className="w-3 h-3" /> Subscription
        </p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-muted/50 rounded-md px-3 py-2">
            <span className="text-muted-foreground text-xs block">Plan</span>
            <span className="font-medium capitalize">{sub?.plan ?? "free"}</span>
          </div>
          <div className="bg-muted/50 rounded-md px-3 py-2">
            <span className="text-muted-foreground text-xs block">Status</span>
            <span className="font-medium capitalize">{sub?.status ?? "—"}</span>
          </div>
          {sub?.currentPeriodEnd && (
            <div className="bg-muted/50 rounded-md px-3 py-2 col-span-2">
              <span className="text-muted-foreground text-xs block">Period ends</span>
              <span className="font-medium">{format(new Date(sub.currentPeriodEnd), "MMM d, yyyy")}</span>
            </div>
          )}
          {sub?.stripeCustomerId && (
            <div className="bg-muted/50 rounded-md px-3 py-2 col-span-2">
              <span className="text-muted-foreground text-xs block">Stripe Customer</span>
              <span className="font-mono text-xs">{sub.stripeCustomerId}</span>
            </div>
          )}
        </div>
      </div>

      {/* Discussion posts */}
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium flex items-center gap-1.5">
          <MessageSquare className="w-3 h-3" /> Discussion Posts ({posts.length})
        </p>
        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No posts yet.</p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {posts.map(p => (
              <div key={p.id} className="flex items-start justify-between gap-2 text-sm border rounded-md px-3 py-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">{p.title}</p>
                  <p className="text-xs text-muted-foreground">
                    ↑ {p.upvotes} · {p.commentCount} comments · {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Support tickets */}
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium flex items-center gap-1.5">
          <LifeBuoy className="w-3 h-3" /> Support Tickets ({tickets.length})
        </p>
        {tickets.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No tickets submitted.</p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {tickets.map(t => (
              <div key={t.id} className="flex items-center justify-between gap-2 text-sm border rounded-md px-3 py-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">{t.subject}</p>
                  <p className="text-xs text-muted-foreground capitalize">{t.type} · {formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}</p>
                </div>
                <Badge variant="outline" className="text-xs capitalize flex-shrink-0">{t.status.replace("_", " ")}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UserSheet({ user, open, onOpenChange }: {
  user: AdminUser;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { mutateAsync: updateMembership, isPending: isUpdatingMembership } = useAdminUpdateUserMembership();
  const { mutateAsync: sendNotification, isPending: isSendingNotif } = useAdminSendNotification();
  const { mutateAsync: banUser, isPending: isBanning } = useAdminBanUser();
  const { mutateAsync: unbanUser, isPending: isUnbanning } = useAdminUnbanUser();
  const { mutateAsync: resyncSubscription, isPending: isResyncing } = useAdminResyncSubscription();
  const { mutateAsync: clearSession, isPending: isClearing } = useAdminClearUserSession();
  const { mutateAsync: forceRefresh, isPending: isForcing } = useAdminForceRefreshWebsites();

  const [activeTab, setActiveTab] = useState("manage");
  const [resyncResult, setResyncResult] = useState<{ changed: boolean; plan: string; status: string; isPro: boolean; message: string } | null>(null);
  const [clearResult, setClearResult] = useState<{ prefsCleared: number } | null>(null);
  const [refreshDone, setRefreshDone] = useState(false);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [banReason, setBanReason] = useState("");
  const [showBanConfirm, setShowBanConfirm] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey({}) });

  const handleResync = async () => {
    setResyncResult(null);
    try {
      const result = await resyncSubscription({ userId: user.id });
      setResyncResult(result as any);
      if ((result as any).changed) await refresh();
      toast({ title: (result as any).changed ? "Subscription synced" : "Already up to date", description: (result as any).message });
    } catch (e: any) {
      toast({ title: e?.response?.data?.error ?? "Resync failed", variant: "destructive" });
    }
  };

  const handleClearSession = async () => {
    setClearResult(null);
    try {
      const result = await clearSession({ userId: user.id });
      setClearResult(result as any);
      toast({ title: "Session cleared", description: `Removed ${(result as any).prefsCleared} saved pref${(result as any).prefsCleared !== 1 ? "s" : ""}` });
    } catch {
      toast({ title: "Failed to clear session", variant: "destructive" });
    }
  };

  const handleForceRefresh = async () => {
    setRefreshDone(false);
    try {
      await forceRefresh({ userId: user.id });
      setRefreshDone(true);
      toast({ title: "Website refresh triggered", description: "User will see the refresh prompt on next app open." });
    } catch {
      toast({ title: "Failed to trigger refresh", variant: "destructive" });
    }
  };

  const handleGrantPro = async () => {
    try {
      await updateMembership({ userId: user.id, data: { plan: "monthly", status: "active" } });
      await refresh();
      toast({ title: `Pro access granted` });
    } catch {
      toast({ title: "Failed to update membership", variant: "destructive" });
    }
  };

  const handleRevokePro = async () => {
    try {
      await updateMembership({ userId: user.id, data: { plan: "free", status: "canceled" } });
      await refresh();
      toast({ title: `Pro access revoked` });
    } catch {
      toast({ title: "Failed to update membership", variant: "destructive" });
    }
  };

  const handleSendNotif = async () => {
    if (!notifTitle.trim() || !notifMessage.trim()) return;
    try {
      await sendNotification({ data: { userId: user.id, title: notifTitle.trim(), message: notifMessage.trim() } });
      setNotifTitle("");
      setNotifMessage("");
      toast({ title: "Notification sent" });
    } catch {
      toast({ title: "Failed to send notification", variant: "destructive" });
    }
  };

  const handleBan = async () => {
    if (!banReason.trim()) return;
    try {
      await banUser({ userId: user.id, data: { reason: banReason.trim() } });
      await refresh();
      setShowBanConfirm(false);
      setBanReason("");
      toast({ title: `${user.email} has been suspended`, variant: "destructive" });
    } catch {
      toast({ title: "Failed to ban user", variant: "destructive" });
    }
  };

  const handleUnban = async () => {
    try {
      await unbanUser({ userId: user.id });
      await refresh();
      toast({ title: `${user.email} has been reinstated` });
    } catch {
      toast({ title: "Failed to unban user", variant: "destructive" });
    }
  };

  const planLabel = user.membershipPlan === "free" || !user.membershipPlan
    ? "Free"
    : `${user.membershipPlan.charAt(0).toUpperCase()}${user.membershipPlan.slice(1)}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="dark w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            {user.isPro && <Badge className="bg-primary/20 text-primary border-primary/30 gap-1"><Crown className="w-3 h-3" />Pro</Badge>}
            {user.isBanned && <Badge className="bg-destructive/10 text-destructive border-destructive/20 gap-1"><Ban className="w-3 h-3" />Suspended</Badge>}
          </div>
          <SheetTitle className="text-left">{user.displayName || "Unknown User"}</SheetTitle>
          <p className="text-sm text-muted-foreground">{user.email || user.id}</p>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="manage" className="flex-1">Manage</TabsTrigger>
            <TabsTrigger value="quickfix" className="flex-1">Quick Fix</TabsTrigger>
            <TabsTrigger value="activity" className="flex-1">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="manage" className="space-y-5 mt-0">
            {/* Info grid */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-muted/50 rounded-md px-3 py-2 col-span-2">
                <p className="text-muted-foreground text-xs mb-0.5">User ID</p>
                <p className="font-mono text-xs truncate">{user.id}</p>
              </div>
              <div className="bg-muted/50 rounded-md px-3 py-2">
                <p className="text-muted-foreground text-xs mb-0.5">Joined</p>
                <p className="font-medium">{format(new Date(user.createdAt), "MMM d, yyyy")}</p>
              </div>
              <div className="bg-muted/50 rounded-md px-3 py-2">
                <p className="text-muted-foreground text-xs mb-0.5">Plan</p>
                <p className="font-medium">{planLabel} ({user.membershipStatus})</p>
              </div>
              {user.stripeCustomerId && (
                <div className="bg-muted/50 rounded-md px-3 py-2 col-span-2">
                  <p className="text-muted-foreground text-xs mb-0.5">Stripe Customer ID</p>
                  <p className="font-mono text-xs">{user.stripeCustomerId}</p>
                </div>
              )}
            </div>

            {/* Membership override */}
            <div className="space-y-2 border-t pt-4">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Crown className="w-3 h-3" /> Membership Override
              </Label>
              <div className="flex gap-2">
                {!user.isPro ? (
                  <Button className="flex-1" onClick={handleGrantPro} disabled={isUpdatingMembership || user.isBanned}>
                    {isUpdatingMembership ? "Updating…" : "Grant Pro Access"}
                  </Button>
                ) : (
                  <Button variant="outline" className="flex-1" onClick={handleRevokePro} disabled={isUpdatingMembership}>
                    {isUpdatingMembership ? "Updating…" : "Revoke Pro Access"}
                  </Button>
                )}
              </div>
            </div>

            {/* Send notification */}
            <div className="space-y-2.5 border-t pt-4">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3" /> In-App Notification
              </Label>
              <Input placeholder="Title" value={notifTitle} onChange={e => setNotifTitle(e.target.value)} />
              <Textarea placeholder="Message…" value={notifMessage} onChange={e => setNotifMessage(e.target.value)} rows={2} />
              <Button variant="outline" className="w-full" onClick={handleSendNotif}
                disabled={!notifTitle.trim() || !notifMessage.trim() || isSendingNotif || user.isBanned}>
                {isSendingNotif ? "Sending…" : "Send Notification"}
              </Button>
            </div>

            {/* Ban / unban */}
            <div className="space-y-2.5 border-t pt-4">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Ban className="w-3 h-3" /> Account Status
              </Label>
              {user.isBanned ? (
                <div className="space-y-2">
                  <div className="bg-destructive/5 border border-destructive/20 rounded-md p-3 text-sm space-y-1">
                    <p className="font-medium text-destructive flex items-center gap-1.5"><AlertTriangle className="w-3 h-3" />Account suspended</p>
                    {user.bannedAt && <p className="text-muted-foreground text-xs">Since {format(new Date(user.bannedAt), "MMM d, yyyy")}</p>}
                    {user.banReason && <p className="text-muted-foreground text-xs">Reason: {user.banReason}</p>}
                  </div>
                  <Button variant="outline" className="w-full text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
                    onClick={handleUnban} disabled={isUnbanning}>
                    <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                    {isUnbanning ? "Reinstating…" : "Reinstate Account"}
                  </Button>
                </div>
              ) : showBanConfirm ? (
                <div className="space-y-2 bg-destructive/5 border border-destructive/20 rounded-md p-3">
                  <p className="text-sm font-medium text-destructive">Suspend this account?</p>
                  <p className="text-xs text-muted-foreground">They'll receive a 403 on all API requests until reinstated.</p>
                  <Textarea
                    placeholder="Reason for suspension (required)…"
                    value={banReason}
                    onChange={e => setBanReason(e.target.value)}
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { setShowBanConfirm(false); setBanReason(""); }}>
                      Cancel
                    </Button>
                    <Button variant="destructive" size="sm" className="flex-1"
                      onClick={handleBan} disabled={!banReason.trim() || isBanning}>
                      {isBanning ? "Suspending…" : "Confirm Suspend"}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setShowBanConfirm(true)}>
                  <Ban className="w-3.5 h-3.5 mr-1.5" />
                  Suspend Account
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="quickfix" className="mt-0 space-y-4">
            <p className="text-xs text-muted-foreground pb-1">
              Use these tools when a user reports a bug or their app appears out of sync. Each action is logged in the audit trail.
            </p>

            {/* 1 — Re-sync Stripe subscription */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-primary/10 p-2 mt-0.5">
                  <RefreshCw className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Re-sync Stripe Subscription</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Fetches the live subscription from Stripe and corrects any drift — useful when a webhook was missed and the user's Pro status is wrong.
                  </p>
                </div>
              </div>

              {resyncResult && (
                <div className={`rounded-md px-3 py-2 text-xs space-y-1 ${resyncResult.changed ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-muted/50 border text-muted-foreground"}`}>
                  <p className="font-medium">{resyncResult.message}</p>
                  <p>Plan: <span className="font-mono">{resyncResult.plan}</span> · Status: <span className="font-mono">{resyncResult.status}</span> · Pro: {resyncResult.isPro ? "✓ Yes" : "✗ No"}</p>
                </div>
              )}

              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={handleResync}
                disabled={isResyncing}
              >
                {isResyncing ? (
                  <><RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />Fetching from Stripe…</>
                ) : (
                  <><RefreshCw className="w-3.5 h-3.5 mr-2" />Re-sync Subscription</>
                )}
              </Button>
            </div>

            {/* 2 — Clear WebView session */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-orange-500/10 p-2 mt-0.5">
                  <Trash2 className="w-4 h-4 text-orange-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Clear WebView Cache &amp; Session</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Deletes the user's saved tab URLs and custom tab order. Stamps a reset timestamp the app checks on next load. Useful when a site is stuck on a cached page.
                  </p>
                </div>
              </div>

              {clearResult && (
                <div className="rounded-md px-3 py-2 text-xs bg-orange-500/10 border border-orange-500/20 text-orange-400">
                  ✓ Cleared {clearResult.prefsCleared} saved preference{clearResult.prefsCleared !== 1 ? "s" : ""}. User's tab order and cached URLs have been reset.
                </div>
              )}

              <Button
                size="sm"
                variant="outline"
                className="w-full border-orange-500/30 text-orange-400 hover:bg-orange-500/10 hover:text-orange-300"
                onClick={handleClearSession}
                disabled={isClearing}
              >
                {isClearing ? (
                  <><RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />Clearing…</>
                ) : (
                  <><Trash2 className="w-3.5 h-3.5 mr-2" />Clear Session &amp; Cache</>
                )}
              </Button>
            </div>

            {/* 3 — Force-refresh website list */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-blue-500/10 p-2 mt-0.5">
                  <Wifi className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Force-Refresh Website List</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sends the user an in-app notification and stamps a refresh flag their app checks on next launch — forces a fresh fetch of the curated sites list.
                  </p>
                </div>
              </div>

              {refreshDone && (
                <div className="rounded-md px-3 py-2 text-xs bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  ✓ Refresh flag set and in-app notification sent. User will reload the website list on their next app open.
                </div>
              )}

              <Button
                size="sm"
                variant="outline"
                className="w-full border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
                onClick={handleForceRefresh}
                disabled={isForcing}
              >
                {isForcing ? (
                  <><RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />Triggering…</>
                ) : (
                  <><Wifi className="w-3.5 h-3.5 mr-2" />Force Refresh Websites</>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="mt-0">
            <ActivityTab userId={user.id} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

export default function Users() {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const limit = 25;
  const { data, isLoading } = useAdminListUsers(
    { page, limit },
    { query: { queryKey: getAdminListUsersQueryKey({ page, limit }) } }
  );

  const users = ((data?.users ?? []) as AdminUser[]).filter(u => {
    const matchesTier =
      tierFilter === "all" ||
      (tierFilter === "pro" && u.isPro) ||
      (tierFilter === "free" && !u.isPro) ||
      (tierFilter === "banned" && u.isBanned);
    const q = search.toLowerCase();
    const matchesSearch = !search ||
      u.email?.toLowerCase().includes(q) ||
      u.displayName?.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q);
    return matchesTier && matchesSearch;
  });

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const handleExportCSV = () => {
    window.open("/api/admin/users/export", "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {total > 0 ? `${total} total users` : "Manage user accounts and memberships."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2 mt-1">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by email, name, or ID…"
            className="pl-9 w-64"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Tabs value={tierFilter} onValueChange={v => { setTierFilter(v); setPage(1); }}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pro"><Crown className="w-3 h-3 mr-1" />Pro</TabsTrigger>
            <TabsTrigger value="free">Free</TabsTrigger>
            <TabsTrigger value="banned"><Ban className="w-3 h-3 mr-1" />Suspended</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {search || tierFilter !== "all" ? "No users match your filters." : "No users found."}
                </TableCell>
              </TableRow>
            ) : (
              users.map(user => (
                <TableRow key={user.id}
                  className={`cursor-pointer hover:bg-muted/30 ${user.isBanned ? "opacity-60" : ""}`}
                  onClick={() => setSelectedUser(user)}>
                  <TableCell className="font-medium text-sm">
                    {user.email || <span className="text-muted-foreground italic">No email</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{user.displayName || "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {user.isPro && (
                        <Badge className="bg-primary/20 text-primary border-primary/30 gap-1 text-xs">
                          <Crown className="w-2.5 h-2.5" />Pro
                        </Badge>
                      )}
                      {user.isBanned && (
                        <Badge className="bg-destructive/10 text-destructive border-destructive/20 gap-1 text-xs">
                          <Ban className="w-2.5 h-2.5" />Banned
                        </Badge>
                      )}
                      {!user.isPro && !user.isBanned && (
                        <Badge variant="outline" className="text-xs">Free</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(user.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedUser(user)}>Manage</Button>
                  </TableCell>
                </TableRow>
              ))
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

      {selectedUser && (
        <UserSheet
          user={selectedUser}
          open={!!selectedUser}
          onOpenChange={v => { if (!v) setSelectedUser(null); }}
        />
      )}
    </div>
  );
}
