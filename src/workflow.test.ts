import { describe, expect, it } from "vitest";
import {
  aggregatePublishing,
  archivePublication,
  calculatePublicationStatus,
  canPublishChannel,
  canTransition,
  createTemplateDraft,
  disablePlatform,
  disableTranslation,
  duplicatePublication,
  emptyStateKey,
  dashboardCountForSector,
  hasPageOverflow,
  inspectCalendarItem,
  isPublicationVisibleToRole,
  isLanguageSelectable,
  navPathsForRole,
  reschedulePublication,
  resolveNotificationTarget,
  restorePublication,
  sectorOwnsText,
  templatesForSector,
  type WorkflowPublication,
} from "./workflow";

const publication: WorkflowPublication = {
  status: "Ministry Review",
  languages: ["Arabic", "English", "French"],
  channels: ["X", "Instagram"],
  selectedLanguages: ["Arabic", "English", "French"],
  selectedPlatforms: ["X", "Instagram"],
  languageStatuses: {
    Arabic: { status: "Pending" },
    English: { status: "Pending" },
    French: { status: "Pending" },
  },
  platformStatuses: {
    X: { status: "Pending" },
    Instagram: { status: "Pending" },
  },
  translations: [
    { language: "English", status: "Ready" },
    { language: "French", status: "Ready" },
  ],
  platformVersions: [
    { platform: "X", status: "Ready" },
    { platform: "Instagram", status: "Ready" },
  ],
  versionHistory: [],
  demoTimeline: [],
};

describe("publication state transitions", () => {
  it("allows ministry approval from ministry review", () => {
    expect(canTransition("Ministry Review", "Approved", { role: "approver" }).ok).toBe(true);
  });

  it("blocks invalid publishing from draft", () => {
    expect(canTransition("Draft", "Publishing", { role: "approver" }).ok).toBe(false);
  });

  it("requires a reason for ministry returns and rejection", () => {
    expect(canTransition("Ministry Review", "Returned by Ministry", { role: "approver" }).ok).toBe(false);
    expect(canTransition("Ministry Review", "Returned by Ministry", { role: "approver", reason: "Needs correction" }).ok).toBe(true);
    expect(canTransition("Ministry Review", "Rejected", { role: "approver" }).ok).toBe(false);
  });

  it("keeps auditors read-only", () => {
    expect(canTransition("Ministry Review", "Approved", { role: "auditor" }).ok).toBe(false);
  });
});

describe("ministry item-level review", () => {
  it("uses selected languages and platforms as the source of truth", () => {
    const submitted: WorkflowPublication = {
      ...publication,
      languages: ["Arabic", "English"],
      channels: ["X"],
      selectedLanguages: ["Arabic", "English"],
      selectedPlatforms: ["X"],
      translations: [
        { language: "English", status: "Ready" },
        { language: "French", status: "Ready" },
      ],
      platformVersions: [
        { platform: "X", status: "Ready" },
        { platform: "Facebook", status: "Ready" },
      ],
    };
    expect(submitted.selectedLanguages).toEqual(["Arabic", "English"]);
    expect(submitted.selectedPlatforms).toEqual(["X"]);
    expect(submitted.selectedLanguages).not.toContain("French");
    expect(submitted.selectedPlatforms).not.toContain("Facebook");
  });

  it("returns a generated language with a reason", () => {
    const updated = disableTranslation(publication, "French", "Incorrect official terminology");
    expect(updated.translations?.find((t) => t.language === "French")?.status).toBe("Returned for Revision");
    expect(updated.translations?.find((t) => t.language === "French")?.reason).toContain("Incorrect");
    expect(updated.languageStatuses?.French.status).toBe("Returned");
    expect(updated.status).toBe("Returned by Ministry");
    expect(updated.demoTimeline?.length).toBe(1);
  });

  it("returns one language without resetting the other selected languages", () => {
    const approvedArabicAndEnglish: WorkflowPublication = {
      ...publication,
      selectedLanguages: ["Arabic", "English", "French"],
      languageStatuses: {
        Arabic: { status: "Approved" },
        English: { status: "Approved" },
        French: { status: "Pending" },
      },
    };
    const updated = disableTranslation(approvedArabicAndEnglish, "French", "Needs a terminology correction");
    expect(updated.languageStatuses?.Arabic.status).toBe("Approved");
    expect(updated.languageStatuses?.English.status).toBe("Approved");
    expect(updated.languageStatuses?.French.status).toBe("Returned");
  });

  it("rejects disabling a language that was not selected", () => {
    expect(() => disableTranslation(publication, "Spanish", "Not required")).toThrow();
  });

  it("excludes a platform with a stored reason", () => {
    const updated = disablePlatform(publication, "Instagram", "Platform adaptation issue");
    expect(updated.platformVersions?.find((p) => p.platform === "Instagram")?.status).toBe("Rejected");
    expect(updated.platformStatuses?.Instagram.status).toBe("Excluded");
  });

  it("calculates full ministry approval from selected item statuses", () => {
    expect(calculatePublicationStatus({
      ...publication,
      languageStatuses: {
        Arabic: { status: "Approved" },
        English: { status: "Approved" },
        French: { status: "Approved" },
      },
      platformStatuses: {
        X: { status: "Approved" },
        Instagram: { status: "Approved" },
      },
    })).toBe("Approved");
  });

  it("keeps invalid item actions as thrown failures before mutation", () => {
    expect(() => disablePlatform(publication, "Facebook", "Not part of submission")).toThrow("not selected");
    expect(() => disableTranslation(publication, "Spanish", "Not part of submission")).toThrow("not selected");
  });
});

