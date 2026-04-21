import jsPDF from "jspdf";
import type { CreatorProfile } from "@/context/AppContext";
import { buildGrowthPlan, type GrowthPlan } from "./growthPlan";

export interface OnboardingAnswers {
  firstName: string;
  lastName: string;
  socialHandle?: string;
  creatorType?: string;
  followerCount?: string;
  primaryPlatform?: string;
  isMonetizing?: string | null;
  monthlyEarnings?: string;
  creatorStage?: string;
  oneSentence?: string;
  challenges?: string[];
  firstUseCase?: string;
  hearAbout?: string;
  goals?: string[];
  goalTimeline?: string;
}

/** Build a minimal CreatorProfile from onboarding answers so we can reuse buildGrowthPlan. */
function profileFromAnswers(a: OnboardingAnswers): CreatorProfile {
  const fullName = [a.firstName, a.lastName].filter(Boolean).join(" ").trim() || "Creator";
  return {
    name: fullName,
    members: 0,
    mrr: 0,
    tier: 1,
    tierName: "Starter",
    healthScore: 50,
    challenge: undefined,
  } as unknown as CreatorProfile;
}

const MARGIN = 48;
const PAGE_WIDTH = 612; // US Letter at 72dpi
const PAGE_HEIGHT = 792;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

interface Cursor {
  doc: jsPDF;
  y: number;
}

function ensureSpace(c: Cursor, needed: number) {
  if (c.y + needed > PAGE_HEIGHT - MARGIN) {
    c.doc.addPage();
    c.y = MARGIN;
  }
}

function heading(c: Cursor, text: string, size = 16) {
  ensureSpace(c, size + 12);
  c.doc.setFont("helvetica", "bold");
  c.doc.setFontSize(size);
  c.doc.setTextColor(20, 20, 20);
  c.doc.text(text, MARGIN, c.y);
  c.y += size + 6;
}

function body(c: Cursor, text: string, size = 11) {
  c.doc.setFont("helvetica", "normal");
  c.doc.setFontSize(size);
  c.doc.setTextColor(60, 60, 60);
  const lines = c.doc.splitTextToSize(text, CONTENT_WIDTH);
  for (const line of lines) {
    ensureSpace(c, size + 4);
    c.doc.text(line, MARGIN, c.y);
    c.y += size + 4;
  }
}

function kv(c: Cursor, label: string, value: string) {
  if (!value) return;
  ensureSpace(c, 16);
  c.doc.setFont("helvetica", "bold");
  c.doc.setFontSize(11);
  c.doc.setTextColor(20, 20, 20);
  c.doc.text(`${label}:`, MARGIN, c.y);
  const labelWidth = c.doc.getTextWidth(`${label}:`) + 6;
  c.doc.setFont("helvetica", "normal");
  c.doc.setTextColor(60, 60, 60);
  const lines = c.doc.splitTextToSize(value, CONTENT_WIDTH - labelWidth);
  c.doc.text(lines[0], MARGIN + labelWidth, c.y);
  c.y += 15;
  for (let i = 1; i < lines.length; i++) {
    ensureSpace(c, 15);
    c.doc.text(lines[i], MARGIN + labelWidth, c.y);
    c.y += 15;
  }
}

function spacer(c: Cursor, h = 8) {
  c.y += h;
}

function rule(c: Cursor) {
  ensureSpace(c, 12);
  c.doc.setDrawColor(220, 220, 220);
  c.doc.line(MARGIN, c.y, PAGE_WIDTH - MARGIN, c.y);
  c.y += 10;
}

export function buildOnboardingPdf(answers: OnboardingAnswers, plan?: GrowthPlan): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const c: Cursor = { doc, y: MARGIN };
  const fullName = [answers.firstName, answers.lastName].filter(Boolean).join(" ").trim() || "Creator";
  const growth = plan ?? buildGrowthPlan(profileFromAnswers(answers));

  // Header
  c.doc.setFont("helvetica", "bold");
  c.doc.setFontSize(22);
  c.doc.setTextColor(20, 20, 20);
  c.doc.text("Your UPLY Growth Plan", MARGIN, c.y);
  c.y += 26;
  c.doc.setFont("helvetica", "normal");
  c.doc.setFontSize(11);
  c.doc.setTextColor(110, 110, 110);
  c.doc.text(
    `${fullName} · Generated ${new Date().toLocaleDateString()}`,
    MARGIN,
    c.y,
  );
  c.y += 18;
  rule(c);

  // Answers
  heading(c, "Your Answers", 15);
  kv(c, "Name", fullName);
  if (answers.socialHandle) kv(c, "Social handle", answers.socialHandle);
  if (answers.creatorType) kv(c, "Creator type", answers.creatorType);
  if (answers.primaryPlatform) kv(c, "Primary platform", answers.primaryPlatform);
  if (answers.followerCount) kv(c, "Followers", answers.followerCount);
  if (answers.isMonetizing) kv(c, "Currently monetizing", answers.isMonetizing);
  if (answers.monthlyEarnings) kv(c, "Monthly earnings", answers.monthlyEarnings);
  if (answers.creatorStage) kv(c, "Stage", answers.creatorStage);
  if (answers.oneSentence) kv(c, "What you do", answers.oneSentence);
  if (answers.challenges?.length) kv(c, "Biggest challenges", answers.challenges.join(", "));
  if (answers.firstUseCase) kv(c, "First use case", answers.firstUseCase);
  if (answers.goals?.length) kv(c, "Goals", answers.goals.join(", "));
  if (answers.goalTimeline) kv(c, "Timeline", `${answers.goalTimeline} days`);
  if (answers.hearAbout) kv(c, "How you found us", answers.hearAbout);

  spacer(c, 8);
  rule(c);

  // Next 3 actions
  heading(c, "Your Next 3 Actions", 15);
  growth.nextActions.forEach((a, i) => {
    body(c, `${i + 1}. ${a.title}`, 12);
    body(c, `   Why: ${a.reason}`, 10);
    spacer(c, 4);
  });

  spacer(c, 6);
  rule(c);

  // Weekly cadence
  heading(c, "Weekly Cadence", 15);
  growth.weeklyTasks.forEach((t) => {
    const cadence = t.recurDays === 1 ? "Daily" : t.recurDays === 7 ? "Weekly" : "Once";
    body(c, `${t.title}  (${cadence})`, 12);
    body(c, t.description, 10);
    spacer(c, 4);
  });

  spacer(c, 6);
  rule(c);

  // Milestones
  heading(c, "Milestones", 15);
  growth.milestones.forEach((m) => {
    body(c, `${m.date ?? ""}  ·  ${m.title}`, 12);
    body(c, m.description, 10);
    spacer(c, 4);
  });

  // Footer on last page
  spacer(c, 12);
  c.doc.setFont("helvetica", "italic");
  c.doc.setFontSize(9);
  c.doc.setTextColor(140, 140, 140);
  ensureSpace(c, 14);
  c.doc.text("Generated by UPLY · https://uply.tv", MARGIN, c.y);

  return doc;
}

export function downloadOnboardingPdf(answers: OnboardingAnswers, plan?: GrowthPlan) {
  const doc = buildOnboardingPdf(answers, plan);
  const fullName = [answers.firstName, answers.lastName].filter(Boolean).join("-").trim() || "creator";
  doc.save(`uply-growth-plan-${fullName.toLowerCase().replace(/\s+/g, "-")}.pdf`);
}
