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

const router: IRouter = Router();

router.use(healthRouter);
router.use("/categories", categoriesRouter);
router.use("/websites", websitesRouter);
router.use("/user", userRouter);
router.use("/user/prefs", prefsRouter);
router.use("/citizen-vote", citizenVoteRouter);
router.use("/support", supportRouter);
router.use("/notifications", notificationsRouter);
router.use("/stripe", stripeRouter);
router.use("/talks", talksRouter);
router.use("/admin", adminRouter);

export default router;
