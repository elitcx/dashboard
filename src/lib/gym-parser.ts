// Parser for workout text in multiple formats:
//   1. Full Gemini markdown  (### heading, * **Bold** bullets, indented set bullets)
//   2. Plain-bullet format   (* Pull-ups with indented set lines)
//   3. No-markdown format    (plain text with indented set lines)
//   4. Legacy inline format  (Bench Press: 3 sets × 10 reps @ 80kg)

export type ParsedSet = { reps?: number; weight?: number; duration?: number; notes?: string };
export type ParsedExercise = { name: string; sets: ParsedSet[] };
export type ParsedWorkout = {
  name: string;
  dayType: "PUSH" | "PULL" | "UPPER" | "LOWER" | "FULL_BODY" | "CARDIO" | "OTHER";
  date: string; // ISO date (yyyy-mm-dd)
  notes?: string;
  exercises: ParsedExercise[];
};

// ─── Exercise classifiers ─────────────────────────────────────────────────────

const PUSH_EX =
  /bench\s*press|incline\s*(press|dumbbell|barbell)|decline\s*(press)?|chest\s*fly|cable\s*fly|pec\s*deck|dips?\b|tricep|push.?down|skull\s*crusher|overhead\s*press|shoulder\s*press|military\s*press|lateral\s*raise|front\s*raise|push.?up/i;

const PULL_EX =
  /pull.?up|chin.?up|pull.?down|lat\s*(pull|bar)\b|bent.?over\s*row|cable\s*row|seated\s*row|t.?bar\s*row|wide.?grip.*row|bicep\s*curl|bicep|curl\b|face\s*pull|shrug|hammer\s*curl|preacher/i;

const LOWER_EX =
  /squat|leg\s*press|lunge|leg\s*curl|leg\s*extension|calf\s*raise|hip\s*thrust|glute|romanian|rdl\b|hack\s*squat|sumo|bulgarian|nordic|step.?up/i;

const CARDIO_EX =
  /incline\s*walk|treadmill|elliptical|stationary\s*bike|cycling\b|rowing\s*machine|stair(s|\s*climb)?|jog\b|swim/i;

function classifyExercise(name: string): "push" | "pull" | "lower" | "cardio" | "unknown" {
  if (CARDIO_EX.test(name)) return "cardio";
  if (PUSH_EX.test(name)) return "push";
  if (PULL_EX.test(name)) return "pull";
  if (LOWER_EX.test(name)) return "lower";
  return "unknown";
}

function detectDayTypeFromExercises(exercises: ParsedExercise[]): ParsedWorkout["dayType"] | null {
  let push = 0, pull = 0, lower = 0, cardio = 0;
  for (const ex of exercises) {
    switch (classifyExercise(ex.name)) {
      case "push": push++; break;
      case "pull": pull++; break;
      case "lower": lower++; break;
      case "cardio": cardio++; break;
    }
  }
  const strength = push + pull + lower;
  if (cardio > 0 && strength === 0) return "CARDIO";
  if (lower > 0 && push === 0 && pull === 0) return "LOWER";
  if (lower > 0 && strength > lower) return "FULL_BODY";
  if (push > 0 && pull > 0) return "UPPER";
  if (push > 0) return "PUSH";
  if (pull > 0) return "PULL";
  return null;
}

// ─── Day-type detection ───────────────────────────────────────────────────────

function detectDayType(text: string, exercises?: ParsedExercise[]): ParsedWorkout["dayType"] {
  // 1. Title-level explicit keywords (first 4 lines)
  const titleText = text.split(/\r?\n/).slice(0, 4).join(" ");
  const titlePatterns: [RegExp, ParsedWorkout["dayType"]][] = [
    [/\bpush\s*(day|workout|session)\b/i, "PUSH"],
    [/\bpull\s*(day|workout|session)\b/i, "PULL"],
    [/\b(leg|lower\s*body)\s*(day|workout|session)\b/i, "LOWER"],
    [/\bupper\s*(body\s*)?(day|workout|session)\b/i, "UPPER"],
    [/\bfull[\s-]body\b/i, "FULL_BODY"],
    [/\bcardio\s*(day|session|workout)\b/i, "CARDIO"],
    // "Upper/Lower" hybrid → determine from exercises
    [/\bupper[\s/&+]+lower\b/i, "UPPER"],
  ];
  for (const [re, dayType] of titlePatterns) {
    if (re.test(titleText)) {
      // For "Upper/Lower" hybrid, refine from exercises if available
      if (dayType === "UPPER" && /upper[\s/&+]+lower/i.test(titleText) && exercises?.length) {
        return detectDayTypeFromExercises(exercises) ?? "UPPER";
      }
      return dayType;
    }
  }

  // 2. From exercise names (most accurate)
  if (exercises?.length) {
    const fromEx = detectDayTypeFromExercises(exercises);
    if (fromEx) return fromEx;
  }

  // 3. Word-boundary keyword fallback in full text
  const pairs: [string, ParsedWorkout["dayType"]][] = [
    ["push", "PUSH"], ["pull", "PULL"], ["upper", "UPPER"],
    ["lower", "LOWER"], ["legs", "LOWER"], ["full body", "FULL_BODY"], ["cardio", "CARDIO"],
  ];
  const lower = text.toLowerCase();
  for (const [kw, dt] of pairs) {
    if (new RegExp(`\\b${kw}\\b`).test(lower)) return dt;
  }

  return "OTHER";
}

