/**
 * JobsScreen — Browse job listings (Indeed/ZipRecruiter style) + Post a job.
 *
 * Browse mode: search + category filter + paginated job listing cards.
 *              Tap a card → detail modal → apply with cover letter.
 * Hire mode:   multi-step form to post a new job listing.
 *              My posted listings + applicant management.
 *
 * Full API integration via generated hooks (populated after codegen).
 * Falls back to direct fetch() for operations not yet in the spec.
 */
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  memo,
  startTransition,
} from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUser } from "@clerk/expo";
import { useColors } from "@/hooks/useColors";

// ── Constants ─────────────────────────────────────────────────────────────────

type Mode = "browse" | "hire";

const JOB_TYPES = [
  { id: "full_time",   label: "Full-Time",   emoji: "🏢" },
  { id: "part_time",   label: "Part-Time",   emoji: "⏰" },
  { id: "contract",    label: "Contract",    emoji: "📄" },
  { id: "remote",      label: "Remote",      emoji: "🌐" },
  { id: "internship",  label: "Internship",  emoji: "🎓" },
] as const;

const JOB_CATEGORIES = [
  { id: "tech",       label: "Technology",   emoji: "💻" },
  { id: "retail",     label: "Retail",       emoji: "🛍" },
  { id: "food",       label: "Food & Bev",   emoji: "🍽" },
  { id: "healthcare", label: "Healthcare",   emoji: "🏥" },
  { id: "education",  label: "Education",    emoji: "📚" },
  { id: "trades",     label: "Trades",       emoji: "🔧" },
  { id: "admin",      label: "Admin",        emoji: "📋" },
  { id: "transport",  label: "Transport",    emoji: "🚗" },
  { id: "creative",   label: "Creative",     emoji: "🎨" },
  { id: "sales",      label: "Sales",        emoji: "📈" },
  { id: "other",      label: "Other",        emoji: "💼" },
];

interface JobListing {
  id: number;
  posterId: string;
  posterName: string;
  company: string;
  title: string;
  description: string;
  jobType: string;
  category: string;
  payMinCents: number | null;
  payMaxCents: number | null;
  city: string;
  stateCode: string;
  isRemote: boolean;
  applicationUrl: string | null;
  status: string;
  applicationCount: number;
  createdAt: string;
}

interface JobApplication {
  id: number;
  listingId: number;
  applicantId: string;
  applicantName: string;
  coverLetter: string;
  status: string;
  createdAt: string;
}

function formatSalary(minCents: number | null, maxCents: number | null): string {
  if (!minCents && !maxCents) return "Salary not listed";
  const fmt = (c: number) => `$${Math.round(c / 100).toLocaleString()}`;
  if (minCents && maxCents) return `${fmt(minCents)} – ${fmt(maxCents)}/yr`;
  if (minCents) return `From ${fmt(minCents)}/yr`;
  return `Up to ${fmt(maxCents!)}/yr`;
}

function jobTypeLabel(jt: string) {
  return JOB_TYPES.find((t) => t.id === jt)?.label ?? jt;
}
function jobCatEmoji(cat: string) {
  return JOB_CATEGORIES.find((c) => c.id === cat)?.emoji ?? "💼";
}

// ── Job card ──────────────────────────────────────────────────────────────────

