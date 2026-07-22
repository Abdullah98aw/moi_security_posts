import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  Archive,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Clock,
  FileCheck2,
  FilePlus2,
  Gauge,
  Globe2,
  History,
  Languages,
  LayoutDashboard,
  Library,
  ListChecks,
  Lock,
  LogOut,
  Menu,
  MessageSquare,
  Newspaper,
  PanelLeftClose,
  PlayCircle,
  RefreshCcw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UserCog,
  Users,
  Workflow,
  XCircle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
  hasReachedMinistry,
  isPublicationVisibleToRole,
  isLanguageSelectable,
  navPathsForRole,
  resolveNotificationTarget,
  restorePublication,
  reschedulePublication,
  type ReviewItemState,
} from "./workflow";
import "./styles.css";

type Lang = "ar" | "en";
type RoleId = "creator" | "reviewer" | "approver" | "admin" | "auditor";
type Status =
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
type Priority = "Low" | "Normal" | "High" | "Urgent";
type ReviewItemStatus = ReviewItemState["status"];

interface Role {
  id: RoleId;
  ar: string;
  en: string;
}
interface User {
  id: string;
  nameAr: string;
  nameEn: string;
  email: string;
  role: RoleId;
  sectorId?: string;
  lastLogin: string;
  active: boolean;
  avatar?: string;
}
interface Sector {
  id: string;
  nameAr: string;
  nameEn: string;
  abbreviation: string;
  active: boolean;
  descriptionAr: string;
  defaultLanguages: string[];
}
interface MediaAsset {
  id: string;
  name: string;
  type: "image" | "video" | "document";
  size: string;
  dimensions?: string;
  status: "Uploaded" | "Scanning" | "Ready";
  altText: string;
  preview: string;
}
interface SensitiveFinding {
  id: string;
  type: string;
  severity: "Info" | "Review" | "High";
  text: string;
  explanationAr: string;
  explanationEn: string;
  blocking: boolean;
}
interface PublicationTranslation {
  language: string;
  status: Extract<ReviewItemStatus, "Pending" | "Ready" | "Needs review" | "Approved" | "Rejected" | "Returned for Revision" | "Excluded" | "Published" | "Failed">;
  content: string;
  reason?: string;
  notes?: string;
  approver?: string;
  date?: string;
  requiredCorrection?: string;
}
interface PlatformContent {
  platform: string;
  content: string;
  characterLimit: number;
  status: Extract<ReviewItemStatus, "Pending" | "Ready" | "Approved" | "Rejected" | "Excluded" | "Published" | "Failed">;
  reason?: string;
  notes?: string;
  approver?: string;
  date?: string;
  requiredCorrection?: string;
}
interface Comment {
  id: string;
  user: string;
  role: RoleId;
  text: string;
  createdAt: string;
  internal: boolean;
  resolved: boolean;
}
interface PublishingResult {
  platform: string;
  status: "Scheduled" | "Queued" | "Publishing" | "Published" | "Failed" | "Package generated";
  account: string;
  attempt: number;
  startedAt?: string;
  completedAt?: string;
  externalUrl?: string;
  error?: string;
}
interface AuditLog {
  id: string;
  date: string;
  user: string;
  role: RoleId;
  sector: string;
  action: string;
  entity: string;
  reference: string;
  previousValue: string;
  newValue: string;
  ip: string;
  device: string;
  result: "Success" | "Warning" | "Failed";
}
interface Publication {
  id: string;
  reference: string;
  title: string;
  sourceArabic: string;
  improvedArabic: string;
  sectorId: string;
  creatorId: string;
  category: string;
  priority: Priority;
  campaign: string;
  languages: string[];
  channels: string[];
  selectedLanguages: string[];
  selectedPlatforms: string[];
  languageStatuses: Record<string, ReviewItemState>;
  platformStatuses: Record<string, ReviewItemState>;
  media: MediaAsset[];
  translations: PublicationTranslation[];
  platformVersions: PlatformContent[];
  findings: SensitiveFinding[];
  status: Status;
  currentStep: string;
  comments: Comment[];
  scheduledAt: string;
  createdAt: string;
  updatedAt: string;
  publishingResults: PublishingResult[];
  versionHistory: string[];
  auditHistory: AuditLog[];
  aiConfidence: number;
  ministryReachedAt?: string;
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  previousStatus?: Status;
  sourcePublicationId?: string;
  sourceReference?: string;
  templateId?: string;
  exportHistory?: { format: string; exportedBy: string; exportedAt: string; publicationId: string }[];
  createdByName?: string;
  createdByNameAr?: string;
  approval?: {
    status: "Approved" | "Partially Approved" | "Returned" | "Rejected";
    approvedBy?: string;
    approvedAt?: string;
    comments?: string;
    approvedLanguages: string[];
    approvedPlatforms: string[];
    excludedLanguages: string[];
    excludedPlatforms: string[];
  };
  demoTimeline?: { time: string; labelAr: string; labelEn: string }[];
}
interface NotificationItem {
  id: string;
  type: string;
  recipientId?: string;
  titleAr: string;
  titleEn: string;
  messageAr: string;
  messageEn: string;
  read: boolean;
  publicationId?: string;
  createdAt: string;
}
interface Channel {
  id: string;
  name: string;
  type: string;
  status: "Connected" | "Token expiring" | "Not connected" | "Maintenance" | "Permission required";
  method: string;
  account: string;
  handle: string;
  media: string;
  enabled: boolean;
}
interface OfficialTerm {
  id: string;
  ar: string;
  en: string;
  fr: string;
  ur: string;
  department: string;
  active: boolean;
  forbidden: string;
}
interface TemplateItem {
  id: string;
  titleAr: string;
  titleEn: string;
  category: string;
  platforms: string[];
  fields: string[];
  sectorId?: string;
  bodyAr?: string;
  defaultLanguages?: string[];
}

const roles: Role[] = [
  { id: "creator", ar: "منشئ محتوى القطاع", en: "Sector Content Creator" },
  { id: "reviewer", ar: "مراجع القطاع", en: "Sector Reviewer" },
  { id: "approver", ar: "معتمد الوزارة", en: "Ministry Approver" },
  { id: "admin", ar: "مدير النظام", en: "System Administrator" },
  { id: "auditor", ar: "المدقق", en: "Auditor" },
];

const text = {
  ar: {
    app: "GovPublish AI",
    title: "منصة ذكية لإعداد وترجمة واعتماد ونشر المحتوى الحكومي متعدد اللغات",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    remember: "تذكرني",
    login: "تسجيل الدخول",
    demo: "حسابات العرض",
    dashboard: "لوحة التحكم",
    create: "إنشاء نشر جديد",
    approvals: "مركز الاعتماد",
    publishing: "مركز النشر",
    calendar: "تقويم المحتوى",
    library: "مكتبة المحتوى",
    templates: "القوالب",
    terminology: "المصطلحات المعتمدة",
    channels: "قنوات النشر",
    aiSettings: "إعدادات الذكاء الاصطناعي",
    workflows: "مسارات الاعتماد",
    notifications: "الإشعارات",
    analytics: "التحليلات والتقارير",
    audit: "سجلات التدقيق",
    users: "إدارة المستخدمين",
    sectors: "إدارة القطاعات",
    health: "حالة النظام",
    search: "بحث عام",
    logout: "خروج",
    saveDraft: "حفظ كمسودة",
    runAi: "تشغيل المعالجة الذكية",
    submit: "إرسال للاعتماد",
    approve: "اعتماد",
    reject: "رفض",
    return: "إعادة للتعديل",
    publishNow: "نشر الآن",
    export: "تصدير",
    addComment: "إضافة تعليق",
    test: "اختبار الاتصال",
    retry: "إعادة المحاولة",
    cancel: "إلغاء",
    status: "الحالة",
    priority: "الأولوية",
    sector: "القطاع",
    language: "اللغة",
    channel: "القناة",
    schedule: "الموعد",
    comments: "التعليقات",
    original: "النص العربي الأصلي",
    improved: "النص العربي المحسن",
  },
  en: {
    app: "GovPublish AI",
    title: "AI-Powered Multilingual Government Content Approval and Publishing Platform",
    email: "Email",
    password: "Password",
    remember: "Remember me",
    login: "Sign in",
    demo: "Demo accounts",
    dashboard: "Dashboard",
    create: "Create Publication",
    approvals: "Approval Center",
    publishing: "Publishing Center",
    calendar: "Content Calendar",
    library: "Content Library",
    templates: "Templates",
    terminology: "Approved Terminology",
    channels: "Publishing Channels",
    aiSettings: "AI Settings",
    workflows: "Approval Workflows",
    notifications: "Notifications",
    analytics: "Analytics",
    audit: "Audit Logs",
    users: "User Management",
    sectors: "Sector Management",
    health: "System Health",
    search: "Global search",
    logout: "Logout",
    saveDraft: "Save draft",
    runAi: "Run AI processing",
    submit: "Submit for approval",
    approve: "Approve",
    reject: "Reject",
    return: "Return for revision",
    publishNow: "Publish now",
    export: "Export",
    addComment: "Add comment",
    test: "Test connection",
    retry: "Retry",
    cancel: "Cancel",
    status: "Status",
    priority: "Priority",
    sector: "Sector",
    language: "Language",
    channel: "Channel",
    schedule: "Schedule",
    comments: "Comments",
    original: "Original Arabic",
    improved: "Improved Arabic",
  },
} as const;

const sectors: Sector[] = [
  { id: "public-security", nameAr: "الأمن العام", nameEn: "Public Security", abbreviation: "PS", active: true, descriptionAr: "محتوى التوعية والخدمات الأمنية العامة", defaultLanguages: ["Arabic", "English"] },
  { id: "civil-defense", nameAr: "الدفاع المدني", nameEn: "General Directorate of Civil Defense", abbreviation: "CD", active: true, descriptionAr: "إرشادات السلامة والوقاية والطوارئ", defaultLanguages: ["Arabic", "English", "French", "Urdu"] },
  { id: "passports", nameAr: "الجوازات", nameEn: "General Directorate of Passports", abbreviation: "GDP", active: true, descriptionAr: "خدمات السفر والجوازات والإقامات", defaultLanguages: ["Arabic", "English", "Urdu"] },
  { id: "prisons", nameAr: "المديرية العامة للسجون", nameEn: "General Directorate of Prisons", abbreviation: "GDPN", active: true, descriptionAr: "برامج الإصلاح والتأهيل", defaultLanguages: ["Arabic", "English"] },
  { id: "border-guard", nameAr: "حرس الحدود", nameEn: "Border Guard", abbreviation: "BG", active: true, descriptionAr: "تنبيهات السلامة البحرية والحدودية", defaultLanguages: ["Arabic", "English"] },
  { id: "environmental", nameAr: "القوات الخاصة للأمن البيئي", nameEn: "Special Forces for Environmental Security", abbreviation: "SFES", active: true, descriptionAr: "التوعية البيئية والالتزام النظامي", defaultLanguages: ["Arabic", "English", "Spanish"] },
  { id: "narcotics", nameAr: "مكافحة المخدرات", nameEn: "General Directorate of Narcotics Control", abbreviation: "GDNC", active: true, descriptionAr: "حملات الوقاية والتوعية المجتمعية", defaultLanguages: ["Arabic", "English", "Turkish"] },
];

const users: User[] = [
  { id: "u0", nameAr: "عبدالله العواد", nameEn: "Abdullah Alawad", email: "creator@prisons.gov.sa", role: "creator", sectorId: "prisons", lastLogin: "2026-07-21 09:15", active: true, avatar: "AA" },
  { id: "u1", nameAr: "سارة العتيبي", nameEn: "Sarah Alotaibi", email: "creator@civildefense.gov.sa", role: "creator", sectorId: "civil-defense", lastLogin: "2026-07-21 09:10", active: true },
  { id: "u2", nameAr: "خالد الحربي", nameEn: "Khalid Alharbi", email: "reviewer@civildefense.gov.sa", role: "reviewer", sectorId: "civil-defense", lastLogin: "2026-07-21 08:42", active: true },
  { id: "u3", nameAr: "نورة القحطاني", nameEn: "Noura Alqahtani", email: "approver@moi.gov.sa", role: "approver", lastLogin: "2026-07-21 10:03", active: true },
  { id: "u4", nameAr: "ماجد السبيعي", nameEn: "Majed Alsubaie", email: "admin@moi.gov.sa", role: "admin", lastLogin: "2026-07-21 07:55", active: true },
  { id: "u5", nameAr: "ريم الشهري", nameEn: "Reem Alshehri", email: "auditor@moi.gov.sa", role: "auditor", lastLogin: "2026-07-20 16:20", active: true },
  { id: "u6", nameAr: "فهد البلوي", nameEn: "Fahad Albalawi", email: "creator@borderguard.gov.sa", role: "creator", sectorId: "border-guard", lastLogin: "2026-07-21 09:22", active: true },
  { id: "u7", nameAr: "منى الغامدي", nameEn: "Mona Alghamdi", email: "creator@passports.gov.sa", role: "creator", sectorId: "passports", lastLogin: "2026-07-21 09:28", active: true },
];

const demoPublicationReference = "GP-2026-000184";
const demoArabicSource = "تعلن المديرية العامة للسجون عن إطلاق حملة توعوية لتعزيز الوعي المجتمعي بأهمية برامج التأهيل والإصلاح، وتهدف الحملة إلى إبراز الجهود المبذولة في تطوير الخدمات الإصلاحية ودعم إعادة التأهيل بما يسهم في تعزيز الأمن المجتمعي.";
const demoImprovedArabic = "تعلن المديرية العامة للسجون إطلاق حملة توعوية لتعزيز الوعي المجتمعي بأهمية برامج التأهيل والإصلاح، وتسليط الضوء على الجهود المبذولة لتطوير الخدمات الإصلاحية ودعم إعادة التأهيل، بما يسهم في تعزيز الأمن المجتمعي.";
const demoTimeline = [
  { time: "09:15", labelAr: "تم إنشاء المحتوى", labelEn: "Content Created" },
  { time: "09:18", labelAr: "اكتملت المعالجة الذكية", labelEn: "AI Processing Completed" },
  { time: "09:20", labelAr: "تم الإرسال للاعتماد", labelEn: "Submitted" },
  { time: "09:24", labelAr: "تم الاعتماد", labelEn: "Approved" },
  { time: "09:25", labelAr: "نشر على X", labelEn: "Published to X" },
  { time: "09:26", labelAr: "نشر على Instagram", labelEn: "Published to Instagram" },
  { time: "09:27", labelAr: "نشر على بوابة الوزارة", labelEn: "Published to Ministry Portal" },
  { time: "09:28", labelAr: "تم توليد حزمة وكالة الأنباء", labelEn: "Press Package Generated" },
];

const languages = ["Arabic", "English", "French", "Urdu", "Turkish", "Indonesian", "Spanish"];
const platforms = ["X", "Instagram", "Facebook", "LinkedIn", "Telegram", "Ministry Portal", "Sector Website", "Saudi Press Agency", "Approved Newspaper", "Email Bulletin"];
const categories = ["News", "Announcement", "Public Awareness", "Emergency Notice", "Event", "Achievement", "Regulation", "Warning", "Public Service Information", "Official Statement"];
const statusFlow: Status[] = ["Draft", "AI Processing", "AI Review", "Sector Review", "Ministry Review", "Approved", "Scheduled", "Publishing", "Published"];

const sectorContent: Record<string, { hashtags: string; audience: string; media: string; topics: { title: string; body: string; category: string }[] }> = {
  prisons: {
    hashtags: "#المديرية_العامة_للسجون #التأهيل_والإصلاح",
    audience: "أسر النزلاء والمستفيدون من الخدمات الإصلاحية",
    media: "صورة رسمية مرتبطة ببرامج التأهيل أو خدمات الزيارة",
    topics: [
      { title: "إطلاق برنامج تدريبي مهني جديد للنزلاء", category: "Public Awareness", body: "تعلن المديرية العامة للسجون إطلاق برنامج تدريبي مهني جديد للنزلاء بالتعاون مع الجهات المختصة، بهدف دعم مهارات المستفيدين وتعزيز فرص إعادة الاندماج المجتمعي بعد انتهاء المحكومية." },
      { title: "تحديث مواعيد الزيارة خلال إجازة نهاية الأسبوع", category: "Public Service Information", body: "توضح المديرية العامة للسجون تحديث مواعيد الزيارة العائلية خلال إجازة نهاية الأسبوع، مع التأكيد على الحجز المسبق عبر القنوات الرسمية والالتزام بالتعليمات التنظيمية داخل مرافق الزيارة." },
      { title: "مبادرة دعم التأهيل الأسري للنزلاء", category: "Public Awareness", body: "تطلق المديرية العامة للسجون مبادرة لدعم التأهيل الأسري للنزلاء، وتهدف إلى تعزيز التواصل الإيجابي مع الأسر وتوفير برامج إرشادية تساعد على الاستقرار وإعادة الاندماج." },
      { title: "تخريج دفعة من المستفيدين من برامج التدريب المهني", category: "Achievement", body: "احتفت المديرية العامة للسجون بتخريج دفعة من المستفيدين من برامج التدريب المهني داخل المرافق الإصلاحية، ضمن جهودها المستمرة لتطوير برامج التأهيل والإصلاح." },
      { title: "الإعلان عن خدمة الزيارة المرئية", category: "Announcement", body: "تعلن المديرية العامة للسجون توفر خدمة الزيارة المرئية في عدد من المرافق الإصلاحية، بما يسهم في تسهيل تواصل النزلاء مع أسرهم وفق الضوابط المعتمدة." },
      { title: "توقيع شراكة لدعم برامج إعادة التأهيل", category: "News", body: "وقعت المديرية العامة للسجون شراكة مع إحدى الجهات الوطنية لدعم برامج إعادة التأهيل والتدريب، بما يعزز جودة الخدمات المقدمة للنزلاء والمستفيدين." },
    ],
  },
  "civil-defense": {
    hashtags: "#الدفاع_المدني #السلامة_أولا",
    audience: "الأسر والمنشآت والجهات التعليمية",
    media: "تصميم توعوي يوضح إجراءات السلامة والوقاية",
    topics: [
      { title: "تنبيه من مخاطر السيول", category: "Emergency Notice", body: "تنبه المديرية العامة للدفاع المدني إلى مخاطر السيول في المناطق المتأثرة بالحالة المطرية، وتدعو الجميع إلى الابتعاد عن مجاري الأودية واتباع تعليمات السلامة." },
      { title: "إرشادات استخدام طفايات الحريق", category: "Public Awareness", body: "توضح المديرية العامة للدفاع المدني إرشادات استخدام طفايات الحريق المنزلية، وأهمية فحصها دوريا ووضعها في أماكن يسهل الوصول إليها." },
      { title: "خطة السلامة خلال موسم الأمطار", category: "Warning", body: "تؤكد المديرية العامة للدفاع المدني أهمية تطبيق خطة السلامة خلال موسم الأمطار، ومتابعة التنبيهات الرسمية وتجهيز وسائل الطوارئ داخل المنازل والمنشآت." },
      { title: "تمرين إخلاء في منشآت تعليمية", category: "Event", body: "نفذت المديرية العامة للدفاع المدني تمرين إخلاء في عدد من المنشآت التعليمية بهدف رفع الجاهزية وتعزيز ثقافة السلامة بين الطلاب والعاملين." },
    ],
  },
  passports: {
    hashtags: "#الجوازات #خدمات_إلكترونية",
    audience: "المواطنون والمقيمون والمسافرون",
    media: "صورة إرشادية توضح خطوات الخدمة الإلكترونية",
    topics: [
      { title: "تمديد ساعات العمل في بعض الفروع", category: "Announcement", body: "تعلن المديرية العامة للجوازات تمديد ساعات العمل في عدد من الفروع خلال فترة محددة لخدمة المستفيدين وإنجاز معاملات السفر والإقامة وفق المواعيد المعتمدة." },
      { title: "خطوات تجديد جواز السفر إلكترونيا", category: "Public Service Information", body: "توضح المديرية العامة للجوازات خطوات تجديد جواز السفر إلكترونيا عبر المنصات المعتمدة، مع التأكيد على التحقق من البيانات وسداد الرسوم قبل إرسال الطلب." },
      { title: "تنبيه للمسافرين بشأن صلاحية الجواز", category: "Public Awareness", body: "تنبه المديرية العامة للجوازات المسافرين إلى ضرورة التحقق من صلاحية جواز السفر ومتطلبات وجهة السفر قبل موعد الرحلة بوقت كاف." },
      { title: "تحديث خدمة إصدار الإقامة", category: "Announcement", body: "تعلن المديرية العامة للجوازات تحديث خدمة إصدار الإقامة عبر القنوات الرقمية لتسهيل الإجراءات ورفع جودة الخدمات المقدمة للمستفيدين." },
    ],
  },
  "border-guard": {
    hashtags: "#حرس_الحدود #السلامة_البحرية",
    audience: "مرتادو الشواطئ والبحارة والمتنزهون",
    media: "تصميم توعوي عن السلامة البحرية أو التحذيرات الساحلية",
    topics: [
      { title: "إرشادات السلامة البحرية", category: "Public Awareness", body: "يدعو حرس الحدود مرتادي البحر إلى الالتزام بإرشادات السلامة البحرية، وارتداء سترات النجاة ومتابعة حالة الطقس قبل الإبحار." },
      { title: "تنبيه مرتادي الشواطئ", category: "Warning", body: "ينبه حرس الحدود مرتادي الشواطئ إلى ضرورة السباحة في المواقع المخصصة واتباع اللوحات الإرشادية وتجنب المناطق الخطرة." },
      { title: "حملة توعوية للحد من مخاطر السباحة في المواقع غير المخصصة", category: "Public Awareness", body: "يطلق حرس الحدود حملة توعوية للحد من مخاطر السباحة في المواقع غير المخصصة، ورفع الوعي بإجراءات السلامة وطرق طلب المساعدة." },
      { title: "تعليمات الإبلاغ عن الطوارئ البحرية", category: "Emergency Notice", body: "يوضح حرس الحدود تعليمات الإبلاغ عن الطوارئ البحرية عبر القنوات الرسمية، مع أهمية تحديد الموقع بدقة وتقديم المعلومات الأساسية." },
    ],
  },
  narcotics: {
    hashtags: "#مكافحة_المخدرات #وقاية",
    audience: "الأسر والشباب والمؤسسات التعليمية",
    media: "تصميم توعوي عن الوقاية وبلاغات مكافحة المخدرات",
    topics: [
      { title: "حملة توعوية للوقاية من المخدرات", category: "Public Awareness", body: "تطلق المديرية العامة لمكافحة المخدرات حملة توعوية لتعزيز وعي الأسر والشباب بأضرار المخدرات وطرق طلب المساندة والإبلاغ عبر القنوات الرسمية." },
      { title: "التعاون مع المدارس في برامج الوقاية", category: "Event", body: "تنفذ المديرية العامة لمكافحة المخدرات برامج توعوية بالتعاون مع المدارس والجامعات لتعزيز الوقاية وبناء الوعي المبكر لدى الطلاب." },
    ],
  },
  "public-security": {
    hashtags: "#الأمن_العام #سلامتكم_تهمنا",
    audience: "عموم المواطنين والمقيمين",
    media: "تصميم رسمي لإرشادات السلامة العامة وقنوات البلاغات",
    topics: [
      { title: "تعزيز الوعي بقنوات البلاغات الأمنية", category: "Public Awareness", body: "يدعو الأمن العام الجميع إلى استخدام قنوات البلاغات الرسمية عند رصد ما يمس السلامة العامة، مع التأكيد على أهمية دقة المعلومات." },
      { title: "إرشادات السلامة في الفعاليات العامة", category: "Public Awareness", body: "يوضح الأمن العام إرشادات السلامة في الفعاليات العامة، ويدعو الزوار إلى التعاون مع المنظمين والالتزام بمسارات الدخول والخروج." },
    ],
  },
  environmental: {
    hashtags: "#الأمن_البيئي #حماية_البيئة",
    audience: "المتنزهون ومرتادو المناطق البرية",
    media: "تصميم توعوي عن حماية البيئة والالتزام بالأنظمة",
    topics: [
      { title: "التوعية بمخالفات إشعال النار في غير الأماكن المخصصة", category: "Public Awareness", body: "تؤكد القوات الخاصة للأمن البيئي أهمية الالتزام بالتعليمات البيئية وعدم إشعال النار في غير الأماكن المخصصة حفاظا على الغطاء النباتي والسلامة العامة." },
      { title: "الإبلاغ عن المخالفات البيئية", category: "Announcement", body: "توضح القوات الخاصة للأمن البيئي قنوات الإبلاغ عن المخالفات البيئية، وتدعو الجميع إلى المساهمة في حماية الموارد الطبيعية." },
    ],
  },
};
const statusAr: Record<Status, string> = {
  "Draft": "مسودة",
  "AI Processing": "معالجة ذكية",
  "AI Review": "مراجعة مخرجات الذكاء",
  "Sector Review": "مراجعة القطاع",
  "Returned by Sector": "معاد من القطاع",
  "Ministry Review": "مراجعة الوزارة",
  "Returned by Ministry": "معاد من الوزارة",
  "Approved": "معتمد",
  "Scheduled": "مجدول",
  "Publishing": "قيد النشر",
  "Published": "منشور",
  "Partially Published": "منشور جزئيا",
  "Publishing Failed": "فشل النشر",
  "Rejected": "مرفوض",
  "Archived": "مؤرشف",
};

