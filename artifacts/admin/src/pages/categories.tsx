import { useState } from "react";
import {
  useAdminListCategories,
  useAdminCreateCategory,
  useAdminUpdateCategory,
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
import { GripVertical, Plus, Pencil } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Category = { id: number; name: string; isActive: boolean; sortOrder: number | null };

function CategoryDialog({
  open,
  onOpenChange,
  category,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  category?: Category;
  onSave: (data: { name: string; isActive: boolean }) => void;
  isSaving: boolean;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [isActive, setIsActive] = useState(category?.isActive ?? true);

  const reset = (cat?: Category) => {
    setName(cat?.name ?? "");
    setIsActive(cat?.isActive ?? true);
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (v) reset(category); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md dark">
        <DialogHeader>
          <DialogTitle>{category ? "Edit Category" : "Add Category"}</DialogTitle>
          <DialogDescription>
            Categories organise the curated websites shown in the mobile browser tabs.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              placeholder="e.g. Food Delivery"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && name.trim()) onSave({ name: name.trim(), isActive }); }}
              autoFocus
            />
          </div>
          {category && (
            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">Inactive categories are hidden from users.</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSave({ name: name.trim(), isActive })} disabled={!name.trim() || isSaving}>
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Categories() {
  const queryClient = useQueryClient();
  const { data: categories, isLoading } = useAdminListCategories({
    query: { queryKey: getAdminListCategoriesQueryKey() }
  });
  const { mutateAsync: createCategory, isPending: isCreating } = useAdminCreateCategory();
  const { mutateAsync: updateCategory, isPending: isUpdating } = useAdminUpdateCategory();

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: getAdminListCategoriesQueryKey() });

  const handleCreate = async ({ name }: { name: string; isActive: boolean }) => {
    try {
      await createCategory({ data: { name } });
      await refresh();
      setAddOpen(false);
      toast({ title: "Category created" });
    } catch {
      toast({ title: "Failed to create category", variant: "destructive" });
    }
  };

  const handleUpdate = async ({ name, isActive }: { name: string; isActive: boolean }) => {
    if (!editTarget) return;
    try {
      await updateCategory({ id: editTarget.id, data: { name, isActive } });
      await refresh();
      setEditTarget(null);
      toast({ title: "Category updated" });
    } catch {
      toast({ title: "Failed to update category", variant: "destructive" });
    }
  };

  const handleToggleActive = async (cat: Category) => {
    try {
      await updateCategory({ id: cat.id, data: { isActive: !cat.isActive } });
      await refresh();
      toast({ title: cat.isActive ? "Category deactivated" : "Category activated" });
    } catch {
      toast({ title: "Failed to update category", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Groups for curated websites — shown as filter tabs in the mobile browser.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add Category
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : !categories?.length ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No categories yet. Add one to get started.
                </TableCell>
              </TableRow>
            ) : (
              (categories as unknown as Category[]).map(cat => (
                <TableRow key={cat.id}>
                  <TableCell>
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  </TableCell>
                  <TableCell className="font-medium">{cat.name}</TableCell>
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
                        className={cat.isActive ? "text-destructive hover:text-destructive" : "text-emerald-500 hover:text-emerald-400"}
                        onClick={() => handleToggleActive(cat)}
                      >
                        {cat.isActive ? "Deactivate" : "Activate"}
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
    </div>
  );
}
