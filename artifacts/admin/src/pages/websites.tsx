import { useState } from "react";
import { useAdminListWebsites, getAdminListWebsitesQueryKey } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function Websites() {
  const [search, setSearch] = useState("");
  const { data: websites, isLoading } = useAdminListWebsites({}, {
    query: { queryKey: getAdminListWebsitesQueryKey({}) }
  });

  const filtered = websites?.filter(w => w.name.toLowerCase().includes(search.toLowerCase()) || w.url.toLowerCase().includes(search.toLowerCase())) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Websites</h1>
        <Button>Add Website</Button>
      </div>

      <div className="flex items-center gap-4">
        <Input 
          placeholder="Search websites..." 
          className="max-w-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

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
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No websites found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((website) => (
                <TableRow key={website.id}>
                  <TableCell className="font-medium">{website.name}</TableCell>
                  <TableCell className="text-muted-foreground">{website.url}</TableCell>
                  <TableCell>{website.categoryName}</TableCell>
                  <TableCell>
                    {website.isActive ? (
                      <Badge variant="default" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {website.isFree ? (
                      <Badge variant="outline">Free</Badge>
                    ) : (
                      <Badge variant="default" className="bg-primary/20 text-primary border-primary/30">Pro</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Edit</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
