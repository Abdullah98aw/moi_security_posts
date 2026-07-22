export type RoleId = "creator" | "reviewer" | "approver" | "admin" | "auditor";
export type PublicationStatus =
  | "Draft"
  | "AI Processing"
  | "AI Review"
  | "Sector Review"
  | "Returned by Sector"
  | "Ministry Review"
  | "Returned by Ministry"
  | "Approved"
  | "Scheduled"
  | "Publishing"
  | "Published"
  | "Partially Published"
  | "Publishing Failed"
  | "Rejected"
  | "Archived";

export type ChannelStatus = "Connected" | "Token expiring" | "Not connected" | "Maintenance" | "Permission required";
export type ReviewItemStatus = "Not Selected" | "Pending" | "Ready" | "Needs review" | "Approved" | "Returned" | "Returned for Revision" | "Rejected" | "Excluded" | "Published" | "Failed";

export interface ReviewItemState {
  status: ReviewItemStatus;
  reason?: string;
  notes?: string;
  approver?: string;
  date?: string;
  requiredCorrection?: string;
}

export interface WorkflowPublication {
  id?: string;
  reference?: string;
  title?: string;
  status: PublicationStatus;
  languages: string[];
  channels: string[];
  sectorId?: string;
  creatorId?: string;
  category?: string;
  scheduledAt?: string;
  createdAt?: string;
  updatedAt?: string;
  currentStep?: string;
  sourceArabic?: string;
  improvedArabic?: string;
  campaign?: string;
  ministryReachedAt?: string;
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  previousStatus?: PublicationStatus;
  sourcePublicationId?: string;
  sourceReference?: string;
  templateId?: string;
  selectedLanguages?: string[];
  selectedPlatforms?: string[];
  languageStatuses?: Record<string, ReviewItemState>;
  platformStatuses?: Record<string, ReviewItemState>;
  translations?: { language: string; status: string; reason?: string; notes?: string; approver?: string; date?: string; requiredCorrection?: string }[];
  platformVersions?: { platform: string; status: string; content?: string; characterLimit?: number; reason?: string; notes?: string; approver?: string; date?: string; requiredCorrection?: string }[];
  publishingResults?: unknown[];
  comments?: unknown[];
  approval?: unknown;
  auditHistory?: unknown[];
  versionHistory?: string[];
  demoTimeline?: { time: string; labelAr: string; labelEn: string }[];
}

export interface WorkflowUser {
  id: string;
  role: RoleId;
  sectorId?: string;
}

export interface WorkflowTemplate {
  id: string;
  titleAr: string;
  titleEn: string;
  category: string;
  platforms: string[];
  sectorId?: string;
  bodyAr?: string;
  defaultLanguages?: string[];
}

export const sectorDomainKeywords: Record<string, string[]> = {
  prisons: ["نزلاء", "التأهيل", "الإصلاح", "الزيارة", "السجون", "تدريب مهني"],
  "border-guard": ["البحرية", "الشواطئ", "حرس الحدود", "السباحة", "الإبحار", "السواحل"],
  "civil-defense": ["الدفاع المدني", "الحريق", "السيول", "الإخلاء", "السلامة", "الأمطار"],
  passports: ["الجواز", "الجوازات", "الإقامة", "السفر", "المسافرين", "الفروع"],
  narcotics: ["المخدرات", "الوقاية", "الإبلاغ", "الأسر", "الشباب"],
  "public-security": ["الأمن العام", "السلامة العامة", "البلاغات", "الفعاليات"],
  environmental: ["الأمن البيئي", "البيئة", "المخالفات البيئية", "الغطاء النباتي"],
};

export function sectorOwnsText(sectorId: string | undefined, text: string) {
  if (!sectorId) return false;
  const keywords = sectorDomainKeywords[sectorId] || [];
  return keywords.some((keyword) => text.includes(keyword));
}

export function templatesForSector<T extends WorkflowTemplate>(templates: T[], sectorId: string | undefined, role: RoleId) {
  if (role === "admin") return templates;
  return templates.filter((template) => !("sectorId" in template) || !(template as WorkflowTemplate).sectorId || (template as WorkflowTemplate).sectorId === sectorId);
}

export function dashboardCountForSector(publications: WorkflowPublication[], sectorId: string, status?: PublicationStatus) {
  return publications.filter((publication) => publication.sectorId === sectorId && (!status || publication.status === status)).length;
}

