import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { queryClient } from "@/lib/queryClient";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout";

// Pages
import Dashboard from "@/pages/dashboard";
import Websites from "@/pages/websites";
import Categories from "@/pages/categories";
import Users from "@/pages/users";
import Support from "@/pages/support";
import WebviewSettings from "@/pages/webview-settings";
import AuditLogs from "@/pages/audit-logs";
import Notifications from "@/pages/notifications";
import StripeSettingsPage from "@/pages/stripe-settings";
import Discussions from "@/pages/discussions";
import Moderation from "@/pages/moderation";
import NotFound from "@/pages/not-found";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(249 90% 65%)",
    colorForeground: "hsl(240 20% 98%)",
    colorMutedForeground: "hsl(240 5% 65%)",
    colorDanger: "hsl(0 84% 60%)",
    colorBackground: "hsl(240 10% 6%)",
    colorInput: "hsl(240 10% 18%)",
    colorInputForeground: "hsl(240 20% 98%)",
    colorNeutral: "hsl(240 10% 12%)",
    fontFamily: "Inter, sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#0f0f12] rounded-2xl w-[440px] max-w-full overflow-hidden border border-[#1a1a24]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function HomeRedirect() {
  const [, setLocation] = useLocation();
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
          <div className="text-center space-y-6">
            <img src={`${basePath}/logo.svg`} alt="The Republic Logo" className="mx-auto w-24 h-24 mb-4" />
            <h1 className="text-4xl font-bold tracking-tight">The Republic</h1>
            <p className="text-muted-foreground text-lg">Admin Command Center</p>
            <Button onClick={() => setLocation("/sign-in")} size="lg" className="px-8 mt-4 font-semibold text-white">
              Admin Login
            </Button>
          </div>
        </div>
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component }: { component: any }) {
  return (
    <>
      <Show when="signed-in">
        <Layout>
          <Component />
        </Layout>
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClientObj = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClientObj.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClientObj]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          
          <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
          <Route path="/websites" component={() => <ProtectedRoute component={Websites} />} />
          <Route path="/categories" component={() => <ProtectedRoute component={Categories} />} />
          <Route path="/users" component={() => <ProtectedRoute component={Users} />} />
          <Route path="/support" component={() => <ProtectedRoute component={Support} />} />
          <Route path="/webview-settings" component={() => <ProtectedRoute component={WebviewSettings} />} />
          <Route path="/audit-logs" component={() => <ProtectedRoute component={AuditLogs} />} />
          <Route path="/notifications" component={() => <ProtectedRoute component={Notifications} />} />
          <Route path="/stripe-settings" component={() => <ProtectedRoute component={StripeSettingsPage} />} />
          <Route path="/discussions" component={() => <ProtectedRoute component={Discussions} />} />
          <Route path="/moderation" component={() => <ProtectedRoute component={Moderation} />} />

          <Route component={NotFound} />
        </Switch>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <TooltipProvider>
        <ClerkProviderWithRoutes />
        <Toaster />
      </TooltipProvider>
    </WouterRouter>
  );
}

export default App;