const channelSettings: Channel[] = platforms.map((name, index) => ({
  id: `ch-${index}`,
  name,
  type: name.includes("Portal") || name.includes("Website") ? "Portal Integration" : name.includes("Press") || name.includes("Newspaper") ? "Manual Media Package" : "Social API",
  status: ["Connected", "Token expiring", "Connected", "Maintenance", "Permission required"][index % 5] as Channel["status"],
  method: ["OAuth Connection", "Access Token", "API Integration", "Secure Government Gateway", "Email Delivery"][index % 5],
  account: ["X", "Instagram", "Ministry Portal", "Saudi Press Agency"].includes(name) ? "General Directorate of Prisons" : `MOI ${name} Official`,
  handle: name === "X" ? "@Prisons_KSA" : name === "Instagram" ? "@prisons_ksa" : `govpublish-${name.toLowerCase().replaceAll(" ", "-")}`,
  media: "Images, video, document package",
  enabled: index !== 3,
}));

const officialTerms: OfficialTerm[] = [
  { id: "t1", ar: "وزارة الداخلية", en: "Ministry of Interior", fr: "Ministère de l'Intérieur", ur: "وزارت داخلہ", department: "MOI", active: true, forbidden: "Interior Ministry" },
  { id: "t2", ar: "الأمن العام", en: "Public Security", fr: "Sécurité publique", ur: "پبلک سکیورٹی", department: "Public Security", active: true, forbidden: "General Security" },
  { id: "t3", ar: "الدفاع المدني", en: "General Directorate of Civil Defense", fr: "Direction générale de la défense civile", ur: "جنرل ڈائریکٹوریٹ آف سول ڈیفنس", department: "Civil Defense", active: true, forbidden: "Civil Protection" },
  { id: "t4", ar: "الجوازات", en: "General Directorate of Passports", fr: "Direction générale des passeports", ur: "محکمہ پاسپورٹس", department: "Passports", active: true, forbidden: "Passport Office" },
  { id: "t5", ar: "مكافحة المخدرات", en: "General Directorate of Narcotics Control", fr: "Direction générale de la lutte contre les stupéfiants", ur: "محکمہ انسداد منشیات", department: "Narcotics Control", active: true, forbidden: "Drug Police" },
];

const templates: TemplateItem[] = [
  "Emergency warning|تحذير طارئ|Emergency Notice|",
  "Public announcement|إعلان عام|Announcement|",
  "Event invitation|دعوة فعالية|Event|",
  "Achievement announcement|إعلان إنجاز|Achievement|",
  "Official statement|بيان رسمي|Official Statement|",
  "Public awareness campaign|حملة توعوية|Public Awareness|",
  "Condolence statement|بيان تعزية|Official Statement|",
  "Holiday greeting|تهنئة مناسبة|Announcement|",
  "Service disruption notice|إشعار تعطل خدمة|Public Service Information|",
  "Prison rehabilitation announcement|إعلان برنامج تأهيل للنزلاء|Public Awareness|prisons",
  "Civil Defense emergency warning|تحذير طارئ من الدفاع المدني|Emergency Notice|civil-defense",
  "Passport service update|تحديث خدمة من الجوازات|Public Service Information|passports",
  "Traffic road closure notice|تنبيه إغلاق طريق|Warning|traffic",
  "Border Guard marine safety warning|تنبيه سلامة بحرية|Warning|border-guard",
].map((row, i) => {
  const [en, ar, category, sectorId] = row.split("|");
  const profile = sectorId ? sectorContent[sectorId] : undefined;
  return { id: `tmp-${i}`, titleAr: ar, titleEn: en, category, sectorId: sectorId || undefined, platforms: ["X", "Instagram", "Ministry Portal"], defaultLanguages: profile ? sectors.find((sector) => sector.id === sectorId)?.defaultLanguages : ["Arabic", "English"], bodyAr: profile ? `${ar}\n\n${profile.topics[0].body}\n\n${profile.hashtags}` : `${ar}\n\n[اسم الجهة]\n[النص الرئيسي]\n\n#وزارة_الداخلية`, fields: ["العنوان", "النص الرئيسي", "رابط الخدمة", "المرفقات"] };
});

const sampleArabic = [
  "تعلن المديرية العامة للدفاع المدني عن بدء حملة توعوية لتعزيز إجراءات السلامة المنزلية، وتهدف الحملة إلى رفع مستوى الوعي بأهمية فحص أجهزة الإنذار وطفايات الحريق والتأكد من سلامة التمديدات الكهربائية.",
  "يدعو الأمن العام قائدي المركبات إلى الالتزام بالأنظمة المرورية خلال أوقات الذروة حفاظا على سلامة الجميع.",
  "توضح الجوازات أن خدمة إصدار وتجديد جواز السفر متاحة عبر المنصات الرقمية المعتمدة وفق المتطلبات النظامية.",
  "ينظم حرس الحدود حملة توعوية للمتنزهين ومرتادي الشواطئ حول تعليمات السلامة البحرية.",
  "تؤكد القوات الخاصة للأمن البيئي أهمية الإبلاغ عن المخالفات البيئية عبر القنوات الرسمية.",
  "تطلق مكافحة المخدرات حملة توعوية للأسر لتعزيز الوقاية وطلب المشورة من الجهات المختصة.",
  "تعلن المديرية العامة للسجون عن برنامج تأهيلي جديد لدعم مهارات المستفيدين بعد الإفراج.",
];

function dayOffset(offset: number, hour = 10) {
  const d = new Date("2026-07-21T10:00:00");
  d.setDate(d.getDate() + offset);
  d.setHours(hour, (offset * 7) % 60);
  return d.toISOString();
}

function uniqueKnown(values: unknown, allowed: string[]) {
  if (!Array.isArray(values)) return [];
  return Array.from(new Set(values.filter((value): value is string => typeof value === "string" && allowed.includes(value))));
}

function languageContent(language: string, sectorName = "Government sector") {
  return `${language} official translation for ${sectorName}: public information prepared for approved channels.`;
}

function platformContent(platform: string) {
  return platform === "X" ? "رسالة رسمية مختصرة مع وسم الحملة ورابط التفاصيل." : "صياغة رسمية مناسبة للقناة تتضمن مقدمة واضحة وتفاصيل الخدمة وروابط المتابعة.";
}

function sectorTopic(sectorId: string, index = 0) {
  const profile = sectorContent[sectorId] || sectorContent["public-security"];
  return { profile, topic: profile.topics[index % profile.topics.length] };
}

function sectorCreatorId(sectorId: string) {
  return users.find((user) => user.role === "creator" && user.sectorId === sectorId)?.id || "u0";
}

function isSeedRecord(source: Partial<Publication>) {
  return typeof source.id === "string" && /^pub-\d+$/.test(source.id);
}

function applySectorConsistency<T extends Partial<Publication>>(source: T, index = 0): T {
  if (!source.sectorId || source.templateId || source.sourcePublicationId || (!isSeedRecord(source) && !source.reference?.startsWith("GP-2026-"))) return source;
  const { profile, topic } = sectorTopic(source.sectorId, index);
  return {
    ...source,
    title: topic.title,
    sourceArabic: topic.body,
    improvedArabic: topic.body,
    category: topic.category,
    campaign: topic.title,
    creatorId: source.creatorId && users.some((user) => user.id === source.creatorId && user.sectorId === source.sectorId) ? source.creatorId : sectorCreatorId(source.sectorId),
    media: source.media?.length ? source.media.map((item) => ({ ...item, altText: profile.media })) : source.media,
    comments: source.comments?.map((comment) => ({ ...comment, text: comment.role === "approver" ? "المحتوى مناسب للقطاع مع استكمال الملاحظات النظامية عند الحاجة." : "يرجى مراجعة الصياغة والوسوم بما يتوافق مع اختصاصات القطاع." })),
  };
}

function buildLanguageStatuses(selectedLanguages: string[], translations: PublicationTranslation[], current?: Record<string, ReviewItemState>) {
  return Object.fromEntries(selectedLanguages.map((language) => {
    const translation = translations.find((item) => item.language === language);
    return [language, current?.[language] || { status: language === "Arabic" ? "Ready" : translation?.status || "Pending" }];
  })) as Record<string, ReviewItemState>;
}

function buildPlatformStatuses(selectedPlatforms: string[], platformVersions: PlatformContent[], current?: Record<string, ReviewItemState>) {
  return Object.fromEntries(selectedPlatforms.map((platform) => {
    const version = platformVersions.find((item) => item.platform === platform);
    return [platform, current?.[platform] || { status: version?.status || "Pending" }];
  })) as Record<string, ReviewItemState>;
}

function normalizePublication(raw: unknown, fallback: Publication, index = 0): Publication {
  const source = applySectorConsistency((raw && typeof raw === "object" ? raw : fallback) as Partial<Publication>, index);
  const selectedLanguages = uniqueKnown(source.selectedLanguages, languages).length
    ? uniqueKnown(source.selectedLanguages, languages)
    : uniqueKnown(source.languages, languages).length ? uniqueKnown(source.languages, languages) : fallback.selectedLanguages;
  const selectedPlatforms = uniqueKnown(source.selectedPlatforms, platforms).length
    ? uniqueKnown(source.selectedPlatforms, platforms)
    : uniqueKnown(source.channels, platforms).length ? uniqueKnown(source.channels, platforms) : fallback.selectedPlatforms;
  const sectorName = sectors.find((sector) => sector.id === (source.sectorId || fallback.sectorId))?.nameEn;
  const existingTranslations = Array.isArray(source.translations) ? source.translations : [];
  const translations = selectedLanguages
    .filter((language) => language !== "Arabic")
    .map((language) => {
      const existing = existingTranslations.find((item) => item?.language === language);
      return {
        language,
        status: (existing?.status as PublicationTranslation["status"]) || "Pending",
        content: existing?.content || languageContent(language, sectorName),
        reason: existing?.reason,
        notes: existing?.notes,
        approver: existing?.approver,
        date: existing?.date,
        requiredCorrection: existing?.requiredCorrection,
      };
    });
  const existingVersions = Array.isArray(source.platformVersions) ? source.platformVersions : [];
  const platformVersions = selectedPlatforms.map((platform) => {
    const existing = existingVersions.find((item) => item?.platform === platform);
    return {
      platform,
      content: existing?.content || platformContent(platform),
      characterLimit: existing?.characterLimit || (platform === "X" ? 280 : 2200),
      status: (existing?.status as PlatformContent["status"]) || "Pending",
      reason: existing?.reason,
      notes: existing?.notes,
      approver: existing?.approver,
      date: existing?.date,
      requiredCorrection: existing?.requiredCorrection,
    };
  });
  const existingResults = Array.isArray(source.publishingResults) ? source.publishingResults : [];
  const publishingResults = selectedPlatforms.map((platform, index) => {
    const existing = existingResults.find((item) => item?.platform === platform);
    return existing || { platform, status: "Scheduled" as const, account: `Official ${platform}`, attempt: index + 1 };
  });
  const normalized = {
    ...fallback,
    ...source,
    languages: selectedLanguages,
    channels: selectedPlatforms,
    selectedLanguages,
    selectedPlatforms,
    translations,
    platformVersions,
    publishingResults,
    media: Array.isArray(source.media) ? source.media : fallback.media,
    findings: Array.isArray(source.findings) ? source.findings : fallback.findings,
    comments: Array.isArray(source.comments) ? source.comments : [],
    versionHistory: Array.isArray(source.versionHistory) ? source.versionHistory : [],
    auditHistory: Array.isArray(source.auditHistory) ? source.auditHistory : [],
    exportHistory: Array.isArray(source.exportHistory) ? source.exportHistory : [],
    demoTimeline: Array.isArray(source.demoTimeline) ? source.demoTimeline : [],
    languageStatuses: buildLanguageStatuses(selectedLanguages, translations, source.languageStatuses),
    platformStatuses: buildPlatformStatuses(selectedPlatforms, platformVersions, source.platformStatuses),
  };
  return { ...normalized, status: calculatePublicationStatus(normalized) };
}

function normalizePublications(value: unknown) {
  if (!Array.isArray(value)) return seedPublications;
  return value.map((item, index) => normalizePublication(item, seedPublications[index] || makePublication(index), index));
}

function makePublication(i: number): Publication {
  const sector = sectors[i % sectors.length];
  const status = (["Draft", "Sector Review", "Ministry Review", "Returned by Ministry", "Approved", "Scheduled", "Publishing", "Published", "Partially Published", "Publishing Failed", "Rejected"] as Status[])[i % 11];
  const selectedPlatforms = platforms.slice(0, 2 + (i % 5));
  const selectedLanguages = languages.slice(0, 2 + (i % 4));
  const { profile, topic } = sectorTopic(sector.id, i);
  const source = topic.body;
  const translations = selectedLanguages.filter((l) => l !== "Arabic").map((language) => ({ language, status: i % 5 === 0 ? "Needs review" as const : "Ready" as const, content: languageContent(language, sector.nameEn) }));
  const platformVersions = selectedPlatforms.map((platform) => ({ platform, content: platformContent(platform), characterLimit: platform === "X" ? 280 : 2200, status: "Ready" as const }));
  return {
    id: `pub-${i + 1}`,
    reference: `GP-2026-${String(i + 1).padStart(4, "0")}`,
    title: topic.title,
    sourceArabic: source,
    improvedArabic: source.replace("تعلن", "أعلنت").replace("وتهدف", "وتهدف هذه الحملة"),
    sectorId: sector.id,
    creatorId: sectorCreatorId(sector.id),
    category: topic.category,
    priority: (["Normal", "High", "Low", "Urgent"] as Priority[])[i % 4],
    campaign: topic.title,
    languages: selectedLanguages,
    channels: selectedPlatforms,
    selectedLanguages,
    selectedPlatforms,
    languageStatuses: buildLanguageStatuses(selectedLanguages, translations),
    platformStatuses: buildPlatformStatuses(selectedPlatforms, platformVersions),
    media: [
      { id: `m-${i}`, name: `official-media-${i + 1}.jpg`, type: "image", size: `${1 + (i % 4)}.${i % 9} MB`, dimensions: "1600 x 900", status: "Ready", altText: profile.media, preview: ["#dbeafe", "#ccfbf1", "#fef3c7", "#e0e7ff"][i % 4] },
    ],
    translations,
    platformVersions,
    findings: i % 3 === 0 ? [{ id: `f-${i}`, type: "Missing source attribution", severity: "Review", text: "إضافة مرجع رسمي", explanationAr: "يوصى بإضافة مرجع أو رابط رسمي قبل النشر.", explanationEn: "A formal source or link is recommended before publication.", blocking: false }] : [],
    status,
    currentStep: status,
    ministryReachedAt: ["Ministry Review", "Returned by Ministry", "Approved", "Scheduled", "Publishing", "Published", "Partially Published", "Publishing Failed", "Rejected"].includes(status) ? dayOffset(-i, 10) : undefined,
    comments: [{ id: `c-${i}`, user: i % 2 ? "خالد الحربي" : "نورة القحطاني", role: i % 2 ? "reviewer" : "approver", text: i % 2 ? "يرجى مراجعة الصياغة والوسوم بما يتوافق مع اختصاصات القطاع." : "المحتوى مناسب للقطاع مع استكمال الملاحظات النظامية عند الحاجة.", createdAt: dayOffset(-i, 11), internal: true, resolved: i % 3 === 0 }],
    scheduledAt: dayOffset((i % 14) - 3, 9 + (i % 8)),
    createdAt: dayOffset(-i - 1),
    updatedAt: dayOffset(-i, 12),
    publishingResults: selectedPlatforms.map((platform, p) => ({ platform, status: status === "Published" ? "Published" : status === "Publishing" && p === 0 ? "Publishing" : status === "Publishing Failed" && p === 1 ? "Failed" : "Scheduled", account: `Official ${platform}`, attempt: p + 1, externalUrl: status === "Published" ? `https://mock.govpublish.local/${platform.toLowerCase()}/${i}` : undefined, error: status === "Publishing Failed" && p === 1 ? "محاكاة انتهاء صلاحية الرمز" : undefined })),
    versionHistory: ["النسخة الأصلية", "تحسين الصياغة العربية", "توليد الترجمات", "تكييف المنصات"],
    auditHistory: [],
    aiConfidence: 83 + (i % 15),
  };
}

