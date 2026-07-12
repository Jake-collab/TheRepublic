import { useState } from "react";
import {
  useAdminSendNotification,
  useAdminListUsers,
  getAdminListUsersQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Send, Users, User } from "lucide-react";
import { format } from "date-fns";

type SentNotif = { title: string; message: string; target: string; sentAt: Date };

export default function Notifications() {
  const { mutateAsync: sendNotification, isPending } = useAdminSendNotification();

  const [broadcast, setBroadcast] = useState(true);
  const [userId, setUserId] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState<SentNotif[]>([]);

  const { data: usersData } = useAdminListUsers(
    { limit: 50 },
    { query: { queryKey: getAdminListUsersQueryKey({ limit: 50 }), enabled: !broadcast } }
  );

  const filteredUsers = (usersData?.users ?? []).filter(u =>
    !userSearch || u.email?.toLowerCase().includes(userSearch.toLowerCase()) || u.displayName?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast({ title: "Title and message are required", variant: "destructive" });
      return;
    }
    if (!broadcast && !userId) {
      toast({ title: "Select a user or switch to broadcast", variant: "destructive" });
      return;
    }
    try {
      await sendNotification({
        data: {
          userId: broadcast ? null : userId,
          title: title.trim(),
          message: message.trim(),
        }
      });
      setSent(prev => [{
        title: title.trim(),
        message: message.trim(),
        target: broadcast ? "All users" : userId,
        sentAt: new Date(),
      }, ...prev.slice(0, 9)]);
      setTitle("");
      setMessage("");
      if (!broadcast) setUserId("");
      toast({ title: broadcast ? "Broadcast sent to all users" : "Notification sent", description: title });
    } catch {
      toast({ title: "Failed to send notification", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Send in-app notifications to individual users or broadcast to everyone.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compose Notification</CardTitle>
          <CardDescription>
            Notifications appear in the user's notification tray in the mobile app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Broadcast toggle */}
          <div className="flex items-center justify-between border rounded-lg px-4 py-3">
            <div className="flex items-center gap-2">
              {broadcast ? <Users className="w-4 h-4 text-muted-foreground" /> : <User className="w-4 h-4 text-muted-foreground" />}
              <div>
                <p className="text-sm font-medium">{broadcast ? "Broadcast to all users" : "Send to specific user"}</p>
                <p className="text-xs text-muted-foreground">
                  {broadcast ? "Every registered user will receive this" : "Choose a single user"}
                </p>
              </div>
            </div>
            <Switch checked={broadcast} onCheckedChange={setBroadcast} />
          </div>

          {/* User picker */}
          {!broadcast && (
            <div className="space-y-2">
              <Label>User</Label>
              <Input
                placeholder="Search by email or name…"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
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
                  <button className="text-muted-foreground hover:text-foreground underline text-xs" onClick={() => { setUserId(""); setUserSearch(""); }}>
                    Clear
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              placeholder="Platform update, New feature available…"
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
              disabled={!title.trim() || !message.trim() || isPending || (!broadcast && !userId)}
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              {isPending ? "Sending…" : broadcast ? "Broadcast to All" : "Send Notification"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {sent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recently Sent</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sent.map((n, i) => (
              <div key={i} className="flex items-start gap-3 text-sm border-b last:border-0 pb-3 last:pb-0">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{n.title}</p>
                  <p className="text-muted-foreground truncate">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    → {n.target === "All users" ? "All users" : n.target} · {format(n.sentAt, "h:mm a")}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
