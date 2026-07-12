import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { 
  LayoutDashboard, 
  Globe, 
  Layers, 
  Users, 
  LifeBuoy, 
  Settings, 
  FileText, 
  Bell,
  LogOut,
  CreditCard
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/websites", label: "Websites", icon: Globe },
  { href: "/categories", label: "Categories", icon: Layers },
  { href: "/users", label: "Users", icon: Users },
  { href: "/support", label: "Support", icon: LifeBuoy },
  { href: "/webview-settings", label: "WebView Settings", icon: Settings },
  { href: "/audit-logs", label: "Audit Logs", icon: FileText },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/stripe-settings", label: "Stripe & Billing", icon: CreditCard },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground dark">
      {/* Sidebar */}
      <aside className="w-64 border-r border-sidebar-border bg-sidebar flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border gap-3">
          <img src={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/logo.svg`} alt="Logo" className="w-8 h-8 rounded-lg" />
          <span className="font-bold text-lg text-sidebar-foreground">The Republic</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary uppercase tracking-widest font-semibold ml-auto">Admin</span>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"}`}>
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={() => signOut()}>
            <LogOut className="w-4 h-4 mr-2" />
            Log out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-end px-6 gap-4">
          <Button variant="ghost" size="icon" className="rounded-full">
            <Bell className="w-5 h-5 text-muted-foreground" />
          </Button>
          <div className="flex items-center gap-3 border-l border-border pl-4">
            <div className="text-right flex flex-col justify-center hidden sm:flex">
              <span className="text-sm font-medium leading-none">{user?.fullName || "Admin"}</span>
              <span className="text-xs text-muted-foreground mt-0.5">{user?.primaryEmailAddress?.emailAddress}</span>
            </div>
            <Avatar className="h-9 w-9 border border-border">
              <AvatarImage src={user?.imageUrl} />
              <AvatarFallback>{user?.firstName?.charAt(0) || "A"}</AvatarFallback>
            </Avatar>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