const seedPublications = Array.from({ length: 25 }, (_, i) => makePublication(i));

function useLocalState<T>(key: string, initial: T, normalize?: (value: unknown) => T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (normalize ? normalize(JSON.parse(raw)) : JSON.parse(raw) as T) : initial;
    } catch (error) {
      console.error(`Failed to read ${key} from localStorage`, error);
      return initial;
    }
  });
  useEffect(() => localStorage.setItem(key, JSON.stringify(value)), [key, value]);
  return [value, setValue];
}

class AppErrorBoundary extends React.Component<{ lang: Lang; children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Application error boundary caught an error", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <div className="error-screen" role="alert"><Panel title={this.props.lang === "ar" ? "تعذر إكمال الإجراء" : "Action could not be completed"}><p>{this.props.lang === "ar" ? "تعذر إكمال الإجراء بسبب خطأ غير متوقع. لم يتم حفظ التغيير. يرجى المحاولة مرة أخرى." : "An unexpected error prevented the action from completing. No change was saved. Please try again."}</p><ActionBar><button className="primary" onClick={() => this.setState({ error: null })}>{this.props.lang === "ar" ? "المحاولة مرة أخرى" : "Try again"}</button><a href="#/">{this.props.lang === "ar" ? "العودة للوحة التحكم" : "Back to dashboard"}</a></ActionBar></Panel></div>;
  }
}

function App() {
  const [lang, setLang] = useLocalState<Lang>("govpublish-lang", "ar");
  const [currentUser, setCurrentUser] = useLocalState<User | null>("govpublish-user", null);
  const [publications, setPublications] = useLocalState<Publication[]>("govpublish-publications", seedPublications, normalizePublications);
  const [presentationMode, setPresentationMode] = useLocalState<boolean>("govpublish-presentation-mode", false);
  const [auditLogs, setAuditLogs] = useLocalState<AuditLog[]>("govpublish-audit-logs", []);
  const [channelsState, setChannelsState] = useLocalState<Channel[]>("govpublish-channels", channelSettings);
  const [disabledLanguages, setDisabledLanguages] = useLocalState<string[]>("govpublish-disabled-languages", []);
  const [notifications, setNotifications] = useLocalState<NotificationItem[]>("govpublish-notifications", [
    { id: "n1", type: "review", recipientId: "u3", titleAr: "طلب اعتماد جديد", titleEn: "New approval request", messageAr: "منشور أمني بانتظار مراجعة الوزارة.", messageEn: "A sector publication awaits ministry review.", read: false, publicationId: "pub-3", createdAt: dayOffset(0, 9) },
    { id: "n2", type: "token", recipientId: "u4", titleAr: "تنبيه اتصال", titleEn: "Connection warning", messageAr: "رمز منصة Instagram يقترب من الانتهاء.", messageEn: "Instagram token is expiring soon.", read: false, createdAt: dayOffset(0, 8) },
  ]);
  const [toast, setToast] = useState("");
  const t = text[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPublications((items) => items.map((p) => {
        if (p.status !== "Publishing" || p.reference === demoPublicationReference) return p;
        const nextResults: PublishingResult[] = p.publishingResults.map((r, i) => {
          if (r.status !== "Publishing") return r;
          const nextStatus: PublishingResult["status"] = i % 3 === 1 ? "Failed" : "Published";
          return { ...r, status: nextStatus, completedAt: new Date().toISOString(), externalUrl: nextStatus === "Failed" ? undefined : `https://mock.govpublish.local/${r.platform}/${p.reference}` };
        });
        const failed = nextResults.some((r) => r.status === "Failed");
        const allDone = nextResults.every((r) => r.status === "Published" || r.status === "Failed" || r.status === "Package generated");
        return { ...p, publishingResults: nextResults, status: allDone ? (failed ? "Partially Published" : "Published") : p.status };
      }));
    }, 5000);
    return () => window.clearInterval(timer);
  }, [setPublications]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function recordAction(action: string, publication?: Publication, result: AuditLog["result"] = "Success", note = "") {
    setAuditLogs((items) => [{
      id: `audit-${Date.now()}-${items.length}`,
      date: new Date().toISOString(),
      user: currentUser?.email || "system",
      role: currentUser?.role || "admin",
      sector: publication?.sectorId || currentUser?.sectorId || "MOI",
      action,
      entity: publication ? "Publication" : "System",
      reference: publication?.reference || "-",
      previousValue: publication?.status || "-",
      newValue: note || action,
      ip: "10.24.18.42",
      device: "Codex Demo Browser",
      result,
    }, ...items]);
  }

  function sendNotification(userId: string | undefined, publication: Publication | undefined, titleEn: string, titleAr: string, messageEn: string, messageAr: string, type = "workflow") {
    setNotifications((items) => [{
      id: `n-${Date.now()}-${items.length}`,
      type,
      recipientId: userId,
      titleAr,
      titleEn,
      messageAr,
      messageEn,
      read: false,
      publicationId: publication?.id,
      createdAt: new Date().toISOString(),
    }, ...items]);
  }

  if (!currentUser) {
    return <Login lang={lang} setLang={setLang} onLogin={(user) => { setCurrentUser(user); notify(lang === "ar" ? "تم تسجيل الدخول بنجاح" : "Signed in"); }} />;
  }
  const visibleNotifications = notificationsForUser(currentUser, notifications);

  return (
    <HashRouter>
      <Shell lang={lang} setLang={setLang} user={currentUser} setUser={setCurrentUser} notifications={visibleNotifications} setNotifications={setNotifications} toast={toast} presentationMode={presentationMode} setPresentationMode={setPresentationMode}>
        <AppErrorBoundary lang={lang}>
        <Routes>
          <Route path="/" element={<Dashboard lang={lang} user={currentUser} publications={publications} />} />
          <Route path="/create" element={<CreatePublicationDemo lang={lang} user={currentUser} publications={publications} setPublications={setPublications} notify={notify} disabledLanguages={disabledLanguages} channelsState={channelsState} recordAction={recordAction} sendNotification={sendNotification} />} />
          <Route path="/ai/:id" element={<AIWorkspace lang={lang} user={currentUser} publications={publications} setPublications={setPublications} notify={notify} recordAction={recordAction} sendNotification={sendNotification} />} />
          <Route path="/sector-publications" element={<SectorPublicationsPage lang={lang} user={currentUser} publications={publications} />} />
          <Route path="/approvals" element={<ApprovalCenter lang={lang} user={currentUser} publications={publications} setPublications={setPublications} notify={notify} />} />
          <Route path="/approvals/:id" element={<ApprovalDetails lang={lang} user={currentUser} publications={publications} setPublications={setPublications} notify={notify} recordAction={recordAction} sendNotification={sendNotification} channelsState={channelsState} />} />
          <Route path="/publishing" element={<PublishingCenter lang={lang} publications={publications} setPublications={setPublications} notify={notify} recordAction={recordAction} />} />
          <Route path="/success/:id" element={<SuccessPage lang={lang} publications={publications} setPublications={setPublications} notify={notify} recordAction={recordAction} />} />
          <Route path="/preview/:id/:platform" element={<PublicationPreview lang={lang} publications={publications} />} />
          <Route path="/calendar" element={<CalendarPage lang={lang} user={currentUser} publications={publications} setPublications={setPublications} notify={notify} recordAction={recordAction} sendNotification={sendNotification} />} />
          <Route path="/library" element={<LibraryPage lang={lang} user={currentUser} publications={publications} setPublications={setPublications} notify={notify} recordAction={recordAction} />} />
          <Route path="/templates" element={<TemplatesPage lang={lang} user={currentUser} publications={publications} setPublications={setPublications} notify={notify} recordAction={recordAction} />} />
          <Route path="/terminology" element={<TerminologyPage lang={lang} notify={notify} recordAction={recordAction} />} />
          <Route path="/channels" element={<ChannelsPage lang={lang} notify={notify} channelsState={channelsState} setChannelsState={setChannelsState} recordAction={recordAction} />} />
          <Route path="/ai-settings" element={<AISettingsPage lang={lang} notify={notify} recordAction={recordAction} />} />
          <Route path="/workflows" element={<WorkflowsPage lang={lang} notify={notify} recordAction={recordAction} />} />
          <Route path="/notifications" element={<NotificationsPage lang={lang} notifications={visibleNotifications} setNotifications={setNotifications} publications={publications} notify={notify} />} />
          <Route path="/analytics" element={<AnalyticsPage lang={lang} user={currentUser} publications={publications} recordAction={recordAction} notify={notify} />} />
          <Route path="/audit" element={<AuditPage lang={lang} publications={publications} auditLogs={auditLogs} />} />
          <Route path="/users" element={<UsersPage lang={lang} notify={notify} recordAction={recordAction} />} />
          <Route path="/sectors" element={<SectorsPage lang={lang} notify={notify} recordAction={recordAction} />} />
          <Route path="/health" element={<HealthPage lang={lang} notify={notify} recordAction={recordAction} />} />
          <Route path="/admin/languages" element={<LanguageManagementPage lang={lang} disabledLanguages={disabledLanguages} setDisabledLanguages={setDisabledLanguages} notify={notify} recordAction={recordAction} />} />
          <Route path="/admin/reset" element={<ResetDemoPage lang={lang} setLang={setLang} setCurrentUser={setCurrentUser} setPresentationMode={setPresentationMode} setPublications={setPublications} setNotifications={setNotifications} setAuditLogs={setAuditLogs} setChannelsState={setChannelsState} setDisabledLanguages={setDisabledLanguages} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </AppErrorBoundary>
      </Shell>
    </HashRouter>
  );
}

function Login({ lang, setLang, onLogin }: { lang: Lang; setLang: (l: Lang) => void; onLogin: (u: User) => void }) {
  const [email, setEmail] = useState(users[0].email);
  const [password, setPassword] = useState("Demo@12345");
  const t = text[lang];
  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand-mark"><ShieldCheck /><span>{t.app}</span></div>
        <h1>{t.title}</h1>
        <div className="lang-toggle"><button onClick={() => setLang("ar")} className={lang === "ar" ? "active" : ""}>العربية</button><button onClick={() => setLang("en")} className={lang === "en" ? "active" : ""}>English</button></div>
        <label>{t.email}<input value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>{t.password}<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <div className="row between"><label className="check"><input type="checkbox" defaultChecked /> {t.remember}</label><span className="muted">Demo@12345</span></div>
        <button className="primary full" onClick={() => onLogin(users.find((u) => u.email === email) || users[0])}>{t.login}</button>
        <div className="demo-panel">
          <strong>{t.demo}</strong>
          {users.map((u) => <button key={u.id} onClick={() => setEmail(u.email)}><span>{lang === "ar" ? u.nameAr : u.nameEn}</span><small>{u.email}</small></button>)}
        </div>
      </section>
      <section className="login-visual">
        <div className="glass">
          <Sparkles />
          <h2>GovPublish AI</h2>
          <p>{lang === "ar" ? "مركز عمليات محتوى حكومي يعتمد الذكاء الاصطناعي مع مراجعة بشرية كاملة قبل النشر." : "A government content operations center with AI assistance and human approval before publishing."}</p>
          <div className="mini-grid"><Metric value="7" label={lang === "ar" ? "لغات" : "Languages"} /><Metric value="10" label={lang === "ar" ? "قنوات" : "Channels"} /><Metric value="25" label={lang === "ar" ? "سجلات عرض" : "Demo records"} /></div>
        </div>
      </section>
    </main>
  );
}

function Shell({ lang, setLang, user, setUser, notifications, setNotifications, toast, presentationMode, setPresentationMode, children }: { lang: Lang; setLang: (l: Lang) => void; user: User; setUser: (u: User | null) => void; notifications: NotificationItem[]; setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>; toast: string; presentationMode: boolean; setPresentationMode: (value: boolean) => void; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => typeof window !== "undefined" && window.innerWidth <= 760);
  const [openNotes, setOpenNotes] = useState(false);
  const t = text[lang];
  const role = roles.find((r) => r.id === user.role)!;
  const nav = navItems(user.role, t);
  const sector = sectors.find((s) => s.id === user.sectorId);
  return (
    <div className={`${presentationMode ? "app-shell presentation" : "app-shell"} role-${user.role}`}>
      <aside className={collapsed ? "sidebar collapsed" : "sidebar"}>
        <div className="side-head"><div className="seal">GP</div><div><b>{t.app}</b><span>{lang === "ar" ? "عمليات النشر" : "Publishing ops"}</span></div></div>
        <button className="ghost collapse" onClick={() => setCollapsed(!collapsed)}><PanelLeftClose /></button>
        <nav>{nav.map((n) => <a href={`#${n.path}`} key={n.path} onClick={() => { if (window.innerWidth <= 760) setCollapsed(true); }}><n.icon /> <span>{n.label}</span></a>)}</nav>
      </aside>
      <section className="main">
        <header className="topbar">
          <div className="crumb"><button className="mobile-menu" onClick={() => setCollapsed(false)}><Menu /></button><span>{sector ? (lang === "ar" ? sector.nameAr : sector.nameEn) : lang === "ar" ? "وزارة الداخلية" : "Ministry of Interior"}</span><ChevronLeft /><strong>{lang === "ar" ? role.ar : role.en}</strong></div>
          <div className="top-actions">
            <label className="search"><Search /><input placeholder={t.search} /></label>
            <button className={presentationMode ? "primary" : ""} onClick={() => setPresentationMode(!presentationMode)}><PlayCircle /> {lang === "ar" ? "وضع العرض" : "Presentation Mode"}</button>
            <button className="icon-btn" onClick={() => setLang(lang === "ar" ? "en" : "ar")}><Globe2 /></button>
            <button className="icon-btn has-count" onClick={() => setOpenNotes(!openNotes)}><Bell /><span>{notifications.filter((n) => !n.read).length}</span></button>
            <button className="user-pill" onClick={() => setUser(null)}><span>{lang === "ar" ? user.nameAr : user.nameEn}</span><LogOut /></button>
          </div>
        </header>
        {openNotes && <div className="notification-pop">{notifications.slice(0, 5).map((n) => <a key={n.id} href={n.publicationId ? `#/approvals/${n.publicationId}` : "#/channels"} onClick={() => setNotifications((items) => items.map((x) => x.id === n.id ? { ...x, read: true } : x))}><b>{lang === "ar" ? n.titleAr : n.titleEn}</b><span>{lang === "ar" ? n.messageAr : n.messageEn}</span></a>)}</div>}
        <div className="content">{children}</div>
      </section>
      {toast && <div className="toast"><CheckCircle2 /> {toast}</div>}
    </div>
  );
}

function navItems(role: RoleId, t: typeof text.ar | typeof text.en) {
  const all = [
    { path: "/", label: t.dashboard, icon: LayoutDashboard, roles: ["creator", "reviewer", "approver", "admin", "auditor"] },
    { path: "/sector-publications", label: "My Sector Publications", icon: Library, roles: ["creator", "reviewer"] },
    { path: "/approvals", label: t.approvals, icon: FileCheck2, roles: ["reviewer", "approver", "auditor"] },
    { path: "/publishing", label: t.publishing, icon: Send, roles: ["approver"] },
    { path: "/calendar", label: t.calendar, icon: CalendarDays, roles: ["creator", "reviewer", "approver", "auditor"] },
    { path: "/library", label: t.library, icon: Library, roles: ["auditor"] },
    { path: "/templates", label: t.templates, icon: BookOpen, roles: ["creator", "reviewer", "admin"] },
    { path: "/notifications", label: t.notifications, icon: Bell, roles: ["creator", "reviewer", "approver", "admin", "auditor"] },
    { path: "/analytics", label: t.analytics, icon: BarChart3, roles: ["auditor"] },
    { path: "/users", label: t.users, icon: Users, roles: ["admin"] },
    { path: "/sectors", label: t.sectors, icon: Archive, roles: ["admin"] },
    { path: "/channels", label: t.channels, icon: Globe2, roles: ["admin"] },
    { path: "/admin/languages", label: "Languages", icon: Languages, roles: ["admin"] },
    { path: "/terminology", label: t.terminology, icon: Languages, roles: ["admin"] },
    { path: "/workflows", label: t.workflows, icon: Workflow, roles: ["admin"] },
    { path: "/ai-settings", label: t.aiSettings, icon: Sparkles, roles: ["admin"] },
    { path: "/audit", label: t.audit, icon: History, roles: ["admin", "auditor"] },
    { path: "/health", label: t.health, icon: Gauge, roles: ["admin"] },
    { path: "/admin/reset", label: "Reset Demo Data", icon: RefreshCcw, roles: ["admin"] },
  ];
  const allowed = navPathsForRole(role);
  return all.filter((n) => allowed.includes(n.path) && n.roles.includes(role));
}

function Dashboard({ lang, user, publications }: { lang: Lang; user: User; publications: Publication[] }) {
  const visible = visiblePublications(user, publications);
  const metrics = user.id === "u0"
    ? [["المسودات", "Drafts", visible.filter((p) => p.status === "Draft").length], ["النشرات السابقة", "Previous Publications", visible.filter((p) => p.status === "Published").length], ["النشرات المجدولة", "Scheduled Publications", visible.filter((p) => p.status === "Scheduled").length], ["بانتظار الاعتماد", "Pending Approvals", visible.filter((p) => p.status === "Ministry Review").length], ["التحليلات", "Analytics", "94%"]]
    : user.role === "admin"
    ? [["المستخدمون النشطون", "Active users", users.filter((u) => u.active).length], ["القنوات المتصلة", "Connected channels", channelSettings.filter((c) => c.status === "Connected").length], ["نجاح النشر", "Publishing success", "94%"], ["أحداث التدقيق", "Audit events", 184]]
    : user.role === "approver"
      ? [["بانتظار الاعتماد", "Awaiting approval", visible.filter((p) => p.status === "Ministry Review").length], ["عالية الأولوية", "High priority", visible.filter((p) => p.priority === "High" || p.priority === "Urgent").length], ["مجدولة اليوم", "Scheduled today", visible.filter((p) => p.status === "Scheduled").length], ["متوسط الاعتماد", "Avg approval", "4.2h"]]
      : [["المسودات", "Drafts", visible.filter((p) => p.status === "Draft").length], ["معادة للتصحيح", "Returned", visible.filter((p) => p.status.includes("Returned")).length], ["بانتظار المراجعة", "Awaiting review", visible.filter((p) => p.status.includes("Review")).length], ["منشورة", "Published", visible.filter((p) => p.status === "Published").length]];
  return <Page title={user.id === "u0" ? (lang === "ar" ? "لوحة عبدالله العواد" : "Abdullah Alawad Dashboard") : (lang === "ar" ? "لوحة التحكم التشغيلية" : "Operational Dashboard")} subtitle={lang === "ar" ? "ملخص حي لحركة المحتوى والاعتماد والنشر." : "Live summary of content, approvals, and publishing."}>
    <div className="metric-grid animated-counters">{metrics.map(([ar, en, v]) => <Metric key={String(ar)} value={String(v)} label={lang === "ar" ? String(ar) : String(en)} />)}</div>
    <div className="grid two">
      <Panel title={lang === "ar" ? "اتجاه الاعتمادات" : "Approval trend"}><Chart publications={visible} kind="area" /></Panel>
      <Panel title={lang === "ar" ? "المحتوى حسب القناة" : "Content by platform"}><Chart publications={visible} kind="pie" /></Panel>
    </div>
    <div className="grid two">
      <PublicationTable lang={lang} publications={visible.slice(0, 8)} />
      <Panel title={lang === "ar" ? "النشاط القادم والتعليقات" : "Upcoming work and comments"}>{visible.slice(0, 5).map((p) => <ActivityRow key={p.id} lang={lang} p={p} />)}</Panel>
    </div>
  </Page>;
}