describe("settings and publishing logic", () => {
  it("removes disabled languages from new selections only", () => {
    expect(isLanguageSelectable("French", ["French"])).toBe(false);
    expect(isLanguageSelectable("French", [])).toBe(true);
  });

  it("blocks unavailable publishing channels", () => {
    expect(canPublishChannel("Connected").ok).toBe(true);
    expect(canPublishChannel("Token expiring").warning).toBe(true);
    expect(canPublishChannel("Not connected").ok).toBe(false);
    expect(canPublishChannel("Maintenance", true).ok).toBe(false);
    expect(canPublishChannel("Maintenance", false).ok).toBe(true);
  });

  it("aggregates publishing results consistently", () => {
    expect(aggregatePublishing([{ status: "Published" }, { status: "Package generated" }])).toBe("Published");
    expect(aggregatePublishing([{ status: "Published" }, { status: "Failed" }])).toBe("Partially Published");
    expect(aggregatePublishing([{ status: "Failed" }])).toBe("Publishing Failed");
  });
});

describe("role scope, content actions, and navigation", () => {
  const creator = { id: "u1", role: "creator" as const, sectorId: "prisons" };
  const approver = { id: "u3", role: "approver" as const };

  it("hides sector-only records from ministry approvers", () => {
    expect(isPublicationVisibleToRole({ ...publication, status: "Draft", ministryReachedAt: undefined, versionHistory: [] }, approver)).toBe(false);
    expect(isPublicationVisibleToRole({ ...publication, status: "Sector Review", ministryReachedAt: undefined, versionHistory: [] }, approver)).toBe(false);
  });

  it("shows records after a valid ministry submission and later ministry history", () => {
    expect(isPublicationVisibleToRole({ ...publication, status: "Ministry Review", ministryReachedAt: "2026-07-21T10:00:00Z" }, approver)).toBe(true);
    expect(isPublicationVisibleToRole({ ...publication, status: "Returned by Ministry", ministryReachedAt: "2026-07-21T10:00:00Z" }, approver)).toBe(true);
    expect(isPublicationVisibleToRole({ ...publication, status: "Published", ministryReachedAt: "2026-07-21T10:00:00Z" }, approver)).toBe(true);
  });

  it("creates a real template draft owned by the current sector user", () => {
    const draft = createTemplateDraft({ id: "condolence", titleAr: "بيان تعزية", titleEn: "Condolence", category: "Official Statement", platforms: ["X"] }, creator, 4, "2026-07-22T08:00:00Z");
    expect(draft.status).toBe("Draft");
    expect(draft.creatorId).toBe("u1");
    expect(draft.sectorId).toBe("prisons");
    expect(draft.templateId).toBe("condolence");
    expect(draft.channels).toEqual(["X"]);
  });

  it("duplicates into a clean draft without ministry or publishing state", () => {
    const copy = duplicatePublication({ ...publication, id: "pub-99", reference: "GP-2026-0099", status: "Published", ministryReachedAt: "x" }, creator, 9, "2026-07-22T08:00:00Z");
    expect(copy.status).toBe("Draft");
    expect(copy.creatorId).toBe("u1");
    expect(copy.sourcePublicationId).toBe("pub-99");
    expect(copy.ministryReachedAt).toBeUndefined();
    expect(copy.publishingResults).toEqual([]);
  });

  it("archives and restores without losing the previous workflow state", () => {
    const archived = archivePublication({ ...publication, status: "Approved" }, creator, "2026-07-22T08:00:00Z");
    expect(archived.isArchived).toBe(true);
    expect(archived.status).toBe("Archived");
    expect(archived.previousStatus).toBe("Approved");
    const restored = restorePublication(archived, creator, "2026-07-22T09:00:00Z");
    expect(restored.isArchived).toBe(false);
    expect(restored.status).toBe("Approved");
  });

  it("calendar item inspection does not change the schedule", () => {
    const scheduled = { ...publication, scheduledAt: "2026-07-22T10:00:00Z" };
    expect(inspectCalendarItem(scheduled).scheduledAt).toBe("2026-07-22T10:00:00Z");
  });

  it("calendar reschedule changes only after a confirmed date and time", () => {
    expect(() => reschedulePublication(publication, "", creator)).toThrow();
    const updated = reschedulePublication(publication, "2026-07-23T12:30", creator, "2026-07-22T08:00:00Z");
    expect(updated.scheduledAt).toBe("2026-07-23T12:30");
    expect(updated.demoTimeline?.[updated.demoTimeline.length - 1]?.labelEn).toBe("Publication rescheduled");
  });

  it("resolves missing notification targets safely", () => {
    expect(resolveNotificationTarget("pub-x", [publication]).ok).toBe(false);
    expect(resolveNotificationTarget(undefined, [publication]).href).toBe("#/channels");
  });

  it("uses the merged creator publication workspace navigation", () => {
    expect(navPathsForRole("creator")).toEqual(["/", "/sector-publications", "/templates", "/calendar", "/notifications"]);
    expect(navPathsForRole("creator")).not.toContain("/create");
    expect(navPathsForRole("approver")).not.toContain("/sector-publications");
  });

  it("selects explicit empty-state contexts only for empty lists", () => {
    expect(emptyStateKey("ministry-pending", 0)).toBe("ministry-pending");
    expect(emptyStateKey("archive", 0)).toBe("archive");
    expect(emptyStateKey("calendar", 2)).toBeNull();
  });

  it("recognizes sector-owned content and rejects unrelated examples", () => {
    expect(sectorOwnsText("prisons", "إطلاق برنامج تدريبي مهني جديد للنزلاء")).toBe(true);
    expect(sectorOwnsText("prisons", "إرشادات السلامة البحرية لمرتادي الشواطئ")).toBe(false);
    expect(sectorOwnsText("civil-defense", "تنبيه من مخاطر السيول واستخدام طفايات الحريق")).toBe(true);
    expect(sectorOwnsText("passports", "خطوات تجديد جواز السفر إلكترونيا")).toBe(true);
  });

  it("filters templates by sector while keeping general templates", () => {
    const templates = [
      { id: "general", titleAr: "إعلان عام", titleEn: "Announcement", category: "Announcement", platforms: ["X"] },
      { id: "prisons", titleAr: "تأهيل", titleEn: "Rehabilitation", category: "Awareness", platforms: ["X"], sectorId: "prisons" },
      { id: "civil", titleAr: "حريق", titleEn: "Fire", category: "Warning", platforms: ["X"], sectorId: "civil-defense" },
    ];
    expect(templatesForSector(templates, "prisons", "creator").map((template) => template.id)).toEqual(["general", "prisons"]);
    expect(templatesForSector(templates, "prisons", "admin")).toHaveLength(3);
  });

  it("counts dashboard records by sector", () => {
    const records: WorkflowPublication[] = [
      { ...publication, sectorId: "prisons", status: "Draft" },
      { ...publication, sectorId: "prisons", status: "Published" },
      { ...publication, sectorId: "civil-defense", status: "Draft" },
    ];
    expect(dashboardCountForSector(records, "prisons")).toBe(2);
    expect(dashboardCountForSector(records, "prisons", "Published")).toBe(1);
  });

  it("detects page-level overflow at target widths", () => {
    expect(hasPageOverflow(1366, 1280)).toBe(false);
    expect(hasPageOverflow(1280, 1440)).toBe(true);
  });
});
