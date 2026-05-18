import { useAdminGetWebviewSettings, getAdminGetWebviewSettingsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function WebviewSettings() {
  const { data: settings, isLoading } = useAdminGetWebviewSettings({
    query: { queryKey: getAdminGetWebviewSettingsQueryKey() }
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight">WebView Settings</h1>

      {isLoading ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance & Memory</CardTitle>
              <CardDescription>Configure how webviews are preloaded and managed in memory.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Preloading</Label>
                  <p className="text-sm text-muted-foreground">Preload websites in the background for faster switching.</p>
                </div>
                <Switch checked={settings?.preloadEnabled} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Session Memory</Label>
                  <p className="text-sm text-muted-foreground">Keep webviews in memory when switching tabs.</p>
                </div>
                <Switch checked={settings?.sessionMemoryEnabled} />
              </div>
              <div className="grid gap-2">
                <Label>Max Preloaded WebViews</Label>
                <Input type="number" defaultValue={settings?.maxPreloadedWebviews} className="max-w-[200px]" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Limits</CardTitle>
              <CardDescription>Set restrictions on user dashboards.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-2">
                <Label>Homepage Limit</Label>
                <Input type="number" defaultValue={settings?.homepageLimit} className="max-w-[200px]" />
              </div>
              <div className="grid gap-2">
                <Label>Free User Website Limit</Label>
                <Input type="number" defaultValue={settings?.freeWebsiteLimit} className="max-w-[200px]" />
              </div>
              <div className="grid gap-2">
                <Label>Pro User Website Limit</Label>
                <Input type="number" defaultValue={settings?.proWebsiteLimit} className="max-w-[200px]" />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button>Save Settings</Button>
          </div>
        </div>
      )}
    </div>
  );
}
