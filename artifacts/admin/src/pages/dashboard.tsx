import { useAdminGetStats, useAdminListAuditLogs, getAdminGetStatsQueryKey, getAdminListAuditLogsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Globe, LifeBuoy, TrendingUp, Crown, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const ACTION_LABELS: Record<string, string> = {
  create_category: "Added a website category",
  update_category: "Updated a website category",
  create_website: "Added a website",
  update_website: "Updated a website",
  update_user_membership: "Changed a user's membership",
  update_ticket: "Responded to a support ticket",
  send_notification: "Sent a notification",
  update_webview_settings: "Updated WebView settings",
  update_stripe_settings: "Updated Stripe settings",
  create_talk_category: "Added a discussion category",
  update_talk_category: "Updated a discussion category",
  delete_talk_category: "Deleted a discussion category",
  delete_talk_post: "Removed a discussion post",
  delete_talk_comment: "Removed a comment",
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  update_user_membership: <Crown className="w-3.5 h-3.5" />,
  update_ticket: <LifeBuoy className="w-3.5 h-3.5" />,
  send_notification: <MessageSquare className="w-3.5 h-3.5" />,
  create_website: <Globe className="w-3.5 h-3.5" />,
  delete_talk_post: <MessageSquare className="w-3.5 h-3.5" />,
};

function StatCard({ title, value, sub, icon, loading, accent }: {
  title: string;
  value: number | undefined;
  sub?: string;
  icon: React.ReactNode;
  loading: boolean;
  accent?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={accent ?? "text-muted-foreground"}>{icon}</div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value ?? 0}</div>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useAdminGetStats({
    query: { queryKey: getAdminGetStatsQueryKey() }
  });
  const { data: logsData, isLoading: logsLoading } = useAdminListAuditLogs(
    { page: 1, limit: 10 },
    { query: { queryKey: getAdminListAuditLogsQueryKey({ page: 1, limit: 10 }) } }
  );

  const recentLogs = logsData?.logs ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of The Republic platform.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="xl:col-span-1">
          <StatCard title="Total Users" value={stats?.totalUsers} icon={<Users className="h-4 w-4" />} loading={statsLoading} />
        </div>
        <div className="xl:col-span-1">
          <StatCard title="Pro Users" value={stats?.proUsers}
            sub={stats ? `${stats.freeUsers} free` : undefined}
            icon={<Crown className="h-4 w-4" />} loading={statsLoading} accent="text-primary" />
        </div>
        <div className="xl:col-span-1">
          <StatCard title="New This Week" value={stats?.recentSignups} icon={<TrendingUp className="h-4 w-4" />} loading={statsLoading} />
        </div>
        <div className="xl:col-span-1">
          <StatCard title="Active Sites" value={stats?.activeWebsites} icon={<Globe className="h-4 w-4" />} loading={statsLoading} />
        </div>
        <div className="xl:col-span-1">
          <StatCard title="Open Tickets" value={stats?.openTickets} icon={<LifeBuoy className="h-4 w-4" />} loading={statsLoading}
            accent={stats?.openTickets ? "text-destructive" : "text-muted-foreground"} />
        </div>
        <div className="xl:col-span-1">
          <StatCard title="Discussion Posts" value={stats?.totalPosts} icon={<MessageSquare className="h-4 w-4" />} loading={statsLoading} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick health */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Platform Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {statsLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
            ) : (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Pro conversion rate</span>
                  <span className="font-medium">
                    {stats?.totalUsers ? Math.round((stats.proUsers / stats.totalUsers) * 100) : 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Active websites</span>
                  <Badge variant="outline">{stats?.activeWebsites ?? 0} / {stats?.totalWebsites ?? 0}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Support queue</span>
                  {(stats?.openTickets ?? 0) > 0 ? (
                    <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                      {stats?.openTickets} open
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-emerald-500 border-emerald-500/20">All clear</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">New users (7 days)</span>
                  <span className="font-medium text-emerald-500">+{stats?.recentSignups ?? 0}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
              </div>
            ) : recentLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No admin activity yet.</p>
            ) : (
              <div className="space-y-3">
                {recentLogs.map(log => (
                  <div key={log.id} className="flex items-start gap-2 text-sm">
                    <span className="text-muted-foreground mt-0.5 flex-shrink-0">
                      {ACTION_ICONS[log.action] ?? <span className="w-3.5 h-3.5 block" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-foreground">{ACTION_LABELS[log.action] ?? log.action}</span>
                      {log.details && (
                        <span className="text-muted-foreground truncate"> · {log.details.split(",")[0].split("=")[1] ?? ""}</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