// ─── Metadata extraction ──────────────────────────────────────────────────────

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

function detectWorkoutName(text: string): string {
  const firstLine = text.split(/\r?\n/).map((l) => l.trim()).find((l) => l.length > 0);
  if (!firstLine) return "Workout";

  // "### May 20, 2026 — Gym Log" or "May 20, 2026 — Gym Log" → extract after dash
  const dashTitle = firstLine.match(
    /(?:^#{1,4}\s+)?(?:\d{4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b)[^—–]*[—–]\s*(.+)/i,
  );
  if (dashTitle) return dashTitle[1].replace(/[*#_`>]/g, "").trim() || "Workout";

  if (
    firstLine.length < 80 &&
    /(day|workout|session|push|pull|upper|lower|leg|chest|back|arm|shoulder|cardio|full)/i.test(firstLine)
  ) {
    return firstLine
      .replace(/[-–—:]\s*\d{1,2}[\s\/\-,]+.+$/g, "")
      .replace(/[-–—:]\s*(today|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday).*$/gi, "")
      .replace(/[*#_`>]/g, "")
      .replace(/[:.,;]+$/g, "")
      .trim() || "Workout";
  }

  return "Workout";
}

function detectDate(text: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const lower = text.toLowerCase();

  if (/\byesterday\b/.test(lower)) {
    const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10);
  }
  if (/\btoday\b/.test(lower)) return today;

  const iso = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const monthRe = new RegExp(`\\b(${MONTHS.join("|")})\\b\\s+(\\d{1,2})(?:,?\\s+(\\d{4}))?`, "i");
  const mm = text.match(monthRe);
  if (mm) {
    const d = new Date(
      mm[3] ? parseInt(mm[3]) : new Date().getFullYear(),
      MONTHS.indexOf(mm[1].toLowerCase()),
      parseInt(mm[2]),
    );
    return d.toISOString().slice(0, 10);
  }

  const slash = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (slash) {
    let year = slash[3] ? parseInt(slash[3]) : new Date().getFullYear();
    if (year < 100) year += 2000;
    return new Date(year, parseInt(slash[1]) - 1, parseInt(slash[2])).toISOString().slice(0, 10);
  }

  return today;
}

// Extract italic preamble lines (*...*) as workout notes
function extractNotes(text: string): string | undefined {
  const notes: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || /^#{1,4}\s/.test(trimmed) || /^\s{2,}/.test(line)) continue;
    const m = trimmed.match(/^\*([^*]+)\*$/);
    if (m) notes.push(m[1].trim());
  }
  return notes.length > 0 ? notes.join(" ") : undefined;
}

// ─── Hierarchical parser (formats 1–3) ───────────────────────────────────────
//
// Lookahead/pending strategy:
//   Every non-indented line becomes a "pending" exercise-name candidate.
//   It is confirmed as an exercise only when an indented set/prop line follows.
//   Section headers, dates, prose, and notes get silently replaced by the next
//   non-indented line and are never confirmed.

function parseHierarchical(text: string): ParsedExercise[] {
  const lines = text.split(/\r?\n/);
  const exercises: ParsedExercise[] = [];
  let current: ParsedExercise | null = null;
  let pending: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const isIndented = /^\s{2,}/.test(line);

    if (!isIndented) {
      if (/^#{2,}\s/.test(trimmed)) continue; // skip markdown headings

      const candidate = trimmed
        .replace(/^[*-]\s+/, "")
        .replace(/^\*{1,3}/, "")
        .replace(/\*{1,3}$/, "")
        .replace(/^[#_`>]+/, "")
        .trim();

      if (candidate) pending = candidate;
      continue;
    }

    const content = trimmed.replace(/^[*-]\s+/, "");
    const isSetLine = /^Set\s+\d+\s*:/i.test(content);
    const isProp = /^[A-Za-z][A-Za-z ]*\s*:\s*\S/.test(content);
    if (!isSetLine && !isProp) continue;

    // Promote pending candidate to current exercise
    if (pending !== null) {
      if (current && current.sets.length > 0) exercises.push(current);
      current = { name: pending, sets: [] };
      pending = null;
    }
    if (current === null) continue;

    const sets = current.sets;

    if (isSetLine) {
      const rest = content.replace(/^Set\s+\d+\s*:\s*/i, "").trim();

      const bwMatch = rest.match(/bodyweight\s*[×x*]\s*(\d+)\s*reps?/i);
      if (bwMatch) { sets.push({ reps: parseInt(bwMatch[1]) }); continue; }

      const wtMatch = rest.match(/(\d+(?:\.\d+)?)\s*(?:kg|lbs?|lb)?\s*[×x*]\s*(\d+)\s*reps?/i);
      if (wtMatch) { sets.push({ weight: parseFloat(wtMatch[1]), reps: parseInt(wtMatch[2]) }); continue; }

      const repsOnly = rest.match(/(\d+)\s*reps?/i);
      if (repsOnly) sets.push({ reps: parseInt(repsOnly[1]) });
      continue;
    }

    // Cardio key:value — accumulate into one "cardio set"
    const propMatch = content.match(/^([A-Za-z][A-Za-z ]*?)\s*:\s*(.+)$/);
    if (!propMatch) continue;

    const key = propMatch[1].trim().toLowerCase();
    const val = propMatch[2].trim();

    const lastSet = sets.at(-1);
    let cardioSet: ParsedSet;
    if (!lastSet || lastSet.reps != null || lastSet.weight != null) {
      cardioSet = {}; sets.push(cardioSet);
    } else {
      cardioSet = lastSet;
    }

    if (key === "duration") {
      const dm = val.match(/(\d+(?:\.\d+)?)/);
      if (dm) {
        let mins = parseFloat(dm[1]);
        if (/hr|hour/i.test(val)) mins *= 60;
        cardioSet.duration = Math.round(mins);
      }
    } else {
      const note = `${propMatch[1]}: ${val}`;
      cardioSet.notes = cardioSet.notes ? `${cardioSet.notes}, ${note}` : note;
    }
  }

  if (current && current.sets.length > 0) exercises.push(current);
  return exercises;
}

// ─── Legacy inline parser (format 4) ─────────────────────────────────────────

const SET_PATTERNS = [
  /(\d+)\s*sets?\s*[x×*]\s*(\d+)\s*reps?\s*(?:@|at|of|with|with weight|using)\s*(\d+(?:\.\d+)?)\s*(?:kg|lbs?|lb|pounds?)?/gi,
  /(\d+)\s*[x×*]\s*(\d+)\s*(?:@|at)\s*(\d+(?:\.\d+)?)\s*(?:kg|lbs?|lb|pounds?)?/gi,
  /(\d+)\s*sets?\s*[,;]\s*(\d+)\s*reps?\s*[,;]\s*(\d+(?:\.\d+)?)\s*(?:kg|lbs?|lb|pounds?)?/gi,
  /(\d+)\s*sets?\s*of\s*(\d+)\s*(?:@|at|with)\s*(\d+(?:\.\d+)?)\s*(?:kg|lbs?|lb|pounds?)?/gi,
];
const BODYWEIGHT_PATTERNS = [
  /(\d+)\s*sets?\s*[x×*]\s*(\d+)\s*reps?(?!\s*@)/gi,
  /(\d+)\s*[x×*]\s*(\d+)(?!\s*@|\s*at|\d)/gi,
];

function parseInlineLine(line: string): ParsedExercise | null {
  const cleaned = line.replace(/^[-*•·▪▫◦‣⁃▸▹►▻▷▶︎*\s#>]+/, "").trim();
  if (!cleaned) return null;

  for (const pattern of SET_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(cleaned);
    if (match) {
      const sets = parseInt(match[1], 10), reps = parseInt(match[2], 10), weight = parseFloat(match[3]);
      if (sets > 0 && sets < 20 && reps > 0 && reps < 100) {
        const name = cleaned.slice(0, match.index).trim().replace(/[:\-–—]+$/, "").trim();
        if (name.length > 0 && name.length < 80)
          return { name, sets: Array.from({ length: sets }, () => ({ reps, weight })) };
      }
    }
  }
  for (const pattern of BODYWEIGHT_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(cleaned);
    if (match) {
      const sets = parseInt(match[1], 10), reps = parseInt(match[2], 10);
      if (sets > 0 && sets < 20 && reps > 0 && reps < 100) {
        const name = cleaned.slice(0, match.index).trim().replace(/[:\-–—]+$/, "").trim();
        if (name.length > 0 && name.length < 80)
          return { name, sets: Array.from({ length: sets }, () => ({ reps })) };
      }
    }
  }
  return null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function parseGeminiText(text: string): ParsedWorkout {
  const hierarchical = parseHierarchical(text);
  const exercises = hierarchical.length > 0
    ? hierarchical
    : text.split(/\r?\n/).map(parseInlineLine).filter((e): e is ParsedExercise => e !== null);

  return {
    name: detectWorkoutName(text),
    dayType: detectDayType(text, exercises),
    date: detectDate(text),
    notes: extractNotes(text),
    exercises,
  };
}

// ─── Gemini prompt template ───────────────────────────────────────────────────

export const GEMINI_FORMAT_PROMPT =
`Format my workout log using this exact plain-text structure. No markdown symbols (no *, #, **).

[Month Day, Year] — [Workout Name, e.g. "Push Day" or "Upper/Lower"]
[One sentence about how the session felt, e.g. "Felt strong today."]

[Section name, e.g. Strength Training]
[Exercise Name]
    Set 1: [Bodyweight OR weight in kg] × [reps] reps
    Set 2: ...

[For cardio exercises:]
[Exercise Name]
    [Property]: [value]
    Duration: [N] min

Here is my workout log:`;
