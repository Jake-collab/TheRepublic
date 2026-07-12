import { useState } from "react";
import {
  useAdminListWebsites,
  useAdminCreateWebsite,
  useAdminUpdateWebsite,
  useAdminListCategories,
  getAdminListWebsitesQueryKey,
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Website = {
  id: number;
  name: string;
  url: string;
  displayDomain: string;
  categoryId: number | null;
  categoryName: string | null;
  isActive: boolean;
  isFree: boolean;
  iconUrl?: string | null;
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
  open,
  onOpenChange,
  website,
  categories,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  website?: Website;
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

  const handleOpen = (v: boolean) => {
    if (v) setForm(blank);
    onOpenChange(v);
  };

  const valid = form.name.trim() && form.url.trim() && form.displayDomain.trim();

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
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
                <SelectTrigger>
                  <SelectValue placeholder="No category" />
                </SelectTrigger>
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
          <Button onClick={() => onSave(form)} disabled={!valid || isSaving}>
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
  const { data: websites, isLoading } = useAdminListWebsites({}, {
    query: { queryKey: getAdminListWebsitesQueryKey({}) }
  });
  const { data: categories } = useAdminListCategories({
    query: { queryKey: getAdminListCategoriesQueryKey() }
  });
  const { mutateAsync: createWebsite, isPending: isCreating } = useAdminCreateWebsite();
  const { mutateAsync: updateWebsite, isPending: isUpdating } = useAdminUpdateWebsite();

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Website | null>(null);

  const filtered = (websites ?? []).filter(w =>
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    w.url.toLowerCase().includes(search.toLowerCase())
  );

  const refresh = () => queryClient.invalidateQueries({ queryKey: getAdminListWebsitesQueryKey({}) });

  const handleCreate = async (form: WebsiteFormData) => {
    try {
      await createWebsite({
        data: {
          name: form.name.trim(),
          url: form.url.trim(),
          displayDomain: form.displayDomain.trim(),
          iconUrl: form.iconUrl.trim() || null,
          categoryId: form.categoryId,
          isFree: form.isFree,
          isActive: form.isActive,
        }
      });
      await refresh();
      setAddOpen(false);
      toast({ title: "Website added" });
    } catch {
      toast({ title: "Failed to add website", variant: "destructive" });
    }
  };

  const handleUpdate = async (form: WebsiteFormData) => {
    if (!editTarget) return;
    try {
      await updateWebsite({
        id: editTarget.id,
        data: {
          name: form.name.trim(),
          url: form.url.trim(),
          displayDomain: form.displayDomain.trim(),
          iconUrl: form.iconUrl.trim() || null,
          categoryId: form.categoryId,
          isFree: form.isFree,
          isActive: form.isActive,
        }
      });
      await refresh();
      setEditTarget(null);
      toast({ title: "Website updated" });
    } catch {
      toast({ title: "Failed to update website", variant: "destructive" });
    }
  };

  const handleToggleActive = async (w: Website) => {
    try {
      await updateWebsite({ id: w.id, data: { isActive: !w.isActive } });
      await refresh();
      toast({ title: w.isActive ? "Website deactivated" : "Website activated" });
    } catch {
      toast({ title: "Failed to update website", variant: "destructive" });
    }
  };

  const cats = (categories ?? []) as unknown as Category[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Websites</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Curated sites shown as tabs in the mobile browser. Free = all users; Pro = subscribers only.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add Website
        </Button>
      </div>

      <Input
        placeholder="Search by name or URL…"
        className="max-w-sm"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tier</TableHead>
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
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {search ? "No websites match your search." : "No websites yet. Add one to get started."}
                </TableCell>
              </TableRow>
            ) : (
              (filtered as unknown as Website[]).map(w => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">{w.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{w.displayDomain}</TableCell>
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
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditTarget(w)}>
                        <Pencil className="w-3 h-3 mr-1" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={w.isActive ? "text-destructive hover:text-destructive" : "text-emerald-500 hover:text-emerald-400"}
                        onClick={() => handleToggleActive(w)}
                      >
                        {w.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <WebsiteDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        categories={cats}
        onSave={handleCreate}
        isSaving={isCreating}
      />
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
    </div>
  );
}
