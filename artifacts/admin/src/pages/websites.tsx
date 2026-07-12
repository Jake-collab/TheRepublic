import { useState } from "react";
import {
  useAdminGetWebsitesWithUsage,
  useAdminCreateWebsite,
  useAdminUpdateWebsite,
  useAdminBulkUpdateWebsites,
  useAdminReorderWebsites,
  useAdminDeleteWebsite,
  useAdminListCategories,
  getAdminGetWebsitesWithUsageQueryKey,
  getAdminListCategoriesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Download, ChevronUp, ChevronDown, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type WebsiteWithUsage = {
  id: number;
  name: string;
  url: string;
  displayDomain: string;
  categoryId: number | null;
  categoryName: string | null;
  isActive: boolean;
  isFree: boolean;
  iconUrl?: string | null;
  tabOrder: number;
  userCount: number;
};

type Category = { id: number; name: string; isActive: boolean };

type WebsiteFormData = {
  name: string;
  url: string;
  displayDomain: string;
  categoryId: number | null;
  isFree: boolean;
  isActive: boolean;
  iconUrl: string;
};

function WebsiteDialog({
  open, onOpenChange, website, categories, onSave, isSaving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  website?: WebsiteWithUsage;
  categories: Category[];
  onSave: (data: WebsiteFormData) => void;
  isSaving: boolean;
}) {
  const blank: WebsiteFormData = {
    name: website?.name ?? "",
    url: website?.url ?? "",
    displayDomain: website?.displayDomain ?? "",
    categoryId: website?.categoryId ?? null,
    isFree: website?.isFree ?? true,
    isActive: website?.isActive ?? true,
    iconUrl: website?.iconUrl ?? "",
  };
  const [form, setForm] = useState<WebsiteFormData>(blank);
  const set = (key: keyof WebsiteFormData, value: WebsiteFormData[typeof key]) =>
    setForm(f => ({ ...f, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={v => { if (v) setForm(blank); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg dark max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{website ? "Edit Website" : "Add Website"}</DialogTitle>
          <DialogDescription>
            Curated websites appear as tabs in the mobile browser. Free tier users see the first 10; Pro users see all.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input placeholder="Uber Eats" value={form.name} onChange={e => set("name", e.target.value)} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>URL <span className="text-destructive">*</span></Label>
              <Input placeholder="https://ubereats.com" value={form.url} onChange={e => set("url", e.target.value)} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Display Domain <span className="text-destructive">*</span></Label>
              <Input placeholder="ubereats.com" value={form.displayDomain} onChange={e => set("displayDomain", e.target.value)} />
              <p className="text-xs text-muted-foreground">Shown under the website name in the browser tabs.</p>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Icon URL</Label>
              <Input placeholder="https://..." value={form.iconUrl} onChange={e => set("iconUrl", e.target.value)} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Category</Label>
              <Select
                value={form.categoryId ? String(form.categoryId) : "none"}
                onValueChange={v => set("categoryId", v === "none" ? null : Number(v))}
              >
                <SelectTrigger><SelectValue placeholder="No category" /></SelectTrigger>
                <SelectContent className="dark">
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between border rounded-lg px-4 py-3">
            <div>
              <p className="text-sm font-medium">Free Tier</p>
              <p className="text-xs text-muted-foreground">Visible to all users. Disable for Pro-only.</p>
            </div>
            <Switch checked={form.isFree} onCheckedChange={v => set("isFree", v)} />
          </div>
          <div className="flex items-center justify-between border rounded-lg px-4 py-3">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">Inactive websites are hidden from the browser.</p>
            </div>
            <Switch checked={form.isActive} onCheckedChange={v => set("isActive", v)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={!form.name.trim() || !form.url.trim() || !form.displayDomain.trim() || isSaving}>
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Websites() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WebsiteWithUsage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WebsiteWithUsage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: websites, isLoading } = useAdminGetWebsitesWithUsage({
    query: { queryKey: getAdminGetWebsitesWithUsageQueryKey() },
  });
  const { data: categories } = useAdminListCategories({
    query: { queryKey: getAdminListCategoriesQueryKey() },
  });
  const { mutateAsync: createWebsite, isPending: isCreating } = useAdminCreateWebsite();
  const { mutateAsync: updateWebsite, isPending: isUpdating } = useAdminUpdateWebsite();
  const { mutateAsync: bulkUpdate, isPending: isBulking } = useAdminBulkUpdateWebsites();
  const { mutateAsync: reorder } = useAdminReorderWebsites();
  const { mutateAsync: deleteWebsite } = useAdminDeleteWebsite();

  const refresh = () => queryClient.invalidateQueries({ queryKey: getAdminGetWebsitesWithUsageQueryKey() });

  const sorted = [...(websites ?? [] as WebsiteWithUsage[])].sort((a, b) => a.tabOrder - b.tabOrder) as WebsiteWithUsage[];
  const filtered = sorted.filter(w =>
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    w.url.toLowerCase().includes(search.toLowerCase())
  );

  const allSelected = filtered.length > 0 && selected.size === filtered.length;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(filtered.map(w => w.id)));
  const toggleOne = (id: number) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const cats = (categories ?? []) as unknown as Category[];

  const handleCreate = async (form: WebsiteFormData) => {
    try {
      await createWebsite({ data: { name: form.name.trim(), url: form.url.trim(), displayDomain: form.displayDomain.trim(), iconUrl: form.iconUrl.trim() || null, categoryId: form.categoryId, isFree: form.isFree, isActive: form.isActive } });
      await refresh(); setAddOpen(false); toast({ title: "Website added" });
    } catch { toast({ title: "Failed to add website", variant: "destructive" }); }
  };

  const handleUpdate = async (form: WebsiteFormData) => {
    if (!editTarget) return;
    try {
      await updateWebsite({ id: editTarget.id, data: { name: form.name.trim(), url: form.url.trim(), displayDomain: form.displayDomain.trim(), iconUrl: form.iconUrl.trim() || null, categoryId: form.categoryId, isFree: form.isFree, isActive: form.isActive } });
      await refresh(); setEditTarget(null); toast({ title: "Website updated" });
    } catch { toast({ title: "Failed to update website", variant: "destructive" }); }
  };

  const handleBulkUpdate = async (updates: { isActive?: boolean; isFree?: boolean }) => {
    try {
      await bulkUpdate({ data: { ids: [...selected], updates } });
      await refresh(); setSelected(new Set());
      toast({ title: `Updated ${selected.size} website(s)` });
    } catch { toast({ title: "Bulk update failed", variant: "destructive" }); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteWebsite({ id: deleteTarget.id });
      await refresh(); setDeleteTarget(null);
      toast({ title: `"${deleteTarget.name}" deleted` });
    } catch { toast({ title: "Failed to delete website", variant: "destructive" }); }
    finally { setIsDeleting(false); }
  };

  const handleExport = () => {
    const a = document.createElement("a");
    a.href = `${BASE}/api/admin/websites/export`;
    a.click();
  };

  const handleMove = async (w: WebsiteWithUsage, dir: "up" | "down") => {
    const list = [...sorted];
    const idx = list.findIndex(x => x.id === w.id);
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= list.length) return;
    [list[idx], list[swapIdx]] = [list[swapIdx], list[idx]];
    try {
      await reorder({ data: { ids: list.map(x => x.id) } });
      await refresh();
    } catch { toast({ title: "Reorder failed", variant: "destructive" }); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Websites</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Curated sites shown as tabs in the mobile browser. Free = all users; Pro = subscribers only.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Website
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Input
          placeholder="Search by name or URL…"
          className="max-w-sm"
          value={search}
          onChange={e => { setSearch(e.target.value); setSelected(new Set()); }}
        />
        {selected.size > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-card text-sm">
            <span className="text-muted-foreground font-medium">{selected.size} selected</span>
            <div className="h-3.5 w-px bg-border" />
            <Button variant="ghost" size="sm" className="h-7 px-2 text-emerald-500 hover:text-emerald-400" onClick={() => handleBulkUpdate({ isActive: true })} disabled={isBulking}>Activate</Button>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground" onClick={() => handleBulkUpdate({ isActive: false })} disabled={isBulking}>Deactivate</Button>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground" onClick={() => handleBulkUpdate({ isFree: true })} disabled={isBulking}>Set Free</Button>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-primary" onClick={() => handleBulkUpdate({ isFree: false })} disabled={isBulking}>Set Pro</Button>
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setSelected(new Set())}>Clear</Button>
          </div>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
              </TableHead>
              <TableHead className="w-8">Order</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1"><Users className="h-3.5 w-3.5" /> Users</div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {search ? "No websites match your search." : "No websites yet. Add one to get started."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((w, idx) => (
                <TableRow key={w.id} className={selected.has(w.id) ? "bg-muted/30" : ""}>
                  <TableCell>
                    <Checkbox checked={selected.has(w.id)} onCheckedChange={() => toggleOne(w.id)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => handleMove(w, "up")}
                        disabled={idx === 0}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                        aria-label="Move up"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleMove(w, "down")}
                        disabled={idx === filtered.length - 1}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                        aria-label="Move down"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{w.name}</p>
                      <p className="text-xs text-muted-foreground">{w.displayDomain}</p>
                    </div>
                  </TableCell>
                  <TableCell>{w.categoryName ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>
                    {w.isActive
                      ? <Badge variant="default" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Active</Badge>
                      : <Badge variant="secondary">Inactive</Badge>}
                  </TableCell>
                  <TableCell>
                    {w.isFree
                      ? <Badge variant="outline">Free</Badge>
                      : <Badge variant="default" className="bg-primary/20 text-primary border-primary/30">Pro</Badge>}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-xs">
                      {w.userCount}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditTarget(w)}>
                        <Pencil className="w-3 h-3 mr-1" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(w)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <WebsiteDialog open={addOpen} onOpenChange={setAddOpen} categories={cats} onSave={handleCreate} isSaving={isCreating} />
      {editTarget && (
        <WebsiteDialog
          open
          onOpenChange={v => { if (!v) setEditTarget(null); }}
          website={editTarget}
          categories={cats}
          onSave={handleUpdate}
          isSaving={isUpdating}
        />
      )}

      <Dialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null); }}>
        <DialogContent className="dark sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete website?</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong> and remove it from all {deleteTarget?.userCount ?? 0} user preference{deleteTarget?.userCount !== 1 ? "s" : ""}. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