const labels: Record<string, Record<Lang, string>> = { title: { ar: "عنوان النشر", en: "Publication title" }, campaign: { ar: "اسم الحملة", en: "Campaign" }, reference: { ar: "رقم مرجعي داخلي", en: "Internal reference" }, purpose: { ar: "الغرض من النشر", en: "Purpose" }, audience: { ar: "الجمهور المستهدف", en: "Target audience" }, geo: { ar: "النطاق الجغرافي", en: "Geographic audience" } };

function CreatePublicationDemo({ lang, user, publications, setPublications, notify, disabledLanguages, channelsState, recordAction, sendNotification }: { lang: Lang; user: User; publications: Publication[]; setPublications: React.Dispatch<React.SetStateAction<Publication[]>>; notify: (m: string) => void; disabledLanguages: string[]; channelsState: Channel[]; recordAction: (action: string, publication?: Publication, result?: AuditLog["result"], note?: string) => void; sendNotification: (userId: string | undefined, publication: Publication | undefined, titleEn: string, titleAr: string, messageEn: string, messageAr: string, type?: string) => void }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(100);
  const initialSectorId = user.sectorId || "prisons";
  const initialSector = sectorTopic(initialSectorId, 0);
  const [form, setForm] = useState({
    title: initialSector.topic.title,
    sectorId: initialSectorId,
    category: initialSector.topic.category,
    priority: "High" as Priority,
    campaign: initialSector.topic.title,
    reference: "INT-PR-184",
    purpose: initialSector.profile.audience,
    content: initialSector.topic.body,
    audience: initialSector.profile.audience,
    geo: "جميع مناطق المملكة",
    schedule: "2026-07-21T09:25",
    immediate: false,
  });
  const [selectedChannels, setSelectedChannels] = useState(["X", "Instagram", "Ministry Portal", "Saudi Press Agency"]);
  const [selectedLanguages, setSelectedLanguages] = useState(["Arabic", "English", "French", "Urdu"]);
  const [media, setMedia] = useState<MediaAsset[]>([{ id: "demo-media", name: `${initialSectorId}-official-awareness.jpg`, type: "image", size: "2.8 MB", dimensions: "1600 x 900", status: "Ready", altText: initialSector.profile.media, preview: "#ccfbf1" }]);
  const stages = ["Initializing AI Agent...", "Loading Government Terminology...", "Checking Arabic Grammar...", "Detecting Repeated Wording...", "Applying Official Government Tone...", "Reviewing Sensitive Information...", "Generating English Translation...", "Generating French Translation...", "Generating Urdu Translation...", "Optimizing for X...", "Optimizing for Instagram...", "Generating Press Release...", "Performing Final Quality Review...", "Completed Successfully"];
  const demoLabels: Record<string, Record<Lang, string>> = { title: { ar: "عنوان النشر", en: "Publication title" }, campaign: { ar: "اسم الحملة", en: "Campaign" }, reference: { ar: "رقم مرجعي داخلي", en: "Internal reference" }, purpose: { ar: "الغرض من النشر", en: "Purpose" }, audience: { ar: "الجمهور المستهدف", en: "Target audience" }, geo: { ar: "النطاق الجغرافي", en: "Geographic audience" } };

  function simulateUpload() {
    setUploading(true);
    setUploadProgress(0);
    const points = [25, 48, 72, 100];
    let index = 0;
    const timer = window.setInterval(() => {
      setUploadProgress(points[index]);
      if (points[index] === 100) {
        window.clearInterval(timer);
        window.setTimeout(() => setUploading(false), 500);
      }
      index += 1;
    }, 520);
  }

  function createDemo(status: Status) {
    const errors = [
      !form.title.trim() ? "Publication title is required." : "",
      !form.content.trim() ? "Arabic content is required." : "",
      selectedChannels.length === 0 ? "At least one platform is required." : "",
      selectedLanguages.length === 0 ? "At least one language is required." : "",
      selectedLanguages.some((language) => disabledLanguages.includes(language)) ? "A disabled language is selected." : "",
      selectedChannels.some((name) => {
        const channel = channelsState.find((c) => c.name === name);
        return !channel?.enabled || !canPublishChannel(channel.status, !form.immediate).ok;
      }) ? "A selected channel is disabled or not publishable." : "",
    ].filter(Boolean);
    if (errors.length) {
      notify(errors[0]);
      return;
    }
    const id = `demo-live-${Date.now()}`;
    const base = makePublication(183);
    const activeSector = sectors.find((sector) => sector.id === form.sectorId);
    const activeProfile = sectorContent[form.sectorId] || initialSector.profile;
    const created: Publication = {
      ...base,
      id,
      reference: demoPublicationReference,
      title: form.title,
      sourceArabic: form.content,
      improvedArabic: demoImprovedArabic,
      sectorId: form.sectorId,
      creatorId: user.id,
      category: form.category,
      priority: form.priority,
      campaign: form.campaign,
      languages: selectedLanguages,
      channels: selectedChannels,
      selectedLanguages,
      selectedPlatforms: selectedChannels,
      languageStatuses: buildLanguageStatuses(selectedLanguages, selectedLanguages.filter((language) => language !== "Arabic").map((language) => ({ language, status: "Ready", content: languageContent(language, "General Directorate of Prisons") }))),
      platformStatuses: buildPlatformStatuses(selectedChannels, selectedChannels.map((platform) => ({ platform, content: platformContent(platform), characterLimit: platform === "X" ? 280 : 2200, status: "Ready" }))),
      media,
      status,
      currentStep: status,
      scheduledAt: form.schedule,
      createdAt: "2026-07-21T09:15:00",
      updatedAt: new Date().toISOString(),
      createdByName: user.nameEn,
      createdByNameAr: user.nameAr,
      demoTimeline,
      translations: selectedLanguages.filter((language) => language !== "Arabic").map((language) => ({ language, status: "Ready", content: languageContent(language, activeSector?.nameEn || "Government sector") })),
      platformVersions: selectedChannels.map((platform) => ({ platform, content: platform === "X" ? `${form.content.slice(0, 180)} ${activeProfile.hashtags}` : `${form.content}\n\n${activeProfile.hashtags}`, characterLimit: platform === "X" ? 280 : 2200, status: "Ready" })),
      publishingResults: selectedChannels.map((platform, index) => ({
        platform,
        status: "Scheduled",
        account: platform === "X" ? "@Prisons_KSA" : platform === "Instagram" ? "@prisons_ksa" : "General Directorate of Prisons",
        attempt: index + 1,
        externalUrl: platform === "X" ? "https://x.com/Prisons_KSA/status/194875219485" : platform === "Instagram" ? "https://instagram.com/p/CxY82LmAb12" : `mock://govpublish/${platform.toLowerCase().replaceAll(" ", "-")}/${demoPublicationReference}`,
      })),
      findings: [{ id: "demo-sensitive", type: "No critical sensitive information", severity: "Info", text: "Human review recommended", explanationAr: "لا توجد معلومات حساسة حرجة. يوصى بمراجعة بشرية نهائية قبل النشر وإضافة رابط رسمي عند الحاجة.", explanationEn: "No critical sensitive information was detected. Final human review and an official link are recommended.", blocking: false }],
      comments: [{ id: "demo-comment", user: user.nameAr, role: user.role, text: "تم تجهيز المحتوى وفق اختصاصات القطاع والصياغة الرسمية وإرساله للاعتماد.", createdAt: "2026-07-21T09:20:00", internal: true, resolved: true }],
    };
    setPublications((items) => [created, ...items.filter((item) => item.reference !== demoPublicationReference)]);
    recordAction(status === "AI Review" ? "AI processing completed" : "Draft saved", created, "Success", status);
    sendNotification("u3", created, "Publication submitted", "تم تجهيز نشر جديد", `${created.reference} is ready for ministry review.`, `${created.reference} جاهز للمراجعة الوزارية.`, "review");
    notify(status === "AI Review" ? (lang === "ar" ? "اكتملت المعالجة الذكية بنجاح" : "AI processing completed successfully") : (lang === "ar" ? "تم حفظ النشر" : "Publication saved"));
    navigate(status === "AI Review" ? `/ai/${id}` : "/library");
  }

  function runAi() {
    setProcessing(true);
    setProgress(0);
    const timer = window.setInterval(() => setProgress((p) => {
      const next = p + 8;
      if (next >= 100) {
        window.clearInterval(timer);
        setProcessing(false);
        createDemo("AI Review");
      }
      return Math.min(next, 100);
    }), 620);
  }

  return <Page title={lang === "ar" ? "إنشاء نشر جديد" : "Create New Publication"} subtitle={lang === "ar" ? "سيناريو العرض الحي: عبدالله العواد، المديرية العامة للسجون." : "Live demo scenario: Abdullah Alawad, General Directorate of Prisons."}>
    <Stepper step={step} labels={lang === "ar" ? ["المعلومات", "الوسائط", "القنوات", "اللغات", "المعالجة"] : ["Information", "Media", "Channels", "Languages", "AI"]} />
    {step === 1 && <Panel title={lang === "ar" ? "المعلومات الأساسية" : "Basic information"}><div className="form-grid">{["title", "campaign", "reference", "purpose", "audience", "geo"].map((k) => <label key={k}>{demoLabels[k][lang]}<input value={(form as any)[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></label>)}<label>{lang === "ar" ? "التصنيف" : "Category"}<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((c) => <option key={c}>{c}</option>)}</select></label><label>{lang === "ar" ? "الأولوية" : "Priority"}<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}>{["Low", "Normal", "High", "Urgent"].map((c) => <option key={c}>{c}</option>)}</select></label><label className="span">{lang === "ar" ? "النص العربي المصدر" : "Arabic source content"}<textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></label><label>{lang === "ar" ? "تاريخ ووقت النشر" : "Publication time"}<input type="datetime-local" value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} /></label><label className="check inline"><input type="checkbox" checked={form.immediate} onChange={(e) => setForm({ ...form, immediate: e.target.checked })} /> {lang === "ar" ? "نشر فوري بعد الاعتماد" : "Immediate after approval"}</label></div></Panel>}
    {step === 2 && <Panel title={lang === "ar" ? "رفع صورة العرض التجريبية" : "Demo image upload"}><div className="drop"><UploadCloud /><b>{uploading ? (lang === "ar" ? "جار رفع الصورة..." : "Uploading...") : (lang === "ar" ? "صورة توعوية رسمية جاهزة للعرض" : "Official awareness image ready for demo")}</b><div className="progress upload"><span style={{ width: `${uploadProgress}%` }} /></div><strong>{uploading ? `${uploadProgress}%` : "Completed"}</strong><button className="demo-action" onClick={simulateUpload}>{lang === "ar" ? "إعادة محاكاة الرفع" : "Simulate upload"}</button></div><MediaGrid media={media} setMedia={setMedia} /></Panel>}
    {step === 3 && <SelectableGrid items={channelsState.filter((c) => ["X", "Instagram", "Ministry Portal", "Saudi Press Agency"].includes(c.name) && c.enabled)} selected={selectedChannels} setSelected={setSelectedChannels} lang={lang} />}
    {step === 4 && <Panel title={lang === "ar" ? "اختيار اللغات" : "Select languages"}><div className="card-grid">{["Arabic", "English", "French", "Urdu"].filter((l) => isLanguageSelectable(l, disabledLanguages)).map((l) => <button key={l} className={selectedLanguages.includes(l) ? "choice selected" : "choice"} onClick={() => setSelectedLanguages((arr) => arr.includes(l) ? arr.filter((x) => x !== l) : [...arr, l])}><Languages /><b>{l}</b><span>{lang === "ar" ? "مصطلحات معتمدة متاحة" : "Official terms available"}</span></button>)}</div>{disabledLanguages.length > 0 && <p className="validation">{lang === "ar" ? "لغات معطلة حاليا: " : "Currently disabled: "}{disabledLanguages.join(", ")}</p>}</Panel>}
    {step === 5 && <Panel title={lang === "ar" ? "المعالجة الذكية" : "AI processing"}>{processing ? <div><div className="progress"><span style={{ width: `${progress}%` }} /></div>{stages.map((stage, index) => <div className={index <= Math.floor(progress / 8) ? "stage done" : "stage"} key={stage}><Sparkles /> {stage}</div>)}</div> : <div className="ai-ready"><Sparkles /><h3>{lang === "ar" ? "جاهز لتشغيل وكيل الذكاء الاصطناعي" : "Ready to run the AI agent"}</h3><p>{lang === "ar" ? "سيتم تحسين النص، فحصه، ترجمته، وتكييفه مع X وInstagram والبوابة ووكالة الأنباء." : "The agent will improve, review, translate, and adapt the publication for X, Instagram, the portal, and SPA."}</p><button className="primary demo-action" onClick={runAi}>{text[lang].runAi}</button></div>}</Panel>}
    <div className="wizard-actions"><button disabled={step === 1} onClick={() => setStep(step - 1)}>{lang === "ar" ? "السابق" : "Back"}</button><button onClick={() => createDemo("Draft")}>{text[lang].saveDraft}</button>{step < 5 ? <button className="primary demo-action" onClick={() => setStep(step + 1)}>{lang === "ar" ? "التالي" : "Next"}</button> : <button className="primary demo-action" onClick={runAi}>{text[lang].runAi}</button>}</div>
  </Page>;
}

function AIWorkspace({ lang, user, publications, setPublications, notify, recordAction, sendNotification }: { lang: Lang; user: User; publications: Publication[]; setPublications: React.Dispatch<React.SetStateAction<Publication[]>>; notify: (m: string) => void; recordAction: (action: string, publication?: Publication, result?: AuditLog["result"], note?: string) => void; sendNotification: (userId: string | undefined, publication: Publication | undefined, titleEn: string, titleAr: string, messageEn: string, messageAr: string, type?: string) => void }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const p = publications.find((x) => x.id === id)!;
  if (!p) {
    return <Page title={lang === "ar" ? "السجل غير موجود" : "Publication not found"} subtitle={id || "-"}><Panel title={lang === "ar" ? "لا يمكن فتح مساحة الذكاء الاصطناعي" : "AI workspace unavailable"}><p>{lang === "ar" ? "تعذر العثور على سجل النشر المطلوب. لم يتم تنفيذ أي إجراء." : "The requested publication record was not found. No action was performed."}</p><ActionBar><a className="primary" href="#/sector-publications">{lang === "ar" ? "العودة لمنشورات القطاع" : "Back to sector publications"}</a></ActionBar></Panel></Page>;
  }
  function update(status: Status) {
    const allowed = canTransition(p.status, status, { role: user.role });
    if (!allowed.ok) {
      notify(allowed.message || "Invalid action");
      return;
    }
    setPublications((items) => items.map((x) => x.id === p.id ? { ...x, status, currentStep: status, ministryReachedAt: status === "Ministry Review" ? new Date().toISOString() : x.ministryReachedAt, updatedAt: new Date().toISOString(), versionHistory: [...x.versionHistory, `${new Date().toISOString()} - ${user.email} submitted to ${status}`], demoTimeline: [...(x.demoTimeline || []), { time: "09:20", labelAr: "تم الإرسال للاعتماد الوزاري", labelEn: "Submitted for Ministry Approval" }] } : x));
    recordAction("Submitted for ministry approval", p, "Success", status);
    sendNotification("u3", p, "Ministry approval requested", "طلب اعتماد وزاري", `${p.reference} is waiting for ministry approval.`, `${p.reference} بانتظار اعتماد الوزارة.`, "review");
    notify(status === "Ministry Review" ? (lang === "ar" ? "تم الإرسال بنجاح. الحالة: بانتظار اعتماد الوزارة" : "Submission successful. Status: Waiting for Ministry Approval") : (lang === "ar" ? "تم تحديث حالة المحتوى" : "Content status updated"));
    navigate("/approvals");
  }
  function mutateAiOutput(action: "accept" | "formal" | "shorter" | "translate") {
    const stamp = new Date().toISOString();
    setPublications((items) => items.map((item) => {
      if (item.id !== p.id) return item;
      const improvedArabic = action === "formal"
        ? `${item.improvedArabic}\n\nوتؤكد الجهة أهمية الالتزام بالمعلومات المنشورة عبر القنوات الرسمية.`
        : action === "shorter"
          ? item.improvedArabic.slice(0, 180)
          : item.improvedArabic;
      const translations = action === "translate" ? item.translations.map((translation) => ({ ...translation, status: "Ready" as const, content: `${translation.content}\n\nUpdated translation generated at ${stamp}.` })) : item.translations;
      return {
        ...item,
        improvedArabic,
        translations,
        versionHistory: [...item.versionHistory, `${stamp} - AI action: ${action}`],
        demoTimeline: [...(item.demoTimeline || []), { time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }), labelAr: `تم تنفيذ إجراء ذكاء اصطناعي: ${action}`, labelEn: `AI action completed: ${action}` }],
        updatedAt: stamp,
      };
    }));
    recordAction(`AI workspace action: ${action}`, p, "Success", action);
    notify(action === "accept" ? "AI changes accepted and version saved" : `AI ${action} version saved`);
  }
  return <Page title={lang === "ar" ? "مساحة مراجعة مخرجات الذكاء الاصطناعي" : "AI Content Workspace"} subtitle={p.reference}>
    <div className="grid two"><Panel title={text[lang].original}><p className="arabic-block">{p.sourceArabic}</p></Panel><Panel title={text[lang].improved}><p className="arabic-block highlight">{p.improvedArabic}</p><ul className="explain"><li>{lang === "ar" ? "تم تعديل العبارة لتقليل التكرار وتعزيز النبرة المؤسسية." : "Wording was adjusted to reduce repetition and strengthen formal tone."}</li><li>{lang === "ar" ? "تم الحفاظ على الترجمة الرسمية للمصطلحات المعتمدة." : "Approved official terminology was preserved."}</li><li>{lang === "ar" ? "تم اختصار نسخة X لتناسب الحد المقترح." : "X version was shortened for the recommended limit."}</li></ul></Panel></div>
    <Panel title={lang === "ar" ? "الترجمات والنسخ حسب القناة" : "Translations and platform versions"}><Tabs items={[...p.translations.map((tr) => ({ label: tr.language, body: tr.content })), ...p.platformVersions.map((v) => ({ label: v.platform, body: `${v.content}\n${v.content.length}/${v.characterLimit}` }))]} /></Panel>
    <div className="grid three"><Quality label={lang === "ar" ? "النبرة الرسمية" : "Official tone"} value={94} /><Quality label={lang === "ar" ? "اتساق المصطلحات" : "Terminology consistency"} value={98} /><Quality label={lang === "ar" ? "ثقة الذكاء الاصطناعي" : "AI confidence"} value={p.aiConfidence} /></div>
    <SensitivePanel lang={lang} findings={p.findings} />
    <Timeline lang={lang} items={p.demoTimeline || demoTimeline.slice(0, 3)} />
    <ActionBar><button onClick={() => mutateAiOutput("accept")}>Accept all AI changes</button><button onClick={() => mutateAiOutput("formal")}>Make more formal</button><button onClick={() => mutateAiOutput("shorter")}>Make shorter</button><button onClick={() => mutateAiOutput("translate")}>Re-run translation</button><button className="primary demo-action" onClick={() => update("Ministry Review")}>{lang === "ar" ? "إرسال لاعتماد الوزارة" : "Submit for Ministry Approval"}</button></ActionBar>
  </Page>;
}

function ApprovalCenter({ lang, user, publications, setPublications, notify }: { lang: Lang; user: User; publications: Publication[]; setPublications: React.Dispatch<React.SetStateAction<Publication[]>>; notify: (m: string) => void }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const visible = visiblePublications(user, publications).filter((p) => (status === "All" || p.status === status) && `${p.title} ${p.reference} ${p.sourceArabic} ${p.campaign} ${p.createdByName || ""}`.toLowerCase().includes(query.toLowerCase()));
  return <Page title={lang === "ar" ? "مركز الاعتماد" : "Approval Center"} subtitle={lang === "ar" ? "صندوق وارد احترافي للطلبات حسب القطاع والحالة والأولوية." : "Professional approval inbox by sector, status, and priority."}>
    <Filters lang={lang} query={query} setQuery={setQuery} status={status} setStatus={setStatus} />
    <div className="row"><span className="badge">Results: {visible.length}</span><button onClick={() => { setQuery(""); setStatus("All"); }}>Clear filters</button></div>
    {visible.length === 0 ? <Panel title="No matching approvals"><p>No records match the current filters.</p></Panel> : <PublicationTable lang={lang} publications={visible} action={(p) => <a className="table-link" href={`#/approvals/${p.id}`}>{lang === "ar" ? "فتح" : "Open"}</a>} />}
  </Page>;
}