export function hasPageOverflow(viewportWidth: number, contentWidth: number) {
  return contentWidth > viewportWidth;
}

export interface TransitionContext {
  role: RoleId;
  reason?: string;
  selectedParts?: string[];
}

export const allowedTransitions: Record<PublicationStatus, PublicationStatus[]> = {
  Draft: ["AI Processing", "Archived"],
  "AI Processing": ["AI Review"],
  "AI Review": ["Sector Review", "Ministry Review", "Draft"],
  "Sector Review": ["Ministry Review", "Returned by Sector"],
  "Returned by Sector": ["Draft", "AI Review", "Archived"],
  "Ministry Review": ["Approved", "Returned by Ministry", "Rejected"],
  "Returned by Ministry": ["AI Review", "Sector Review", "Archived"],
  Approved: ["Scheduled", "Publishing"],
  Scheduled: ["Publishing", "Archived"],
  Publishing: ["Published", "Partially Published", "Publishing Failed"],
  "Partially Published": ["Publishing", "Published", "Archived"],
  "Publishing Failed": ["Publishing", "Archived"],
  Published: ["Archived"],
  Rejected: ["Archived"],
  Archived: [],
};

export function canTransition(from: PublicationStatus, to: PublicationStatus, ctx: TransitionContext): { ok: boolean; message?: string } {
  if (ctx.role === "auditor") return { ok: false, message: "Auditor is read-only." };
  if (!allowedTransitions[from].includes(to)) return { ok: false, message: `Invalid transition: ${from} -> ${to}` };
  if (["Returned by Ministry", "Returned by Sector", "Rejected"].includes(to) && !ctx.reason?.trim()) {
    return { ok: false, message: "A reason is required." };
  }
  if (to === "Approved" && ctx.role !== "approver") return { ok: false, message: "Only ministry approvers can approve." };
  if (to === "Publishing" && !["approver", "admin"].includes(ctx.role)) return { ok: false, message: "Only approvers can publish." };
  return { ok: true };
}

export function disableTranslation<T extends WorkflowPublication>(publication: T, language: string, reason: string): T {
  const selectedLanguages = publication.selectedLanguages?.length ? publication.selectedLanguages : publication.languages;
  if (!selectedLanguages.includes(language)) throw new Error("Cannot return a language that was not selected.");
  if (!reason.trim()) throw new Error("A reason is required.");
  const now = new Date().toISOString();
  const itemState: ReviewItemState = { status: "Returned", reason, notes: reason, date: now, requiredCorrection: reason };
  return {
    ...publication,
    status: "Returned by Ministry",
    languageStatuses: { ...(publication.languageStatuses || {}), [language]: itemState },
    translations: (publication.translations || []).map((t) => t.language === language ? { ...t, status: "Returned for Revision", reason, notes: reason, date: now, requiredCorrection: reason } : t),
    demoTimeline: [...(publication.demoTimeline || []), { time: nowTime(), labelAr: `أعيدت ترجمة ${language} للتصحيح`, labelEn: `${language} translation returned for revision` }],
  };
}

export function disablePlatform<T extends WorkflowPublication>(publication: T, platform: string, reason: string): T {
  const selectedPlatforms = publication.selectedPlatforms?.length ? publication.selectedPlatforms : publication.channels;
  if (!selectedPlatforms.includes(platform)) throw new Error("Cannot exclude a platform that was not selected.");
  if (!reason.trim()) throw new Error("A reason is required.");
  const now = new Date().toISOString();
  const itemState: ReviewItemState = { status: "Excluded", reason, notes: reason, date: now, requiredCorrection: reason };
  return {
    ...publication,
    platformStatuses: { ...(publication.platformStatuses || {}), [platform]: itemState },
    platformVersions: (publication.platformVersions || []).map((p) => p.platform === platform ? { ...p, status: "Rejected", reason, notes: reason, date: now, requiredCorrection: reason } : p),
    demoTimeline: [...(publication.demoTimeline || []), { time: nowTime(), labelAr: `تم استبعاد منصة ${platform}`, labelEn: `${platform} platform excluded` }],
  };
}

