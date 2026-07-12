import { useState } from "react";
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
  CreditCard,
  MessageSquare,
  Menu,
  X
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
  { href: "/discussions", label: "Discussions", icon: MessageSquare },
  { href: "/stripe-settings", label: "Stripe & Billing", icon: CreditCard },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground dark">
      {/* Mobile overlay */}
      {!sidebarOpen ? null : (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:relative z-30 md:z-auto
          flex flex-col h-full
          border-r border-sidebar-border bg-sidebar
          transition-all duration-200
          ${sidebarOpen ? "w-64" : "w-0 md:w-16 overflow-hidden"}
        `}
      >
        <div className={`h-16 flex items-center border-b border-sidebar-border gap-3 ${sidebarOpen ? "px-6" : "px-0 md:justify-center"}`}>
          {sidebarOpen && (
            <>
              <img src={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/logo.svg`} alt="Logo" className="w-8 h-8 rounded-lg flex-shrink-0" />
              <span className="font-bold text-lg text-sidebar-foreground truncate">The Republic</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary uppercase tracking-widest font-semibold ml-auto flex-shrink-0">Admin</span>
            </>
          )}
          {!sidebarOpen && (
            <img src={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/logo.svg`} alt="Logo" className="w-8 h-8 rounded-lg hidden md:block" />
          )}
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => { if (window.innerWidth < 768) setSidebarOpen(false); }}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors
                  ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"}
                  ${!sidebarOpen ? "md:justify-center md:px-2" : ""}
                `}
                title={!sidebarOpen ? item.label : undefined}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={`p-3 border-t border-sidebar-border ${!sidebarOpen ? "md:flex md:justify-center" : ""}`}>
          <Button
            variant="ghost"
            className={`text-muted-foreground hover:text-foreground ${sidebarOpen ? "w-full justify-start" : "md:w-10 md:h-10 md:p-0 md:justify-center w-full justify-start"}`}
            onClick={() => signOut()}
            title="Sign out"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && <span className="ml-2">Sign out</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center px-4 gap-3 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(v => !v)}
            className="flex-shrink-0"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>

          <div className="flex-1" />

          <Button variant="ghost" size="icon" className="rounded-full">
            <Bell className="w-5 h-5 text-muted-foreground" />
          </Button>
          <div className="flex items-center gap-3 border-l border-border pl-3">
            <div className="text-right flex-col justify-center hidden sm:flex">
              <span className="text-sm font-medium leading-none">{user?.fullName || "Admin"}</span>
              <span className="text-xs text-muted-foreground mt-0.5">{user?.primaryEmailAddress?.emailAddress}</span>
            </div>
            <Avatar className="h-9 w-9 border border-border flex-shrink-0">
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
