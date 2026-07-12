import { useState } from "react";
import {
  useAdminListUsers,
  useAdminUpdateUserMembership,
  useAdminSendNotification,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { Search, Crown, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";

type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  isPro: boolean;
  membershipPlan: string;
  membershipStatus: string;
  createdAt: string;
};

function UserSheet({ user, open, onOpenChange }: {
  user: AdminUser;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { mutateAsync: updateMembership, isPending: isUpdatingMembership } = useAdminUpdateUserMembership();
  const { mutateAsync: sendNotification, isPending: isSendingNotif } = useAdminSendNotification();

  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");

  const refresh = () => queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey({}) });

  const handleGrantPro = async () => {
    try {
      await updateMembership({ userId: user.id, data: { plan: "monthly", status: "active" } });
      await refresh();
      toast({ title: `Pro access granted to ${user.displayName || user.email}` });
    } catch {
      toast({ title: "Failed to update membership", variant: "destructive" });
    }
  };

  const handleRevokePro = async () => {
    try {
      await updateMembership({ userId: user.id, data: { plan: "free", status: "canceled" } });
      await refresh();
      toast({ title: `Pro access revoked from ${user.displayName || user.email}` });
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

  const planLabel = user.membershipPlan === "free" || !user.membershipPlan
    ? "Free"
    : `${user.membershipPlan.charAt(0).toUpperCase()}${user.membershipPlan.slice(1)} (${user.membershipStatus})`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="dark w-full sm:max-w-md overflow-y-auto space-y-6">
        <SheetHeader>
          <SheetTitle className="text-left">{user.displayName || "Unknown User"}</SheetTitle>
          <p className="text-sm text-muted-foreground">{user.email || user.id}</p>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-muted-foreground text-xs mb-1">User ID</p>
            <p className="font-mono text-xs truncate">{user.id}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-muted-foreground text-xs mb-1">Joined</p>
            <p className="font-medium">{format(new Date(user.createdAt), "MMM d, yyyy")}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 col-span-2">
            <p className="text-muted-foreground text-xs mb-1">Membership</p>
            <div className="flex items-center gap-2">
              {user.isPro ? (
                <Badge className="bg-primary/20 text-primary border-primary/30"><Crown className="w-3 h-3 mr-1" />Pro — {planLabel}</Badge>
              ) : (
                <Badge variant="outline">Free</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2 border-t pt-4">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Membership Override</Label>
          <p className="text-xs text-muted-foreground">Manually grant or revoke Pro access regardless of Stripe status.</p>
          <div className="flex gap-2">
            {!user.isPro ? (
              <Button className="flex-1" onClick={handleGrantPro} disabled={isUpdatingMembership}>
                <Crown className="w-3 h-3 mr-1.5" />
                {isUpdatingMembership ? "Updating…" : "Grant Pro Access"}
              </Button>
            ) : (
              <Button variant="destructive" className="flex-1" onClick={handleRevokePro} disabled={isUpdatingMembership}>
                {isUpdatingMembership ? "Updating…" : "Revoke Pro Access"}
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-3 border-t pt-4">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <MessageSquare className="w-3 h-3" /> Send In-App Notification
          </Label>
          <Input
            placeholder="Notification title"
            value={notifTitle}
            onChange={e => setNotifTitle(e.target.value)}
          />
          <Textarea
            placeholder="Message…"
            value={notifMessage}
            onChange={e => setNotifMessage(e.target.value)}
            rows={3}
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
    const matchesTier = tierFilter === "all" || (tierFilter === "pro" ? u.isPro : !u.isPro);
    const matchesSearch = !search || u.email?.toLowerCase().includes(search.toLowerCase()) || u.displayName?.toLowerCase().includes(search.toLowerCase()) || u.id.toLowerCase().includes(search.toLowerCase());
    return matchesTier && matchesSearch;
  });

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {total > 0 ? `${total} total users` : "Manage user accounts and memberships."}
        </p>
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
          </TabsList>
        </Tabs>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Plan</TableHead>
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
                <TableRow key={user.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setSelectedUser(user)}>
                  <TableCell className="font-medium text-sm">{user.email || <span className="text-muted-foreground italic">No email</span>}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{user.displayName || "—"}</TableCell>
                  <TableCell>
                    {user.isPro ? (
                      <Badge className="bg-primary/20 text-primary border-primary/30 gap-1"><Crown className="w-3 h-3" />Pro</Badge>
                    ) : (
                      <Badge variant="outline">Free</Badge>
                    )}
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
