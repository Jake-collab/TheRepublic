import { useState } from "react";
import {
  useAdminListIdentityVerifications,
  useAdminReviewIdentityVerification,
  getAdminListIdentityVerificationsQueryKey,
} from "@workspace/api-client-react";
import type { IdentityVerificationAdmin } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, Eye } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function StatusBadge({ status }: { status: string }) {
  if (status === "verified")
    return (
      <Badge className="gap-1 bg-emerald-500/15 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/25">
        <CheckCircle className="h-3 w-3" /> Verified
      </Badge>
    );
  if (status === "rejected")
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" /> Rejected
      </Badge>
    );
  return (
    <Badge variant="secondary" className="gap-1">
      <Clock className="h-3 w-3" /> Pending
    </Badge>
  );
}

export default function IdentityVerificationsPage() {
  const queryClient = useQueryClient();
  const { data: verifications, isLoading } = useAdminListIdentityVerifications({
    query: { queryKey: getAdminListIdentityVerificationsQueryKey() },
  });
  const { mutateAsync: reviewVerification, isPending: isReviewing } =
    useAdminReviewIdentityVerification();

  const [selected, setSelected] = useState<IdentityVerificationAdmin | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectMode, setRejectMode] = useState(false);

  const handleApprove = async () => {
    if (!selected) return;
    try {
      await reviewVerification({ id: selected.id, data: { action: "approve" } });
      toast({ title: "Identity approved", description: `${selected.displayName ?? selected.userId} is now verified.` });
      await queryClient.invalidateQueries({ queryKey: getAdminListIdentityVerificationsQueryKey() });
      setSelected(null);
    } catch {
      toast({ title: "Failed to approve", variant: "destructive" });
    }
  };

  const handleReject = async () => {
    if (!selected || !rejectReason.trim()) return;
    try {
      await reviewVerification({
        id: selected.id,
        data: { action: "reject", reason: rejectReason.trim() },
      });
      toast({ title: "Identity rejected", description: "User has been notified." });
      await queryClient.invalidateQueries({ queryKey: getAdminListIdentityVerificationsQueryKey() });
      setSelected(null);
      setRejectReason("");
      setRejectMode(false);
    } catch {
      toast({ title: "Failed to reject", variant: "destructive" });
    }
  };

  const openDetail = (v: IdentityVerificationAdmin) => {
    setSelected(v);
    setRejectMode(false);
    setRejectReason("");
  };

  const photoUrl = (id: number, side: "front" | "back") =>
    `${BASE}/api/admin/identity-verifications/${id}/photo/${side}`;

  const pendingCount = verifications?.filter((v) => v.status === "pending").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Identity Verification</h1>
          <p className="text-muted-foreground mt-1">
            Review government ID submissions before users can access Work mode.
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="destructive" className="text-sm px-3 py-1">
            {pendingCount} pending
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : !verifications?.length ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            No identity verification submissions yet.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Submissions ({verifications.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {verifications.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <StatusBadge status={v.status} />
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {v.fullName ?? v.displayName ?? v.userId}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {v.email ?? v.userId}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 ml-4">
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      {new Date(v.createdAt).toLocaleDateString()}
                    </span>
                    {v.rejectionReason && (
                      <span className="text-xs text-destructive max-w-[160px] truncate hidden md:block">
                        {v.rejectionReason}
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => openDetail(v)}
                    >
                      <Eye className="h-3.5 w-3.5" /> Review
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setRejectMode(false); setRejectReason(""); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  Identity Review
                  <StatusBadge status={selected.status} />
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 py-2">
                {/* Personal Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Full Name</p>
                    <p className="font-medium">{selected.fullName ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Date of Birth</p>
                    <p className="font-medium">{selected.dob ?? "—"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Address</p>
                    <p className="font-medium">
                      {[selected.addressLine1, selected.city, selected.state, selected.zip]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{selected.email ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Submitted</p>
                    <p className="font-medium">{new Date(selected.createdAt).toLocaleString()}</p>
                  </div>
                  {selected.rejectionReason && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Rejection Reason</p>
                      <p className="font-medium text-destructive">{selected.rejectionReason}</p>
                    </div>
                  )}
                </div>

                {/* ID Photos */}
                <div>
                  <p className="text-sm font-semibold mb-3">Government ID Photos</p>
                  <div className="grid grid-cols-2 gap-4">
                    {(["front", "back"] as const).map((side) => (
                      <div key={side} className="space-y-1.5">
                        <p className="text-xs text-muted-foreground capitalize">{side}</p>
                        <div className="border rounded-lg overflow-hidden aspect-[3/2] bg-muted">
                          <img
                            src={photoUrl(selected.id, side)}
                            alt={`ID ${side}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "";
                              (e.target as HTMLImageElement).parentElement!.innerHTML =
                                '<div class="flex h-full items-center justify-center text-muted-foreground text-xs">Photo unavailable</div>';
                            }}
                          />
                        </div>
                        <a
                          href={photoUrl(selected.id, side)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          Open full size
                        </a>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reject Reason Input */}
                {rejectMode && (
                  <div className="space-y-2">
                    <Label>Rejection reason (sent to user)</Label>
                    <Textarea
                      placeholder="e.g. ID is expired, photo is blurry, name mismatch…"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={3}
                    />
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 flex-wrap">
                {selected.status === "pending" && (
                  <>
                    {!rejectMode ? (
                      <>
                        <Button
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setRejectMode(true)}
                          disabled={isReviewing}
                        >
                          Reject
                        </Button>
                        <Button
                          className="bg-emerald-600 hover:bg-emerald-500"
                          onClick={handleApprove}
                          disabled={isReviewing}
                        >
                          {isReviewing ? "Approving…" : "Approve"}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="outline" onClick={() => setRejectMode(false)} disabled={isReviewing}>
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleReject}
                          disabled={isReviewing || !rejectReason.trim()}
                        >
                          {isReviewing ? "Rejecting…" : "Confirm Reject"}
                        </Button>
                      </>
                    )}
                  </>
                )}
                {selected.status !== "pending" && (
                  <p className="text-sm text-muted-foreground">
                    This submission has already been {selected.status}.
                  </p>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