function ApprovalDetails({ lang, user, publications, setPublications, notify, recordAction, sendNotification, channelsState }: { lang: Lang; user: User; publications: Publication[]; setPublications: React.Dispatch<React.SetStateAction<Publication[]>>; notify: (m: string) => void; recordAction: (action: string, publication?: Publication, result?: AuditLog["result"], note?: string) => void; sendNotification: (userId: string | undefined, publication: Publication | undefined, titleEn: string, titleAr: string, messageEn: string, messageAr: string, type?: string) => void; channelsState: Channel[] }) {
  const { id } = useParams();
  const p = publications.find((x) => x.id === id)!;
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [modal, setModal] = useState<{ type: "language" | "platform" | "return" | "reject"; target?: string } | null>(null);
  const [modalReason, setModalReason] = useState("");
  const [returnParts, setReturnParts] = useState<string[]>(["Arabic content"]);
  const [affectedLanguages, setAffectedLanguages] = useState<string[]>([]);
  const [affectedPlatforms, setAffectedPlatforms] = useState<string[]>([]);
  if (!p) {
    return <Page title={lang === "ar" ? "السجل غير موجود" : "Publication not found"} subtitle={id || "-"}><Panel title={lang === "ar" ? "لا يمكن فتح هذا الطلب" : "This request cannot be opened"}><p>{lang === "ar" ? "تعذر العثور على سجل النشر المطلوب. لم يتم تنفيذ أي إجراء." : "The requested publication record was not found. No action was performed."}</p><ActionBar><a className="primary" href="#/approvals">{lang === "ar" ? "العودة لمركز الاعتماد" : "Back to approvals"}</a></ActionBar></Panel></Page>;
  }
  const languageReviewItems = p.selectedLanguages.map((language) => {
    const translation = p.translations.find((item) => item.language === language);
    return { language, status: translation?.status || p.languageStatuses[language]?.status || "Ready", reason: translation?.reason || p.languageStatuses[language]?.reason };
  });
  const platformReviewItems = p.selectedPlatforms.map((platform) => {
    const version = p.platformVersions.find((item) => item.platform === platform);
    return { platform, status: version?.status || p.platformStatuses[platform]?.status || "Ready", reason: version?.reason || p.platformStatuses[platform]?.reason };
  });
  function change(status: Status) {
    const validation = canTransition(p.status, status, { role: user.role, reason: reason || modalReason });
    if (!validation.ok) {
      notify(validation.message || (lang === "ar" ? "إجراء غير مسموح" : "Action not allowed"));
      return;
    }
    if (status === "Publishing") {
      const blocked = p.channels.find((channelName) => {
        const channel = channelsState.find((channel) => channel.name === channelName);
        return !channel?.enabled || !canPublishChannel(channel.status, true).ok;
      });
      if (blocked) {
        notify(`${blocked} cannot be published because the channel is unavailable.`);
        return;
      }
    }
    const now = new Date().toISOString();
    const nextTimeline = [...(p.demoTimeline || []), { time: "09:24", labelAr: status === "Approved" ? "تم اعتماد الطلب من الوزارة" : status === "Publishing" ? "بدأ النشر على القنوات المختارة" : `تغيرت الحالة إلى ${statusLabel(status, "ar")}`, labelEn: status === "Approved" ? "Approved by ministry" : status === "Publishing" ? "Publishing started" : `Status changed to ${status}` }];
    setPublications((items) => items.map((x) => {
      if (x.id !== p.id) return x;
      const approvedLanguages = x.selectedLanguages;
      const approvedPlatforms = x.selectedPlatforms;
      const translations = status === "Approved" ? x.translations.map((item) => ({ ...item, status: "Approved" as const, approver: lang === "ar" ? user.nameAr : user.nameEn, date: now })) : x.translations;
      const platformVersions = status === "Approved" ? x.platformVersions.map((item) => ({ ...item, status: "Approved" as const, approver: lang === "ar" ? user.nameAr : user.nameEn, date: now })) : x.platformVersions;
      const languageStatuses = status === "Approved" ? Object.fromEntries(approvedLanguages.map((language) => [language, { status: "Approved", approver: lang === "ar" ? user.nameAr : user.nameEn, date: now, notes: reason }])) as Record<string, ReviewItemState> : x.languageStatuses;
      const platformStatuses = status === "Approved" ? Object.fromEntries(approvedPlatforms.map((platform) => [platform, { status: "Approved", approver: lang === "ar" ? user.nameAr : user.nameEn, date: now, notes: reason }])) as Record<string, ReviewItemState> : x.platformStatuses;
      return {
        ...x,
        status,
        currentStep: status,
        ministryReachedAt: x.ministryReachedAt || now,
        translations,
        platformVersions,
        languageStatuses,
        platformStatuses,
        approval: status === "Approved" ? { status: "Approved", approvedBy: lang === "ar" ? user.nameAr : user.nameEn, approvedAt: now, comments: reason, approvedLanguages, approvedPlatforms, excludedLanguages: languages.filter((language) => !approvedLanguages.includes(language)), excludedPlatforms: platforms.filter((platform) => !approvedPlatforms.includes(platform)) } : x.approval,
        demoTimeline: nextTimeline,
        comments: comment ? [...x.comments, { id: `c-${Date.now()}`, user: lang === "ar" ? user.nameAr : user.nameEn, role: user.role, text: comment, createdAt: now, internal: true, resolved: false }] : x.comments,
        versionHistory: [...x.versionHistory, `${now} - ${user.email} changed status to ${status}`],
        updatedAt: now,
      };
    }));
    recordAction(`Status changed to ${status}`, p, "Success", reason || modalReason || status);
    if (status === "Approved") {
      sendNotification(p.creatorId, p, "Publication approved by ministry", "تم اعتماد الطلب من الوزارة", `${p.reference} was approved by ${lang === "ar" ? user.nameAr : user.nameEn}.`, `تم اعتماد الطلب ${p.reference} من الوزارة.`, "approval");
      sendNotification("u2", p, "Publication approved by ministry", "تم اعتماد الطلب من الوزارة", `${p.reference} was approved by the ministry.`, `تم اعتماد الطلب ${p.reference} من الوزارة.`, "approval");
      notify(lang === "ar" ? "تم اعتماد الطلب" : "Publication approved");
      return;
    }
    sendNotification(p.creatorId, p, "Publication status changed", "تغيرت حالة النشر", `${p.reference} changed to ${status}.`, `${p.reference} تغيرت حالته إلى ${statusLabel(status, "ar")}.`, "workflow");
    notify(lang === "ar" ? "تم تنفيذ الإجراء" : "Action completed");
  }
  function confirmModal() {
    if (!modalReason.trim()) {
      notify(lang === "ar" ? "يجب إدخال سبب واضح" : "A clear reason is required");
      return;
    }
    try {
      if (modal?.type === "language" && modal.target) {
        setPublications((items) => items.map((item) => item.id === p.id ? { ...disableTranslation(item, modal.target!, modalReason), currentStep: "Returned by Ministry", updatedAt: new Date().toISOString(), versionHistory: [...item.versionHistory, `${new Date().toISOString()} - ${modal.target} returned by ministry - ${modalReason}`] } : item));
        recordAction(`Language returned: ${modal.target}`, p, "Warning", modalReason);
        sendNotification(p.creatorId, p, "Language returned for correction", "إعادة لغة للتصحيح", `${modal.target} was returned: ${modalReason}`, `تمت إعادة ${modal.target}: ${modalReason}`, "language");
        notify(lang === "ar" ? `تم إرجاع اللغة ${modal.target} للتعديل` : `${modal.target} returned for revision`);
      }
      if (modal?.type === "platform" && modal.target) {
        setPublications((items) => items.map((item) => item.id === p.id ? { ...disablePlatform(item, modal.target!, modalReason), updatedAt: new Date().toISOString(), versionHistory: [...item.versionHistory, `${new Date().toISOString()} - ${modal.target} excluded by ministry - ${modalReason}`] } : item));
        recordAction(`Platform disabled: ${modal.target}`, p, "Warning", modalReason);
        sendNotification(p.creatorId, p, "Platform removed from publication", "استبعاد منصة من النشر", `${modal.target} was excluded: ${modalReason}`, `تم استبعاد ${modal.target}: ${modalReason}`, "platform");
        notify(lang === "ar" ? `تم تعطيل المنصة ${modal.target}` : `${modal.target} excluded`);
      }
      if (modal?.type === "return") {
        const selectedAffectedLanguages = affectedLanguages.length ? affectedLanguages : [];
        const selectedAffectedPlatforms = affectedPlatforms.length ? affectedPlatforms : [];
        if (selectedAffectedLanguages.some((language) => !p.selectedLanguages.includes(language)) || selectedAffectedPlatforms.some((platform) => !p.selectedPlatforms.includes(platform))) {
          notify(lang === "ar" ? "لا يمكن إرجاع لغة أو منصة غير محددة في الطلب" : "Only selected languages and platforms can be returned");
          return;
        }
        const details = `Parts: ${returnParts.join(", ")}; Languages: ${selectedAffectedLanguages.join(", ") || "full publication"}; Platforms: ${selectedAffectedPlatforms.join(", ") || "full publication"}; Reason: ${modalReason}`;
        setPublications((items) => items.map((item) => {
          if (item.id !== p.id) return item;
          const now = new Date().toISOString();
          const languageStatuses = { ...item.languageStatuses };
          const platformStatuses = { ...item.platformStatuses };
          const targetLanguages = selectedAffectedLanguages.length ? selectedAffectedLanguages : item.selectedLanguages;
          const targetPlatforms = selectedAffectedPlatforms.length ? selectedAffectedPlatforms : item.selectedPlatforms;
          targetLanguages.forEach((language) => { languageStatuses[language] = { status: "Returned", reason: modalReason, notes: details, approver: lang === "ar" ? user.nameAr : user.nameEn, date: now, requiredCorrection: modalReason }; });
          targetPlatforms.forEach((platform) => { platformStatuses[platform] = { status: "Returned", reason: modalReason, notes: details, approver: lang === "ar" ? user.nameAr : user.nameEn, date: now, requiredCorrection: modalReason }; });
          return {
            ...item,
            status: "Returned by Ministry",
            currentStep: "Returned by Ministry",
            languageStatuses,
            platformStatuses,
            translations: item.translations.map((translation) => targetLanguages.includes(translation.language) ? { ...translation, status: "Returned for Revision", reason: modalReason, notes: details, approver: lang === "ar" ? user.nameAr : user.nameEn, date: now, requiredCorrection: modalReason } : translation),
            platformVersions: item.platformVersions.map((version) => targetPlatforms.includes(version.platform) ? { ...version, status: "Rejected", reason: modalReason, notes: details, approver: lang === "ar" ? user.nameAr : user.nameEn, date: now, requiredCorrection: modalReason } : version),
            comments: [...item.comments, { id: `return-${Date.now()}`, user: lang === "ar" ? user.nameAr : user.nameEn, role: user.role, text: details, createdAt: now, internal: true, resolved: false }],
            versionHistory: [...item.versionHistory, `${now} - returned by ministry - ${details}`],
            demoTimeline: [...(item.demoTimeline || []), { time: "09:24", labelAr: `أعيد للمنشئ: ${modalReason}`, labelEn: `Returned to creator: ${modalReason}` }],
            updatedAt: now,
          };
        }));
        recordAction("Returned by Ministry", p, "Warning", details);
        sendNotification(p.creatorId, p, "Publication returned by ministry", "إعادة النشر من الوزارة", details, details, "return");
        notify(lang === "ar" ? "تم إرجاع الطلب للمنشئ" : "Publication returned to creator");
      }
    } catch (error) {
      console.error("Approval modal action failed", error);
      recordAction("Approval modal action failed", p, "Failed", error instanceof Error ? error.message : String(error));
      notify(lang === "ar" ? "تعذر تنفيذ الإجراء. لم يتم حفظ أي تغييرات" : "Action failed. No changes were saved.");
      return;
    }
    setModal(null);
    setModalReason("");
  }
  return <Page title={p.title} subtitle={`${p.reference} · ${statusLabel(p.status, lang)}`}>
    <div className="grid two"><Panel title={text[lang].original}><p className="arabic-block">{p.sourceArabic}</p></Panel><Panel title={text[lang].improved}><p className="arabic-block highlight">{p.improvedArabic}</p></Panel></div>
    {p.approval && <Panel title={lang === "ar" ? "تفاصيل اعتماد الوزارة" : "Ministry approval details"}><div className="metric-grid"><Metric value={p.approval.approvedBy || "-"} label={lang === "ar" ? "اعتمد بواسطة" : "Approved by"} /><Metric value={p.approval.approvedAt ? new Date(p.approval.approvedAt).toLocaleString(lang === "ar" ? "ar-SA" : "en-US") : "-"} label={lang === "ar" ? "تاريخ الاعتماد" : "Approval date"} /><Metric value={p.approval.approvedLanguages.join(", ")} label={lang === "ar" ? "اللغات المعتمدة" : "Approved languages"} /><Metric value={p.approval.approvedPlatforms.join(", ")} label={lang === "ar" ? "المنصات المعتمدة" : "Approved platforms"} /></div><p className="validation success-text">{p.status === "Scheduled" ? "تم الاعتماد ومجدول للنشر" : p.status === "Published" ? "تم الاعتماد والنشر بنجاح" : "تم اعتماد الطلب من الوزارة"}</p>{p.approval.comments && <p>{p.approval.comments}</p>}</Panel>}
    <Panel title={lang === "ar" ? "مراجعة اللغات والقنوات" : "Language and channel review"}><div className="approval-grid">{languageReviewItems.map((tr) => <ReviewChip key={tr.language} label={tr.language} status={tr.status} reason={tr.reason} notify={notify} lang={lang} onDisable={() => setModal({ type: "language", target: tr.language })} onApprove={() => { const now = new Date().toISOString(); setPublications((items) => items.map((item) => item.id === p.id ? { ...item, languageStatuses: { ...item.languageStatuses, [tr.language]: { status: "Approved", approver: lang === "ar" ? user.nameAr : user.nameEn, date: now } }, translations: item.translations.map((t) => t.language === tr.language ? { ...t, status: "Approved", approver: lang === "ar" ? user.nameAr : user.nameEn, date: now } : t), updatedAt: now } : item)); recordAction(`Language approved: ${tr.language}`, p); }} />)}{platformReviewItems.map((v) => <ReviewChip key={v.platform} label={v.platform} status={v.status} reason={v.reason} notify={notify} lang={lang} onDisable={() => setModal({ type: "platform", target: v.platform })} onApprove={() => { const now = new Date().toISOString(); setPublications((items) => items.map((item) => item.id === p.id ? { ...item, platformStatuses: { ...item.platformStatuses, [v.platform]: { status: "Approved", approver: lang === "ar" ? user.nameAr : user.nameEn, date: now } }, platformVersions: item.platformVersions.map((pv) => pv.platform === v.platform ? { ...pv, status: "Approved", approver: lang === "ar" ? user.nameAr : user.nameEn, date: now } : pv), updatedAt: now } : item)); recordAction(`Platform approved: ${v.platform}`, p); }} />)}</div></Panel>
    <SensitivePanel lang={lang} findings={p.findings} />
    <Comments lang={lang} comments={p.comments} comment={comment} setComment={setComment} />
    <Panel title={lang === "ar" ? "قرار الاعتماد" : "Approval decision"}><textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={lang === "ar" ? "ملاحظات الوزارة" : "Ministry notes"} /><ActionBar>{user.role === "auditor" ? <span className="validation">Read-only auditor access</span> : <><button onClick={() => setModal({ type: "return" })}>{text[lang].return}</button><button onClick={() => setModal({ type: "reject" })}>{text[lang].reject}</button><button className="primary demo-action" disabled={p.status !== "Ministry Review"} onClick={() => change("Approved")}>{text[lang].approve}</button><button disabled={p.status !== "Approved"} onClick={() => change("Publishing")}>{text[lang].publishNow}</button></>}</ActionBar></Panel>
    {modal && <Modal title={modal.type === "language" ? `Return ${modal.target}` : modal.type === "platform" ? `Exclude ${modal.target}` : modal.type === "return" ? "Return Publication" : "Reject Publication"} onClose={() => setModal(null)}><div className="form-grid"><label className="span">Predefined reason<select onChange={(e) => setModalReason(e.target.value)} value={modalReason}><option value="">Select a reason</option><option>Translation quality issue</option><option>Incorrect official terminology</option><option>Language not required</option><option>Translation needs revision</option><option>Platform adaptation issue</option><option>Other</option></select></label>{modal.type === "return" && <><label className="span">Correction areas<div className="check-grid">{["Arabic content", "Translation", "Image", "Hashtags", "Sensitive information", "Platform adaptation", "Scheduling", "Other"].map((part) => <label className="check" key={part}><input type="checkbox" checked={returnParts.includes(part)} onChange={(e) => setReturnParts((items) => e.target.checked ? [...items, part] : items.filter((x) => x !== part))} /> {part}</label>)}</div></label><label>Affected languages<select multiple value={affectedLanguages} onChange={(e) => setAffectedLanguages(Array.from(e.target.selectedOptions).map((o) => o.value))}>{p.selectedLanguages.map((l) => <option key={l}>{l}</option>)}</select></label><label>Affected platforms<select multiple value={affectedPlatforms} onChange={(e) => setAffectedPlatforms(Array.from(e.target.selectedOptions).map((o) => o.value))}>{p.selectedPlatforms.map((c) => <option key={c}>{c}</option>)}</select></label></>}<label className="span">Detailed reason<textarea value={modalReason} onChange={(e) => setModalReason(e.target.value)} /></label></div><ActionBar><button onClick={() => setModal(null)}>{text[lang].cancel}</button><button className="primary" disabled={!modalReason.trim()} onClick={() => { if (modal.type === "reject") { change("Rejected"); if (p.status === "Ministry Review") setModal(null); } else { confirmModal(); } }}>Confirm</button></ActionBar></Modal>}
  </Page>;
}

