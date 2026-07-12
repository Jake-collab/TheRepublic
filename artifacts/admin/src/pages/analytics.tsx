import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Users, Crown, TrendingUp, ShieldAlert, ThumbsUp, MessageSquare } from "lucide-react";
import { format, parseISO } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { credentials: "include" });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<T>;
}

type DailyNewUsers = { date: string; newUsers: number };
type DailyContentActivity = { date: string; talkPosts: number; citizenVotes: number; comments: number };
type DailyTicketActivity = { date: string; created: number; resolved: number };
type TopTalkPost = { id: number; title: string; upvotes: number; commentCount: number; displayName: string };
type TopCitizenVotePost = { id: number; content: string; upvotes: number; category: string; displayName: string };
type TopContentResult = { topTalkPosts: TopTalkPost[]; topCitizenVotes: TopCitizenVotePost[] };
type MembershipStats = { total: number; pro: number; free: number; conversionRate: number; newThisMonth: number; pendingFlags: number };

const CHART_COLORS = {
  users: "#7c3aed",
  talkPosts: "#3b82f6",
  citizenVotes: "#10b981",
  comments: "#f59e0b",
  created: "#ef4444",
  resolved: "#10b981",
  pro: "#7c3aed",
  free: "#334155",
};

const GRID_COLOR = "#1e293b";
const AXIS_COLOR = "#64748b";
const TOOLTIP_STYLE = {
  backgroundColor: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: 8,
  fontSize: 12,
};

function shortDate(dateStr: string) {
  try { return format(parseISO(dateStr), "MMM d"); } catch { return dateStr; }
}

function ChartSkeleton() {
  return <Skeleton className="h-[200px] w-full" />;
}

