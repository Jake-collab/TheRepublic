import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShieldAlert, Flag, X, Trash2, Pin, PinOff, Plus, CheckCircle, EyeOff, MoreHorizontal } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch(path: string, options?: RequestInit) {
  const r = await fetch(`${BASE}/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!r.ok) throw new Error(await r.text());
  return r.status === 204 ? null : r.json();
}

interface ContentFlag {
  id: number;
  contentType: string;
  contentId: number;
  userId: string | null;
  reason: string;
  details: string | null;
  status: string;
  reviewedAt: string | null;
  createdAt: string;
  reporterEmail: string | null;
  reporterName: string | null;
}

interface BlockedWord {
  id: number;
  word: string;
  createdAt: string;
}

interface AdminTalkPost {
  id: number;
  title: string;
  displayName: string;
  isPinned: boolean;
  upvotes: number;
  commentCount: number;
  createdAt: string;
}

const FLAG_REASON_LABELS: Record<string, string> = {
  spam: "Spam",
  harassment: "Harassment",
  misinformation: "Misinformation",
  hate_speech: "Hate Speech",
  other: "Other",
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  talk_post: "Talks Post",
  talk_comment: "Talks Comment",
  citizen_vote: "Citizen Vote",
  user: "User Report",
};

function statusBadge(status: string) {
  if (status === "pending") return <Badge variant="destructive">Pending</Badge>;
  if (status === "reviewed") return <Badge className="bg-green-600 text-white">Reviewed</Badge>;
  return <Badge variant="secondary">Dismissed</Badge>;
}

function FlagsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [typeFilter, setTypeFilter] = useState("all");

  const params = new URLSearchParams({ status: statusFilter });
  if (typeFilter !== "all") params.set("contentType", typeFilter);

  const { data: flags = [], isLoading } = useQuery<ContentFlag[]>({
    queryKey: ["admin", "flags", statusFilter, typeFilter],
    queryFn: () => apiFetch(`/admin/moderation/flags?${params}`),
  });

  const dismissMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/admin/moderation/flags/${id}/dismiss`, { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "flags"] }); toast({ title: "Flag dismissed" }); },
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/admin/moderation/flags/${id}/remove-content`, { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "flags"] }); toast({ title: "Content removed", description: "The flagged content has been deleted." }); },
    onError: (e) => toast({ title: "Error", description: String(e), variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All content types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="talk_post">Talks Post</SelectItem>
            <SelectItem value="talk_comment">Talks Comment</SelectItem>
            <SelectItem value="citizen_vote">Citizen Vote</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-auto">{flags.length} result{flags.length !== 1 ? "s" : ""}</span>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading…</div>
      ) : flags.length === 0 ? (
        <div className="py-16 text-center">
          <CheckCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No flags here</p>
          <p className="text-sm text-muted-foreground mt-1">All clear for this filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {flags.map((flag) => (
            <div key={flag.id} className="rounded-lg border border-border bg-card p-4 space-y-2">
              <div className="flex items-start gap-3">
                <Flag className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-foreground">
                      {CONTENT_TYPE_LABELS[flag.contentType] ?? flag.contentType} #{flag.contentId}
                    </span>
                    {statusBadge(flag.status)}
                    <Badge variant="outline" className="capitalize text-xs">
                      {FLAG_REASON_LABELS[flag.reason] ?? flag.reason}
                    </Badge>
                  </div>
                  {flag.details && (
                    <p className="text-sm text-muted-foreground line-clamp-2">"{flag.details}"</p>
                  )}
                  <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                    <span>Reported by: {flag.reporterName ?? flag.reporterEmail ?? "Anonymous"}</span>
                    <span>·</span>
                    <span>{new Date(flag.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                {flag.status === "pending" && (
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => dismissMutation.mutate(flag.id)}
                      disabled={dismissMutation.isPending}
                    >
                      <EyeOff className="w-3 h-3 mr-1" />
                      Dismiss
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" disabled={removeMutation.isPending}>
                          <Trash2 className="w-3 h-3 mr-1" />
                          Remove Content
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove this content?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This permanently deletes the {CONTENT_TYPE_LABELS[flag.contentType]?.toLowerCase()} and cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => removeMutation.mutate(flag.id)}
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BlockedWordsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [newWord, setNewWord] = useState("");

  const { data: words = [], isLoading } = useQuery<BlockedWord[]>({
    queryKey: ["admin", "blocked-words"],
    queryFn: () => apiFetch("/admin/moderation/blocked-words"),
  });

  const addMutation = useMutation({
    mutationFn: (word: string) => apiFetch("/admin/moderation/blocked-words", { method: "POST", body: JSON.stringify({ word }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "blocked-words"] });
      setNewWord("");
      toast({ title: "Word added to blocklist" });
    },
    onError: (e) => toast({ title: "Error", description: String(e), variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/admin/moderation/blocked-words/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "blocked-words"] }); toast({ title: "Word removed" }); },
  });

  const handleAdd = () => {
    const w = newWord.trim();
    if (!w) return;
    addMutation.mutate(w);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Add blocked word / phrase</h3>
        <p className="text-xs text-muted-foreground">Posts and comments containing these words will be rejected automatically.</p>
        <div className="flex gap-2">
          <Input
            placeholder="e.g. spam, offensive term…"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="flex-1"
          />
          <Button onClick={handleAdd} disabled={addMutation.isPending || !newWord.trim()}>
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">Loading…</div>
      ) : words.length === 0 ? (
        <div className="py-10 text-center text-muted-foreground">
          <p className="font-medium">No blocked words yet</p>
          <p className="text-sm mt-1">Add words above to start filtering content.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card divide-y divide-border">
          <div className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {words.length} blocked word{words.length !== 1 ? "s" : ""}
          </div>
          {words.map((w) => (
            <div key={w.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <code className="text-sm font-mono text-foreground">{w.word}</code>
                <span className="ml-3 text-xs text-muted-foreground">
                  Added {new Date(w.createdAt).toLocaleDateString()}
                </span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive h-7 w-7"
                onClick={() => deleteMutation.mutate(w.id)}
                disabled={deleteMutation.isPending}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PinnedPostsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: pageData, isLoading } = useQuery<{ items: AdminTalkPost[]; total: number }>({
    queryKey: ["admin", "pinned-posts"],
    queryFn: () => apiFetch("/admin/talks/posts?limit=200"),
  });

  const allPosts: AdminTalkPost[] = (pageData as any)?.items ?? [];
  const pinned = allPosts.filter((p) => p.isPinned);
  const unpinned = allPosts.filter((p) => !p.isPinned).slice(0, 50);

  const pinMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/admin/talks/posts/${id}/pin`, { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "pinned-posts"] }); toast({ title: "Post pinned" }); },
  });

  const unpinMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/admin/talks/posts/${id}/unpin`, { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "pinned-posts"] }); toast({ title: "Post unpinned" }); },
  });

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Pin className="w-4 h-4" /> Currently Pinned ({pinned.length})
        </h3>
        {pinned.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3">No posts are pinned yet.</p>
        ) : (
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {pinned.map((post) => (
              <div key={post.id} className="flex items-center gap-3 px-4 py-3">
                <Pin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{post.title}</p>
                  <p className="text-xs text-muted-foreground">{post.displayName} · {post.upvotes}↑ · {post.commentCount} comments</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => unpinMutation.mutate(post.id)}
                  disabled={unpinMutation.isPending}
                >
                  <PinOff className="w-3 h-3 mr-1" /> Unpin
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <MoreHorizontal className="w-4 h-4" /> Recent Posts (up to 50)
        </h3>
        {unpinned.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3">No unpinned posts.</p>
        ) : (
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {unpinned.map((post) => (
              <div key={post.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{post.title}</p>
                  <p className="text-xs text-muted-foreground">{post.displayName} · {post.upvotes}↑ · {post.commentCount} comments</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => pinMutation.mutate(post.id)}
                  disabled={pinMutation.isPending}
                >
                  <Pin className="w-3 h-3 mr-1" /> Pin
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Moderation() {
  const [tab, setTab] = useState<"flags" | "blocked-words" | "pinned">("flags");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ShieldAlert className="w-6 h-6" /> Content Moderation
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Review flagged content, manage the blocklist, and pin important discussions.
        </p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {(["flags", "blocked-words", "pinned"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "flags" ? "🚩 Flags" : t === "blocked-words" ? "🚫 Blocked Words" : "📌 Pinned Posts"}
          </button>
        ))}
      </div>

      <div>
        {tab === "flags" && <FlagsTab />}
        {tab === "blocked-words" && <BlockedWordsTab />}
        {tab === "pinned" && <PinnedPostsTab />}
      </div>
    </div>
  );
}