function PublishingCenter({ lang, publications, setPublications, notify, recordAction }: { lang: Lang; publications: Publication[]; setPublications: React.Dispatch<React.SetStateAction<Publication[]>>; notify: (m: string) => void; recordAction: (action: string, publication?: Publication, result?: AuditLog["result"], note?: string) => void }) {
  const navigate = useNavigate();
  const [channelProgress, setChannelProgress] = useState<Record<string, number>>({});
  const list = publications.filter((p) => ["Scheduled", "Publishing", "Published", "Partially Published", "Publishing Failed"].includes(p.status));
  const activeDemo = list.find((p) => p.reference === demoPublicationReference && p.status === "Publishing");
  useEffect(() => {
    if (!activeDemo) return;
    const timer = window.setInterval(() => {
      setChannelProgress((current) => {
        const next = { ...current };
        activeDemo.publishingResults.forEach((result, index) => {
          const key = `${activeDemo.id}-${result.platform}`;
          const delay = index * 18;
          next[key] = Math.min(100, (next[key] || 0) + 16 - Math.min(delay, 12));
        });
        if (activeDemo.publishingResults.every((result) => (next[`${activeDemo.id}-${result.platform}`] || 0) >= 100)) {
          window.clearInterval(timer);
          setPublications((items) => items.map((item) => item.id === activeDemo.id ? {
            ...item,
            status: "Published",
            publishingResults: item.publishingResults.map((result) => ({ ...result, status: result.platform === "Saudi Press Agency" ? "Package generated" : "Published", startedAt: "2026-07-21T09:24:20", completedAt: "2026-07-21T09:28:00" })),
            updatedAt: new Date().toISOString(),
          } : item));
          recordAction("Publishing completed", activeDemo, "Success", "4 channels published");
          notify(lang === "ar" ? "تم نشر المحتوى بنجاح إلى 4 قنوات." : "Publication successfully published to 4 channels.");
          window.setTimeout(() => navigate(`/success/${activeDemo.id}`), 650);
        }
        return next;
      });
    }, 720);
    return () => window.clearInterval(timer);
  }, [activeDemo, lang, navigate, notify, setPublications]);
  function retry(id: string) {
    setPublications((items) => items.map((p) => {
      if (p.id !== id) return p;
      const publishingResults = p.publishingResults.map((r) => ({ ...r, status: r.status === "Failed" ? "Published" as const : r.status }));
      recordAction("Publishing retry", p, "Success", "Failed channels retried");
      return { ...p, status: aggregatePublishing(publishingResults), publishingResults, updatedAt: new Date().toISOString() };
    }));
    notify(lang === "ar" ? "بدأت إعادة المحاولة" : "Retry started");
  }
  return <Page title={lang === "ar" ? "مركز النشر المباشر" : "Live Publishing Center"} subtitle={lang === "ar" ? "محاكاة نشر متدرجة عبر X وInstagram والبوابة ووكالة الأنباء." : "Animated publishing across X, Instagram, the portal, and SPA."}>
    {list.map((p) => <Panel key={p.id} title={`${p.reference} · ${p.title}`} right={<Badge status={p.status} lang={lang} />}><div className="publish-grid">{p.publishingResults.map((r, index) => {
      const value = p.status === "Publishing" ? (channelProgress[`${p.id}-${r.platform}`] || 8) : r.status === "Published" || r.status === "Package generated" ? 100 : 0;
      const stageText = r.platform === "X" ? ["Connecting to X...", "Publishing Content...", "Uploading Media...", "Completed"] : r.platform === "Instagram" ? ["Publishing to Instagram...", "Uploading Images...", "Completed"] : r.platform === "Ministry Portal" ? ["Generating Ministry Portal Article...", "Completed"] : ["Generating Saudi Press Agency Package...", "Completed"];
      return <div className="publish-card live" key={r.platform}><b>{r.platform}</b><StatusDot status={value >= 100 ? (r.platform === "Saudi Press Agency" ? "Package generated" : "Published") : p.status === "Publishing" ? "Publishing" : r.status} /><span>{r.account}</span><div className="progress small"><span style={{ width: `${value}%` }} /></div><small>{stageText[Math.min(stageText.length - 1, Math.floor((value / 100) * stageText.length))]}</small>{r.status === "Failed" && <button onClick={() => retry(p.id)}>{text[lang].retry}</button>}{index === 0 && p.status === "Publishing" && <strong>{lang === "ar" ? "Publishing..." : "Publishing..."}</strong>}</div>;
    })}</div>{p.demoTimeline && <Timeline lang={lang} items={p.demoTimeline} />}</Panel>)}
    <Panel title={lang === "ar" ? "سجل النشاط الحي" : "Live activity feed"}>{list.slice(0, 6).map((p) => <ActivityRow key={p.id} lang={lang} p={p} />)}</Panel>
  </Page>;
}

function SuccessPage({ lang, publications, setPublications, notify, recordAction }: { lang: Lang; publications: Publication[]; setPublications: React.Dispatch<React.SetStateAction<Publication[]>>; notify: (m: string) => void; recordAction: (action: string, publication?: Publication, result?: AuditLog["result"], note?: string) => void }) {
  const { id } = useParams();
  const p = publications.find((x) => x.id === id)!;
  if (!p) {
    return <Page title={lang === "ar" ? "السجل غير موجود" : "Publication not found"} subtitle={id || "-"}><Panel title={lang === "ar" ? "لا يمكن عرض نتيجة النشر" : "Publishing result unavailable"}><p>{lang === "ar" ? "تعذر العثور على سجل النشر المطلوب. لم يتم تنفيذ أي إجراء." : "The requested publication record was not found. No action was performed."}</p><ActionBar><a className="primary" href="#/publishing">{lang === "ar" ? "العودة لمركز النشر" : "Back to publishing"}</a></ActionBar></Panel></Page>;
  }
  function duplicate(status: Status) {
    const copy = { ...p, id: `pub-${Date.now()}`, reference: `GP-2026-${Date.now().toString().slice(-6)}`, title: status === "Draft" ? `${p.title} - Follow-up` : `${p.title} - Copy`, status, currentStep: status, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), versionHistory: [...p.versionHistory, `${new Date().toISOString()} - duplicated from ${p.reference}`] };
    setPublications((items) => [copy, ...items]);
    recordAction(status === "Draft" ? "Created follow-up publication" : "Duplicated publication", copy);
    notify(status === "Draft" ? "Follow-up draft created" : "Publication duplicated");
  }
  function exportReport() {
    const report = { reference: p.reference, status: p.status, platforms: p.publishingResults, exportedAt: new Date().toISOString() };
    localStorage.setItem(`govpublish-export-${p.reference}`, JSON.stringify(report));
    recordAction("Exported publication report", p);
    notify("Export report saved in demo storage");
  }
  return <Page title={lang === "ar" ? "تم النشر بنجاح" : "Publication Successful"} subtitle={p.reference}>
    <div className="success success-hero"><CheckCircle2 /><h2>{p.title}</h2><p>{lang === "ar" ? "تم اعتماد المحتوى ونشره عبر القنوات المختارة مع حفظ الروابط وسجل التدقيق." : "The publication was approved and published across selected channels with links and audit trail saved."}</p></div>
    <div className="metric-grid">
      <Metric value={p.reference} label={lang === "ar" ? "الرقم المرجعي" : "Reference Number"} />
      <Metric value="09:28" label={lang === "ar" ? "وقت النشر" : "Publication Time"} />
      <Metric value="3:42" label={lang === "ar" ? "مدة النشر" : "Publishing Duration"} />
      <Metric value={String(p.publishingResults.length)} label={lang === "ar" ? "المنصات المنشورة" : "Platforms Published"} />
    </div>
    <Panel title={lang === "ar" ? "روابط النشر التجريبية" : "Mock publication links"}><div className="card-grid">{p.publishingResults.map((r) => <a className="choice link-card" href={`#/preview/${p.id}/${encodeURIComponent(r.platform)}`} key={r.platform}><b>{r.platform}</b><span>{r.externalUrl || "mock://package-generated"}</span><small>{lang === "ar" ? "يفتح معاينة داخلية ولا ينتقل إلى موقع خارجي" : "Opens an internal preview, not an external website"}</small></a>)}</div></Panel>
    <Timeline lang={lang} items={p.demoTimeline || demoTimeline} />
    <ActionBar><a className="primary" href={`#/preview/${p.id}/X`}>{lang === "ar" ? "عرض المحتوى المنشور" : "View published content"}</a><button onClick={() => duplicate("Draft")}>Duplicate publication</button><button onClick={() => duplicate("Draft")}>Create follow-up publication</button><button onClick={exportReport}>{text[lang].export}</button></ActionBar>
  </Page>;
}

function PublicationPreview({ lang, publications }: { lang: Lang; publications: Publication[] }) {
  const { id, platform } = useParams();
  const p = publications.find((item) => item.id === id)!;
  if (!p) {
    return <Page title={lang === "ar" ? "السجل غير موجود" : "Publication not found"} subtitle={id || "-"}><Panel title={lang === "ar" ? "لا يمكن عرض المعاينة" : "Preview unavailable"}><p>{lang === "ar" ? "تعذر العثور على سجل النشر المطلوب. لم يتم تنفيذ أي إجراء." : "The requested publication record was not found. No action was performed."}</p><ActionBar><a className="primary" href="#/library">{lang === "ar" ? "العودة للمكتبة" : "Back to library"}</a></ActionBar></Panel></Page>;
  }
  const selected = decodeURIComponent(platform || "X");
  const content = p.platformVersions.find((item) => item.platform === selected)?.content || p.improvedArabic;
  const date = "21 يوليو 2026";
  if (selected === "Instagram") {
    return <Page title={lang === "ar" ? "معاينة Instagram" : "Instagram Preview"} subtitle="@prisons_ksa">
      <section className="instagram-preview">
        <div className="insta-head"><Avatar initials="GD" /><div><b>المديرية العامة للسجون</b><span>@prisons_ksa · {date}</span></div></div>
        <div className="insta-image"><span>General Directorate of Prisons</span><strong>برامج التأهيل والإصلاح</strong></div>
        <p className="caption">{content}</p>
        <div className="social-stats"><b>18,420 likes</b><span>642 comments</span><span>Posted by Abdullah Alawad</span></div>
      </section>
    </Page>;
  }
  return <Page title={lang === "ar" ? "معاينة X" : "X Preview"} subtitle="@Prisons_KSA">
    <section className="tweet-preview">
      <div className="tweet-head"><Avatar initials="GD" /><div><b>المديرية العامة للسجون</b><span>@Prisons_KSA · {date}</span><small>{lang === "ar" ? "الكاتب: عبدالله العواد" : "Author: Abdullah Alawad"}</small></div></div>
      <p>{content}</p>
      <div className="tweet-media">برامج التأهيل والإصلاح</div>
      <div className="social-stats"><span>1,248 Replies</span><span>4,875 Reposts</span><span>19.4K Likes</span><span>682 Bookmarks</span><span>1.8M Views</span></div>
    </section>
  </Page>;
}

function CalendarPage({ lang, user, publications, setPublications, notify, recordAction, sendNotification }: { lang: Lang; user: User; publications: Publication[]; setPublications: React.Dispatch<React.SetStateAction<Publication[]>>; notify: (m: string) => void; recordAction: (action: string, publication?: Publication, result?: AuditLog["result"], note?: string) => void; sendNotification: (userId: string | undefined, publication: Publication | undefined, titleEn: string, titleAr: string, messageEn: string, messageAr: string, type?: string) => void }) {
  const [selected, setSelected] = useState<Publication | null>(null);
  const [editing, setEditing] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [filter, setFilter] = useState<string>("All");
  const visible = visiblePublications(user, publications).filter((p) => !p.isArchived && ["Approved", "Scheduled", "Publishing", "Published", "Partially Published", "Publishing Failed"].includes(p.status));
  const filtered = filter === "All" ? visible : visible.filter((p) => p.status === filter);
  const legend = [
    ["Scheduled", lang === "ar" ? "مجدول" : "Scheduled"],
    ["Published", lang === "ar" ? "منشور" : "Published"],
    ["Publishing Failed", lang === "ar" ? "فشل النشر" : "Publishing Failed"],
    ["Partially Published", lang === "ar" ? "نشر جزئي" : "Partially Published"],
    ["Approved", lang === "ar" ? "معتمد وجاهز" : "Approved and Ready"],
    ["Archived", lang === "ar" ? "ملغي أو مؤرشف" : "Cancelled or Archived"],
  ];
  function confirmSchedule() {
    if (!selected) return;
    if (!newDate.trim()) {
      notify(lang === "ar" ? "لم يتم اختيار تاريخ جديد" : "No new date was selected");
      return;
    }
    const updated = reschedulePublication(selected, newDate, user) as Publication;
    setPublications((items) => items.map((item) => item.id === selected.id ? updated : item));
    recordAction("Rescheduled publication", selected, "Success", newDate);
    sendNotification(selected.creatorId, updated, "Publication rescheduled", "تمت إعادة جدولة المنشور", `${updated.reference} was rescheduled to ${newDate}.`, `تمت إعادة جدولة ${updated.reference} إلى ${newDate}.`, "schedule");
    notify(lang === "ar" ? "تمت إعادة جدولة المنشور بنجاح" : "Publication rescheduled successfully");
    setSelected(updated);
    setEditing(false);
  }
  return <Page title={lang === "ar" ? "تقويم المحتوى" : "Content Calendar"} subtitle={lang === "ar" ? "اضغط على المنشور لعرض التفاصيل. لا تتغير الجدولة إلا بعد التأكيد." : "Click an item to inspect it. Schedule changes only after confirmation."}>
    <div className="legend">{legend.map(([status, label]) => <button key={status} className={`legend-item ${status.toLowerCase().replaceAll(" ", "-")} ${filter === status ? "active" : ""}`} onClick={() => setFilter(filter === status ? "All" : status)}><span />{label}</button>)}{filter !== "All" && <button onClick={() => setFilter("All")}>{lang === "ar" ? "كل الحالات" : "All statuses"}</button>}</div>
    {filtered.length === 0 ? <Panel title={lang === "ar" ? "لا توجد منشورات مجدولة في هذه الفترة" : "No calendar items in this period"}><p>{lang === "ar" ? "غيّر الفلتر أو أنشئ منشورا جديدا." : "Change the filter or create a new publication."}</p><ActionBar><button onClick={() => setFilter("All")}>{lang === "ar" ? "مسح الفلاتر" : "Clear filters"}</button><a className="primary" href="#/sector-publications">{lang === "ar" ? "منشورات القطاع" : "My Sector Publications"}</a></ActionBar></Panel> : <div className="calendar-grid">{Array.from({ length: 30 }, (_, i) => <div className="day" key={i}><b>{i + 1}</b>{filtered.filter((p) => new Date(p.scheduledAt).getDate() === i + 1).slice(0, 3).map((p) => <button key={p.id} onClick={() => { setSelected(p); setEditing(false); setNewDate(p.scheduledAt.slice(0, 16)); }} className={`cal-item ${p.status.toLowerCase().replaceAll(" ", "-")}`} aria-label={`${p.title} - ${statusLabel(p.status, lang)}`}><span>{statusLabel(p.status, lang)}</span>{p.title}</button>)}</div>)}</div>}
    {selected && <Modal title={selected.title} onClose={() => setSelected(null)}><div className="form-grid"><Metric value={selected.reference} label={lang === "ar" ? "الرقم المرجعي" : "Reference"} /><Metric value={statusLabel(selected.status, lang)} label={lang === "ar" ? "الحالة" : "Status"} /><label>{lang === "ar" ? "القطاع" : "Sector"}<input readOnly value={sectors.find((s) => s.id === selected.sectorId)?.[lang === "ar" ? "nameAr" : "nameEn"] || selected.sectorId} /></label><label>{lang === "ar" ? "المالك" : "Owner"}<input readOnly value={users.find((u) => u.id === selected.creatorId)?.[lang === "ar" ? "nameAr" : "nameEn"] || selected.creatorId} /></label><label>{lang === "ar" ? "اللغات" : "Languages"}<input readOnly value={selected.selectedLanguages.join(", ")} /></label><label>{lang === "ar" ? "المنصات" : "Platforms"}<input readOnly value={selected.selectedPlatforms.join(", ")} /></label><label>{lang === "ar" ? "الموعد الحالي" : "Current schedule"}<input readOnly value={new Date(selected.scheduledAt).toLocaleString(lang === "ar" ? "ar-SA" : "en-US")} /></label><label>{lang === "ar" ? "آخر تحديث" : "Last update"}<input readOnly value={new Date(selected.updatedAt).toLocaleString(lang === "ar" ? "ar-SA" : "en-US")} /></label>{editing && <label className="span">{lang === "ar" ? "الموعد الجديد" : "New date and time"}<input type="datetime-local" value={newDate} onChange={(e) => setNewDate(e.target.value)} /></label>}</div><ActionBar><a className="primary" href={`#/approvals/${selected.id}`}>{lang === "ar" ? "عرض المنشور" : "View Publication"}</a>{!editing && ["Approved", "Scheduled"].includes(selected.status) && <button onClick={() => setEditing(true)}>{lang === "ar" ? "تعديل الجدولة" : "Edit Schedule"}</button>}{editing && <button className="primary" onClick={confirmSchedule}>{lang === "ar" ? "تأكيد الجدولة" : "Confirm Schedule"}</button>}<a href={`#/preview/${selected.id}/${encodeURIComponent(selected.selectedPlatforms[0] || "X")}`}>{lang === "ar" ? "فتح المعاينة" : "Open Preview"}</a>{["Published", "Partially Published", "Publishing Failed"].includes(selected.status) && <a href="#/publishing">{lang === "ar" ? "نتائج النشر" : "Publishing Result"}</a>}</ActionBar></Modal>}
  </Page>;
}

function LibraryPage({ lang, user, publications, setPublications, notify, recordAction }: { lang: Lang; user: User; publications: Publication[]; setPublications: React.Dispatch<React.SetStateAction<Publication[]>>; notify: (m: string) => void; recordAction: (action: string, publication?: Publication, result?: AuditLog["result"], note?: string) => void }) {
  const [table, setTable] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Publication | null>(null);
  const [versionTarget, setVersionTarget] = useState<Publication | null>(null);
  const canCreate = ["creator", "reviewer"].includes(user.role) && Boolean(user.sectorId);
  const visible = visiblePublications(user, publications);
  function duplicate(p: Publication) {
    if (!canCreate) {
      notify(lang === "ar" ? "تعذر إنشاء نسخة من هذا المنشور بسبب صلاحيات الحساب" : "This account cannot duplicate sector publications.");
      return;
    }
    const copy = normalizePublication(duplicatePublication(p, user, publications.length), makePublication(publications.length));
    copy.comments = [];
    copy.auditHistory = [];
    copy.publishingResults = [];
    copy.approval = undefined;
    setPublications((items) => [copy, ...items]);
    recordAction("Duplicated publication", copy, "Success", `Copied from ${p.reference}`);
    notify(lang === "ar" ? "تم إنشاء نسخة جديدة كمسودة" : "New draft duplicate created");
    window.location.hash = `#/ai/${copy.id}`;
  }
  function createFollowUp(p: Publication) {
    if (!canCreate) {
      notify(lang === "ar" ? "تعذر إنشاء متابعة بسبب صلاحيات الحساب" : "This account cannot create follow-up drafts.");
      return;
    }
    const follow = normalizePublication({ ...duplicatePublication(p, user, publications.length), title: `${p.title} - متابعة`, sourcePublicationId: p.id, sourceReference: p.reference }, makePublication(publications.length));
    follow.comments = [];
    follow.auditHistory = [];
    follow.publishingResults = [];
    follow.approval = undefined;
    setPublications((items) => [follow, ...items]);
    recordAction("Created follow-up publication", follow, "Success", p.reference);
    notify(lang === "ar" ? "تم إنشاء مسودة متابعة" : "Follow-up draft created");
    window.location.hash = `#/ai/${follow.id}`;
  }
  function confirmArchive() {
    if (!archiveTarget) return;
    try {
      const archived = archivePublication(archiveTarget, user) as Publication;
      setPublications((items) => items.map((item) => item.id === archiveTarget.id ? archived : item));
      recordAction("Archived publication", archiveTarget, "Warning", "Archive flag set");
      notify(lang === "ar" ? "تمت أرشفة المنشور بنجاح" : "Publication archived successfully");
      setArchiveTarget(null);
    } catch (error) {
      notify(lang === "ar" ? "لا يمكن أرشفة منشور قيد النشر" : "Cannot archive a publication while publishing.");
    }
  }
  function restore(p: Publication) {
    try {
      const restored = restorePublication(p, user) as Publication;
      setPublications((items) => items.map((item) => item.id === p.id ? restored : item));
      recordAction("Restored publication", restored, "Success", restored.status);
      notify(lang === "ar" ? "تمت استعادة المنشور" : "Publication restored");
    } catch (error) {
      notify(lang === "ar" ? "تعذرت استعادة المنشور" : "Publication could not be restored.");
    }
  }
  function exportPublication(p: Publication, format = "JSON") {
    const exportRecord = { format, exportedBy: user.id, exportedAt: new Date().toISOString(), publicationId: p.id };
    localStorage.setItem(`govpublish-export-${p.id}-${Date.now()}`, JSON.stringify({ ...exportRecord, reference: p.reference, title: p.title, status: p.status }));
    setPublications((items) => items.map((item) => item.id === p.id ? { ...item, exportHistory: [...(item.exportHistory || []), exportRecord], updatedAt: new Date().toISOString() } : item));
    recordAction("Exported publication", p, "Success", format);
    notify(lang === "ar" ? "تم إنشاء سجل تصدير للمنشور" : "Publication export record created");
  }
  function actions(p: Publication) {
    if (user.role === "auditor") return <ActionBar><a href={`#/approvals/${p.id}`}>{lang === "ar" ? "عرض" : "View"}</a><a href={`#/preview/${p.id}/${encodeURIComponent(p.selectedPlatforms[0] || "X")}`}>{lang === "ar" ? "معاينة" : "Preview"}</a><button onClick={() => setVersionTarget(p)}>{lang === "ar" ? "الإصدارات" : "Versions"}</button></ActionBar>;
    return <ActionBar><a href={`#/approvals/${p.id}`}>{lang === "ar" ? "عرض" : "View"}</a>{canCreate && !p.isArchived && <button onClick={() => duplicate(p)}>{lang === "ar" ? "نسخ" : "Duplicate"}</button>}{!p.isArchived && <button onClick={() => setArchiveTarget(p)}>{lang === "ar" ? "أرشفة" : "Archive"}</button>}{p.isArchived && ["admin", "creator", "reviewer"].includes(user.role) && <button onClick={() => restore(p)}>{lang === "ar" ? "استعادة" : "Restore"}</button>}<button onClick={() => exportPublication(p)}>{lang === "ar" ? "سجل تصدير" : "Export Record"}</button><a href={`#/preview/${p.id}/${encodeURIComponent(p.selectedPlatforms[0] || "X")}`}>{lang === "ar" ? "معاينة" : "Preview"}</a><button onClick={() => setVersionTarget(p)}>{lang === "ar" ? "الإصدارات" : "Versions"}</button>{["Published", "Partially Published", "Publishing Failed"].includes(p.status) && <a href="#/publishing">{lang === "ar" ? "نتائج النشر" : "Publishing Results"}</a>}{canCreate && ["Published", "Approved"].includes(p.status) && <button onClick={() => createFollowUp(p)}>{lang === "ar" ? "متابعة" : "Follow-up"}</button>}</ActionBar>;
  }
  return <Page title={lang === "ar" ? "مكتبة المحتوى" : "Content Library"} subtitle={lang === "ar" ? "مستودع قابل للتدقيق مع نسخ وأرشفة وتصدير واستعادة." : "Auditable repository with duplicate, archive, export, and restore actions."} right={<button onClick={() => setTable(!table)}>{table ? "Cards" : "Table"}</button>}>{visible.length === 0 ? <Panel title={lang === "ar" ? "لا توجد سجلات متاحة" : "No records available"}><p>{lang === "ar" ? "لا توجد منشورات ضمن صلاحيات هذا الحساب." : "No publications are available for this account."}</p></Panel> : table ? <PublicationTable lang={lang} publications={visible} action={actions} /> : <div className="card-grid">{visible.map((p) => <div className="content-card" key={p.id}><Badge status={p.status} lang={lang} />{p.isArchived && <Badge status="Archived" lang={lang} />}<h3>{p.title}</h3><p>{p.sourceArabic.slice(0, 110)}...</p><small>{p.sourceReference ? `Linked to ${p.sourceReference}` : p.reference}</small>{actions(p)}</div>)}</div>}{archiveTarget && <Modal title={lang === "ar" ? "تأكيد الأرشفة" : "Confirm archive"} onClose={() => setArchiveTarget(null)}><p>{lang === "ar" ? "الأرشفة لا تحذف السجل. سيتم حفظ المحتوى والإصدارات وقرارات الاعتماد ونتائج النشر." : "Archiving does not delete the record. Content, versions, approvals, and publishing results are preserved."}</p><ActionBar><button onClick={() => setArchiveTarget(null)}>{lang === "ar" ? "إلغاء" : "Cancel"}</button><button className="primary" onClick={confirmArchive}>{lang === "ar" ? "تأكيد الأرشفة" : "Confirm Archive"}</button></ActionBar></Modal>}{versionTarget && <Modal title={lang === "ar" ? "الإصدارات" : "Version History"} onClose={() => setVersionTarget(null)}><div className="timeline">{versionTarget.versionHistory.map((entry, index) => <div className="timeline-item" key={`${entry}-${index}`}><time>{index + 1}</time><span /><b>{entry}</b></div>)}</div></Modal>}</Page>;
}