function MiniStatCard({
  title, value, sub, icon, loading, highlight,
}: {
  title: string;
  value: number | undefined;
  sub?: string;
  icon: React.ReactNode;
  loading: boolean;
  highlight?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={highlight ? "text-primary" : "text-muted-foreground"}>{icon}</div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-7 w-16" />
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

const PERIODS: { label: string; days: number }[] = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

export default function Analytics() {
  const [days, setDays] = useState(30);

  const { data: userGrowth, isLoading: ugLoading } = useQuery({
    queryKey: ["analytics", "user-growth", days],
    queryFn: () => fetchJson<DailyNewUsers[]>(`/api/admin/analytics/user-growth?days=${days}`),
  });

  const { data: contentActivity, isLoading: caLoading } = useQuery({
    queryKey: ["analytics", "content", days],
    queryFn: () => fetchJson<DailyContentActivity[]>(`/api/admin/analytics/content?days=${days}`),
  });

  const { data: ticketTrends, isLoading: ttLoading } = useQuery({
    queryKey: ["analytics", "tickets", days],
    queryFn: () => fetchJson<DailyTicketActivity[]>(`/api/admin/analytics/tickets?days=${days}`),
  });

  const { data: topContent, isLoading: tcLoading } = useQuery({
    queryKey: ["analytics", "top-content"],
    queryFn: () => fetchJson<TopContentResult>("/api/admin/analytics/top-content"),
  });

  const { data: membership, isLoading: msLoading } = useQuery({
    queryKey: ["analytics", "membership"],
    queryFn: () => fetchJson<MembershipStats>("/api/admin/analytics/membership"),
  });

  const pieData = membership
    ? [
        { name: "Pro", value: membership.pro },
        { name: "Free", value: membership.free },
      ]
    : [];

  const totalContent = contentActivity?.reduce(
    (acc, d) => ({ t: acc.t + d.talkPosts, c: acc.c + d.citizenVotes }),
    { t: 0, c: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Platform insights for the last {days} days.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-card p-1 self-start sm:self-auto">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              onClick={() => setDays(p.days)}
              className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                days === p.days
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStatCard
          title="Total Members"
          value={membership?.total}
          sub={`${membership?.free ?? 0} free`}
          icon={<Users className="h-4 w-4" />}
          loading={msLoading}
        />
        <MiniStatCard
          title="Pro Subscribers"
          value={membership?.pro}
          sub={`${membership?.conversionRate ?? 0}% conversion`}
          icon={<Crown className="h-4 w-4" />}
          loading={msLoading}
          highlight
        />
        <MiniStatCard
          title="New This Month"
          value={membership?.newThisMonth}
          icon={<TrendingUp className="h-4 w-4" />}
          loading={msLoading}
        />
        <MiniStatCard
          title="Pending Flags"
          value={membership?.pendingFlags}
          sub="awaiting review"
          icon={<ShieldAlert className="h-4 w-4" />}
          loading={msLoading}
          highlight={!!membership?.pendingFlags}
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">User Growth</CardTitle>
            <p className="text-xs text-muted-foreground">New registrations per day</p>
          </CardHeader>
          <CardContent>
            {ugLoading ? (
              <ChartSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={userGrowth} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="usersFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.users} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.users} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: AXIS_COLOR, fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: AXIS_COLOR, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={shortDate} formatter={(v) => [v, "New users"]} />
                  <Area type="monotone" dataKey="newUsers" stroke={CHART_COLORS.users} strokeWidth={2} fill="url(#usersFill)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Content Activity</CardTitle>
            <p className="text-xs text-muted-foreground">
              Posts and votes per day
              {totalContent && (
                <span className="ml-2">
                  <Badge variant="outline" className="text-[10px] h-4 px-1">{totalContent.t} talks</Badge>{" "}
                  <Badge variant="outline" className="text-[10px] h-4 px-1">{totalContent.c} votes</Badge>
                </span>
              )}
            </p>
          </CardHeader>
          <CardContent>
            {caLoading ? (
              <ChartSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={contentActivity} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="talkFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.talkPosts} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.talkPosts} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="cvFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.citizenVotes} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.citizenVotes} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: AXIS_COLOR, fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: AXIS_COLOR, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={shortDate} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Area type="monotone" dataKey="talkPosts" name="Talks" stroke={CHART_COLORS.talkPosts} strokeWidth={2} fill="url(#talkFill)" dot={false} />
                  <Area type="monotone" dataKey="citizenVotes" name="Citizen Votes" stroke={CHART_COLORS.citizenVotes} strokeWidth={2} fill="url(#cvFill)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Support Ticket Trends</CardTitle>
            <p className="text-xs text-muted-foreground">Created vs resolved per day</p>
          </CardHeader>
          <CardContent>
            {ttLoading ? (
              <ChartSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ticketTrends} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: AXIS_COLOR, fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: AXIS_COLOR, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={shortDate} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Bar dataKey="created" name="Created" fill={CHART_COLORS.created} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="resolved" name="Resolved" fill={CHART_COLORS.resolved} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Membership Breakdown</CardTitle>
            <p className="text-xs text-muted-foreground">Free vs Pro distribution</p>
          </CardHeader>
          <CardContent>
            {msLoading ? (
              <ChartSkeleton />
            ) : (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} dataKey="value" strokeWidth={0}>
                      <Cell fill={CHART_COLORS.pro} />
                      <Cell fill={CHART_COLORS.free} />
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS.pro }} />
                      <span className="text-muted-foreground">Pro</span>
                      <span className="ml-auto font-semibold">{membership?.pro ?? 0}</span>
                    </div>
                    <div className="mt-0.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${membership?.conversionRate ?? 0}%`,
                          backgroundColor: CHART_COLORS.pro,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS.free }} />
                      <span className="text-muted-foreground">Free</span>
                      <span className="ml-auto font-semibold">{membership?.free ?? 0}</span>
                    </div>
                    <div className="mt-0.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${membership?.total ? Math.round(((membership.free) / membership.total) * 100) : 0}%`,
                          backgroundColor: CHART_COLORS.free,
                        }}
                      />
                    </div>
                  </div>
                  <div className="pt-1 border-t">
                    <p className="text-xs text-muted-foreground">
                      Conversion rate{" "}
                      <span className="text-primary font-semibold">{membership?.conversionRate ?? 0}%</span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top content */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Discussion Posts</CardTitle>
            <p className="text-xs text-muted-foreground">Highest upvoted all-time</p>
          </CardHeader>
          <CardContent className="p-0">
            {tcLoading ? (
              <div className="space-y-2 p-6">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
              </div>
            ) : !topContent?.topTalkPosts.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">No posts yet.</p>
            ) : (
              <div className="divide-y">
                {topContent.topTalkPosts.slice(0, 8).map((post, i) => (
                  <div key={post.id} className="flex items-start gap-3 px-6 py-3 hover:bg-muted/30 transition-colors">
                    <span className="text-sm font-bold text-muted-foreground w-5 flex-shrink-0 mt-0.5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{post.title}</p>
                      <p className="text-xs text-muted-foreground">{post.displayName}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3" /> {post.upvotes}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" /> {post.commentCount}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Citizen Vote Posts</CardTitle>
            <p className="text-xs text-muted-foreground">Highest upvoted all-time</p>
          </CardHeader>
          <CardContent className="p-0">
            {tcLoading ? (
              <div className="space-y-2 p-6">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
              </div>
            ) : !topContent?.topCitizenVotes.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">No votes yet.</p>
            ) : (
              <div className="divide-y">
                {topContent.topCitizenVotes.slice(0, 8).map((post, i) => (
                  <div key={post.id} className="flex items-start gap-3 px-6 py-3 hover:bg-muted/30 transition-colors">
                    <span className="text-sm font-bold text-muted-foreground w-5 flex-shrink-0 mt-0.5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{post.content}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="outline" className="text-[10px] h-4 px-1">{post.category}</Badge>
                        <span className="text-xs text-muted-foreground">{post.displayName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 text-xs text-muted-foreground">
                      <ThumbsUp className="h-3 w-3" /> {post.upvotes}
                    </div>
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