const JobCard = memo(function JobCard({
  job,
  onPress,
}: {
  job: JobListing;
  onPress: (job: JobListing) => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      style={[styles.jobCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => onPress(job)}
    >
      <View style={styles.jobCardTop}>
        <View style={[styles.jobCatIcon, { backgroundColor: colors.secondary }]}>
          <Text style={styles.jobCatEmoji}>{jobCatEmoji(job.category)}</Text>
        </View>
        <View style={styles.jobCardInfo}>
          <Text style={[styles.jobTitle, { color: colors.foreground }]} numberOfLines={2}>
            {job.title}
          </Text>
          <Text style={[styles.jobCompany, { color: colors.mutedForeground }]} numberOfLines={1}>
            {job.company}
          </Text>
        </View>
      </View>

      <View style={styles.jobMeta}>
        <View style={[styles.jobTypeBadge, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" }]}>
          <Text style={[styles.jobTypeBadgeText, { color: colors.primary }]}>
            {jobTypeLabel(job.jobType)}
          </Text>
        </View>
        {(job.city || job.isRemote) && (
          <View style={styles.jobLocRow}>
            <Feather name={job.isRemote ? "globe" : "map-pin"} size={11} color={colors.mutedForeground} />
            <Text style={[styles.jobLocText, { color: colors.mutedForeground }]}>
              {job.isRemote ? "Remote" : `${job.city}${job.stateCode ? `, ${job.stateCode}` : ""}`}
            </Text>
          </View>
        )}
        <Text style={[styles.jobSalary, { color: colors.foreground }]}>
          {formatSalary(job.payMinCents, job.payMaxCents)}
        </Text>
      </View>

      <Text style={[styles.jobDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
        {job.description}
      </Text>

      <View style={styles.jobCardFooter}>
        <Text style={[styles.jobApps, { color: colors.mutedForeground }]}>
          {job.applicationCount} applicant{job.applicationCount !== 1 ? "s" : ""}
        </Text>
        <Text style={[styles.jobDate, { color: colors.mutedForeground }]}>
          {new Date(job.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </Pressable>
  );
});

// ── Job detail + apply modal ──────────────────────────────────────────────────

function JobDetailModal({
  job,
  meId,
  meName,
  onClose,
}: {
  job: JobListing;
  meId: string;
  meName: string;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<"detail" | "apply">("detail");
  const [coverLetter, setCoverLetter] = useState("");
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  const handleApply = useCallback(async () => {
    if (!coverLetter.trim()) {
      Alert.alert("Cover letter required", "Please write a brief cover letter.");
      return;
    }
    setApplying(true);
    try {
      const res = await fetch(`/api/jobs/listings/${job.id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicantId: meId,
          applicantName: meName,
          coverLetter: coverLetter.trim(),
        }),
      });
      if (res.ok) {
        setApplied(true);
        setView("detail");
      } else {
        const err = await res.json().catch(() => ({})) as { error?: string };
        Alert.alert("Error", err.error ?? "Failed to apply. Try again.");
      }
    } finally {
      setApplying(false);
    }
  }, [job.id, meId, meName, coverLetter]);

  return (
    <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.modalHeader, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={view === "apply" ? () => setView("detail") : onClose}
          style={[styles.modalCloseBtn, { backgroundColor: colors.secondary }]}
        >
          <Feather name={view === "apply" ? "arrow-left" : "x"} size={18} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.modalTitle, { color: colors.foreground }]}>
          {view === "apply" ? "Apply" : "Job Details"}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {view === "detail" ? (
        <ScrollView contentContainerStyle={[styles.modalBody, { paddingBottom: insets.bottom + 20 }]}>
          {/* Company + title */}
          <View style={[styles.detailHero, { backgroundColor: colors.secondary }]}>
            <Text style={styles.detailCatEmoji}>{jobCatEmoji(job.category)}</Text>
          </View>
          <Text style={[styles.detailTitle, { color: colors.foreground }]}>{job.title}</Text>
          <Text style={[styles.detailCompany, { color: colors.mutedForeground }]}>{job.company}</Text>

          {/* Meta row */}
          <View style={[styles.detailMeta, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <View style={styles.detailMetaRow}>
              <Feather name="briefcase" size={14} color={colors.mutedForeground} />
              <Text style={[styles.detailMetaText, { color: colors.foreground }]}>{jobTypeLabel(job.jobType)}</Text>
            </View>
            {(job.city || job.isRemote) && (
              <View style={styles.detailMetaRow}>
                <Feather name={job.isRemote ? "globe" : "map-pin"} size={14} color={colors.mutedForeground} />
                <Text style={[styles.detailMetaText, { color: colors.foreground }]}>
                  {job.isRemote ? "Remote" : `${job.city}${job.stateCode ? `, ${job.stateCode}` : ""}`}
                </Text>
              </View>
            )}
            <View style={styles.detailMetaRow}>
              <Feather name="dollar-sign" size={14} color={colors.mutedForeground} />
              <Text style={[styles.detailMetaText, { color: colors.foreground }]}>
                {formatSalary(job.payMinCents, job.payMaxCents)}
              </Text>
            </View>
          </View>

          {/* Description */}
          <Text style={[styles.detailSectionLabel, { color: colors.mutedForeground }]}>About this role</Text>
          <Text style={[styles.detailDesc, { color: colors.foreground }]}>{job.description}</Text>

          {applied && (
            <View style={[styles.appliedBanner, { backgroundColor: "#16a34a20", borderColor: "#16a34a" }]}>
              <Feather name="check-circle" size={14} color="#16a34a" />
              <Text style={[styles.appliedText, { color: "#16a34a" }]}>Application submitted!</Text>
            </View>
          )}

          {/* Apply / external link */}
          {!applied && (
            job.applicationUrl ? (
              <Pressable style={[styles.applyBtn, { backgroundColor: colors.primary }]} onPress={() => setView("apply")}>
                <Feather name="send" size={16} color="#ffffff" />
                <Text style={styles.applyBtnText}>Apply Now</Text>
              </Pressable>
            ) : (
              <Pressable style={[styles.applyBtn, { backgroundColor: colors.primary }]} onPress={() => setView("apply")}>
                <Feather name="send" size={16} color="#ffffff" />
                <Text style={styles.applyBtnText}>Apply Now</Text>
              </Pressable>
            )
          )}
        </ScrollView>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView contentContainerStyle={[styles.modalBody, { paddingBottom: insets.bottom + 20 }]} keyboardShouldPersistTaps="handled">
            <Text style={[styles.applyTitle, { color: colors.foreground }]}>
              Applying to: <Text style={{ color: colors.primary }}>{job.title}</Text>
            </Text>
            <Text style={[styles.applyCompany, { color: colors.mutedForeground }]}>{job.company}</Text>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Cover Letter *</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
              value={coverLetter}
              onChangeText={setCoverLetter}
              placeholder="Tell them why you're a great fit for this role…"
              placeholderTextColor={colors.mutedForeground}
              multiline
              textAlignVertical="top"
              autoFocus
            />

            <Pressable
              style={[styles.applyBtn, { backgroundColor: colors.primary, opacity: applying ? 0.6 : 1 }]}
              onPress={handleApply}
              disabled={applying}
            >
              {applying ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="send" size={16} color="#fff" />
                  <Text style={styles.applyBtnText}>Submit Application</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

// ── Post Job Form (Hire mode) ─────────────────────────────────────────────────

const POST_STEPS = ["Category", "Details", "Location & Pay", "Review"];

function PostJobForm({
  meId,
  meName,
  onClose,
  onPosted,
}: {
  meId: string;
  meName: string;
  onClose: () => void;
  onPosted: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [catId, setCatId] = useState("");
  const [jobType, setJobType] = useState("full_time");
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [payMin, setPayMin] = useState("");
  const [payMax, setPayMax] = useState("");
  const [city, setCity] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [isRemote, setIsRemote] = useState(false);
  const [posting, setPosting] = useState(false);

  const handleNext = useCallback(async () => {
    if (step < POST_STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    // Submit
    setPosting(true);
    try {
      const res = await fetch("/api/jobs/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          posterId: meId,
          posterName: meName,
          company: company.trim(),
          title: title.trim(),
          description: description.trim(),
          jobType,
          category: catId,
          payMinCents: payMin ? Math.round(parseFloat(payMin) * 100) : null,
          payMaxCents: payMax ? Math.round(parseFloat(payMax) * 100) : null,
          city: city.trim(),
          stateCode: stateCode.trim(),
          isRemote,
        }),
      });
      if (res.ok) {
        onPosted();
      } else {
        const err = await res.json().catch(() => ({})) as { error?: string };
        Alert.alert("Error", err.error ?? "Failed to post job.");
      }
    } finally {
      setPosting(false);
    }
  }, [step, meId, meName, company, title, description, jobType, catId, payMin, payMax, city, stateCode, isRemote, onPosted]);

  const canNext =
    step === 0 ? !!catId :
    step === 1 ? !!(company.trim() && title.trim() && description.trim()) :
    true;

  const selectedCat = JOB_CATEGORIES.find((c) => c.id === catId);

  return (
    <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
      <View style={[styles.modalHeader, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={step === 0 ? onClose : () => setStep((s) => s - 1)}
          style={[styles.modalCloseBtn, { backgroundColor: colors.secondary }]}
        >
          <Feather name={step === 0 ? "x" : "arrow-left"} size={18} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.modalTitle, { color: colors.foreground }]}>Post a Job</Text>
        <Pressable
          onPress={handleNext}
          disabled={!canNext || posting}
          style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: !canNext || posting ? 0.5 : 1 }]}
        >
          {posting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>{step < POST_STEPS.length - 1 ? "Next" : "Post"}</Text>
          )}
        </Pressable>
      </View>

      {/* Step indicator */}
      <View style={styles.stepRow}>
        {POST_STEPS.map((label, i) => (
          <View key={i} style={styles.stepItem}>
            <View style={[styles.stepDot, {
              backgroundColor: i <= step ? colors.primary : colors.secondary,
              borderColor: i <= step ? colors.primary : colors.border,
            }]}>
              <Text style={[styles.stepNum, { color: i <= step ? "#fff" : colors.mutedForeground }]}>
                {i + 1}
              </Text>
            </View>
            {i < POST_STEPS.length - 1 && (
              <View style={[styles.stepLine, { backgroundColor: i < step ? colors.primary : colors.border }]} />
            )}
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={[styles.formBody, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        {/* Step 0: Category */}
        {step === 0 && (
          <>
            <Text style={[styles.formStepTitle, { color: colors.foreground }]}>Job Category</Text>
            <View style={styles.catGrid}>
              {JOB_CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => setCatId(cat.id)}
                  style={[styles.catGridItem, {
                    backgroundColor: catId === cat.id ? colors.primary + "18" : colors.secondary,
                    borderColor: catId === cat.id ? colors.primary : colors.border,
                  }]}
                >
                  <Text style={styles.catGridEmoji}>{cat.emoji}</Text>
                  <Text style={[styles.catGridLabel, { color: catId === cat.id ? colors.primary : colors.foreground }]}>
                    {cat.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* Step 1: Job type + details */}
        {step === 1 && (
          <View style={styles.formFields}>
            <Text style={[styles.formStepTitle, { color: colors.foreground }]}>Job Details</Text>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Job Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
              {JOB_TYPES.map((jt) => (
                <Pressable
                  key={jt.id}
                  onPress={() => setJobType(jt.id)}
                  style={[styles.typeChip, {
                    backgroundColor: jobType === jt.id ? colors.primary : colors.secondary,
                    borderColor: jobType === jt.id ? colors.primary : colors.border,
                  }]}
                >
                  <Text style={styles.typeChipEmoji}>{jt.emoji}</Text>
                  <Text style={[styles.typeChipLabel, { color: jobType === jt.id ? "#fff" : colors.foreground }]}>
                    {jt.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Company Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
              value={company}
              onChangeText={setCompany}
              placeholder="e.g. Acme Corp"
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Job Title</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Senior Software Engineer"
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Job Description</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe responsibilities, requirements, and benefits…"
              placeholderTextColor={colors.mutedForeground}
              multiline
              textAlignVertical="top"
            />
          </View>
        )}

        {/* Step 2: Location + Pay */}
        {step === 2 && (
          <View style={styles.formFields}>
            <Text style={[styles.formStepTitle, { color: colors.foreground }]}>Location & Salary</Text>

            <Pressable
              onPress={() => setIsRemote((v) => !v)}
              style={[styles.remoteToggle, {
                backgroundColor: isRemote ? colors.primary + "18" : colors.secondary,
                borderColor: isRemote ? colors.primary : colors.border,
              }]}
            >
              <Feather name="globe" size={16} color={isRemote ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.remoteToggleText, { color: isRemote ? colors.primary : colors.foreground }]}>
                Remote position
              </Text>
              {isRemote && <Feather name="check" size={14} color={colors.primary} />}
            </Pressable>

            {!isRemote && (
              <>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>City</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
                  value={city}
                  onChangeText={setCity}
                  placeholder="e.g. Austin"
                  placeholderTextColor={colors.mutedForeground}
                />
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>State (2-letter)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
                  value={stateCode}
                  onChangeText={(t) => setStateCode(t.toUpperCase().slice(0, 2))}
                  placeholder="TX"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="characters"
                  maxLength={2}
                />
              </>
            )}

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Salary Range (annual, optional)</Text>
            <View style={styles.salaryRow}>
              <TextInput
                style={[styles.input, styles.salaryInput, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
                value={payMin}
                onChangeText={setPayMin}
                placeholder="Min $"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
              />
              <Text style={[styles.salarySep, { color: colors.mutedForeground }]}>–</Text>
              <TextInput
                style={[styles.input, styles.salaryInput, { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border }]}
                value={payMax}
                onChangeText={setPayMax}
                placeholder="Max $"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
              />
            </View>
          </View>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <View style={styles.formFields}>
            <Text style={[styles.formStepTitle, { color: colors.foreground }]}>Review & Post</Text>
            <View style={[styles.reviewCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: colors.mutedForeground }]}>Category</Text>
                <Text style={[styles.reviewValue, { color: colors.foreground }]}>
                  {selectedCat?.emoji} {selectedCat?.label}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: colors.mutedForeground }]}>Company</Text>
                <Text style={[styles.reviewValue, { color: colors.foreground }]}>{company}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: colors.mutedForeground }]}>Title</Text>
                <Text style={[styles.reviewValue, { color: colors.foreground }]}>{title}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: colors.mutedForeground }]}>Type</Text>
                <Text style={[styles.reviewValue, { color: colors.foreground }]}>{jobTypeLabel(jobType)}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: colors.mutedForeground }]}>Location</Text>
                <Text style={[styles.reviewValue, { color: colors.foreground }]}>
                  {isRemote ? "Remote" : `${city}${stateCode ? `, ${stateCode}` : ""}`}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: colors.mutedForeground }]}>Salary</Text>
                <Text style={[styles.reviewValue, { color: colors.primary }]}>
                  {formatSalary(
                    payMin ? Math.round(parseFloat(payMin) * 100) : null,
                    payMax ? Math.round(parseFloat(payMax) * 100) : null,
                  )}
                </Text>
              </View>
            </View>
            <Text style={[styles.reviewDesc, { color: colors.mutedForeground }]} numberOfLines={4}>
              {description}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ── Main JobsScreen ───────────────────────────────────────────────────────────

export default function JobsScreen({
  onOpenDrawer,
  externalMode,
}: {
  onOpenDrawer: () => void;
  externalMode?: "browse" | "hire";
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>(externalMode ?? "browse");
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [myListings, setMyListings] = useState<JobListing[]>([]);
  const [myApps, setMyApps] = useState<JobApplication[]>([]);
  const [detailJob, setDetailJob] = useState<JobListing | null>(null);
  const [showPost, setShowPost] = useState(false);

  const meId = user?.id ?? "";
  const meName = user?.fullName ?? user?.firstName ?? "User";

  // Sync externalMode
  useEffect(() => {
    if (externalMode) setMode(externalMode as Mode);
  }, [externalMode]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Load job listings
  const loadJobs = useCallback(async (reset = false) => {
    if (loading && !reset) return;
    const newCursor = reset ? undefined : cursor;
    if (!reset) setLoadingMore(true);
    else setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeCat) params.set("category", activeCat);
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (newCursor) params.set("cursor", String(newCursor));
      params.set("limit", "20");
      const res = await fetch(`/api/jobs/listings?${params}`);
      if (!res.ok) return;
      const data = await res.json() as { items: JobListing[]; nextCursor: number | null };
      setJobs(reset ? data.items : (prev) => [...prev, ...data.items]);
      setCursor(data.nextCursor ?? undefined);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [activeCat, debouncedSearch, cursor, loading]);

  useEffect(() => {
    startTransition(() => {
      setJobs([]);
      setCursor(undefined);
    });
    loadJobs(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCat, debouncedSearch]);

  // Load my listings + apps
  const loadMyData = useCallback(async () => {
    if (!meId) return;
    try {
      const [listRes, appRes] = await Promise.all([
        fetch("/api/jobs/listings/my"),
        fetch("/api/jobs/applications/my"),
      ]);
      if (listRes.ok) setMyListings(await listRes.json() as JobListing[]);
      if (appRes.ok) setMyApps(await appRes.json() as JobApplication[]);
    } catch { /* ignore */ }
  }, [meId]);

  useEffect(() => {
    if (mode === "hire") loadMyData();
  }, [mode, loadMyData]);

  const handleCat = useCallback((id: string) => {
    Haptics.selectionAsync();
    setActiveCat((prev) => (prev === id ? null : id));
  }, []);

  const renderJob = useCallback(({ item }: { item: JobListing }) => (
    <JobCard job={item} onPress={setDetailJob} />
  ), []);

  const keyExtractor = useCallback((item: JobListing) => String(item.id), []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Pressable onPress={onOpenDrawer} style={styles.hamburger} hitSlop={10}>
          <Feather name="menu" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {mode === "hire" ? "Post a Job" : "Jobs"}
        </Text>
        {mode === "hire" && (
          <Pressable
            style={[styles.postBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowPost(true)}
          >
            <Feather name="plus" size={16} color="#fff" />
            <Text style={styles.postBtnText}>Post</Text>
          </Pressable>
        )}
      </View>

      {/* ── Browse mode ── */}
      {mode === "browse" && (
        <>
          {/* Search bar */}
          <View style={[styles.searchBar, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Feather name="search" size={15} color={colors.mutedForeground} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Search jobs by title or company…"
              placeholderTextColor={colors.mutedForeground}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")} hitSlop={8}>
                <Feather name="x" size={14} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>

          {/* Category pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catRow}
            style={[styles.catBar, { borderBottomColor: colors.border }]}
          >
            {JOB_CATEGORIES.map((cat) => (
              <Pressable
                key={cat.id}
                style={[styles.catPill, {
                  backgroundColor: activeCat === cat.id ? colors.primary : colors.secondary,
                  borderColor: activeCat === cat.id ? colors.primary : colors.border,
                }]}
                onPress={() => handleCat(cat.id)}
              >
                <Text style={styles.catPillEmoji}>{cat.emoji}</Text>
                <Text style={[styles.catPillLabel, { color: activeCat === cat.id ? "#fff" : colors.foreground, fontWeight: activeCat === cat.id ? "600" : "400" }]}>
                  {cat.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Job list */}
          {loading && jobs.length === 0 ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : (
            <FlatList
              data={jobs}
              keyExtractor={keyExtractor}
              renderItem={renderJob}
              contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
              refreshControl={
                <RefreshControl refreshing={loading && jobs.length > 0} onRefresh={() => loadJobs(true)} tintColor={colors.primary} />
              }
              onEndReached={() => { if (cursor) loadJobs(false); }}
              onEndReachedThreshold={0.3}
              ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null}
              ListEmptyComponent={
                <View style={styles.emptyCenter}>
                  <Feather name="briefcase" size={44} color={colors.mutedForeground} />
                  <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No jobs found</Text>
                  <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                    {debouncedSearch ? "Try a different search." : "Check back soon for new listings!"}
                  </Text>
                </View>
              }
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}

      {/* ── Hire mode ── */}
      {mode === "hire" && (
        <ScrollView contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}>
          {/* My posted listings */}
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>My Posted Jobs</Text>
          {myListings.length === 0 ? (
            <View style={[styles.hireEmpty, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Feather name="briefcase" size={32} color={colors.mutedForeground} />
              <Text style={[styles.hireEmptyText, { color: colors.mutedForeground }]}>
                You haven't posted any jobs yet.
              </Text>
              <Pressable
                style={[styles.hirePostBtn, { backgroundColor: colors.primary }]}
                onPress={() => setShowPost(true)}
              >
                <Feather name="plus" size={14} color="#fff" />
                <Text style={styles.hirePostBtnText}>Post a Job</Text>
              </Pressable>
            </View>
          ) : (
            myListings.map((job) => (
              <JobCard key={job.id} job={job} onPress={setDetailJob} />
            ))
          )}

          {/* My applications */}
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 20 }]}>My Applications</Text>
          {myApps.length === 0 ? (
            <Text style={[styles.emptySub, { color: colors.mutedForeground, paddingHorizontal: 16 }]}>
              No applications yet. Browse jobs and apply!
            </Text>
          ) : (
            myApps.map((app) => (
              <View key={app.id} style={[styles.appCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.appTitle, { color: colors.foreground }]}>Application #{app.listingId}</Text>
                <View style={[styles.appStatusBadge, { backgroundColor: app.status === "accepted" ? "#16a34a20" : app.status === "rejected" ? "#dc262620" : colors.secondary }]}>
                  <Text style={[styles.appStatusText, { color: app.status === "accepted" ? "#16a34a" : app.status === "rejected" ? "#dc2626" : colors.mutedForeground }]}>
                    {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* ── Job detail modal ── */}
      <Modal visible={detailJob !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setDetailJob(null)}>
        {detailJob !== null && (
          <JobDetailModal
            job={detailJob}
            meId={meId}
            meName={meName}
            onClose={() => setDetailJob(null)}
          />
        )}
      </Modal>

      {/* ── Post job modal ── */}
      <Modal visible={showPost} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPost(false)}>
        <PostJobForm
          meId={meId}
          meName={meName}
          onClose={() => setShowPost(false)}
          onPosted={() => {
            setShowPost(false);
            loadMyData();
          }}
        />
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  hamburger: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 22, fontWeight: "700", flex: 1, letterSpacing: -0.4 },
  postBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  postBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },

  catBar: { borderBottomWidth: StyleSheet.hairlineWidth },
  catRow: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  catPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  catPillEmoji: { fontSize: 13 },
  catPillLabel: { fontSize: 13 },

  listContent: { paddingTop: 8 },
  centerLoading: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 60 },
  emptyCenter: { paddingTop: 60, alignItems: "center", gap: 10, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptySub: { fontSize: 14, textAlign: "center", lineHeight: 20 },

  // Job card
  jobCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  jobCardTop: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  jobCatIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  jobCatEmoji: { fontSize: 22 },
  jobCardInfo: { flex: 1, gap: 3 },
  jobTitle: { fontSize: 16, fontWeight: "600", lineHeight: 22 },
  jobCompany: { fontSize: 13 },
  jobMeta: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  jobTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  jobTypeBadgeText: { fontSize: 11, fontWeight: "600" },
  jobLocRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  jobLocText: { fontSize: 12 },
  jobSalary: { fontSize: 14, fontWeight: "600" },
  jobDesc: { fontSize: 13, lineHeight: 19 },
  jobCardFooter: { flexDirection: "row", justifyContent: "space-between" },
  jobApps: { fontSize: 11 },
  jobDate: { fontSize: 11 },

  // Hire mode
  sectionLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  hireEmpty: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 12,
  },
  hireEmptyText: { fontSize: 14, textAlign: "center" },
  hirePostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  hirePostBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  // Application card
  appCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  appTitle: { fontSize: 14, fontWeight: "600" },
  appStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  appStatusText: { fontSize: 12, fontWeight: "600" },

  // Modal shared
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  modalTitle: { fontSize: 17, fontWeight: "600" },
  submitBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  submitBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  modalBody: { paddingHorizontal: 16, paddingTop: 16, gap: 14 },

  // Detail modal
  detailHero: { height: 120, borderRadius: 16, justifyContent: "center", alignItems: "center", marginBottom: 4 },
  detailCatEmoji: { fontSize: 52 },
  detailTitle: { fontSize: 22, fontWeight: "700", lineHeight: 28 },
  detailCompany: { fontSize: 15, marginBottom: 4 },
  detailMeta: { padding: 14, borderRadius: 14, borderWidth: 1, gap: 10 },
  detailMetaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailMetaText: { fontSize: 14, flex: 1 },
  detailSectionLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  detailDesc: { fontSize: 15, lineHeight: 23 },
  appliedBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  appliedText: { fontSize: 14, fontWeight: "600" },
  applyBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 16 },
  applyBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // Apply form
  applyTitle: { fontSize: 18, fontWeight: "700" },
  applyCompany: { fontSize: 14 },
  fieldLabel: { fontSize: 13, fontWeight: "500", marginBottom: 6 },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 140,
    paddingTop: 12,
  },

  // Post form
  stepRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, paddingHorizontal: 16, gap: 0 },
  stepItem: { flexDirection: "row", alignItems: "center" },
  stepDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, justifyContent: "center", alignItems: "center" },
  stepNum: { fontSize: 12, fontWeight: "700" },
  stepLine: { width: 32, height: 2, marginHorizontal: 4 },
  formBody: { paddingHorizontal: 16, gap: 14 },
  formStepTitle: { fontSize: 20, fontWeight: "700", marginBottom: 4 },
  formFields: { gap: 10 },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  catGridItem: {
    width: "30%",
    flexGrow: 1,
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 6,
  },
  catGridEmoji: { fontSize: 24 },
  catGridLabel: { fontSize: 12, fontWeight: "600", textAlign: "center" },
  typeChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  typeChipEmoji: { fontSize: 14 },
  typeChipLabel: { fontSize: 13, fontWeight: "500" },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  remoteToggle: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  remoteToggleText: { flex: 1, fontSize: 15, fontWeight: "500" },
  salaryRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  salaryInput: { flex: 1 },
  salarySep: { fontSize: 18, fontWeight: "300" },
  reviewCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  reviewRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  reviewLabel: { width: 70, fontSize: 13, fontWeight: "500" },
  reviewValue: { flex: 1, fontSize: 14 },
  reviewDesc: { fontSize: 14, lineHeight: 21 },
});