export function calculatePublicationStatus(publication: WorkflowPublication): PublicationStatus {
  const selectedLanguages = publication.selectedLanguages?.length ? publication.selectedLanguages : publication.languages;
  const selectedPlatforms = publication.selectedPlatforms?.length ? publication.selectedPlatforms : publication.channels;
  const languageStates = selectedLanguages.map((language) => publication.languageStatuses?.[language]?.status || publication.translations?.find((item) => item.language === language)?.status || (language === "Arabic" ? "Ready" : "Pending"));
  const platformStates = selectedPlatforms.map((platform) => publication.platformStatuses?.[platform]?.status || publication.platformVersions?.find((item) => item.platform === platform)?.status || "Pending");
  const allStates = [...languageStates, ...platformStates];
  if (allStates.some((status) => status === "Rejected")) return "Rejected";
  if (allStates.some((status) => status === "Returned" || status === "Returned for Revision")) return "Returned by Ministry";
  if (allStates.length > 0 && allStates.every((status) => status === "Approved" || status === "Published" || status === "Excluded")) return "Approved";
  return publication.status;
}

const ministryStatuses: PublicationStatus[] = ["Ministry Review", "Returned by Ministry", "Approved", "Scheduled", "Publishing", "Published", "Partially Published", "Publishing Failed", "Rejected"];

export function hasReachedMinistry(publication: WorkflowPublication) {
  return Boolean(publication.ministryReachedAt)
    || ministryStatuses.includes(publication.status)
    || (publication.versionHistory || []).some((entry) => /ministry review|ministry approval|وزارة|وزاري/i.test(entry));
}

export function isPublicationVisibleToRole(publication: WorkflowPublication, user: WorkflowUser) {
  if (user.role === "creator" || user.role === "reviewer") return publication.sectorId === user.sectorId;
  if (user.role === "approver") return hasReachedMinistry(publication) && !["Draft", "AI Processing", "AI Review", "Sector Review", "Returned by Sector"].includes(publication.status);
  return true;
}

export function createTemplateDraft(template: WorkflowTemplate, user: WorkflowUser, count: number, now = new Date().toISOString()): WorkflowPublication {
  if (!["creator", "reviewer"].includes(user.role) || !user.sectorId) throw new Error("User cannot create sector publications.");
  const selectedLanguages = template.defaultLanguages?.length ? template.defaultLanguages : ["Arabic", "English"];
  const selectedPlatforms = template.platforms.length ? template.platforms : ["X", "Instagram"];
  return {
    id: `template-${Date.now()}`,
    reference: `GP-2026-T${String(count + 1).padStart(4, "0")}`,
    title: template.titleAr,
    sourceArabic: template.bodyAr || `${template.titleAr}\n\nالنص الرئيسي:\n\nالوسوم المقترحة: #وزارة_الداخلية #${template.category.replaceAll(" ", "_")}`,
    improvedArabic: template.bodyAr || template.titleAr,
    sectorId: user.sectorId,
    creatorId: user.id,
    category: template.category,
    campaign: template.titleEn,
    status: "Draft",
    currentStep: "Draft",
    languages: selectedLanguages,
    channels: selectedPlatforms,
    selectedLanguages,
    selectedPlatforms,
    languageStatuses: Object.fromEntries(selectedLanguages.map((language) => [language, { status: language === "Arabic" ? "Ready" : "Pending" }])),
    platformStatuses: Object.fromEntries(selectedPlatforms.map((platform) => [platform, { status: "Pending" }])),
    translations: selectedLanguages.filter((language) => language !== "Arabic").map((language) => ({ language, status: "Pending", content: "" })),
    platformVersions: selectedPlatforms.map((platform) => ({ platform, status: "Pending", content: "", characterLimit: platform === "X" ? 280 : 2200 })),
    publishingResults: [],
    versionHistory: [`${now} - created from template ${template.id}`],
    demoTimeline: [{ time: nowTime(), labelAr: "تم إنشاء مسودة من قالب", labelEn: "Draft created from template" }],
    createdAt: now,
    updatedAt: now,
    templateId: template.id,
  };
}