function SectorPublicationsPage({ lang, user, publications }: { lang: Lang; user: User; publications: Publication[] }) {
  const [tab, setTab] = useState("All");
  const [query, setQuery] = useState("");
  const scoped = publications.filter((p) => p.sectorId === user.sectorId);
  const tabs = ["All", "My Drafts", "AI Processing", "Awaiting Sector Review", "Returned by Sector", "Awaiting Ministry Approval", "Returned by Ministry", "Approved", "Scheduled", "Published", "Partially Published", "Failed", "Rejected", "Archived"];
  const mappedStatus: Record<string, (p: Publication) => boolean> = {
    All: () => true,
    "My Drafts": (p) => p.status === "Draft" && p.creatorId === user.id,
    "AI Processing": (p) => p.status === "AI Processing" || p.status === "AI Review",
    "Awaiting Sector Review": (p) => p.status === "Sector Review",
    "Returned by Sector": (p) => p.status === "Returned by Sector",
    "Awaiting Ministry Approval": (p) => p.status === "Ministry Review",
    "Returned by Ministry": (p) => p.status === "Returned by Ministry",
    Approved: (p) => p.status === "Approved",
    Scheduled: (p) => p.status === "Scheduled",
    Published: (p) => p.status === "Published",
    "Partially Published": (p) => p.status === "Partially Published",
    Failed: (p) => p.status === "Publishing Failed",
    Rejected: (p) => p.status === "Rejected",
    Archived: (p) => p.status === "Archived",
  };
  const filtered = scoped.filter((p) => mappedStatus[tab](p)).filter((p) => `${p.title} ${p.reference} ${p.sourceArabic} ${p.campaign} ${p.createdByName || ""}`.toLowerCase().includes(query.toLowerCase()));
  return <Page title={lang === "ar" ? "منشورات القطاع" : "My Sector Publications"} subtitle={lang === "ar" ? "كل منشورات القطاع حسب الصلاحيات والحالة." : "All sector publications filtered by permissions and status."} right={["creator", "reviewer"].includes(user.role) && <a className="primary" href="#/create"><FilePlus2 /> {lang === "ar" ? "إنشاء منشور جديد" : "Create New Publication"}</a>}>
    <div className="filters"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={text[lang].search} /><button onClick={() => setQuery("")}>Clear filters</button><span className="badge">Results: {filtered.length}</span><span className="badge">Active filters: {(query ? 1 : 0) + (tab !== "All" ? 1 : 0)}</span></div>
    <div className="tabs">{tabs.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item} ({scoped.filter((p) => mappedStatus[item](p)).length})</button>)}</div>
    {filtered.length === 0 ? <Panel title={tab === "Returned by Ministry" ? (lang === "ar" ? "لا توجد منشورات مرتجعة من الوزارة" : "No publications returned by ministry") : tab === "Archived" ? (lang === "ar" ? "لا توجد منشورات مؤرشفة" : "No archived publications") : (lang === "ar" ? "لا توجد سجلات مطابقة" : "No matching publications")}><p>{lang === "ar" ? "غيّر الفلاتر أو أنشئ منشورا جديدا عند الحاجة." : "Change filters or create a new publication when needed."}</p><ActionBar><button onClick={() => { setQuery(""); setTab("All"); }}>{lang === "ar" ? "مسح الفلاتر" : "Clear filters"}</button>{["creator", "reviewer"].includes(user.role) && <a className="primary" href="#/create">{lang === "ar" ? "إنشاء منشور جديد" : "Create New Publication"}</a>}</ActionBar></Panel> : <PublicationTable lang={lang} publications={filtered} action={(p) => <a className="table-link" href={`#/approvals/${p.id}`}>Open</a>} />}
  </Page>;
}

