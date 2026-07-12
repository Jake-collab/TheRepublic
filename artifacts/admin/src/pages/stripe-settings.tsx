import { useState, useEffect, useRef } from "react";
import { useAdminGetStripeSettings, useAdminUpdateStripeSettings, getAdminGetStripeSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";

function centsToDisplay(cents: number) {
  return (cents / 100).toFixed(2);
}

export default function StripeSettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useAdminGetStripeSettings({
    query: { queryKey: getAdminGetStripeSettingsQueryKey() }
  });
  const { mutateAsync: updateSettings, isPending } = useAdminUpdateStripeSettings();

  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [monthlyPriceId, setMonthlyPriceId] = useState("");
  const [annualPriceId, setAnnualPriceId] = useState("");
  const [monthlyPrice, setMonthlyPrice] = useState("");
  const [annualPrice, setAnnualPrice] = useState("");
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (settings && !initialized.current) {
      initialized.current = true;
      setMonthlyPriceId(settings.monthlyPriceId ?? "");
      setAnnualPriceId(settings.annualPriceId ?? "");
      setMonthlyPrice(centsToDisplay(settings.monthlyPriceCents));
      setAnnualPrice(centsToDisplay(settings.annualPriceCents));
    }
  }, [settings]);

  const handleSave = async () => {
    const monthlyPriceCents = Math.round(parseFloat(monthlyPrice) * 100);
    const annualPriceCents = Math.round(parseFloat(annualPrice) * 100);

    if (isNaN(monthlyPriceCents) || isNaN(annualPriceCents)) {
      toast({ title: "Invalid prices", description: "Please enter valid dollar amounts.", variant: "destructive" });
      return;
    }

    try {
      await updateSettings({
        data: {
          secretKey: secretKey || null,
          webhookSecret: webhookSecret || null,
          monthlyPriceId: monthlyPriceId || undefined,
          annualPriceId: annualPriceId || undefined,
          monthlyPriceCents,
          annualPriceCents,
        }
      });
      setSecretKey("");
      setWebhookSecret("");
      await queryClient.invalidateQueries({ queryKey: getAdminGetStripeSettingsQueryKey() });
      initialized.current = false;
      toast({ title: "Stripe settings saved", description: "Your changes are now live." });
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = status === 403
        ? "You don't have admin access. Please reload and try again."
        : "Could not save Stripe settings. Check the console for details.";
      toast({ title: "Save failed", description: msg, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Stripe & Billing</h1>
        <p className="text-muted-foreground mt-1">
          Configure Stripe credentials and membership pricing. Leave a credentials field blank to keep the existing value.
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
              <CardTitle>Credentials</CardTitle>
              <CardDescription>
                Stripe API keys. Enter a new value to update; leave blank to keep the current value.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Secret Key</Label>
                  {settings?.secretKeyConfigured ? (
                    <Badge variant="secondary" className="gap-1 text-emerald-600 border-emerald-500/20">
                      <CheckCircle className="h-3 w-3" /> Configured
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1 text-destructive">
                      <XCircle className="h-3 w-3" /> Not set
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    type={showSecretKey ? "text" : "password"}
                    placeholder={settings?.secretKeyConfigured ? "Leave blank to keep existing key" : "sk_live_..."}
                    value={secretKey}
                    onChange={e => setSecretKey(e.target.value)}
                    className="font-mono text-sm"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={() => setShowSecretKey(v => !v)}>
                    {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Webhook Secret</Label>
                  {settings?.webhookSecretConfigured ? (
                    <Badge variant="secondary" className="gap-1 text-emerald-600 border-emerald-500/20">
                      <CheckCircle className="h-3 w-3" /> Configured
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1 text-destructive">
                      <XCircle className="h-3 w-3" /> Not set
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    type={showWebhookSecret ? "text" : "password"}
                    placeholder={settings?.webhookSecretConfigured ? "Leave blank to keep existing secret" : "whsec_..."}
                    value={webhookSecret}
                    onChange={e => setWebhookSecret(e.target.value)}
                    className="font-mono text-sm"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={() => setShowWebhookSecret(v => !v)}>
                    {showWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
              <CardDescription>
                Stripe Price IDs from your Stripe dashboard (Products → Prices). Dollar amounts are shown to users in the app.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Monthly Price ID</Label>
                  <Input
                    placeholder="price_1abc..."
                    value={monthlyPriceId}
                    onChange={e => setMonthlyPriceId(e.target.value)}
                    className="font-mono text-sm"
                    spellCheck={false}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Monthly Price ($)</Label>
                  <div className="flex">
                    <span className="flex items-center px-3 border border-r-0 rounded-l-md bg-muted text-muted-foreground text-sm">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="2.99"
                      value={monthlyPrice}
                      onChange={e => setMonthlyPrice(e.target.value)}
                      className="rounded-l-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Annual Price ID</Label>
                  <Input
                    placeholder="price_1abc..."
                    value={annualPriceId}
                    onChange={e => setAnnualPriceId(e.target.value)}
                    className="font-mono text-sm"
                    spellCheck={false}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Annual Price ($)</Label>
                  <div className="flex">
                    <span className="flex items-center px-3 border border-r-0 rounded-l-md bg-muted text-muted-foreground text-sm">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="20.00"
                      value={annualPrice}
                      onChange={e => setAnnualPrice(e.target.value)}
                      className="rounded-l-none"
                    />
                  </div>
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
