import { Router, type IRouter } from "express";
import healthRouter from "./health";
import categoriesRouter from "./categories";
import websitesRouter from "./websites";
import userRouter from "./user";
import prefsRouter from "./prefs";
import citizenVoteRouter from "./citizenVote";
import supportRouter from "./support";
import notificationsRouter from "./notifications";
import stripeRouter from "./stripe";
import adminRouter from "./admin";
import talksRouter from "./talks";
import marketplaceRouter from "./marketplace";
import gigsRouter from "./gigs";
import gigTrackingRouter from "./gigTracking";
import freelanceRouter from "./freelance";
import skillPostsRouter from "./skillPosts";
import jobsRouter from "./jobs";
import identityRouter from "./identity";
import storageRouter from "./storage";
import reviewsRouter from "./reviews";
import userReportsRouter from "./userReports";
import { getStripeConfig } from "../utils/stripeHelpers";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/categories", categoriesRouter);
router.use("/websites", websitesRouter);
router.use("/user", userRouter);
router.use("/user/prefs", prefsRouter);
router.use("/user/identity", identityRouter);
router.use("/citizen-vote", citizenVoteRouter);
router.use("/support", supportRouter);
router.use("/notifications", notificationsRouter);
router.use("/stripe", stripeRouter);
router.use("/storage", storageRouter);
router.use("/talks", talksRouter);
router.use("/marketplace", marketplaceRouter);
router.use("/gigs", gigsRouter);
router.use("/gig-tracking", gigTrackingRouter);
router.use("/freelance", freelanceRouter);
router.use("/skill-posts", skillPostsRouter);
router.use("/jobs", jobsRouter);
router.use("/reviews", reviewsRouter);
router.use("/user-reports", userReportsRouter);
router.use("/admin", adminRouter);

router.get("/membership/pricing", async (_req, res) => {
  const cfg = await getStripeConfig();
  res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
  res.json({
    webMonthlyCents:   cfg.webMonthlyCents,
    proMonthlyCents:   cfg.proMonthlyCents,
    monthlyPriceCents: cfg.monthlyPriceCents,
    annualPriceCents:  cfg.annualPriceCents,
  });
});

export default router;
