import { useState, useEffect, useRef } from "react";
import {
  useAdminGetAppConfig,
  useAdminUpdateAppConfig,
  getAdminGetAppConfigQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, Megaphone, Sliders, Smartphone } from "lucide-react";

type AppConfigForm = {
  maintenanceMode: boolean;
  maintenanceBanner: string;
  announcementBanner: string;
  announcementActive: boolean;
  minAppVersion: string;
  citizenVoteEnabled: boolean;
  discussionsEnabled: boolean;
};

const defaults: AppConfigForm = {
  maintenanceMode: false,
  maintenanceBanner: "",
  announcementBanner: "",
  announcementActive: false,
  minAppVersion: "1.0.0",
  citizenVoteEnabled: true,
  discussionsEnabled: true,
};

export default function AppConfig() {
  const queryClient = useQueryClient();
  const { data: config, isLoading } = useAdminGetAppConfig({
    query: { queryKey: getAdminGetAppConfigQueryKey() },
  });
  const { mutateAsync: updateConfig, isPending } = useAdminUpdateAppConfig();
  const initialized = useRef(false);
  const [form, setForm] = useState<AppConfigForm>(defaults);

  useEffect(() => {
    if (config && !initialized.current) {
      initialized.current = true;
      setForm({
        maintenanceMode: config.maintenanceMode,
        maintenanceBanner: config.maintenanceBanner ?? "",
        announcementBanner: config.announcementBanner ?? "",
        announcementActive: config.announcementActive,
        minAppVersion: config.minAppVersion,
        citizenVoteEnabled: config.citizenVoteEnabled,
        discussionsEnabled: config.discussionsEnabled,
      });
    }
  }, [config]);

  const set = <K extends keyof AppConfigForm>(key: K, value: AppConfigForm[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const handleSave = async () => {
    try {
      await updateConfig({
        data: {
          maintenanceMode: form.maintenanceMode,
          maintenanceBanner: form.maintenanceBanner.trim() || undefined,
          announcementBanner: form.announcementBanner.trim() || undefined,
          announcementActive: form.announcementActive,
          minAppVersion: form.minAppVersion.trim() || "1.0.0",
          citizenVoteEnabled: form.citizenVoteEnabled,
          discussionsEnabled: form.discussionsEnabled,
        },
      });
      await queryClient.invalidateQueries({ queryKey: getAdminGetAppConfigQueryKey() });
      initialized.current = false;
      toast({ title: "App configuration saved" });
    } catch {
      toast({ title: "Failed to save configuration", variant: "destructive" });
    }
  };

  const SectionSkeleton = () => (
    <Card>
      <CardContent className="p-6 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">App Configuration</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Global feature flags, maintenance mode, announcements, and version gating for the mobile app.
        </p>
      </div>

      {isLoading ? (
        <>
          <SectionSkeleton />
          <SectionSkeleton />
          <SectionSkeleton />
        </>
      ) : (
        <div className="space-y-6">
          {/* Maintenance Mode */}
          <Card className={form.maintenanceMode ? "border-destructive/50" : ""}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className={`w-4 h-4 ${form.maintenanceMode ? "text-destructive" : "text-muted-foreground"}`} />
                <CardTitle>Maintenance Mode</CardTitle>
                {form.maintenanceMode && <Badge variant="destructive" className="ml-auto">ACTIVE</Badge>}
              </div>
              <CardDescription>
                When enabled, all mobile app users see a maintenance message and cannot access features.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between border rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Enable Maintenance Mode</p>
                  <p className="text-xs text-muted-foreground">Take the app offline for all users immediately.</p>
                </div>
                <Switch
                  checked={form.maintenanceMode}
                  onCheckedChange={v => set("maintenanceMode", v)}
                  className="data-[state=checked]:bg-destructive"
                />
              </div>
              <div className="space-y-2">
                <Label>Maintenance Message</Label>
                <Textarea
                  placeholder="We're performing scheduled maintenance. We'll be back shortly!"
                  value={form.maintenanceBanner}
                  onChange={e => set("maintenanceBanner", e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">Shown to users when maintenance mode is active.</p>
              </div>
            </CardContent>
          </Card>

          {/* Announcement Banner */}
          <Card className={form.announcementActive ? "border-primary/30" : ""}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Megaphone className={`w-4 h-4 ${form.announcementActive ? "text-primary" : "text-muted-foreground"}`} />
                <CardTitle>Announcement Banner</CardTitle>
                {form.announcementActive && <Badge className="ml-auto bg-primary/20 text-primary border-primary/30">ACTIVE</Badge>}
              </div>
              <CardDescription>
                Display a persistent banner at the top of the mobile app for announcements or promotions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between border rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Show Announcement Banner</p>
                  <p className="text-xs text-muted-foreground">Users will see this banner until they dismiss it.</p>
                </div>
                <Switch checked={form.announcementActive} onCheckedChange={v => set("announcementActive", v)} />
              </div>
              <div className="space-y-2">
                <Label>Banner Text</Label>
                <Textarea
                  placeholder="🎉 Pro plan is now available! Unlock 27+ websites for $9.99/mo."
                  value={form.announcementBanner}
                  onChange={e => set("announcementBanner", e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Feature Flags */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-muted-foreground" />
                <CardTitle>Feature Flags</CardTitle>
              </div>
              <CardDescription>
                Toggle individual features on or off without deploying a new app version.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between border rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Citizen Vote Feed</p>
                  <p className="text-xs text-muted-foreground">The first tab in the mobile browser — community voting feed.</p>
                </div>
                <Switch checked={form.citizenVoteEnabled} onCheckedChange={v => set("citizenVoteEnabled", v)} />
              </div>
              <div className="flex items-center justify-between border rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Discussions (Talks)</p>
                  <p className="text-xs text-muted-foreground">Community forum and discussion threads in the mobile app.</p>
                </div>
                <Switch checked={form.discussionsEnabled} onCheckedChange={v => set("discussionsEnabled", v)} />
              </div>
            </CardContent>
          </Card>

          {/* Version Gating */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-muted-foreground" />
                <CardTitle>Version Gating</CardTitle>
              </div>
              <CardDescription>
                Force users to update before using the app. Users on older versions will see an upgrade prompt.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-w-xs">
                <Label>Minimum Required App Version</Label>
                <Input
                  placeholder="1.0.0"
                  value={form.minAppVersion}
                  onChange={e => set("minAppVersion", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Semantic version (e.g. <code className="text-primary">1.2.0</code>). Users below this version are blocked.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={isPending} size="lg">
              {isPending ? "Saving…" : "Save Configuration"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
