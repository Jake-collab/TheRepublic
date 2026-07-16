import { Router } from "express";
import { db } from "@workspace/db";
import { identityVerificationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, ensureUser } from "../middlewares/requireAuth";
import { ObjectStorageService } from "../lib/objectStorage";

const router = Router();
router.use(requireAuth, ensureUser);

const storage = new ObjectStorageService();

const VALID_IMAGE_TYPES = [
  "image/jpeg", "image/jpg", "image/png", "image/heic", "image/heif", "image/webp",
];

// GET /user/identity
router.get("/", async (req, res) => {
  const userId = (req as any).userId as string;
  const rows = await db
    .select()
    .from(identityVerificationsTable)
    .where(eq(identityVerificationsTable.userId, userId));

  if (rows.length === 0) {
    res.json({ status: "unverified" });
    return;
  }
  const v = rows[0];
  res.json({
    id: v.id,
    status: v.status,
    fullName: v.fullName,
    dob: v.dob,
    addressLine1: v.addressLine1,
    city: v.city,
    state: v.state,
    zip: v.zip,
    rejectionReason: v.rejectionReason,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  });
});

// POST /user/identity/upload-url
router.post("/upload-url", async (req, res) => {
  const { contentType } = req.body as { contentType?: string };
  if (!contentType || !VALID_IMAGE_TYPES.includes(contentType)) {
    res.status(400).json({ error: "contentType must be a supported image format." });
    return;
  }
  const uploadURL = await storage.getObjectEntityUploadURL();
  const objectPath = storage.normalizeObjectEntityPath(uploadURL);
  res.json({ uploadURL, objectPath });
});

// POST /user/identity — submit / re-submit verification
router.post("/", async (req, res) => {
  const userId = (req as any).userId as string;
  const { fullName, dob, addressLine1, city, state, zip, idFrontPath, idBackPath } =
    req.body as Record<string, string>;

  if (!fullName || !dob || !addressLine1 || !city || !state || !zip || !idFrontPath || !idBackPath) {
    res.status(400).json({ error: "All personal info fields and both ID photo paths are required." });
    return;
  }

  const values = {
    userId,
    status: "pending" as const,
    fullName,
    dob,
    addressLine1,
    city,
    state,
    zip,
    idFrontPath,
    idBackPath,
    rejectionReason: null,
    updatedAt: new Date(),
  };

  const existing = await db
    .select({ id: identityVerificationsTable.id })
    .from(identityVerificationsTable)
    .where(eq(identityVerificationsTable.userId, userId));

  if (existing.length > 0) {
    await db
      .update(identityVerificationsTable)
      .set(values)
      .where(eq(identityVerificationsTable.userId, userId));
  } else {
    await db.insert(identityVerificationsTable).values(values);
  }

  res.status(201).json({ status: "pending" });
});

export default router;