export function duplicatePublication(publication: WorkflowPublication, user: WorkflowUser, count: number, now = new Date().toISOString()): WorkflowPublication {
  if (!["creator", "reviewer"].includes(user.role) || !user.sectorId) throw new Error("User cannot duplicate sector publications.");
  return {
    ...publication,
    id: `copy-${Date.now()}`,
    reference: `GP-2026-C${String(count + 1).padStart(4, "0")}`,
    title: `Copy of ${publication.title || publication.reference || "publication"}`,
    sectorId: user.sectorId,
    creatorId: user.id,
    status: "Draft",
    currentStep: "Draft",
    publishingResults: [],
    comments: undefined,
    approval: undefined,
    auditHistory: undefined,
    ministryReachedAt: undefined,
    isArchived: false,
    archivedAt: undefined,
    archivedBy: undefined,
    previousStatus: undefined,
    sourcePublicationId: publication.id,
    sourceReference: publication.reference,
    versionHistory: [`${now} - version 1 copied from ${publication.reference || publication.id}`],
    demoTimeline: [{ time: nowTime(), labelAr: "تم إنشاء نسخة جديدة كمسودة", labelEn: "Duplicate draft created" }],
    scheduledAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

export function archivePublication<T extends WorkflowPublication>(publication: T, user: WorkflowUser, now = new Date().toISOString()): T {
  if (publication.status === "Publishing") throw new Error("Cannot archive a publication while publishing.");
  return {
    ...publication,
    isArchived: true,
    archivedAt: now,
    archivedBy: user.id,
    previousStatus: publication.status,
    status: "Archived",
    currentStep: "Archived",
    updatedAt: now,
    versionHistory: [...(publication.versionHistory || []), `${now} - archived by ${user.id}`],
  };
}

export function restorePublication<T extends WorkflowPublication>(publication: T, user: WorkflowUser, now = new Date().toISOString()): T {
  if (!publication.isArchived && publication.status !== "Archived") throw new Error("Publication is not archived.");
  const restoredStatus = publication.previousStatus && publication.previousStatus !== "Archived" ? publication.previousStatus : "Draft";
  return {
    ...publication,
    isArchived: false,
    archivedAt: undefined,
    archivedBy: undefined,
    status: restoredStatus,
    currentStep: restoredStatus,
    updatedAt: now,
    versionHistory: [...(publication.versionHistory || []), `${now} - restored by ${user.id}`],
  };
}

export function inspectCalendarItem<T extends WorkflowPublication>(publication: T): T {
  return publication;
}

export function reschedulePublication<T extends WorkflowPublication>(publication: T, scheduledAt: string, user: WorkflowUser, now = new Date().toISOString()): T {
  if (!scheduledAt.trim()) throw new Error("A new schedule date and time is required.");
  return {
    ...publication,
    scheduledAt,
    updatedAt: now,
    versionHistory: [...(publication.versionHistory || []), `${now} - rescheduled by ${user.id} to ${scheduledAt}`],
    demoTimeline: [...(publication.demoTimeline || []), { time: nowTime(), labelAr: "تمت إعادة جدولة المنشور", labelEn: "Publication rescheduled" }],
  };
}

export function resolveNotificationTarget(publicationId: string | undefined, publications: WorkflowPublication[]) {
  if (!publicationId) return { ok: true, href: "#/channels" };
  const publication = publications.find((item) => item.id === publicationId);
  return publication ? { ok: true, href: `#/approvals/${publication.id}` } : { ok: false, href: "#/notifications", message: "Linked record was not found." };
}

export function navPathsForRole(role: RoleId) {
  const map: Record<RoleId, string[]> = {
    creator: ["/", "/sector-publications", "/templates", "/calendar", "/notifications"],
    reviewer: ["/", "/sector-publications", "/approvals", "/calendar", "/notifications"],
    approver: ["/", "/approvals", "/publishing", "/calendar", "/notifications"],
    admin: ["/", "/users", "/sectors", "/admin/languages", "/channels", "/workflows", "/templates", "/terminology", "/ai-settings", "/audit", "/health", "/admin/reset"],
    auditor: ["/", "/library", "/audit", "/analytics"],
  };
  return map[role];
}

export function emptyStateKey(context: "ministry-pending" | "creator-returned" | "archive" | "calendar" | "generic", count: number) {
  if (count > 0) return null;
  return context;
}

export function aggregatePublishing(results: { status: string }[]): PublicationStatus {
  if (results.every((r) => r.status === "Published" || r.status === "Package generated")) return "Published";
  if (results.some((r) => r.status === "Failed") && results.some((r) => r.status === "Published" || r.status === "Package generated")) return "Partially Published";
  if (results.some((r) => r.status === "Failed")) return "Publishing Failed";
  return "Publishing";
}

export function isLanguageSelectable(language: string, disabled: string[]) {
  return !disabled.includes(language);
}

export function canPublishChannel(status: ChannelStatus, immediate = true) {
  if (status === "Connected" || status === "Token expiring") return { ok: true, warning: status === "Token expiring" };
  if (status === "Maintenance" && !immediate) return { ok: true, warning: true };
  return { ok: false, warning: false };
}

export function nowTime() {
  return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}