function TemplatesPage({ lang, user, publications, setPublications, notify, recordAction }: { lang: Lang; user: User; publications: Publication[]; setPublications: React.Dispatch<React.SetStateAction<Publication[]>>; notify: (m: string) => void; recordAction: (action: string, publication?: Publication, result?: AuditLog["result"], note?: string) => void }) {
  const navigate = useNavigate();
  function useTemplate(template: TemplateItem) {
    if (!["creator", "reviewer"].includes(user.role) || !user.sectorId) {
      notify(lang === "ar" ? "تعذر إنشاء مسودة من هذا القالب بسبب صلاحيات الحساب" : "This account cannot create sector publications.");
      return;
    }
    const base = makePublication(5);
    const profile = user.sectorId ? sectorContent[user.sectorId] : undefined;
    const core = createTemplateDraft({ ...template, bodyAr: template.bodyAr || `${template.titleAr}\n\nالنص الرئيسي:\n\nالإرشادات الإعلامية: ${profile?.media || "استخدم مادة رسمية مناسبة للقطاع."}\n\nالوسوم المقترحة: ${profile?.hashtags || "#وزارة_الداخلية"}` }, user, publications.length);
    const draft: Publication = normalizePublication({
      ...base,
      ...core,
      title: lang === "ar" ? template.titleAr : template.titleEn,
      priority: "Normal",
      media: [{ id: `template-media-${Date.now()}`, name: "template-media-guidance.txt", type: "document", size: "2 KB", status: "Ready", altText: "Suggested media guidance for the selected template", preview: "#f8fafc" }],
      findings: [],
      comments: [],
      auditHistory: [],
      aiConfidence: 88,
      createdByName: lang === "ar" ? user.nameAr : user.nameEn,
      createdByNameAr: user.nameAr,
    }, base);
    draft.comments = [];
    draft.auditHistory = [];
    draft.publishingResults = [];
    draft.approval = undefined;
    setPublications((items) => [draft, ...items]);
    recordAction("Created draft from template", draft);
    notify(lang === "ar" ? `تم إنشاء مسودة جديدة من قالب ${template.titleAr}` : `Draft created from ${template.titleEn} template`);
    navigate(`/ai/${draft.id}`);
  }
  const canCreate = ["creator", "reviewer"].includes(user.role) && Boolean(user.sectorId);
  const visibleTemplates = templates.filter((template) => !template.sectorId || template.sectorId === user.sectorId || user.role === "admin");
  return <Page title={lang === "ar" ? "القوالب الرسمية" : "Official Templates"}><div className="card-grid">{visibleTemplates.map((template) => <div className="content-card" key={template.id}><h3>{lang === "ar" ? template.titleAr : template.titleEn}</h3><p>{template.sectorId ? sectors.find((sector) => sector.id === template.sectorId)?.[lang === "ar" ? "nameAr" : "nameEn"] : (lang === "ar" ? "قالب حكومي عام" : "General government template")} · {template.category}</p><small>{lang === "ar" ? "ينشئ مسودة مستقلة ولا يغيّر القالب الأصلي." : "Creates an independent draft without changing the template."}</small><button className="primary" disabled={!canCreate} onClick={() => useTemplate(template)}>{lang === "ar" ? "استخدام القالب" : "Use Template"}</button>{!canCreate && <p className="validation">{lang === "ar" ? "هذا الحساب لا يملك صلاحية إنشاء منشورات قطاعية." : "This account cannot create sector publications."}</p>}</div>)}</div></Page>;
}
function TerminologyPage({ lang, notify, recordAction }: { lang: Lang; notify: (m: string) => void; recordAction: (action: string, publication?: Publication, result?: AuditLog["result"], note?: string) => void }) {
  const [terms, setTerms] = useLocalState<OfficialTerm[]>("govpublish-official-terms", officialTerms);
  function addTerm() {
    if (terms.some((term) => term.ar === "برنامج التأهيل")) {
      notify("Duplicate official terminology is not allowed.");
      return;
    }
    setTerms((items) => [{ id: `term-${Date.now()}`, ar: "برنامج التأهيل", en: "Rehabilitation Program", fr: "Programme de rehabilitation", ur: "Rehabilitation Program", department: "Prisons", active: true, forbidden: "Rehab plan" }, ...items]);
    recordAction("Added official terminology", undefined, "Success", "برنامج التأهيل");
    notify(lang === "ar" ? "تم حفظ مصطلح جديد" : "Term saved");
  }
  return <Page title={text[lang].terminology} subtitle={lang === "ar" ? "قاموس مصطلحات رسمي تستخدمه محاكاة الترجمة." : "Official glossary used by translation simulation."}><DataList rows={terms.map((t) => [t.ar, t.en, t.fr, t.department, t.forbidden])} headers={["Arabic", "English", "French", "Department", "Forbidden"]} /><button className="primary" onClick={addTerm}>Add term</button></Page>;
}
function ChannelsPage({ lang, notify, channelsState, setChannelsState, recordAction }: { lang: Lang; notify: (m: string) => void; channelsState: Channel[]; setChannelsState: React.Dispatch<React.SetStateAction<Channel[]>>; recordAction: (action: string, publication?: Publication, result?: AuditLog["result"], note?: string) => void }) { return <Page title={text[lang].channels} subtitle={lang === "ar" ? "إعدادات اتصالات مشفرة ومحاكاة بدون كلمات مرور نصية." : "Masked integration settings without plaintext passwords."}><div className="card-grid">{channelsState.map((c) => <div className="content-card" key={c.id}><h3>{c.name}</h3><Badge status={c.status as any} lang={lang} /><p>{c.method} · {c.type}</p><code>Token: ••••••••••••••••••••</code>{!c.enabled && <p className="validation">Disabled channels cannot be selected or published.</p>}<ActionBar><button onClick={() => { notify(lang === "ar" ? "تم اختبار الاتصال وتسجيله" : "Connection test logged"); recordAction(`Test connection: ${c.name}`, undefined, canPublishChannel(c.status).ok ? "Success" : "Warning", c.status); }}>{text[lang].test}</button><button onClick={() => { setChannelsState((items) => items.map((item) => item.id === c.id ? { ...item, enabled: !item.enabled } : item)); notify(c.enabled ? "Channel disabled" : "Channel enabled"); recordAction(`${c.enabled ? "Disabled" : "Enabled"} channel ${c.name}`); }}>{c.enabled ? "Disable" : "Enable"}</button></ActionBar></div>)}</div></Page>; }
function AISettingsPage({ lang, notify, recordAction }: { lang: Lang; notify: (m: string) => void; recordAction: (action: string, publication?: Publication, result?: AuditLog["result"], note?: string) => void }) { const opts = ["Default official tone", "Translation strictness", "Sensitive-information rules", "Character-limit adaptation", "Approved terminology enforcement", "Auto-suggest hashtags", "AI confidence threshold", "Mandatory human review", "Automatic spelling correction", "Version generation count"]; return <SettingsList title={text[lang].aiSettings} opts={opts} notify={notify} lang={lang} recordAction={recordAction} storageKey="govpublish-ai-settings" />; }
function WorkflowsPage({ lang, notify, recordAction }: { lang: Lang; notify: (m: string) => void; recordAction: (action: string, publication?: Publication, result?: AuditLog["result"], note?: string) => void }) {
  const [workflows, setWorkflows] = useLocalState<string[]>("govpublish-workflows", ["Creator → Sector Reviewer → Ministry Approver → Publish", "Creator → Ministry Approver → Publish", "Creator → Legal Review → Ministry Approver → Publish"]);
  return <Page title={text[lang].workflows} subtitle={lang === "ar" ? "مسارات اعتماد حسب القطاع والأولوية." : "Approval paths by sector and priority."}>{workflows.map((w, index) => <Panel key={w} title={w}><div className="workflow">{w.split("→").map((s) => <span key={s}>{s.trim()}</span>)}</div><ActionBar><button onClick={() => { setWorkflows((items) => items.map((item, i) => i === index ? `${item} · updated ${new Date().toLocaleTimeString()}` : item)); recordAction("Updated approval workflow", undefined, "Success", w); notify(lang === "ar" ? "تم تحديث المسار" : "Workflow updated"); }}>Edit</button><button onClick={() => { setWorkflows((items) => items.map((item, i) => i === index ? `${item} · high-priority escalation` : item)); recordAction("Updated workflow priority rules", undefined, "Success", w); notify("Priority rules updated"); }}>Priority rules</button></ActionBar></Panel>)}</Page>;
}
function NotificationsPage({ lang, notifications, setNotifications, publications, notify }: { lang: Lang; notifications: NotificationItem[]; setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>; publications: Publication[]; notify: (m: string) => void }) {
  const visibleIds = new Set(notifications.map((item) => item.id));
  function mark(id: string, read: boolean) {
    setNotifications((items) => items.map((item) => item.id === id ? { ...item, read } : item));
    notify(read ? (lang === "ar" ? "تم تحديد الإشعار كمقروء" : "Notification marked as read") : (lang === "ar" ? "تم تحديد الإشعار كغير مقروء" : "Notification marked as unread"));
  }
  function notificationHref(n: NotificationItem) {
    const target = resolveNotificationTarget(n.publicationId, publications);
    return target.href;
  }
  function guardNotificationOpen(event: React.MouseEvent, n: NotificationItem) {
    const target = resolveNotificationTarget(n.publicationId, publications);
    if (!target.ok) {
      event.preventDefault();
      notify(lang === "ar" ? "السجل المرتبط بهذا الإشعار غير موجود" : target.message || "Linked record was not found.");
      return;
    }
    mark(n.id, true);
  }
  return <Page title={text[lang].notifications} right={<button className="primary" onClick={() => { setNotifications((items) => items.map((n) => visibleIds.has(n.id) ? { ...n, read: true } : n)); notify(lang === "ar" ? "تم تحديد كل الإشعارات كمقروءة" : "All notifications marked as read"); }}>{lang === "ar" ? "تحديد الكل كمقروء" : "Mark all read"}</button>}>{notifications.length === 0 ? <Panel title={lang === "ar" ? "لا توجد إشعارات" : "No notifications"}><p>{lang === "ar" ? "لا توجد إشعارات عمل حالية." : "No workflow notifications are currently pending."}</p></Panel> : <div className="notification-list">{notifications.map((n) => <article key={n.id} className={n.read ? "notification-card read" : "notification-card unread"}><div className="notification-icon"><Bell /></div><a className="notification-body" href={notificationHref(n)} onClick={(event) => guardNotificationOpen(event, n)}><b>{lang === "ar" ? n.titleAr : n.titleEn}</b><span>{lang === "ar" ? n.messageAr : n.messageEn}</span><small>{new Date(n.createdAt).toLocaleString(lang === "ar" ? "ar-SA" : "en-US")}</small></a><div className="notification-actions">{!n.read && <span className="unread-dot" title="Unread" />}<a className="primary compact" href={notificationHref(n)} onClick={(event) => guardNotificationOpen(event, n)}>{lang === "ar" ? "فتح" : "Open"}</a><button className="compact" onClick={() => mark(n.id, !n.read)}>{n.read ? (lang === "ar" ? "غير مقروء" : "Unread") : (lang === "ar" ? "مقروء" : "Read")}</button></div></article>)}</div>}</Page>;
}
function AnalyticsPage({ lang, user, publications, recordAction, notify }: { lang: Lang; user: User; publications: Publication[]; recordAction: (action: string, publication?: Publication, result?: AuditLog["result"], note?: string) => void; notify: (m: string) => void }) {
  const scopedPublications = visiblePublications(user, publications);
  function exportAnalytics(format: string) {
    localStorage.setItem(`govpublish-analytics-export-${format}`, JSON.stringify({ format, count: scopedPublications.length, sectorId: user.sectorId || "MOI", exportedAt: new Date().toISOString() }));
    recordAction(`Exported analytics ${format}`, undefined, "Success", `${scopedPublications.length} records`);
    notify(`${format} analytics export prepared`);
  }
  return <Page title={text[lang].analytics} subtitle={lang === "ar" ? "مؤشرات النشر والترجمة والأداء." : "Publishing, translation, and performance metrics."} right={<ActionBar><button onClick={() => exportAnalytics("PDF")}>PDF</button><button onClick={() => exportAnalytics("Excel")}>Excel</button><button onClick={() => exportAnalytics("CSV")}>CSV</button></ActionBar>}><div className="grid two"><Panel title="Publications by sector"><Chart publications={scopedPublications} kind="bar" /></Panel><Panel title="Publishing results by status"><PublishingStatusChart publications={scopedPublications} /></Panel><Panel title="Approval workload by status"><ApprovalStatusChart publications={scopedPublications} /></Panel><Panel title="Translation readiness">{languages.map((l, i) => <Quality key={l} label={l} value={60 + i * 5} />)}</Panel></div></Page>;
}
function AuditPage({ lang, publications, auditLogs }: { lang: Lang; publications: Publication[]; auditLogs: AuditLog[] }) { const generated = publications.flatMap((p, i) => ["Login", "Content creation", "AI processing", "Submission", "Approval", "Publication"].map((a, j) => [dayOffset(-i, 8 + j), users[j % users.length].email, roles[j % roles.length].id, a, p.reference, j % 5 ? "Success" : "Warning"])); const rows = auditLogs.length ? auditLogs.map((a) => [a.date, a.user, a.role, a.action, a.reference, a.result]) : generated; return <Page title={text[lang].audit} subtitle={lang === "ar" ? "سجل قابل للتدقيق لكل عملية مؤثرة." : "Traceable log for every important operation."}><DataList rows={rows} headers={["Date", "User", "Role", "Action", "Reference", "Result"]} /></Page>; }
function UsersPage({ lang, notify, recordAction }: { lang: Lang; notify: (m: string) => void; recordAction: (action: string, publication?: Publication, result?: AuditLog["result"], note?: string) => void }) {
  const [managedUsers, setManagedUsers] = useLocalState<User[]>("govpublish-managed-users", users);
  function addUser() {
    if (managedUsers.some((u) => u.email === "new.user@moi.gov.sa")) {
      notify("Duplicate user email is not allowed.");
      return;
    }
    const user: User = { id: `u-${Date.now()}`, nameAr: "مستخدم تجريبي", nameEn: "Demo User", email: "new.user@moi.gov.sa", role: "creator", sectorId: "prisons", lastLogin: "-", active: true };
    setManagedUsers((items) => [user, ...items]);
    recordAction("Added user", undefined, "Success", user.email);
    notify(lang === "ar" ? "تمت إضافة مستخدم تجريبي" : "Demo user added");
  }
  return <Page title={text[lang].users}><div className="table-wrap"><table><thead><tr>{["Name", "Email", "Role", "Sector", "Last login", "Status", ""].map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{managedUsers.map((u) => <tr key={u.id}><td>{lang === "ar" ? u.nameAr : u.nameEn}</td><td>{u.email}</td><td>{u.role}</td><td>{u.sectorId || "MOI"}</td><td>{u.lastLogin}</td><td>{u.active ? "Active" : "Inactive"}</td><td><button onClick={() => { setManagedUsers((items) => items.map((item) => item.id === u.id ? { ...item, active: !item.active } : item)); recordAction(`${u.active ? "Deactivated" : "Activated"} user`, undefined, "Success", u.email); }}>{u.active ? "Deactivate" : "Activate"}</button></td></tr>)}</tbody></table></div><button className="primary" onClick={addUser}>Add user</button></Page>;
}
function SectorsPage({ lang, notify, recordAction }: { lang: Lang; notify: (m: string) => void; recordAction: (action: string, publication?: Publication, result?: AuditLog["result"], note?: string) => void }) {
  const [managedSectors, setManagedSectors] = useLocalState<Sector[]>("govpublish-managed-sectors", sectors);
  return <Page title={text[lang].sectors}><div className="card-grid">{managedSectors.map((s) => <div className="content-card" key={s.id}><div className="sector-logo">{s.abbreviation}</div><h3>{lang === "ar" ? s.nameAr : s.nameEn}</h3><p>{lang === "ar" ? s.descriptionAr : s.nameEn}</p><small>{s.defaultLanguages.join(", ")}</small><ActionBar><button onClick={() => { setManagedSectors((items) => items.map((item) => item.id === s.id ? { ...item, active: !item.active } : item)); recordAction(`${s.active ? "Disabled" : "Enabled"} sector`, undefined, "Success", s.nameEn); notify(lang === "ar" ? "تم حفظ القطاع" : "Sector saved"); }}>Edit</button><button onClick={() => { setManagedSectors((items) => items.map((item) => item.id === s.id ? { ...item, descriptionAr: `${item.descriptionAr} · accounts reviewed` } : item)); recordAction("Reviewed sector accounts", undefined, "Success", s.nameEn); notify("Sector accounts reviewed"); }}>Accounts</button></ActionBar></div>)}</div></Page>;
}
function HealthPage({ lang, notify, recordAction }: { lang: Lang; notify: (m: string) => void; recordAction: (action: string, publication?: Publication, result?: AuditLog["result"], note?: string) => void }) {
  const services = ["AI service", "Translation service", "X connector", "Instagram connector", "LinkedIn connector", "Portal publishing connector", "Email service", "Notification service", "Database service", "Media-storage service"];
  const [checks, setChecks] = useLocalState<Record<string, string>>("govpublish-health-checks", {});
  return <Page title={text[lang].health} subtitle={lang === "ar" ? "حالة تشغيلية محاكاة للخدمات والتكاملات." : "Simulated operational status for services and integrations."}><div className="card-grid">{services.map((s, i) => <div className="content-card" key={s}><StatusDot status={(["Operational", "Degraded", "Maintenance", "Offline"] as any)[i % 4]} /><h3>{s}</h3><p>{80 + i * 11}ms · {99 - i % 4}% success</p><small>Last test: {checks[s] || "Not tested"}</small><button onClick={() => { const stamp = new Date().toLocaleString(); setChecks({ ...checks, [s]: stamp }); recordAction(`Tested service ${s}`, undefined, i % 4 === 3 ? "Failed" : i % 4 === 1 ? "Warning" : "Success", stamp); notify(lang === "ar" ? "تم اختبار الخدمة" : "Service tested"); }}>{text[lang].test}</button></div>)}</div></Page>;
}

function LanguageManagementPage({ lang, disabledLanguages, setDisabledLanguages, notify, recordAction }: { lang: Lang; disabledLanguages: string[]; setDisabledLanguages: React.Dispatch<React.SetStateAction<string[]>>; notify: (m: string) => void; recordAction: (action: string, publication?: Publication, result?: AuditLog["result"], note?: string) => void }) {
  const [modalLanguage, setModalLanguage] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [reasons, setReasons] = useLocalState<Record<string, string>>("govpublish-disabled-language-reasons", {});
  function toggle(language: string, disableReason = "") {
    if (!disabledLanguages.includes(language) && !disableReason.trim()) {
      setModalLanguage(language);
      return;
    }
    setDisabledLanguages((items) => {
      const disabled = items.includes(language);
      return disabled ? items.filter((item) => item !== language) : [...items, language];
    });
    setReasons((items) => disabledLanguages.includes(language) ? Object.fromEntries(Object.entries(items).filter(([key]) => key !== language)) : { ...items, [language]: disableReason });
    recordAction(`${disabledLanguages.includes(language) ? "Enabled" : "Disabled"} language ${language}`, undefined, "Warning", disabledLanguages.includes(language) ? "Language re-enabled" : disableReason);
    notify(disabledLanguages.includes(language) ? `${language} enabled` : `${language} disabled. Existing publications are preserved.`);
    setModalLanguage(null);
    setReason("");
  }
  return <Page title={lang === "ar" ? "إدارة اللغات" : "Language Management"} subtitle={lang === "ar" ? "تعطيل اللغة يمنع اختيارها في النشرات الجديدة ولا يحذف الترجمات السابقة." : "Disabling a language removes it from new publications without deleting old translations."}><div className="card-grid">{languages.map((language) => <div className="content-card" key={language}><h3>{language}</h3><Badge status={disabledLanguages.includes(language) ? "Rejected" : "Approved"} lang={lang} />{disabledLanguages.includes(language) && <p className="validation">Existing scheduled publications using {language} show a warning and remain visible. Reason: {reasons[language]}</p>}<button onClick={() => toggle(language)}>{disabledLanguages.includes(language) ? "Enable" : "Disable"}</button></div>)}</div>{modalLanguage && <Modal title={`Disable ${modalLanguage}`} onClose={() => setModalLanguage(null)}><div className="form-grid"><label className="span">Reason<select value={reason} onChange={(e) => setReason(e.target.value)}><option value="">Select a reason</option><option>Language not required</option><option>Translation quality paused</option><option>Terminology review required</option><option>Operational policy update</option><option>Other</option></select></label><label className="span">Notes<textarea value={reason} onChange={(e) => setReason(e.target.value)} /></label></div><ActionBar><button onClick={() => setModalLanguage(null)}>Cancel</button><button className="primary" disabled={!reason.trim()} onClick={() => toggle(modalLanguage, reason)}>Confirm disable</button></ActionBar></Modal>}</Page>;
}

function ResetDemoPage({ lang, setLang, setCurrentUser, setPresentationMode, setPublications, setNotifications, setAuditLogs, setChannelsState, setDisabledLanguages }: { lang: Lang; setLang: React.Dispatch<React.SetStateAction<Lang>>; setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>; setPresentationMode: React.Dispatch<React.SetStateAction<boolean>>; setPublications: React.Dispatch<React.SetStateAction<Publication[]>>; setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>; setAuditLogs: React.Dispatch<React.SetStateAction<AuditLog[]>>; setChannelsState: React.Dispatch<React.SetStateAction<Channel[]>>; setDisabledLanguages: React.Dispatch<React.SetStateAction<string[]>> }) {
  const [done, setDone] = useState(false);
  function reset() {
    Object.keys(localStorage).filter((key) => key.startsWith("govpublish-")).forEach((key) => localStorage.removeItem(key));
    setLang("ar");
    setCurrentUser(null);
    setPresentationMode(false);
    setPublications(seedPublications);
    setNotifications([]);
    setAuditLogs([]);
    setChannelsState(channelSettings);
    setDisabledLanguages([]);
    setDone(true);
  }
  return <Page title={lang === "ar" ? "إعادة ضبط بيانات العرض" : "Reset Demo Data"} subtitle={lang === "ar" ? "يعيد السجلات والإعدادات التجريبية إلى الحالة الأصلية." : "Restores demo records and settings to the original state."}><Panel title="Reset"><p>This clears local prototype changes and restores seed data.</p><button className="primary" onClick={reset}>Reset Demo Data</button>{done && <p className="validation success-text">Demo data has been reset.</p>}</Panel></Page>;
}

function visiblePublications(user: User, publications: Publication[]) {
  return publications.filter((p) => isPublicationVisibleToRole(p, user));
}
function notificationsForUser(user: User, notifications: NotificationItem[]) {
  return notifications.filter((item) => !item.recipientId || item.recipientId === user.id);
}
function Page({ title, subtitle, right, children }: { title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode }) { return <div className="page"><div className="page-head"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{right}</div>{children}</div>; }
function Panel({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) { return <section className="panel"><div className="panel-head"><h2>{title}</h2>{right}</div>{children}</section>; }
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="modal-backdrop" role="dialog" aria-modal="true"><section className="modal"><div className="panel-head"><h2>{title}</h2><button onClick={onClose}>×</button></div>{children}</section></div>; }
function Metric({ value, label }: { value: string; label: string }) { return <div className="metric"><b>{value}</b><span>{label}</span></div>; }
function Avatar({ initials }: { initials: string }) { return <div className="avatar">{initials}</div>; }
function Timeline({ lang, items }: { lang: Lang; items: { time: string; labelAr: string; labelEn: string }[] }) { return <Panel title={lang === "ar" ? "مسار النشاط" : "Activity Timeline"}><div className="timeline">{items.map((item) => <div className="timeline-item" key={`${item.time}-${item.labelEn}`}><time>{item.time}</time><span /> <b>{lang === "ar" ? item.labelAr : item.labelEn}</b></div>)}</div></Panel>; }
function Badge({ status, lang }: { status: string; lang: Lang }) { return <span className={`badge ${status.toLowerCase().replaceAll(" ", "-")}`}>{statusAr[status as Status] && lang === "ar" ? statusAr[status as Status] : status}</span>; }
function StatusDot({ status }: { status: string }) { return <span className={`status-dot ${status.toLowerCase().replaceAll(" ", "-")}`}>{status}</span>; }
function ActivityRow({ lang, p }: { lang: Lang; p: Publication }) { return <a className="activity-row" href={`#/approvals/${p.id}`}><Clock /><div><b>{p.title}</b><span>{sectors.find((s) => s.id === p.sectorId)?.[lang === "ar" ? "nameAr" : "nameEn"]} · {new Date(p.scheduledAt).toLocaleString(lang === "ar" ? "ar-SA" : "en-US")}</span></div><Badge status={p.status} lang={lang} /></a>; }
function PublicationTable({ lang, publications, action }: { lang: Lang; publications: Publication[]; action?: (p: Publication) => React.ReactNode }) { return <Panel title={lang === "ar" ? "سجلات المحتوى" : "Content records"}><div className="table-wrap"><table><thead><tr>{["Reference", "Title", "Sector", "Category", "Languages", "Channels", "Last Update", "Priority", "Status", ""].map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{publications.map((p) => <tr key={p.id}><td>{p.reference}</td><td>{p.title}</td><td>{sectors.find((s) => s.id === p.sectorId)?.[lang === "ar" ? "nameAr" : "nameEn"]}</td><td>{p.category}</td><td>{p.languages.join(", ")}</td><td>{p.channels.slice(0, 3).join(", ")}</td><td>{new Date(p.updatedAt).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US")}</td><td><Badge status={p.priority} lang={lang} /></td><td><Badge status={p.status} lang={lang} /></td><td>{action?.(p)}</td></tr>)}</tbody></table></div></Panel>; }
function Chart({ publications, kind }: { publications: Publication[]; kind: "pie" | "bar" | "area" }) { const data = sectors.slice(0, 6).map((s) => ({ name: s.abbreviation, value: publications.filter((p) => p.sectorId === s.id).length })); if (kind === "pie") return <ResponsiveContainer height={240}><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={52} outerRadius={88}>{data.map((_, i) => <Cell key={i} fill={["#0b1f3a", "#0f766e", "#b68a35", "#64748b", "#14b8a6", "#94a3b8"][i]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>; if (kind === "bar") return <ResponsiveContainer height={240}><BarChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill="#0f766e" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer>; return <ResponsiveContainer height={240}><AreaChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Area type="monotone" dataKey="value" stroke="#0f766e" fill="#ccfbf1" /></AreaChart></ResponsiveContainer>; }
function PublishingStatusChart({ publications }: { publications: Publication[] }) {
  const statuses = ["Scheduled", "Queued", "Publishing", "Published", "Failed", "Package generated"];
  const data = statuses.map((status) => ({ name: status, value: publications.flatMap((p) => p.publishingResults).filter((result) => result.status === status).length }));
  return <ResponsiveContainer height={240}><BarChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" interval={0} tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill="#0f766e" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer>;
}
function ApprovalStatusChart({ publications }: { publications: Publication[] }) {
  const data = ["Draft", "AI Review", "Sector Review", "Ministry Review", "Returned by Ministry", "Approved", "Scheduled", "Published"].map((status) => ({ name: status, value: publications.filter((p) => p.status === status).length }));
  return <ResponsiveContainer height={240}><AreaChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" interval={0} tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} /><Tooltip /><Area type="monotone" dataKey="value" stroke="#0f766e" fill="#ccfbf1" /></AreaChart></ResponsiveContainer>;
}
function Stepper({ step, labels }: { step: number; labels: string[] }) { return <div className="stepper">{labels.map((l, i) => <div className={step >= i + 1 ? "step on" : "step"} key={l}><span>{i + 1}</span>{l}</div>)}</div>; }
function MediaGrid({ media, setMedia }: { media: MediaAsset[]; setMedia: React.Dispatch<React.SetStateAction<MediaAsset[]>> }) { return <div className="card-grid">{media.map((m) => <div className="media-card" key={m.id}><div className="preview" style={{ background: m.preview }} /><b>{m.name}</b><span>{m.size} · {m.dimensions}</span><input value={m.altText} onChange={(e) => setMedia((items) => items.map((x) => x.id === m.id ? { ...x, altText: e.target.value } : x))} /><button onClick={() => setMedia((items) => items.filter((x) => x.id !== m.id))}>Delete</button></div>)}</div>; }
function SelectableGrid({ items, selected, setSelected, lang }: { items: Channel[]; selected: string[]; setSelected: React.Dispatch<React.SetStateAction<string[]>>; lang: Lang }) { return <Panel title={lang === "ar" ? "اختيار قنوات النشر" : "Select publishing channels"}><div className="card-grid">{items.map((c) => <button key={c.name} className={selected.includes(c.name) ? "choice selected" : "choice"} onClick={() => setSelected((arr) => arr.includes(c.name) ? arr.filter((x) => x !== c.name) : [...arr, c.name])}><Newspaper /><b>{c.name}</b><span>{c.status} · {c.method}</span><small>{c.account} · {c.media}</small></button>)}</div></Panel>; }
function Tabs({ items }: { items: { label: string; body: string }[] }) { const [active, setActive] = useState(0); return <div><div className="tabs">{items.map((it, i) => <button key={it.label} className={active === i ? "active" : ""} onClick={() => setActive(i)}>{it.label}</button>)}</div><pre className="tab-body">{items[active]?.body}</pre></div>; }
function Quality({ label, value }: { label: string; value: number }) { return <div className="quality"><div><b>{label}</b><span>{value}%</span></div><div className="progress small"><span style={{ width: `${value}%` }} /></div></div>; }
function SensitivePanel({ lang, findings }: { lang: Lang; findings: SensitiveFinding[] }) { return <Panel title={lang === "ar" ? "مراجعة المعلومات الحساسة" : "Sensitive Information Review"}>{findings.length ? findings.map((f) => <div className="finding" key={f.id}><ShieldCheck /><div><b>{f.type} · {f.severity}</b><p>{lang === "ar" ? f.explanationAr : f.explanationEn}</p></div><Badge status={f.blocking ? "High" : "Normal"} lang={lang} /></div>) : <div className="empty"><CheckCircle2 />{lang === "ar" ? "لا توجد معلومات حساسة حرجة. القرار النهائي للمراجع البشري." : "No critical sensitive information. Final decision remains with human reviewers."}</div>}</Panel>; }
function ActionBar({ children }: { children: React.ReactNode }) { return <div className="action-bar">{children}</div>; }
function ReviewChip({ label, status, reason, onApprove, onDisable, notify, lang }: { label: string; status: string; reason?: string; onApprove?: () => void; onDisable?: () => void; notify: (m: string) => void; lang: Lang }) { return <div className="review-chip"><b>{label}</b><Badge status={status} lang={lang} />{reason && <small className="validation">{reason}</small>}{onApprove && <button onClick={() => { onApprove(); notify(lang === "ar" ? "تم اعتماد العنصر" : "Item approved"); }}>Approve</button>}{onDisable && <button onClick={onDisable}>Disable</button>}</div>; }
function Comments({ lang, comments, comment, setComment }: { lang: Lang; comments: Comment[]; comment: string; setComment: (s: string) => void }) { return <Panel title={text[lang].comments}>{comments.map((c) => <div className="comment" key={c.id}><b>{c.user}</b><span>{new Date(c.createdAt).toLocaleString(lang === "ar" ? "ar-SA" : "en-US")} · {c.internal ? "Internal" : "Public"}</span><p>{c.text}</p></div>)}<textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={lang === "ar" ? "اكتب تعليقا داخليا أو اذكر مستخدما..." : "Write an internal comment or mention a user..."} /></Panel>; }
function Filters({ lang, query, setQuery, status, setStatus }: { lang: Lang; query: string; setQuery: (s: string) => void; status: string; setStatus: (s: string) => void }) { return <div className="filters"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={text[lang].search} /><select value={status} onChange={(e) => setStatus(e.target.value)}><option>All</option>{Object.keys(statusAr).map((s) => <option key={s}>{s}</option>)}</select><select><option>{text[lang].sector}</option>{sectors.map((s) => <option key={s.id}>{lang === "ar" ? s.nameAr : s.nameEn}</option>)}</select><select><option>{text[lang].priority}</option><option>Urgent</option><option>High</option><option>Normal</option></select></div>; }
function SimpleCards({ title, items }: { title: string; items: { title: string; body: string; action: () => void }[] }) { return <Page title={title}><div className="card-grid">{items.map((x) => <div className="content-card" key={x.title}><h3>{x.title}</h3><p>{x.body}</p><button onClick={x.action}>Use template</button></div>)}</div></Page>; }
function SettingsList({ title, opts, notify, lang, recordAction, storageKey }: { title: string; opts: string[]; notify: (m: string) => void; lang: Lang; recordAction: (action: string, publication?: Publication, result?: AuditLog["result"], note?: string) => void; storageKey: string }) {
  const [settings, setSettings] = useLocalState<Record<string, boolean | number>>(storageKey, Object.fromEntries(opts.map((o, i) => [o, i % 3 === 0 ? 70 : true])));
  return <Page title={title}><div className="settings-grid">{opts.map((o, i) => <label className="setting" key={o}><span>{o}</span>{i % 3 === 0 ? <input type="range" value={Number(settings[o] ?? 70)} onChange={(e) => setSettings({ ...settings, [o]: Number(e.target.value) })} /> : <input type="checkbox" checked={Boolean(settings[o])} onChange={(e) => setSettings({ ...settings, [o]: e.target.checked })} />}</label>)}</div><button className="primary" onClick={() => { recordAction(`Saved settings: ${title}`, undefined, "Success", JSON.stringify(settings)); notify(lang === "ar" ? "تم حفظ الإعدادات" : "Settings saved"); }}>Save settings</button></Page>;
}
function DataList({ headers, rows }: { headers: string[]; rows: (string | number | RoleId)[][] }) { return <div className="table-wrap"><table><thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table></div>; }
function statusLabel(status: Status, lang: Lang) { return lang === "ar" ? statusAr[status] : status; }

createRoot(document.getElementById("root")!).render(<App />);









