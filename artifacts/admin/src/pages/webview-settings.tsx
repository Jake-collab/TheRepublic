import { useState, useEffect, useRef } from "react";
import {
  useAdminGetWebviewSettings,
  useAdminUpdateWebviewSettings,
  getAdminGetWebviewSettingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export default function WebviewSettings() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useAdminGetWebviewSettings({
    query: { queryKey: getAdminGetWebviewSettingsQueryKey() }
  });
  const { mutateAsync: updateSettings, isPending } = useAdminUpdateWebviewSettings();
  const initialized = useRef(false);

  const [preloadEnabled, setPreloadEnabled] = useState(true);
  const [sessionMemoryEnabled, setSessionMemoryEnabled] = useState(true);
  const [maxPreloadedWebviews, setMaxPreloadedWebviews] = useState("3");
  const [homepageLimit, setHomepageLimit] = useState("10");
  const [freeWebsiteLimit, setFreeWebsiteLimit] = useState("10");
  const [proWebsiteLimit, setProWebsiteLimit] = useState("27");

  useEffect(() => {
    if (settings && !initialized.current) {
      initialized.current = true;
      setPreloadEnabled(settings.preloadEnabled);
      setSessionMemoryEnabled(settings.sessionMemoryEnabled);
      setMaxPreloadedWebviews(String(settings.maxPreloadedWebviews));
      setHomepageLimit(String(settings.homepageLimit));
      setFreeWebsiteLimit(String(settings.freeWebsiteLimit));
      setProWebsiteLimit(String(settings.proWebsiteLimit));
    }
  }, [settings]);

  const handleSave = async () => {
    const parsed = {
      preloadEnabled,
      sessionMemoryEnabled,
      maxPreloadedWebviews: Number(maxPreloadedWebviews),
      homepageLimit: Number(homepageLimit),
      freeWebsiteLimit: Number(freeWebsiteLimit),
      proWebsiteLimit: Number(proWebsiteLimit),
    };

    if (Object.values(parsed).some(v => typeof v === "number" && isNaN(v))) {
      toast({ title: "All limits must be valid numbers", variant: "destructive" });
      return;
    }

    try {
      await updateSettings({ data: parsed });
      await queryClient.invalidateQueries({ queryKey: getAdminGetWebviewSettingsQueryKey() });
      initialized.current = false;
      toast({ title: "WebView settings saved" });
    } catch {
      toast({ title: "Failed to save settings", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">WebView Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Control preloading, memory management, and website limits for the mobile browser.
        </p>
      </div>

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
              <CardDescription>Configure how WebViews are preloaded and managed in memory.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Preloading</Label>
                  <p className="text-sm text-muted-foreground">Preload websites in the background for faster tab switching.</p>
                </div>
                <Switch checked={preloadEnabled} onCheckedChange={setPreloadEnabled} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Session Memory</Label>
                  <p className="text-sm text-muted-foreground">Keep WebViews in memory when switching tabs (uses more RAM).</p>
                </div>
                <Switch checked={sessionMemoryEnabled} onCheckedChange={setSessionMemoryEnabled} />
              </div>
              <div className="space-y-2">
                <Label>Max Preloaded WebViews</Label>
                <p className="text-xs text-muted-foreground">How many sites to preload at once. Higher = faster but more memory.</p>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={maxPreloadedWebviews}
                  onChange={e => setMaxPreloadedWebviews(e.target.value)}
                  className="max-w-[160px]"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>User Limits</CardTitle>
              <CardDescription>Control how many websites are visible to Free vs. Pro subscribers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Homepage Limit</Label>
                <p className="text-xs text-muted-foreground">Max websites shown on the homepage grid.</p>
                <Input
                  type="number"
                  min={1}
                  value={homepageLimit}
                  onChange={e => setHomepageLimit(e.target.value)}
                  className="max-w-[160px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Free User Website Limit</Label>
                  <p className="text-xs text-muted-foreground">Max tabs visible to free users.</p>
                  <Input
                    type="number"
                    min={1}
                    value={freeWebsiteLimit}
                    onChange={e => setFreeWebsiteLimit(e.target.value)}
                    className="max-w-[160px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pro User Website Limit</Label>
                  <p className="text-xs text-muted-foreground">Max tabs visible to Pro subscribers.</p>
                  <Input
                    type="number"
                    min={1}
                    value={proWebsiteLimit}
                    onChange={e => setProWebsiteLimit(e.target.value)}
                    className="max-w-[160px]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isPending} size="lg">
              {isPending ? "Saving…" : "Save Settings"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
