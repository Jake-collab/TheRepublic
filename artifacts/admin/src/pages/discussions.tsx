import { useState } from "react";
import {
  useAdminListTalkCategories,
  useAdminCreateTalkCategory,
  useAdminUpdateTalkCategory,
  useAdminDeleteTalkCategory,
  useAdminListTalkPosts,
  useAdminDeleteTalkPost,
  useAdminListTalkPostComments,
  useAdminDeleteTalkComment,
  getAdminListTalkCategoriesQueryKey,
  getAdminListTalkPostsQueryKey,
  getAdminListTalkPostCommentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, MessageSquare, ChevronUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type TalkCategory = { id: number; name: string; emoji: string; sortOrder: number; isActive: boolean; postCount: number };
type TalkPost = { id: number; categoryId: number; categoryName: string; displayName: string; title: string; body: string; upvotes: number; commentCount: number; createdAt: string };
type TalkComment = { id: number; postId: number; displayName: string; body: string; createdAt: string };

function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  isDeleting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="dark">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CategoryDialog({
  open,
  onOpenChange,
  category,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  category?: TalkCategory;
  onSave: (data: { name: string; emoji: string; isActive: boolean }) => void;
  isSaving: boolean;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [emoji, setEmoji] = useState(category?.emoji ?? "💬");
  const [isActive, setIsActive] = useState(category?.isActive ?? true);

  const handleOpen = (v: boolean) => {
    if (v) {
      setName(category?.name ?? "");
      setEmoji(category?.emoji ?? "💬");
      setIsActive(category?.isActive ?? true);
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md dark">
        <DialogHeader>
          <DialogTitle>{category ? "Edit Category" : "Add Category"}</DialogTitle>
          <DialogDescription>
            Discussion categories appear as sections in the Talks tab of the mobile app.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex gap-3">
            <div className="space-y-2 w-20">
              <Label>Emoji</Label>
              <Input
                value={emoji}
                onChange={e => setEmoji(e.target.value)}
                className="text-center text-xl"
                maxLength={2}
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. Politics"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && name.trim()) onSave({ name: name.trim(), emoji, isActive }); }}
                autoFocus
              />
            </div>
          </div>
          {category && (
            <div className="flex items-center justify-between border rounded-lg px-4 py-3">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-muted-foreground">Inactive categories are hidden from users.</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSave({ name: name.trim(), emoji, isActive })} disabled={!name.trim() || isSaving}>
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CategoriesTab() {
  const queryClient = useQueryClient();
  const { data: categories, isLoading } = useAdminListTalkCategories({
    query: { queryKey: getAdminListTalkCategoriesQueryKey() }
  });
  const { mutateAsync: create, isPending: isCreating } = useAdminCreateTalkCategory();
  const { mutateAsync: update, isPending: isUpdating } = useAdminUpdateTalkCategory();
  const { mutateAsync: remove, isPending: isDeleting } = useAdminDeleteTalkCategory();

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TalkCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TalkCategory | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: getAdminListTalkCategoriesQueryKey() });

  const handleCreate = async (data: { name: string; emoji: string; isActive: boolean }) => {
    try {
      await create({ data: { name: data.name, emoji: data.emoji } });
      await refresh();
      setAddOpen(false);
      toast({ title: "Category created" });
    } catch {
      toast({ title: "Failed to create category", variant: "destructive" });
    }
  };

  const handleUpdate = async (data: { name: string; emoji: string; isActive: boolean }) => {
    if (!editTarget) return;
    try {
      await update({ id: editTarget.id, data });
      await refresh();
      setEditTarget(null);
      toast({ title: "Category updated" });
    } catch {
      toast({ title: "Failed to update category", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await remove({ id: deleteTarget.id });
      await refresh();
      setDeleteTarget(null);
      toast({ title: "Category deleted" });
    } catch {
      toast({ title: "Failed to delete category", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add Category
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">Emoji</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Posts</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                </TableRow>
              ))
            ) : !categories?.length ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No categories yet. Add one to get started.
                </TableCell>
              </TableRow>
            ) : (
              (categories as unknown as TalkCategory[]).map(cat => (
                <TableRow key={cat.id}>
                  <TableCell className="text-xl">{cat.emoji}</TableCell>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell className="text-muted-foreground">{cat.postCount}</TableCell>
                  <TableCell>
                    {cat.isActive
                      ? <Badge variant="default" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Active</Badge>
                      : <Badge variant="secondary">Inactive</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditTarget(cat)}>
                        <Pencil className="w-3 h-3 mr-1" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(cat)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" /> Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CategoryDialog open={addOpen} onOpenChange={setAddOpen} onSave={handleCreate} isSaving={isCreating} />
      {editTarget && (
        <CategoryDialog
          open
          onOpenChange={v => { if (!v) setEditTarget(null); }}
          category={editTarget}
          onSave={handleUpdate}
          isSaving={isUpdating}
        />
      )}
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={v => { if (!v) setDeleteTarget(null); }}
        title={`Delete "${deleteTarget?.name}"?`}
        description={`This will permanently delete this category and all ${deleteTarget?.postCount ?? 0} posts inside it. This cannot be undone.`}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}

function CommentsSheet({ post, open, onOpenChange }: { post: TalkPost; open: boolean; onOpenChange: (v: boolean) => void }) {
  const queryClient = useQueryClient();
  const { data: comments, isLoading } = useAdminListTalkPostComments(post.id, {
    query: { queryKey: getAdminListTalkPostCommentsQueryKey(post.id), enabled: open }
  });
  const { mutateAsync: deleteComment, isPending: isDeletingComment } = useAdminDeleteTalkComment();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDeleteComment = async (id: number) => {
    setDeletingId(id);
    try {
      await deleteComment({ id });
      await queryClient.invalidateQueries({ queryKey: getAdminListTalkPostCommentsQueryKey(post.id) });
      await queryClient.invalidateQueries({ queryKey: getAdminListTalkPostsQueryKey({}) });
      toast({ title: "Comment deleted" });
    } catch {
      toast({ title: "Failed to delete comment", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="dark w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>Comments on post</SheetTitle>
          <p className="text-sm text-muted-foreground font-medium mt-1 line-clamp-2">{post.title}</p>
        </SheetHeader>
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
          ) : !comments?.length ? (
            <p className="text-center text-muted-foreground py-8">No comments on this post.</p>
          ) : (
            (comments as unknown as TalkComment[]).map(c => (
              <div key={c.id} className="border rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{c.displayName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-destructive hover:text-destructive"
                      disabled={deletingId === c.id && isDeletingComment}
                      onClick={() => handleDeleteComment(c.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{c.body}</p>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PostsTab() {
  const queryClient = useQueryClient();
  const { data: categories } = useAdminListTalkCategories({
    query: { queryKey: getAdminListTalkCategoriesQueryKey() }
  });
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const { data: postsPage, isLoading } = useAdminListTalkPosts({
    categoryId: categoryFilter !== "all" ? Number(categoryFilter) : undefined,
    search: search || undefined,
  }, { query: { queryKey: getAdminListTalkPostsQueryKey({ categoryId: categoryFilter !== "all" ? Number(categoryFilter) : undefined, search: search || undefined }) } });

  const { mutateAsync: deletePost, isPending: isDeleting } = useAdminDeleteTalkPost();
  const [deleteTarget, setDeleteTarget] = useState<TalkPost | null>(null);
  const [commentsPost, setCommentsPost] = useState<TalkPost | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDeletePost = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await deletePost({ id: deleteTarget.id });
      await queryClient.invalidateQueries({ queryKey: getAdminListTalkPostsQueryKey({}) });
      await queryClient.invalidateQueries({ queryKey: getAdminListTalkCategoriesQueryKey() });
      setDeleteTarget(null);
      toast({ title: "Post deleted" });
    } catch {
      toast({ title: "Failed to delete post", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const cats = (categories ?? []) as unknown as TalkCategory[];
  const posts = (postsPage?.items ?? []) as unknown as TalkPost[];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search by title…"
          className="max-w-xs"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent className="dark">
            <SelectItem value="all">All categories</SelectItem>
            {cats.map(c => (
              <SelectItem key={c.id} value={String(c.id)}>{c.emoji} {c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {postsPage && (
          <span className="text-sm text-muted-foreground ml-auto">{postsPage.total} posts</span>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="w-20 text-center">
                <ChevronUp className="w-4 h-4 inline" />
              </TableHead>
              <TableHead className="w-20 text-center">
                <MessageSquare className="w-4 h-4 inline" />
              </TableHead>
              <TableHead>Posted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                </TableRow>
              ))
            ) : !posts.length ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {search || categoryFilter !== "all" ? "No posts match your filters." : "No discussion posts yet."}
                </TableCell>
              </TableRow>
            ) : (
              posts.map(post => (
                <TableRow key={post.id}>
                  <TableCell className="font-medium max-w-[220px]">
                    <span className="line-clamp-1">{post.title}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{post.displayName}</TableCell>
                  <TableCell>
                    <span className="text-sm">{post.categoryName}</span>
                  </TableCell>
                  <TableCell className="text-center text-sm">{post.upvotes}</TableCell>
                  <TableCell className="text-center text-sm">{post.commentCount}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCommentsPost(post)}
                        disabled={post.commentCount === 0}
                      >
                        <MessageSquare className="w-3 h-3 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(post)}
                        disabled={deletingId === post.id && isDeleting}
                      >
                        <Trash2 className="w-3 h-3 mr-1" /> Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={v => { if (!v) setDeleteTarget(null); }}
        title="Delete this post?"
        description={`"${deleteTarget?.title}" and all its comments will be permanently deleted.`}
        onConfirm={handleDeletePost}
        isDeleting={deletingId === deleteTarget?.id && isDeleting}
      />

      {commentsPost && (
        <CommentsSheet
          post={commentsPost}
          open={!!commentsPost}
          onOpenChange={v => { if (!v) setCommentsPost(null); }}
        />
      )}
    </div>
  );
}

export default function Discussions() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Discussions</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage Talks categories, moderate posts, and remove comments.
        </p>
      </div>

      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
        </TabsList>
        <TabsContent value="categories" className="mt-4">
          <CategoriesTab />
        </TabsContent>
        <TabsContent value="posts" className="mt-4">
          <PostsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
