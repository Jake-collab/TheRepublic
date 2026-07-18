---
name: Gig tracking lifecycle patterns
description: Key patterns for the GigActiveBanner, ElapsedTimer, dispute UI, and post-completion review flow
---

## Active gig banner (GigActiveBanner)
- Lives in GigsScreen.tsx between TRACK_LABELS and GigWorkerTrackingPanel
- Self-fetches from `GET /api/gig-tracking/my-active` every 8s; returns `{ tracking, job }` or 404
- Placed at the TOP of work-mode FlatList ListHeaderComponent
- Color-coded: on_way=amber, on_scene=blue, scene_confirmed=green, completed=purple, disputed=red

## Elapsed timer (ElapsedTimer)
- `fmtElapsed(sinceIso)` helper: returns "Xh Ym" or "Ym" from an ISO timestamp
- `ElapsedTimer` component: `setInterval` every 60s, stops on unmount
- API `GET /api/gig-tracking/:jobId` JOINs gigJobsTable to include `jobStartedAt`
- TrackingRecord type has optional `jobStartedAt?: string | null`

## Dispute UI
- When hirer denies worker (deny-request route sets status=disputed), daily slot is returned
- Worker sees red "Request Denied" panel in GigWorkerTrackingPanel
- GigActiveBanner also shows red disputed state

## Post-completion review (Item 16)
- GigHirerTrackingPanel has optional `onComplete?` prop
- Confirm Completion button calls `onComplete?.()` after API success
- MyJobModal: `showCompletionPanel` → purple "Job Complete 🎉" panel → triggers `showLeaveReview`
- LeaveReviewModal called with `contextType="gig_job"`, `revieweeId=job.workerId`, `revieweeName=(job as any).workerName ?? "Worker"`

**Why:**
- `workerName` is not on the GigJob TS type but IS returned by the API join — cast to `any`
- `onComplete` is optional so existing call sites without it still compile

