import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  BookOpen, 
  Layers, 
  Plus, 
  Trash2, 
  Download, 
  Settings, 
  Loader2, 
  RefreshCw,
  AlertCircle,
  FolderOpen,
  Tag,
  Check,
  X,
  Zap,
  Upload,
  Save,
  Cpu,
  Info,
  GitGraph,   
  List,       
  Filter,
  ZoomIn,
  ZoomOut,
  Maximize,
  BarChart2,
  Image as ImageIcon,
  Search,
  Move,
  FastForward,
  Grid3X3,
  Globe,
  MessageSquare,
  Send,
  ToggleLeft,
  ToggleRight,
  Wrench,
  Play,
  ArrowRight,
  FileText,
  Lock,
  Unlock,
  ArrowLeftRight,
  FileSearch,
  Edit2,
  GripVertical
} from 'lucide-react';

// --- Constants & Models ---
const MODELS = [
  { 
    id: "gemini-2.5-flash", 
    name: "Gemini 2.5 Flash (Best Quality)", 
    desc: "Highest reasoning capability. Strict daily limit (~20/day on free tier). Use this for the final Synthesis step where quality counts.",
    type: "gemini"
  },
  { 
    id: "gemma-3-27b-it", 
    name: "Gemma 3 27b (High Quota)", 
    desc: "Generous daily limits on free tier. Best for the initial bulk Sorting/Extraction of papers.",
    type: "gemma"
  }
];

// --- Types ---
interface Paper {
  id: string;
  title: string;
  abstractSnippet: string;
  category: string; 
  theme: string;    
  driver: string;   
  driverGroup: string; 
  response: string; 
  responseGroup: string; 
  effectDirection: 'Positive' | 'Negative' | 'Neutral' | 'Complex' | 'Methodological' | 'Unclear'; 
  keyFinding: string; 
  impactKeywords: string; 
  location: string;
  species: string;
  batchId: number;
  authors: string;
  year: string;
  journal: string;
  shortCitation: string;
  modelUsed?: string; 
}

interface SynthesisResult {
  summary: string | string[]; 
  contradictionAnalysis: string;
  modelUsed?: string;
}

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  timestamp: number;
}

type Taxonomy = Record<string, string[]>;

interface AnalysisResult {
  papers: {
    title: string;
    authors: string;
    year: string;
    journal: string;
    abstract_summary: string;
    main_category: string;
    sub_theme: string;
    driver_variable: string;
    response_variable: string;
    effect_direction: string;
    study_location: string;
    study_species: string;
    key_finding: string;
    impact_keywords: string;
    short_citation: string;
  }[];
}

interface AuditFix {
  original_category: string;
  original_theme: string;
  new_category: string;
  new_theme: string;
  reason: string;
}

interface AuditResult {
  fixes: AuditFix[];
}

interface ConsolidationSuggestion {
  id: string; 
  main_category: string;
  isVerified?: boolean; // New flag for verification status
  suggested_merge?: {
    themes_to_combine: string[];
    new_theme_name: string;
    reason: string;
  } | null;
  suggested_rename?: {
    current_name: string;
    new_name: string;
    reason: string;
  } | null;
  suggested_move?: {
    theme: string;
    current_category: string;
    target_category: string;
    reason: string;
  } | null;
  suggested_category_merge?: {
    source_category: string;
    target_category: string;
    reason: string;
  } | null;
}

interface ConsolidationResult {
  status: "suggestions_made" | "no_changes";
  suggestions: {
    main_category: string;
    suggested_merge: {
      themes_to_combine: string[];
      new_theme_name: string;
      reason: string;
    } | null;
    suggested_rename?: {
      current_name: string;
      new_name: string;
      reason: string;
    } | null;
    suggested_move?: {
      theme: string;
      current_category: string;
      target_category: string;
      reason: string;
    } | null;
    suggested_category_merge?: {
      source_category: string;
      target_category: string;
      reason: string;
    } | null;
  }[];
}

interface OptimizationResult {
  moves: {
    paper_id: string;
    new_category?: string; 
    new_theme?: string;    
    new_driver?: string;   
    new_driver_group?: string; 
    new_response?: string;
    new_response_group?: string;
    new_location?: string; 
    new_species?: string;  
  }[];
}

interface SynthesisModalProps { 
  isOpen: boolean; 
  onClose: () => void; 
  themeKey: string; 
  isSynthesizing: boolean; 
  retryStatus: string; 
  result: SynthesisResult | null; 
}

interface DragItem {
  type: 'cat' | 'theme';
  name: string;
  parentCat?: string; // Only for themes
}

// --- Helper Functions ---

function getSuggestionSignature(s: ConsolidationSuggestion): string {
  if (s.suggested_merge) {
    return `MERGE: In '${s.main_category}', combine [${s.suggested_merge.themes_to_combine.sort().join(', ')}] into '${s.suggested_merge.new_theme_name}'`;
  }
  if (s.suggested_rename) {
    return `RENAME: '${s.suggested_rename.current_name}' to '${s.suggested_rename.new_name}'`;
  }
  if (s.suggested_move) {
    return `MOVE: '${s.suggested_move.theme}' from '${s.suggested_move.current_category}' to '${s.suggested_move.target_category}'`;
  }
  if (s.suggested_category_merge) {
    return `CAT_MERGE: '${s.suggested_category_merge.source_category}' into '${s.suggested_category_merge.target_category}'`;
  }
  return "";
}

function cleanRawText(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'") 
    .replace(/[\u201C\u201D]/g, '"') 
    .replace(/[\u2013\u2014]/g, "-") 
    .replace(/\uFFFD/g, "") 
    .replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, " ")
    .replace(/â€™/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    .replace(/â€“/g, "-")
    .replace(/â€”/g, "-")
    .replace(/Ã©/g, "é")
    .replace(/Ã/g, "à")
    .replace(/Ã±/g, "ñ")
    .replace(/Ã¼/g, "ü")
    .replace(/[ÃÂƒ]/g, " ") 
    .replace(/\r\n/g, "\n");
}

function createBatches(text: string, maxChunkSize: number): string[] {
  const batches: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxChunkSize) {
      batches.push(remaining);
      break;
    }
    
    // 1. Try to split at Double Newline (Paragraph break) to avoid cutting Citation-Abstract pairs
    let cutIndex = remaining.lastIndexOf('\n\n', maxChunkSize);
    
    // 2. If no double newline, try standard newline
    if (cutIndex === -1) {
        cutIndex = remaining.lastIndexOf('\n', maxChunkSize);
    }
    
    // 3. Last resort: Hard cut (very rare)
    if (cutIndex === -1) cutIndex = maxChunkSize;

    batches.push(remaining.slice(0, cutIndex));
    remaining = remaining.slice(cutIndex).trim();
  }
  return batches;
}

function safeJsonParse<T>(jsonString: string): { data: T, wasTruncated: boolean } {
  let clean = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
  let wasTruncated = false;
  
  try {
    return { data: JSON.parse(clean), wasTruncated: false };
  } catch (e) {
    console.warn("JSON Parse failed, attempting repair...", e);
    clean = clean.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
    if (!clean.endsWith('}')) {
        wasTruncated = true;
        const openBraces = (clean.match(/{/g) || []).length;
        const closeBraces = (clean.match(/}/g) || []).length;
        const openSquares = (clean.match(/\[/g) || []).length;
        const closeSquares = (clean.match(/\]/g) || []).length;
        if (openBraces > closeBraces) clean += '}'.repeat(openBraces - closeBraces);
        if (openSquares > closeSquares) clean += ']'.repeat(openSquares - closeSquares);
        if (clean.startsWith('{') && !clean.endsWith('}')) clean += '}';
    }
    try {
      return { data: JSON.parse(clean), wasTruncated };
    } catch (e2) {
      console.error("Fatal JSON Parse Error. Raw string:", jsonString);
      throw new Error("AI returned malformed data (likely truncated).");
    }
  }
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const trackEvent = (action: string, params = {}) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', action, params);
  }
};

class QuotaExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuotaExceededError";
  }
}

class RetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RetryableError";
  }
}

class ApiKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiKeyError";
  }
}

// --- API Logic Functions ---

async function fetchAI(
  modelId: string, 
  apiKey: string, 
  systemPrompt: string, 
  userPrompt: string,
  responseSchema: any = null // keeping signature compatibility
): Promise<any> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
  const isGemma = modelId.toLowerCase().includes('gemma');

  let body: any = {
    contents: [],
    generationConfig: {
      responseMimeType: (responseSchema && !isGemma) ? "application/json" : "text/plain"
    }
  };

  if (isGemma) {
    const combinedPrompt = `*** SYSTEM INSTRUCTIONS ***\n${systemPrompt}\n\n*** USER TASK ***\n${userPrompt}`;
    body.contents.push({ role: 'user', parts: [{ text: combinedPrompt }] });
  } else {
    body.systemInstruction = { parts: [{ text: systemPrompt }] };
    body.contents.push({ parts: [{ text: userPrompt }] });
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const status = response.status;
    let errMessage = `API Error: ${status}`;
    try {
      const errData = await response.json();
      errMessage = errData.error?.message || errMessage;
    } catch {}

    if (status === 400 || status === 403) throw new ApiKeyError("Invalid API Key or Permission Denied.");
    if (status === 503) throw new RetryableError("Model Overloaded (503)");
    
    if (status === 429) {
      const msg = errMessage.toLowerCase();
      if (msg.includes('quota') || msg.includes('exhausted')) {
         throw new QuotaExceededError("Daily Quota Exceeded."); 
      } else {
         throw new RetryableError("Rate Limit Hit (RPM)");
      }
    }
    throw new Error(errMessage);
  }

  const data = await response.json();
  return data;
}

// NEW: Helper to verify move suggestion with more papers
async function verifyMoveWithGemini(
    theme: string,
    currentCat: string,
    targetCat: string,
    titles: string[],
    key: string,
    modelId: string,
    onStatusUpdate: (msg: string) => void
): Promise<{ isValid: boolean, reason: string }> {
    const systemPrompt = `
      You are a strict data auditor.
      TASK: Verify if the sub-theme "${theme}" (currently in "${currentCat}") truly belongs in "${targetCat}".
      
      EVIDENCE: Here are paper titles from this sub-theme:
      ${titles.map(t => `- ${t}`).join('\n')}
      
      INSTRUCTIONS:
      - If the papers generally fit the definition of "${targetCat}" better than "${currentCat}", return isValid: true.
      - If the papers are mixed or actually fit "${currentCat}" fine, return isValid: false.
      - Provide a concise reason citing specific patterns in the titles.
      
      OUTPUT JSON: { "isValid": boolean, "reason": "..." }
    `;
    
    onStatusUpdate("Verifying with expanded paper list...");
    const data = await fetchAI(modelId, key, systemPrompt, "Verify this move.", true);
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = safeJsonParse<{ isValid: boolean, reason: string }>(textResponse);
    return parsed.data;
}

// NEW: Helper to generate reverse suggestion
async function reverseSuggestionWithGemini(
    sourceCat: string,
    targetCat: string,
    key: string,
    modelId: string,
    onStatusUpdate: (msg: string) => void
): Promise<{ reason: string }> {
    const systemPrompt = `
      You are an expert taxonomist.
      CONTEXT: It was suggested to merge "${sourceCat}" INTO "${targetCat}".
      TASK: Generate a rationale for the INVERSE: merging "${targetCat}" INTO "${sourceCat}" instead.
      
      Assume the user wants to flip the hierarchy/direction. Provide a logical reason why "${targetCat}" might be better placed as a subsection of "${sourceCat}", or why "${sourceCat}" is the better parent category.
      
      OUTPUT JSON: { "reason": "..." }
    `;

    onStatusUpdate("Analyzing reverse logic...");
    const data = await fetchAI(modelId, key, systemPrompt, "Generate inverse rationale.", true);
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = safeJsonParse<{ reason: string }>(textResponse);
    return parsed.data;
}

async function analyzeWithGemini(
  textBatch: string,
  currentTaxonomy: Taxonomy,
  key: string,
  topic: string,
  modelId: string,
  enableSpecies: boolean,
  onStatusUpdate: (msg: string) => void
): Promise<{ result: AnalysisResult, truncated: boolean }> {
  const effectiveTopic = topic.trim() || "General Academic Research";
  const taxonomyHint = JSON.stringify(currentTaxonomy);

  const systemPrompt = `
    You are an expert systematic review data extractor. Process the batch of raw text (Title, Abstract, Authors, Year, Journal) for a review on "${effectiveTopic}".

    INSTRUCTIONS:
    1. Extract metadata (title, authors, year, journal).
       - **CRITICAL: SEPARATE CITATION FROM TITLE.**
       - **NUMBERED LISTS:** If text starts with "1.", "25.", etc., ignore the number.
       - **VERBOSE AUTHORS:** Handle long author lists (e.g. "Smith and Jones and Doe"). The Title usually starts *after* the year (e.g. "(2022). Title...").
       - **CLEAN TITLES:** If a title appears with a translation (e.g. "English Title [Spanish Title]" or "Title [Translation]"), **ONLY extract the English title**. Discard the translated version and any brackets.
    2. Condense Abstract into 'abstract_summary'.
    3. Determine 'main_category' (high-level domain) and 'sub_theme' (specific research topic).
       - **Specific Domains:** Use specific, descriptive domains like "Biogeography", "Ecophysiology", "Community Dynamics", "Urban Ecology".
       - **Avoid Broad Fields:** Do NOT use generic terms like "Ecology", "Biology", or "Environmental Science" as Main Categories. They are too broad to be useful.
       - **Atomic Sub-Themes:** Avoid compound names like 'Temperature and Predation' unless the study explicitly tests the *interaction* between them. If a study is just about Temperature, put it in 'Temperature'.
    4. **EXTRACT VARIABLES (Standardize Terms):**
       - 'driver_variable': The primary Independent Variable/Stressor. Use standard terms (e.g., use "Precipitation" NOT "Rainfall"). Keep it simple (1-2 words).
       - 'response_variable': The primary Dependent Variable/Outcome. Keep it simple (1-2 words).
       - 'effect_direction': 'Positive' (Driver increases Response), 'Negative' (Driver decreases Response), 'Neutral' (No significant effect), 'Complex' (Context dependent), or 'Methodological' (Study validates a method/model, no biological effect direction).
       - 'study_location': Country or Region. Normalize to English names (e.g. "USA" -> "United States").
       ${enableSpecies ? "- 'study_species': Species name or group. DO NOT include counts/numbers (e.g., do NOT say '18 bird species', say 'Birds (General)' or 'Aves'). Use common name if available." : ""}
    5. Generate 'key_finding', 'impact_keywords', and 'short_citation'.
    
    **CRITICAL RULE FOR MULTIPLE FINDINGS:**
    - If a single paper contains **multiple distinct experiments** or investigates **distinct Driver-Response pairs** (e.g. Temperature -> Growth AND pH -> Survival), create **SEPARATE** entries in the 'papers' array for each pair.
    - Each entry should share the same title/authors/citation but have specific drivers, responses, and key findings for that pair.
    - Do NOT create duplicate entries if they are synonyms; only for distinct findings.

    EXISTING TAXONOMY HINT: ${taxonomyHint}

    OUTPUT (Strict JSON):
    {
      "papers": [
        { 
          "title": "...", "authors": "...", "year": "...", "journal": "...", "abstract_summary": "...", 
          "main_category": "...", "sub_theme": "...", 
          "driver_variable": "...", "response_variable": "...", "effect_direction": "...",
          "study_location": "...", ${enableSpecies ? '"study_species": "...",' : ''}
          "key_finding": "...", "impact_keywords": "...", "short_citation": "..." 
        }
      ]
    }
  `;

  let retries = 0;
  const maxRetries = 6; 

  while (true) {
    try {
      onStatusUpdate(`Extracting batch... (Attempt ${retries + 1}/${maxRetries})`);
      const data = await fetchAI(modelId, key, systemPrompt, `Process this raw data batch:\n${textBatch}`, true);
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textResponse) throw new Error("No data returned from AI.");

      const parsed = safeJsonParse<AnalysisResult>(textResponse);
      return { result: parsed.data, truncated: parsed.wasTruncated };

    } catch (error: any) {
      const isRetryable = error.name === "RetryableError" || error.message.includes("Overloaded");
      const isFatal = error.name === "QuotaExceededError" || error.name === "ApiKeyError";
      
      // If we failed JSON parsing, we might want to rethrow to trigger manual fix
      if (error.message.includes("malformed data") || error.message.includes("JSON")) {
          throw error; 
      }
      
      if (isRetryable || (!isFatal && retries < maxRetries)) {
        if (retries < maxRetries) {
          retries++;
          const delayTime = Math.pow(2, retries) * 1000 + (Math.random() * 1000); 
          onStatusUpdate(`⚠️ AI Busy/Overloaded. Retrying in ${Math.round(delayTime/1000)}s...`);
          await wait(delayTime);
          continue;
        }
      }
      throw error; 
    }
  }
}

// RESTORED: Superior Audit Function for Automatic Finalization
async function auditTaxonomyWithGemini(
  taxonomyList: string[],
  key: string,
  topic: string,
  modelId: string, // Dynamic model ID
  onStatusUpdate: (msg: string) => void
): Promise<AuditResult> {
  const effectiveTopic = topic.trim() || "General Academic Research";

  const systemPrompt = `
    You are an expert taxonomy auditor for a systematic review on "${effectiveTopic}".
    Your task is to review the current list of "Main Category > Sub-Theme" pairs and identify structural inconsistencies or redundancies.

    SPECIFIC ISSUES TO DETECT AND FIX:
    1. **Duplicate Sub-Themes across Categories:** If the exact same sub-theme name (e.g., "Phenology") appears under two different Main Categories (e.g., "Behavior" and "Physiology"), you MUST resolve this ambiguity.
       - FIX: Rename one or both to be specific (e.g., "Behavioral Phenology", "Physiological Phenology") OR move them to the single most appropriate category.
    2. **Hierarchical Redundancy:** If a Main Category is clearly a subset of another Main Category (e.g., "Heat Stress" is a main category, but "Physiological Responses" also exists), merge the specific one into the broader one.
       - FIX: Demote the specific Main Category to a Sub-Theme under the broader Main Category.
    3. **Merge Synonyms:** If "Demography" and "Population Dynamics" both exist, merge them into the more standard term.

    INPUT FORMAT:
    A list of strings: "Main Category ||| Sub-Theme"

    OUTPUT INSTRUCTIONS:
    - Return a JSON object with a "fixes" array.
    - Each fix object must contain: "original_category", "original_theme", "new_category", "new_theme", "reason".
    - If NO fixes are needed, return an empty "fixes" array.

    CURRENT TAXONOMY LIST:
    ${JSON.stringify(taxonomyList)}

    OUTPUT SCHEMA (STRICT JSON):
    {
      "fixes": [
        {
          "original_category": "...",
          "original_theme": "...",
          "new_category": "...",
          "new_theme": "...",
          "reason": "..."
        }
      ]
    }
  `;

  let retries = 0;
  const maxRetries = 3;

  while (true) {
    try {
      onStatusUpdate(`Auditing Structure...`);
      // Empty user prompt because the list is in the system prompt for better context adherence in Gemma
      const data = await fetchAI(modelId, key, systemPrompt, "Analyze and fix the taxonomy list above.", true);
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = safeJsonParse<AuditResult>(textResponse);
      return parsed.data;
    } catch (error: any) {
      if ((error.name === "RetryableError" || !error.name.includes("Quota")) && retries < maxRetries) {
        retries++; await wait(3000); continue;
      }
      return { fixes: [] };
    }
  }
}

// NEW: Advanced Consolidation Logic for the Button
async function consolidateThemesWithGemini(
  taxonomy: Taxonomy, 
  paperSamples: Record<string, string[]>,
  key: string,
  topic: string,
  modelId: string,
  rejectedSuggestions: string[],
  lockedItems: string[],
  onStatusUpdate: (msg: string) => void
): Promise<ConsolidationResult> {
  const effectiveTopic = topic.trim() || "General Academic Research";

  const systemPrompt = `
    You are an expert data synthesis analyst reviewing the Table of Contents for a Systematic Review Manuscript on "${effectiveTopic}".
    Your task is to analyze the existing structure: Main Sections (Main Categories) and Sub-Sections (Sub-Themes).
    
    INPUT CONTEXT:
    - You are provided with a 'Rich Taxonomy' where each Main Category contains a list of Sub-Themes, and each Sub-Theme has a list of 'sample_titles'.
    - **USE THESE TITLES TO VERIFY CONTEXT.** If a theme name seems misplaced (e.g. "Population Dynamics" in "Community Ecology"), CHECK THE TITLES. 
      - If titles describe community-level interactions, DO NOT move it.
      - If titles describe single-species dynamics, DO move it.
      - **CITATION REQUIRED:** In your 'reason' field, you MUST quote a specific word or phrase from one of the sample titles that justifies your decision.

    LOCKED ITEMS (DO NOT TOUCH):
    - The following sections are LOCKED by the user. Do NOT suggest renaming, moving, or merging them (unless moving something INTO them):
    ${lockedItems.length > 0 ? lockedItems.join(', ') : "None"}

    TASKS (In Order of Priority):
    1. **Merge Sub-Sections (HIGHEST PRIORITY):** Identify any Sub-Sections within a Main Section that are conceptually overlapping and should be merged into a single, cohesive Sub-Section.
    2. **Move Sub-Sections (CRITICAL):** Check if any Sub-Sections are misplaced. Suggest moving them to the correct Main Section.
    3. **Merge Main Sections:** Identify synonymous or highly overlapping Main Sections (e.g., 'Physiology' and 'Physiological Responses') and merge them.
    4. **Hierarchy Check:** Identify Main Sections that are actually subsets of other Main Sections (e.g. "Heat Stress" should be inside "Abiotic Stress") and suggest a move.
    5. **Resolve Ambiguous Names:** If a Sub-Section is named "X and Y" (e.g. "Temperature and Predation"), check the 'sample_titles'. If the papers are only about "X", suggest renaming it to "X".
    6. **Rename Main Sections (CRITICAL ONLY):** ONLY suggest a rename if the current name is 'General', 'Biology', 'Other', or clearly too broad/vague.
    7. **No Self-Merges:** Do NOT suggest merging a sub-section into itself. A merge requires at least two distinct sub-sections.

    RICH TAXONOMY (Structure + Content Samples): 
    ${JSON.stringify({ taxonomy, paperSamples }, null, 2)}

    PREVIOUSLY REJECTED SUGGESTIONS (DO NOT SUGGEST THESE AGAIN):
    ${rejectedSuggestions.length > 0 ? rejectedSuggestions.join('\n') : "None"}

    OUTPUT SCHEMA (STRICT JSON):
    {
      "status": "suggestions_made" | "no_changes", 
      "suggestions": [
        {
          "main_category": "Current Main Section Name",
          "suggested_merge": {
            "themes_to_combine": ["Sub-Section A", "Sub-Section B"],
            "new_theme_name": "Combined Sub-Section Header",
            "reason": "Explanation citing specific title words."
          } | null,
          "suggested_move": {
            "theme": "Sub-Section Name",
            "current_category": "Current Main Section Name",
            "target_category": "Target Main Section Name",
            "reason": "Why it belongs there (cite title words)."
          } | null,
          "suggested_category_merge": {
            "source_category": "Main Section to Remove",
            "target_category": "Main Section to Merge Into",
            "reason": "Why these major sections are duplicates."
          } | null,
          "suggested_rename": {
             "current_name": "Current Main Section Name",
             "new_name": "Better Main Section Name",
             "reason": "Reason for rename."
          } | null
        }
      ]
    }
  `;

  let retries = 0;
  const maxRetries = 3;

  while (true) {
    try {
      onStatusUpdate(`Analyzing manuscript structure...`);
      const data = await fetchAI(modelId, key, systemPrompt, "Review the provided structure for consolidation, moves, and critical improvements.", true);
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = safeJsonParse<ConsolidationResult>(textResponse);
      return parsed.data;
    } catch (error: any) {
      if ((error.name === "RetryableError" || !error.name.includes("Quota")) && retries < maxRetries) {
        retries++; await wait(3000); continue;
      }
      // Return "no changes" on error to avoid crashing
      return { status: "no_changes", suggestions: [] };
    }
  }
}

async function optimizeStructureWithGemini(
  papers: Paper[],
  key: string,
  topic: string,
  modelId: string,
  _enableSpecies: boolean, // unused variable prefix with _
  onStatusUpdate: (msg: string) => void
): Promise<OptimizationResult> {
  const effectiveTopic = topic.trim() || "General Academic Research";
  const paperSummaries = papers.map(p => ({
    id: p.id,
    title: p.title,
    current_cat: p.category,
    current_theme: p.theme,
    driver: p.driver,
    response: p.response,
    location: p.location,
    species: p.species
  }));

  const systemPrompt = `
    You are an expert taxonomy architect for a systematic review on "${effectiveTopic}".
    TASK: Reorganize categories and Normalize metadata (Synonyms & Groups).

    RULES:
    1. **Manuscript Structure:** Organize 'Main Categories' as Major Sections, 'Sub-Themes' as Subsections. Prioritize OUTCOME domains.
    2. **Generalize Sub-Themes:** Merge sub-themes describing the same outcome but different drivers (e.g. "Fire-driven Predation" -> "Predation Rates").
    3. **NORMALIZE METADATA (Apply Universally):**
       - **Drivers:** Scan for ALL synonyms and standardize them to a single term. (e.g., "Rainfall"/"Precipitation" -> "Precipitation"; "Temp"/"Temperature" -> "Temperature"). Use this standardized term for 'new_driver'.
       - **Responses:** Scan for ALL synonyms and standardize them to a single term. Use this standardized term for 'new_response'.
       - **Locations:** Consolidate synonyms (e.g. "USA"/"United States" -> "United States"). Use this for 'new_location'.
       - **Species:** Standardize names (e.g. "5 ducks" -> "Anatidae (Ducks)"). Use this for 'new_species'.
    4. **GROUP METADATA (Hierarchical):**
       - Assign 'new_driver_group' (e.g. "Precipitation" -> "Climate", "Predation" -> "Biotic").
       - Assign 'new_response_group' (e.g. "Hatching Success" -> "Demography", "Water Use Efficiency" -> "Physiology").
    5. **Titles:** If any title contains a bracketed translation [like this], remove the bracketed part and keep the English.
    
    OUTPUT SCHEMA (Strict JSON):
    { 
      "moves": [ 
        { 
          "paper_id": "...", 
          "new_category": "...", 
          "new_theme": "...", 
          "new_driver": "...", 
          "new_driver_group": "...", 
          "new_response": "...", 
          "new_response_group": "...", 
          "new_location": "...", 
          "new_species": "..." 
        } 
      ] 
    }
  `;

  const userPrompt = `PAPER LIST:\n${JSON.stringify(paperSummaries)}`;
  let retries = 0; const maxRetries = 3;

  while (true) {
    try {
      onStatusUpdate(`Optimization: Analyzing ${papers.length} papers for structure & metadata...`);
      const data = await fetchAI(modelId, key, systemPrompt, userPrompt, true);
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      const parsed = safeJsonParse<OptimizationResult>(textResponse);
      return parsed.data; 
    } catch (error: any) {
      if ((error.name === "RetryableError" || !error.name.includes("Quota")) && retries < maxRetries) {
        retries++; await wait(3000 * retries); continue;
      }
      return { moves: [] }; 
    }
  }
}

const cleanSynthesisResponse = (raw: any, modelId: string): SynthesisResult => {
  let summary = raw.summary || "No summary generated.";
  if (typeof summary === 'string' && (summary.includes('<ul>') || summary.includes('<li>'))) {
    let cleanStr = summary.replace(/<\/?ul>/g, '');
    let items = cleanStr.split('</li>');
    summary = items.map(s => s.replace(/<li>/g, '').trim()).filter(s => s.length > 0);
  }
  return { summary: summary, contradictionAnalysis: typeof raw.contradictionAnalysis === 'string' ? raw.contradictionAnalysis : "No analysis generated.", modelUsed: modelId };
};

async function synthesizeSectionWithGemini(sectionTheme: string, papersData: any[], key: string, topic: string, modelId: string, onStatusUpdate: (msg: string) => void): Promise<SynthesisResult> {
  const effectiveTopic = topic.trim() || "Academic Research";
  const synthesisDataString = papersData.map(p => `Key Finding: "${p.keyFinding}". Keywords: [${p.impactKeywords}]. Citation: ${p.shortCitation}`).join('\n---\n');
  const systemPrompt = `
    You are an expert academic synthesizer performing a Systematic Review.
    TOPIC: "${effectiveTopic}"
    SECTION: "${sectionTheme}"
    
    DATA: A list of key findings from individual papers is provided below.
    
    TASK 1: COMPREHENSIVE SYNTHESIS (summary)
    - **Goal:** Representative Coverage. Generate as many bullet points as necessary to cover **every distinct finding** in the dataset.
    - **NO LIMITS:** There is NO maximum number of bullet points. Do not limit yourself to the "top 3-5" findings. If there are 20 distinct findings, produce 20 bullet points.
    - **Citation Clustering:** If multiple papers support the same finding, combine them into a single bullet point and list **ALL** of them. 
      - Format: "Finding text (Smith 2020; Jones 2021; Doe 2022)."
      - **Relevance Filter:** While comprehensive coverage is desired, you are NOT required to cite every single paper if some lack meaningful or relevant findings. Prioritize quality and distinctness over 100% inclusion.
    
    TASK 2: EXHAUSTIVE CONSISTENCY CHECK (contradictionAnalysis)
    - Perform a rigorous check for disagreements.
    - Report **EVERY** distinct instance of disagreement or divergence found in the dataset. 
    - Do not just write a general note; specify which papers conflict and how (e.g., "Paper A and B found positive effects, whereas Paper C found negative effects").
    - If absolutely no contradictions exist, state "No clear contradictions found; findings are generally consistent."
    
    OUTPUT JSON FORMAT (Strict):
    { 
      "summary": ["Bullet 1...", "Bullet 2..."], 
      "contradictionAnalysis": "Detailed paragraph(s) analyzing all conflicts..." 
    }
  `;
  
  let retries = 0; const maxRetries = 5;
  while (true) {
    try {
      const data = await fetchAI(modelId, key, systemPrompt, `DATA:\n${synthesisDataString}`, true);
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const raw = safeJsonParse<any>(textResponse);
      return cleanSynthesisResponse(raw.data, modelId);
    } catch (error: any) {
      if ((error.name === "RetryableError" || !error.name.includes("Quota")) && retries < maxRetries) { retries++; await wait(Math.pow(2, retries) * 1000); onStatusUpdate("Busy..."); continue; }
      throw error;
    }
  }
}

async function askPaperChat(query: string, papers: Paper[], key: string, modelId: string): Promise<string> {
  // Enhanced Keyword Extraction (excluding common stop words)
  const stopWords = new Set(['about', 'this', 'that', 'with', 'from', 'what', 'where', 'when', 'which', 'who', 'how', 'does', 'need', 'want', 'know', 'find', 'show', 'tell', 'papers', 'study', 'studies']);
  const keywords = query.toLowerCase()
    .replace(/[.,?/#!$%^&*;:{}=\-_`~()]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
  
  // 1. Calculate Global Context
  const totalPapers = papers.length;
  const categories = Array.from(new Set(papers.map(p => p.category))).sort();
  const drivers: Record<string, number> = {};
  const responses: Record<string, number> = {};
  const locations: Record<string, number> = {};
  const species: Record<string, number> = {};
  
  papers.forEach(p => {
    drivers[p.driver] = (drivers[p.driver] || 0) + 1;
    responses[p.response] = (responses[p.response] || 0) + 1;
    locations[p.location] = (locations[p.location] || 0) + 1;
    species[p.species] = (species[p.species] || 0) + 1;
  });
  
  const topDrivers = Object.entries(drivers).sort((a,b)=>b[1]-a[1]).slice(0, 5).map(x => `${x[0]} (${x[1]})`).join(', ');
  const topResponses = Object.entries(responses).sort((a,b)=>b[1]-a[1]).slice(0, 5).map(x => `${x[0]} (${x[1]})`).join(', ');
  const topLocations = Object.entries(locations).sort((a,b)=>b[1]-a[1]).slice(0, 5).map(x => `${x[0]} (${x[1]})`).join(', ');
  const topSpecies = Object.entries(species).sort((a,b)=>b[1]-a[1]).slice(0, 5).map(x => `${x[0]} (${x[1]})`).join(', ');

  // 2. RAG Context (Relevance Search with improved keyword logic)
  const relevantPapers = papers.filter(p => {
      if (keywords.length === 0) return false;
      const text = (p.title + " " + p.keyFinding + " " + p.abstractSnippet + " " + p.species + " " + p.location).toLowerCase();
      // Require at least one non-stopword keyword match
      return keywords.some(k => text.includes(k));
  }).slice(0, 15);
  
  const context = relevantPapers.map(p => `- [${p.shortCitation}]: ${p.title}. Found: ${p.keyFinding}. (D: ${p.driver}, R: ${p.response}, Loc: ${p.location}, Sp: ${p.species})`).join('\n');

  const systemPrompt = `
    You are EcoSynthesisAI's Chat Assistant. You have access to a database of ${totalPapers} papers.
    
    DATA CONTEXT (Demographics & Topics):
    - Main Categories: ${categories.join(', ')}
    - Top Drivers: ${topDrivers}
    - Top Outcomes: ${topResponses}
    - Top Locations: ${topLocations}
    - Top Species/Taxa: ${topSpecies}

    CAPABILITIES & LIMITATIONS:
    1. SUMMARIZATION ONLY: You may summarize findings, list citations, and count papers (e.g. "How many papers mention temp?").
    2. NO STATISTICS: Do NOT perform statistical analyses (meta-analysis, regression, effect sizes, etc.). If asked, reply: "I'm sorry, I have been coded/instructed to only summarize information because this tool is a qualitative review assistant, not a quantitative meta-analysis tool."
    3. NO DEEP SYNTHESIS: If asked to compare conclusions in detail or synthesize contradictions (e.g. "Do these papers agree on X?"), reply: "For synthesis and contradiction analysis, please use the ✨ Sparkle buttons in the list view."
    4. CITATIONS: Always use [Author, Year] format. You may expand on these citations in more detail, such as titles or journals, if requested.
    5. VAGUE QUERIES: If the 'Relevant Papers Found' list is empty or doesn't seem to answer the user's specific question, politely suggest that their query might be too vague or that the database doesn't contain that specific information.
  `;
  
  const userPrompt = `Relevant Papers Found (based on keywords: ${keywords.join(', ')}):\n${context || "No specific matches found."}\n\nUser Question: ${query}`;
  
  try {
    const data = await fetchAI(modelId, key, systemPrompt, userPrompt, false);
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
  } catch (err: any) { return `Error: ${err.message}`; }
}

// --- SUB-COMPONENTS ---
const SynthesisModal: React.FC<SynthesisModalProps> = ({ isOpen, onClose, themeKey, isSynthesizing, retryStatus, result }) => {
  if (!isOpen) return null;
  const [category, theme] = themeKey.split('-');
  const analysisText = result?.contradictionAnalysis || "";
  const summaryContent = result?.summary || "No summary available.";
  const hasContradictions = analysisText.toLowerCase && !analysisText.toLowerCase().includes('no clear contradictions');
  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl transform transition-all duration-300 scale-100 opacity-100 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center shrink-0">
          <h3 className="text-xl font-bold text-blue-700 flex items-center gap-2"><Zap className='h-6 w-6 text-yellow-500' /> Synthesis & Contradiction Analysis</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"><X className='h-5 w-5' /></button>
        </div>
        <div className="p-6 overflow-y-auto">
          <p className='text-sm text-slate-600 mb-4'><span className='font-bold text-slate-700'>Section:</span> {category} {theme ? `/ ${theme}` : '(Main Category Summary)'}</p>
          {isSynthesizing ? (<div className="flex flex-col items-center justify-center h-40 bg-slate-50 rounded-lg p-4"><Loader2 className="h-8 w-8 text-blue-500 animate-spin" /><p className='mt-3 text-sm text-blue-600 font-medium'>Generating summary points...</p>{retryStatus && <p className="text-xs text-amber-600 mt-1">{retryStatus}</p>}</div>) : result && (<div className='space-y-6'><div className="bg-blue-50 p-4 rounded-lg border border-blue-200"><h4 className='font-bold text-lg text-blue-800 mb-2'>1. Summary Points & Citations</h4><div className='text-slate-800 leading-relaxed whitespace-pre-wrap'>{Array.isArray(summaryContent) ? (<ul className="list-disc pl-5 space-y-2">{summaryContent.map((line, idx) => (<li key={idx} className="pl-1">{typeof line === 'string' ? line : JSON.stringify(line)}</li>))}</ul>) : String(summaryContent)}</div>{result.modelUsed && (<div className="mt-4 pt-2 border-t border-blue-200 text-xs text-blue-400 flex items-center gap-1"><Cpu className="h-3 w-3" /> Generated with: {result.modelUsed}</div>)}</div><div className={`p-4 rounded-lg border ${!hasContradictions ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}><h4 className={`font-bold text-lg mb-2 flex items-center gap-2 ${!hasContradictions ? 'text-green-800' : 'text-red-800'}`}>{!hasContradictions ? <Check className='h-5 w-5' /> : <AlertCircle className='h-5 w-5' />} 2. Contradiction Analysis</h4><p className='text-slate-800 leading-relaxed'>{String(analysisText)}</p></div></div>)}</div>
      </div>
    </div>
  );
};

// NEW: Bulk Synthesis Modal (Pop-up before export)
interface BulkSynthesisModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: any[] | null;
  type: 'sub' | 'main';
}

const BulkSynthesisModal: React.FC<BulkSynthesisModalProps> = ({ isOpen, onClose, results, type }) => {
  if (!isOpen || !results) return null;

  const handleExport = () => {
    let htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${type === 'sub' ? 'Sub-Theme' : 'Main Category'} Synthesis</title><style>body{font-family:sans-serif;margin:40px} h1{color:#047857} .contradiction{background:#fef2f2;padding:10px;border:1px solid #fca5a5}</style></head><body><h1>${type === 'sub' ? 'Sub-Theme' : 'Main Category'} Synthesis</h1>`;
    
    results.forEach(s => {
       const sum = Array.isArray(s.result.summary) ? s.result.summary : [s.result.summary];
       if (type === 'sub') {
           htmlContent += `<h2>${s.category}</h2><h3>${s.theme}</h3><ul>${sum.map((l:string)=>`<li>${l}</li>`).join('')}</ul><div class="contradiction"><strong>Contradictions:</strong> ${s.result.contradictionAnalysis}</div>`;
       } else {
           htmlContent += `<h2>${s.category}</h2><ul>${sum.map((l:string)=>`<li>${l}</li>`).join('')}</ul><div class="contradiction"><strong>Contradictions:</strong> ${s.result.contradictionAnalysis}</div><hr/>`;
       }
    });

    htmlContent += '</body></html>';
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `synthesis_${type}.html`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => document.body.removeChild(link), 100);
  };

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl transform transition-all duration-300 scale-100 opacity-100 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center shrink-0">
          <h3 className="text-xl font-bold text-emerald-700 flex items-center gap-2">
            <Zap className='h-6 w-6 text-yellow-500' /> 
            {type === 'sub' ? 'Synthesized Sub-Themes' : 'Synthesized Main Categories'}
          </h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"><X className='h-5 w-5' /></button>
        </div>
        <div className="p-6 overflow-y-auto space-y-6">
            {results.map((item, idx) => (
                <div key={idx} className="border-b border-slate-100 pb-6 last:border-0">
                    <h4 className="text-lg font-bold text-slate-800">{item.category} {type === 'sub' && <span className="text-slate-500 font-normal">/ {item.theme}</span>}</h4>
                    
                    <div className="mt-2 bg-blue-50 p-3 rounded text-sm text-slate-800">
                        <ul className="list-disc pl-5 space-y-1">
                            {(Array.isArray(item.result.summary) ? item.result.summary : [item.result.summary]).map((line: string, i: number) => (
                                <li key={i}>{line}</li>
                            ))}
                        </ul>
                    </div>
                    
                    {item.result.contradictionAnalysis && !item.result.contradictionAnalysis.toLowerCase().includes("no clear contradictions") && (
                        <div className="mt-2 bg-red-50 p-3 rounded text-sm text-red-800 border border-red-100 flex gap-2">
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                            <div>
                                <span className="font-bold">Contradictions:</span> {item.result.contradictionAnalysis}
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2 rounded-b-xl">
            <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded font-medium">Close</button>
            <button onClick={handleExport} className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 font-bold flex items-center gap-2">
                <Download className="h-4 w-4" /> Export HTML
            </button>
        </div>
      </div>
    </div>
  );
};

// NEW: Manual Fix Modal
const ManualFixModal = ({ isOpen, text, onSave, onCancel }: { isOpen: boolean, text: string, onSave: (newText: string) => void, onCancel: () => void }) => {
  const [fixedText, setFixedText] = useState(text);
  useEffect(() => { setFixedText(text); }, [text]);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-80 flex items-center justify-center z-[60] p-6">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 border-l-4 border-amber-500 flex flex-col h-[80vh]">
        <div className="flex justify-between items-start mb-4">
            <div>
                <h2 className="text-xl font-bold text-amber-600 flex items-center gap-2"><Wrench className="h-6 w-6"/> Data Repair Required</h2>
                <p className="text-slate-600 text-sm mt-1">The AI couldn't parse this batch, likely due to encoding errors (Mojibake) or garbled text in the citations below. Please edit the text to fix obvious errors, then click "Retry Batch".</p>
            </div>
            <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 border border-slate-300 rounded overflow-hidden relative">
            <div className="absolute top-0 right-0 bg-slate-100 px-2 py-1 text-[10px] text-slate-500 font-bold border-b border-l rounded-bl font-mono">RAW INPUT</div>
            <textarea 
               className="w-full h-full p-4 font-mono text-xs bg-slate-50 text-slate-700 resize-none focus:ring-0 outline-none" 
               value={fixedText} 
               onChange={(e) => setFixedText(e.target.value)} 
               spellCheck={false}
            />
        </div>
        <div className="flex gap-3 justify-end mt-4">
          <button onClick={onCancel} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded">Stop Extraction</button>
          <button onClick={() => onSave(fixedText)} className="px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600 flex items-center gap-2 font-bold"><RefreshCw className="h-4 w-4"/> Retry Batch</button>
        </div>
      </div>
    </div>
  );
};

const QuotaModal = ({ isOpen, onClose, exportFn }: { isOpen: boolean, onClose: () => void, exportFn: () => void }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-80 flex items-center justify-center z-[60] p-6">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border-l-4 border-red-500">
        <h2 className="text-2xl font-bold text-red-600 mb-4 flex items-center gap-2"><AlertCircle className="h-6 w-6" /> Daily Quota Exceeded</h2>
        <p className="text-slate-700 mb-4">Google's API has blocked further requests. This usually means you have hit the <strong>free tier daily limit</strong> for the selected model.</p>
        <div className="bg-slate-100 p-4 rounded mb-4 text-sm text-slate-600">
          <p className="font-semibold mb-2">Recommended Actions:</p>
          <ul className="list-disc pl-5 space-y-1"><li><strong>Switch Models:</strong> Use 'Gemma 3' (higher limits) for sorting.</li><li><strong>Export Now:</strong> Save your JSON state and continue tomorrow.</li><li><strong>Wait:</strong> Quotas typically reset at midnight Pacific Time.</li></ul>
        </div>
        <div className="flex gap-3 justify-end"><button onClick={onClose} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded">Close</button><button onClick={() => { exportFn(); onClose(); }} className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 flex items-center gap-2"><Download className="h-4 w-4" /> Export Progress</button></div>
      </div>
    </div>
  );
};

interface FlowDiagramProps {
  papers: Paper[];
  onFilter: (papers: Paper[]) => void;
  isDriverGrouped: boolean;
  isResponseGrouped: boolean;
  setIsDriverGrouped: (val: (prev: boolean) => boolean) => void;
  setIsResponseGrouped: (val: (prev: boolean) => boolean) => void;
  isTermsNormalized: boolean;
  // New props for the button:
  handleOptimizeTerms: () => Promise<void>;
  isConsolidating: boolean;
  apiKey: string;
}

const FlowDiagram: React.FC<FlowDiagramProps> = ({ papers, onFilter, isDriverGrouped, isResponseGrouped, setIsDriverGrouped, setIsResponseGrouped, isTermsNormalized, handleOptimizeTerms, isConsolidating, apiKey }) => {
  const [zoom, setZoom] = useState(1);
  const [driverFilter, setDriverFilter] = useState('');
  const [responseFilter, setResponseFilter] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<{ type: 'driver'|'response', name: string, startY: number } | null>(null);
  const [customOrder, setCustomOrder] = useState<{ drivers: string[], responses: string[] }>({ drivers: [], responses: [] });

  const data = useMemo(() => {
    const drivers: Record<string, number> = {}; const responses: Record<string, number> = {}; const links: Record<string, { count: number, papers: Paper[], effectCounts: Record<string, number> }> = {};
    papers.forEach(p => {
      // Use Group fields if the toggle is active, otherwise use raw fields.
      const d = isDriverGrouped ? (p.driverGroup || p.driver || "Unknown") : (p.driver || "Unknown");
      const r = isResponseGrouped ? (p.responseGroup || p.response || "Unknown") : (p.response || "Unknown");
      if (driverFilter && !d.toLowerCase().includes(driverFilter.toLowerCase())) return;
      if (responseFilter && !r.toLowerCase().includes(responseFilter.toLowerCase())) return;
      const linkKey = `${d}|||${r}`;
      drivers[d] = (drivers[d] || 0) + 1; responses[r] = (responses[r] || 0) + 1;
      if (!links[linkKey]) links[linkKey] = { count: 0, papers: [], effectCounts: {} };
      links[linkKey].count++; links[linkKey].papers.push(p);
      const effect = p.effectDirection || 'Unclear'; links[linkKey].effectCounts[effect] = (links[linkKey].effectCounts[effect] || 0) + 1;
    });
    let sortedDrivers = Object.entries(drivers).sort((a, b) => b[1] - a[1]).map(x => x[0]);
    let sortedResponses = Object.entries(responses).sort((a, b) => b[1] - a[1]).map(x => x[0]);
    if (customOrder.drivers.length > 0) { sortedDrivers = [...sortedDrivers].sort((a, b) => { const idxA = customOrder.drivers.indexOf(a); const idxB = customOrder.drivers.indexOf(b); if (idxA === -1 && idxB === -1) return 0; if (idxA === -1) return 1; if (idxB === -1) return -1; return idxA - idxB; }); }
    if (customOrder.responses.length > 0) { sortedResponses = [...sortedResponses].sort((a, b) => { const idxA = customOrder.responses.indexOf(a); const idxB = customOrder.responses.indexOf(b); if (idxA === -1 && idxB === -1) return 0; if (idxA === -1) return 1; if (idxB === -1) return -1; return idxA - idxB; }); }
    return { driverList: sortedDrivers.map(d => ({ name: d, count: drivers[d] })), responseList: sortedResponses.map(r => ({ name: r, count: responses[r] })), links };
  }, [papers, driverFilter, responseFilter, customOrder, isDriverGrouped, isResponseGrouped]);

  const width = 1000; const colWidth = 220; const nodeHeight = 35; const gap = 20; const contentHeight = Math.max(data.driverList.length, data.responseList.length) * (nodeHeight + gap) + 100; const height = Math.max(600, contentHeight);
  const getPositions = (items: { name: string, count: number }[], x: number) => { let currentY = 50; return items.map((item) => { const pos = { name: item.name, count: item.count, x, y: currentY, h: nodeHeight }; currentY += nodeHeight + gap; return pos; }); };
  const driverNodes = getPositions(data.driverList, 50); const responseNodes = getPositions(data.responseList, width - colWidth - 50);

  const handleDragStart = (e: React.MouseEvent, type: 'driver'|'response', name: string) => { e.preventDefault(); setDragging({ type, name, startY: e.clientY }); };
  const handleDragEnd = (_e: React.MouseEvent, type: 'driver'|'response', targetName: string) => {
      if (!dragging || dragging.type !== type || dragging.name === targetName) { setDragging(null); return; }
      const list = type === 'driver' ? data.driverList.map(d => d.name) : data.responseList.map(r => r.name);
      const fromIdx = list.indexOf(dragging.name); const toIdx = list.indexOf(targetName);
      if (fromIdx !== -1 && toIdx !== -1) { const newList = [...list]; newList.splice(fromIdx, 1); newList.splice(toIdx, 0, dragging.name); setCustomOrder(prev => ({ ...prev, [type === 'driver' ? 'drivers' : 'responses']: newList })); } setDragging(null);
  };
  
  const linkElements = Object.entries(data.links).map(([key, info]) => {
    const [dName, rName] = key.split('|||'); const start = driverNodes.find(n => n.name === dName); const end = responseNodes.find(n => n.name === rName);
    if (!start || !end) return null; const startX = start.x + colWidth; const startY = start.y + nodeHeight / 2; const endX = end.x; const endY = end.y + nodeHeight / 2; const pathData = `M ${startX} ${startY} C ${startX + 150} ${startY}, ${endX - 150} ${endY}, ${endX} ${endY}`; const strokeWidth = Math.max(2, Math.min(20, info.count * 1.5)); 
    return ( <g key={key} onClick={() => onFilter(info.papers)} className="group cursor-pointer"><path d={pathData} fill="none" stroke="transparent" strokeWidth={strokeWidth + 10} /><path d={pathData} fill="none" stroke="#94a3b8" strokeWidth={strokeWidth} strokeOpacity={0.3} className="transition-all duration-300 group-hover:stroke-opacity-100 group-hover:stroke-blue-600"/><title>{dName} → {rName}: {info.count} papers</title></g> );
  });
  const handleExportPNG = () => { if (!svgRef.current) return; const svgData = new XMLSerializer().serializeToString(svgRef.current); const canvas = document.createElement("canvas"); const ctx = canvas.getContext("2d"); const img = new Image(); img.onload = () => { canvas.width = width; canvas.height = height; if (ctx) { ctx.fillStyle = "white"; ctx.fillRect(0, 0, width, height); ctx.drawImage(img, 0, 0); const link = document.createElement("a"); link.href = canvas.toDataURL("image/png"); link.download = "driver_response_flow.png"; link.click(); } }; img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData))); };
  const handleExportDataCSV = () => { const headers = ["Driver", "Response", "Count", "Paper Titles"]; const rows = Object.entries(data.links).map(([key, info]) => { const [d, r] = key.split('|||'); const titles = info.papers.map(p => p.title).join("; "); return `"${d}","${r}",${info.count},"${titles}"`; }); const csvContent = [headers.join(","), ...rows].join("\n"); const blob = new Blob([csvContent], { type: 'text/csv' }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "flow_diagram_data.csv"; link.click(); };

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-lg border border-slate-200">
      <div className="flex items-center justify-between p-3 border-b border-slate-200 bg-white rounded-t-lg flex-wrap gap-2">
        <div className="flex items-center gap-2"><span className="text-xs font-bold text-slate-600 uppercase tracking-wider mr-2">Zoom:</span><button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-1 hover:bg-slate-100 rounded border border-slate-300"><ZoomOut className="h-4 w-4 text-slate-600"/></button><span className="text-xs w-8 text-center">{Math.round(zoom * 100)}%</span><button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-1 hover:bg-slate-100 rounded border border-slate-300 ml-1"><ZoomIn className="h-4 w-4 text-slate-600"/></button><button onClick={() => setZoom(1)} className="p-1 hover:bg-slate-100 rounded border border-slate-300 ml-1"><Maximize className="h-4 w-4 text-slate-600"/></button></div>
        <div className="flex items-center gap-2">
           {/* GROUP TERMS BUTTON (LOCAL) */}
            <button 
              onClick={handleOptimizeTerms}
              disabled={papers.length === 0 || isConsolidating || !apiKey || isTermsNormalized}
              title={!apiKey ? "API Key required to group terms." : papers.length === 0 ? "Add papers first." : isTermsNormalized ? "Terms are already grouped." : "Run AI analysis to group synonymous driver/response terms."}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-colors border
                ${papers.length === 0 || isConsolidating || !apiKey
                  ? 'text-slate-400 border-slate-100 cursor-not-allowed' 
                  : isTermsNormalized 
                    ? 'text-green-700 border-green-200 bg-green-50'
                    : 'text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100'
                  }`}
            >
              {isConsolidating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : isTermsNormalized ? (
                <Check className="h-3 w-3" />
              ) : (
                <Wrench className="h-3 w-3" />
              )}
              {isConsolidating 
                ? 'Normalizing...' 
                : isTermsNormalized
                  ? 'Terms Grouped'
                  : 'Group Terms'}
            </button>
            {/* DRIVER GROUP TOGGLE (New) */}
           <button onClick={() => setIsDriverGrouped(p => !p)} disabled={!isTermsNormalized} className={`flex gap-1 px-3 py-1.5 border rounded text-xs font-medium ${isDriverGrouped ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white text-slate-500 disabled:opacity-50'}`} title="Toggle Driver Grouping">{isDriverGrouped ? <ToggleRight className="h-4 w-4"/> : <ToggleLeft className="h-4 w-4"/>} Group Drivers</button>
           {/* RESPONSE GROUP TOGGLE (New) */}
           <button onClick={() => setIsResponseGrouped(p => !p)} disabled={!isTermsNormalized} className={`flex gap-1 px-3 py-1.5 border rounded text-xs font-medium ${isResponseGrouped ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white text-slate-500 disabled:opacity-50'}`} title="Toggle Response Grouping">{isResponseGrouped ? <ToggleRight className="h-4 w-4"/> : <ToggleLeft className="h-4 w-4"/>} Group Outcomes</button>

          <div className="flex items-center bg-white border border-slate-300 rounded px-2 py-1 gap-2"><Search className="h-3 w-3 text-slate-400" /><input type="text" placeholder="Filter Drivers..." className="text-xs outline-none w-24" value={driverFilter} onChange={e => setDriverFilter(e.target.value)} /><div className="w-px h-3 bg-slate-300"></div><input type="text" placeholder="Filter Outcomes..." className="text-xs outline-none w-24" value={responseFilter} onChange={e => setResponseFilter(e.target.value)} /></div>
          <button onClick={handleExportDataCSV} className="text-xs flex items-center gap-1 text-slate-600 hover:text-emerald-600 font-medium cursor-pointer"><Download className="h-3 w-3"/> Data</button>
          <button onClick={handleExportPNG} className="text-xs flex items-center gap-1 text-slate-600 hover:text-blue-600 font-medium cursor-pointer"><ImageIcon className="h-3 w-3"/> Image</button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 cursor-grab active:cursor-grabbing">
        <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: width, height: height }}>
          <svg ref={svgRef} width={width} height={height} className="bg-white shadow-sm rounded"><style>{`text { font-family: sans-serif; user-select: none; } .node:hover { stroke: #000; stroke-width: 2px; }`}</style>
            <g transform={`translate(20, ${height - 40})`}><text x="10" y="-15" fontSize="10" fontWeight="bold" fill="#64748b">Highlighting connections on hover.</text></g>
            {linkElements}
            {driverNodes.map((node, i) => ( <g key={`d-${i}`} className="node cursor-move" onMouseDown={(e) => handleDragStart(e, 'driver', node.name)} onMouseUp={(e) => handleDragEnd(e, 'driver', node.name)}><rect x={node.x} y={node.y} width={colWidth} height={node.h} rx={4} fill={dragging?.name === node.name ? "#d1fae5" : "#ecfdf5"} stroke="#059669" strokeWidth={1} /><text x={node.x + 10} y={node.y + 22} fontSize="12" fontWeight="bold" fill="#064e3b">{node.name.length > 25 ? node.name.substring(0, 25) + '...' : node.name}</text><text x={node.x + colWidth - 25} y={node.y + 22} fontSize="10" fill="#64748b" textAnchor="end">{node.count}</text><Move className="h-3 w-3 text-slate-400" x={node.x + colWidth - 20} y={node.y + 10} /></g> ))}
            {responseNodes.map((node, i) => ( <g key={`r-${i}`} className="node cursor-move" onMouseDown={(e) => handleDragStart(e, 'response', node.name)} onMouseUp={(e) => handleDragEnd(e, 'response', node.name)}><rect x={node.x} y={node.y} width={colWidth} height={node.h} rx={4} fill={dragging?.name === node.name ? "#dbeafe" : "#eff6ff"} stroke="#3b82f6" strokeWidth={1} /><text x={node.x + 10} y={node.y + 22} fontSize="12" fontWeight="bold" fill="#1e3a8a">{node.name.length > 25 ? node.name.substring(0, 25) + '...' : node.name}</text><text x={node.x + colWidth - 25} y={node.y + 22} fontSize="10" fill="#64748b" textAnchor="end">{node.count}</text><Move className="h-3 w-3 text-slate-400" x={node.x + colWidth - 20} y={node.y + 10} /></g> ))}
            <text x={50} y={30} fontSize="14" fontWeight="bold" fill="#94a3b8" letterSpacing="2">DRIVERS</text><text x={width - colWidth - 50} y={30} fontSize="14" fontWeight="bold" fill="#94a3b8" letterSpacing="2">RESPONSES</text>
          </svg>
        </div>
      </div>
    </div>
  );
};

interface TemporalChartProps {
  papers: Paper[];
  isDriverGrouped: boolean;
  isResponseGrouped: boolean;
  setIsDriverGrouped: (val: (prev: boolean) => boolean) => void;
  setIsResponseGrouped: (val: (prev: boolean) => boolean) => void;
  isTermsNormalized: boolean;
  // New props for the button:
  handleOptimizeTerms: () => Promise<void>;
  isConsolidating: boolean;
  apiKey: string;
}

// --- COMPONENT: Temporal Chart (Line Graph) ---
const TemporalChart: React.FC<TemporalChartProps> = ({ papers, isDriverGrouped, isResponseGrouped, setIsDriverGrouped, setIsResponseGrouped, isTermsNormalized, handleOptimizeTerms, isConsolidating, apiKey }) => {
  const [metric, setMetric] = useState<'driver' | 'response'>('driver');
  const [categoryFilter, setCategoryFilter] = useState<string>('Top 5'); 
  const svgRef = useRef<SVGSVGElement>(null);
  const data = useMemo(() => {
    const years = Array.from(new Set(papers.map(p => parseInt(p.year) || 0))).filter(y => y > 1900).sort();
    if (years.length === 0) return null;
    const minYear = years[0]; const maxYear = years[years.length - 1];
    const counts: Record<string, number> = {};
    papers.forEach(p => { 
        // Use Grouped terms if the respective toggle is active
        const d = isDriverGrouped ? (p.driverGroup || p.driver) : p.driver;
        const r = isResponseGrouped ? (p.responseGroup || p.response) : p.response;
        const val = metric === 'driver' ? d : r; 
        counts[val] = (counts[val] || 0) + 1; 
    });
    let selectedCats: string[] = [];
    if (categoryFilter === 'Top 5') { selectedCats = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 5).map(x => x[0]); } else { selectedCats = [categoryFilter]; }
    const yearSpan = Array.from({length: maxYear - minYear + 1}, (_, i) => minYear + i);
    const lines = selectedCats.map(cat => {
        const points = yearSpan.map(year => { 
             const count = papers.filter(p => {
                 const d = isDriverGrouped ? (p.driverGroup || p.driver) : p.driver;
                 const r = isResponseGrouped ? (p.responseGroup || p.response) : p.response;
                 const val = metric === 'driver' ? d : r;
                 return (parseInt(p.year) == year) && val === cat;
             }).length; 
             return { year, count }; 
        });
        return { cat, points };
    });
    let maxY = 0; lines.forEach(l => l.points.forEach(p => { if (p.count > maxY) maxY = p.count; })); maxY = Math.max(maxY, 5);
    return { yearSpan, lines, maxY, allCats: Object.keys(counts).sort() };
  }, [papers, metric, categoryFilter, isDriverGrouped, isResponseGrouped]);

  if (!data) return <div className="flex h-full items-center justify-center text-slate-400">No date data available.</div>;
  const width = 800; const height = 400; const padding = { top: 40, right: 120, bottom: 50, left: 50 }; const graphW = width - padding.left - padding.right; const graphH = height - padding.top - padding.bottom; const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
  const handleExportPNG = () => { if (!svgRef.current) return; const svgData = new XMLSerializer().serializeToString(svgRef.current); const canvas = document.createElement("canvas"); const ctx = canvas.getContext("2d"); const img = new Image(); img.onload = () => { canvas.width = width; canvas.height = height; if (ctx) { ctx.fillStyle = "white"; ctx.fillRect(0, 0, width, height); ctx.drawImage(img, 0, 0); const link = document.createElement("a"); link.href = canvas.toDataURL("image/png"); link.download = "temporal_trends.png"; link.click(); } }; img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData))); };
  const handleExportDataCSV = () => { const headers = ["Year", ...data.lines.map(l => l.cat)]; const rows = data.yearSpan.map((year, i) => { const counts = data.lines.map(l => l.points[i].count); return [year, ...counts].join(","); }); const csvContent = [headers.join(","), ...rows].join("\n"); const blob = new Blob([csvContent], { type: 'text/csv' }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "temporal_trends.csv"; link.click(); };

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-lg border border-slate-200 p-4">
        <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-3">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><BarChart2 className="h-4 w-4"/> Trends Over Time</h3>
            <div className="flex items-center gap-3">
                {/* GROUP TERMS BUTTON (LOCAL) */}
                <button 
                  onClick={handleOptimizeTerms}
                  disabled={papers.length === 0 || isConsolidating || !apiKey || isTermsNormalized}
                  title={!apiKey ? "API Key required to group terms." : papers.length === 0 ? "Add papers first." : isTermsNormalized ? "Terms are already grouped." : "Run AI analysis to group synonymous driver/response terms."}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-colors border
                    ${papers.length === 0 || isConsolidating || !apiKey
                      ? 'text-slate-400 border-slate-100 cursor-not-allowed' 
                      : isTermsNormalized 
                        ? 'text-green-700 border-green-200 bg-green-50'
                        : 'text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100'
                      }`}
                >
                  {isConsolidating ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : isTermsNormalized ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Wrench className="h-3 w-3" />
                  )}
                  {isConsolidating 
                    ? 'Normalizing...' 
                    : isTermsNormalized
                      ? 'Terms Grouped'
                      : 'Group Terms'}
                </button>
                 {/* DRIVER GROUP TOGGLE (New) */}
                 <button onClick={() => setIsDriverGrouped(p => !p)} disabled={!isTermsNormalized} className={`flex gap-1 px-3 py-1.5 border rounded text-xs font-medium ${isDriverGrouped ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white text-slate-500 disabled:opacity-50'}`} title="Toggle Driver Grouping">{isDriverGrouped ? <ToggleRight className="h-4 w-4"/> : <ToggleLeft className="h-4 w-4"/>} Group Drivers</button>
                 {/* RESPONSE GROUP TOGGLE (New) */}
                 <button onClick={() => setIsResponseGrouped(p => !p)} disabled={!isTermsNormalized} className={`flex gap-1 px-3 py-1.5 border rounded text-xs font-medium ${isResponseGrouped ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white text-slate-500 disabled:opacity-50'}`} title="Toggle Response Grouping">{isResponseGrouped ? <ToggleRight className="h-4 w-4"/> : <ToggleLeft className="h-4 w-4"/>} Group Outcomes</button>

                 <div className="flex bg-white rounded border border-slate-300 overflow-hidden">
                    <button onClick={() => { setMetric('driver'); setCategoryFilter('Top 5'); }} className={`px-3 py-1 text-xs font-bold ${metric === 'driver' ? 'bg-slate-100 text-emerald-700' : 'text-slate-500'}`}>Drivers</button>
                    <div className="w-px bg-slate-300"></div>
                    <button onClick={() => { setMetric('response'); setCategoryFilter('Top 5'); }} className={`px-3 py-1 text-xs font-bold ${metric === 'response' ? 'bg-slate-100 text-blue-700' : 'text-slate-500'}`}>Responses</button>
                </div>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="text-xs border border-slate-300 rounded p-1 max-w-[150px]">
                    <option value="Top 5">Top 5 (Compare)</option>
                    {data.allCats.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={handleExportDataCSV} className="text-xs flex items-center gap-1 text-slate-600 hover:text-emerald-600 font-medium cursor-pointer"><Download className="h-3 w-3"/> Data</button>
                <button onClick={handleExportPNG} className="text-xs flex items-center gap-1 text-slate-600 hover:text-blue-600 font-medium cursor-pointer"><ImageIcon className="h-3 w-3"/> Image</button>
            </div>
        </div>
        <div className="flex-1 overflow-auto">
            <svg ref={svgRef} width={width} height={height} className="mx-auto bg-white shadow-sm rounded">
                <style>{`text { font-family: sans-serif; }`}</style>
                <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="#cbd5e1" strokeWidth="2" />
                <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#cbd5e1" strokeWidth="2" />
                {[0, 0.25, 0.5, 0.75, 1].map((p, i) => { const y = height - padding.bottom - (p * graphH); const label = Math.round(p * data.maxY); return (<g key={i}><line x1={padding.left - 5} y1={y} x2={padding.left} y2={y} stroke="#cbd5e1" /><text x={padding.left - 8} y={y + 4} fontSize="12" fill="#64748b" textAnchor="end">{label}</text><line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#f1f5f9" strokeDasharray="4" /></g>); })}
                {data.yearSpan.map((year, i) => { if (year % 5 !== 0) return null; const x = padding.left + (i / (data.yearSpan.length - 1)) * graphW; return (<g key={year}><line x1={x} y1={height - padding.bottom} x2={x} y2={height - padding.bottom + 5} stroke="#cbd5e1" /><text x={x} y={height - padding.bottom + 20} fontSize="14" fontWeight="bold" fill="#475569" textAnchor="middle">{year}</text></g>); })}
                {data.lines.map((line, i) => { const points = line.points.map((p, idx) => { const x = padding.left + (idx / (data.yearSpan.length - 1)) * graphW; const y = height - padding.bottom - ((p.count / data.maxY) * graphH); return `${x},${y}`; }).join(" "); const color = categoryFilter === 'Top 5' ? colors[i % colors.length] : '#3b82f6'; return (<g key={line.cat}><polyline points={points} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />{line.points.map((p, idx) => { const x = padding.left + (idx / (data.yearSpan.length - 1)) * graphW; const y = height - padding.bottom - ((p.count / data.maxY) * graphH); return <circle key={idx} cx={x} cy={y} r="4" fill="white" stroke={color} strokeWidth="2" /> })}</g>); })}
                <g transform={`translate(${width - 110}, ${padding.top})`}>
                    {data.lines.map((line, i) => { const color = categoryFilter === 'Top 5' ? colors[i % colors.length] : '#3b82f6'; return (<g key={line.cat} transform={`translate(0, ${i * 20})`}><line x1="0" y1="5" x2="15" y2="5" stroke={color} strokeWidth="3" /><text x="20" y="9" fontSize="11" fontWeight="bold" fill="#475569">{line.cat.substring(0, 14)}</text></g>); })}
                </g>
                <text x={15} y={height / 2} transform={`rotate(-90 15 ${height/2})`} fontSize="12" fontWeight="bold" fill="#94a3b8" letterSpacing="1">PAPER COUNT</text>
            </svg>
        </div>
    </div>
  );
};

interface GapHeatmapProps {
  papers: Paper[];
  isDriverGrouped: boolean;
  isResponseGrouped: boolean;
  setIsDriverGrouped: (val: (prev: boolean) => boolean) => void;
  setIsResponseGrouped: (val: (prev: boolean) => boolean) => void;
  isTermsNormalized: boolean;
  // New props for the button:
  handleOptimizeTerms: () => Promise<void>;
  isConsolidating: boolean;
  apiKey: string;
}

// --- COMPONENT: Gap Heatmap ---
const GapHeatmap: React.FC<GapHeatmapProps> = ({ papers, isDriverGrouped, isResponseGrouped, setIsDriverGrouped, setIsResponseGrouped, isTermsNormalized, handleOptimizeTerms, isConsolidating, apiKey }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const data = useMemo(() => {
    // Use Grouped terms if the respective toggle is active
    const drivers = Array.from(new Set(papers.map(p => isDriverGrouped ? (p.driverGroup || p.driver) : p.driver))).sort();
    const responses = Array.from(new Set(papers.map(p => isResponseGrouped ? (p.responseGroup || p.response) : p.response))).sort();
    
    const topDrivers = drivers.slice(0, 15); const topResponses = responses.slice(0, 15);
    const matrix: Record<string, Record<string, number>> = {};
    topDrivers.forEach(d => { matrix[d] = {}; topResponses.forEach(r => matrix[d][r] = 0); });
    papers.forEach(p => { 
        const d = isDriverGrouped ? (p.driverGroup || p.driver) : p.driver;
        const r = isResponseGrouped ? (p.responseGroup || p.response) : p.response;
        if (topDrivers.includes(d) && topResponses.includes(r)) matrix[d][r]++; 
    });
    return { topDrivers, topResponses, matrix };
  }, [papers, isDriverGrouped, isResponseGrouped]);

  const cellSize = 30; const xLabelHeight = 120; const yLabelWidth = 140;
  const width = yLabelWidth + (data.topResponses.length * cellSize) + 20;
  const height = xLabelHeight + (data.topDrivers.length * cellSize) + 20;

  const handleExportPNG = () => { if (!svgRef.current) return; const svgData = new XMLSerializer().serializeToString(svgRef.current); const canvas = document.createElement("canvas"); const ctx = canvas.getContext("2d"); const img = new Image(); img.onload = () => { canvas.width = width; canvas.height = height; if (ctx) { ctx.fillStyle = "white"; ctx.fillRect(0, 0, width, height); ctx.drawImage(img, 0, 0); const link = document.createElement("a"); link.href = canvas.toDataURL("image/png"); link.download = "gap_heatmap.png"; link.click(); } }; img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData))); };
  const handleExportDataCSV = () => { const headers = ["Driver", ...data.topResponses]; const rows = data.topDrivers.map(d => [d, ...data.topResponses.map(r => data.matrix[d][r])].join(",")); const csvContent = [headers.join(","), ...rows].join("\n"); const blob = new Blob([csvContent], { type: 'text/csv' }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "gap_heatmap.csv"; link.click(); };

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-lg border border-slate-200 p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-slate-700 flex items-center gap-2"><Grid3X3 className="h-4 w-4"/> Research Gap Heatmap</h3>
        <div className="flex gap-2">
            {/* GROUP TERMS BUTTON (LOCAL) */}
            <button 
              onClick={handleOptimizeTerms}
              disabled={papers.length === 0 || isConsolidating || !apiKey || isTermsNormalized}
              title={!apiKey ? "API Key required to group terms." : papers.length === 0 ? "Add papers first." : isTermsNormalized ? "Terms are already grouped." : "Run AI analysis to group synonymous driver/response terms."}
              className={`flex items-center gap-2 px-3 py-1.5 border rounded text-xs font-bold transition-colors
                ${papers.length === 0 || isConsolidating || !apiKey
                  ? 'text-slate-400 border-slate-100 cursor-not-allowed' 
                  : isTermsNormalized 
                    ? 'text-green-700 border-green-200 bg-green-50'
                    : 'text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100'
                  }`}
            >
              {isConsolidating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : isTermsNormalized ? (
                <Check className="h-3 w-3" />
              ) : (
                <Wrench className="h-3 w-3" />
              )}
              {isConsolidating 
                ? 'Normalizing...' 
                : isTermsNormalized
                  ? 'Terms Grouped'
                  : 'Group Terms'}
            </button>
            {/* DRIVER GROUP TOGGLE (New) */}
            <button onClick={() => setIsDriverGrouped(p => !p)} disabled={!isTermsNormalized} className={`flex gap-1 px-3 py-1 border rounded text-xs font-medium ${isDriverGrouped ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white text-slate-500 disabled:opacity-50'}`} title="Toggle Driver Grouping">{isDriverGrouped ? <ToggleRight className="h-4 w-4"/> : <ToggleLeft className="h-4 w-4"/>} Group Drivers</button>
            {/* RESPONSE GROUP TOGGLE (New) */}
            <button onClick={() => setIsResponseGrouped(p => !p)} disabled={!isTermsNormalized} className={`flex gap-1 px-3 py-1 border rounded text-xs font-medium ${isResponseGrouped ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white text-slate-500 disabled:opacity-50'}`} title="Toggle Response Grouping">{isResponseGrouped ? <ToggleRight className="h-4 w-4"/> : <ToggleLeft className="h-4 w-4"/>} Group Outcomes</button>

            <button onClick={handleExportDataCSV} className="text-xs flex items-center gap-1 text-slate-600 hover:text-emerald-600 font-medium cursor-pointer"><Download className="h-3 w-3"/> Data</button>
            <button onClick={handleExportPNG} className="text-xs flex items-center gap-1 text-slate-600 hover:text-blue-600 font-medium cursor-pointer"><ImageIcon className="h-3 w-3"/> Image</button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <svg ref={svgRef} width={width} height={height} className="mx-auto bg-white shadow-sm rounded">
          <style>{`text { font-family: sans-serif; font-size: 12px; }`}</style>
          {data.topResponses.map((r, i) => ( <text key={`x-${i}`} x={yLabelWidth + i * cellSize + cellSize/2} y={xLabelHeight - 10} transform={`rotate(-90, ${yLabelWidth + i * cellSize + cellSize/2}, ${xLabelHeight - 10})`} textAnchor="start" fill="#475569">{r.substring(0, 20)}</text> ))}
          {data.topDrivers.map((d, i) => ( <text key={`y-${i}`} x={yLabelWidth - 10} y={xLabelHeight + i * cellSize + cellSize/2 + 3} textAnchor="end" fill="#475569">{d.substring(0, 25)}</text> ))}
          {data.topDrivers.map((d, rowIdx) => data.topResponses.map((r, colIdx) => { const count = data.matrix[d][r]; const opacity = Math.min(1, count / 5); const fill = count === 0 ? '#f8fafc' : `rgba(16, 185, 129, ${opacity})`; return ( <g key={`${d}-${r}`}><rect x={yLabelWidth + colIdx * cellSize} y={xLabelHeight + rowIdx * cellSize} width={cellSize} height={cellSize} fill={fill} stroke="#e2e8f0" />{count > 0 && <text x={yLabelWidth + colIdx * cellSize + cellSize/2} y={xLabelHeight + rowIdx * cellSize + cellSize/2 + 3} textAnchor="middle" fill={opacity > 0.6 ? 'white' : '#1e293b'}>{count}</text>}</g> ); }))}
        </svg>
      </div>
    </div>
  );
};

// --- COMPONENT: Geo/Species Chart (SVG) ---
const GeoSpeciesChart = ({ papers }: { papers: Paper[] }) => {
  const locRef = useRef<SVGSVGElement | null>(null);
  const specRef = useRef<SVGSVGElement | null>(null);

  const data = useMemo(() => {
    const locCounts: Record<string, number> = {}; const specCounts: Record<string, number> = {};
    papers.forEach(p => { const loc = p.location || "Unspecified"; const spec = p.species || "Unspecified"; locCounts[loc] = (locCounts[loc] || 0) + 1; specCounts[spec] = (specCounts[spec] || 0) + 1; });
    const topLocs = Object.entries(locCounts).sort((a,b)=>b[1]-a[1]).slice(0, 10);
    const topSpecs = Object.entries(specCounts).sort((a,b)=>b[1]-a[1]).slice(0, 10);
    return { topLocs, topSpecs };
  }, [papers]);

  const barHeight = 25; const gap = 15; const textWidth = 140; // Widened text area
  const locHeight = Math.max(300, data.topLocs.length * (barHeight + gap) + 40);
  const specHeight = Math.max(300, data.topSpecs.length * (barHeight + gap) + 40);
  const width = 400; 

  const handleExport = (ref: React.RefObject<SVGSVGElement | null>, name: string) => { if (!ref.current) return; const svgData = new XMLSerializer().serializeToString(ref.current); const canvas = document.createElement("canvas"); const ctx = canvas.getContext("2d"); const img = new Image(); img.onload = () => { canvas.width = width; canvas.height = ref.current?.clientHeight || 400; if (ctx) { ctx.fillStyle = "white"; ctx.fillRect(0, 0, width, canvas.height); ctx.drawImage(img, 0, 0); const link = document.createElement("a"); link.href = canvas.toDataURL("image/png"); link.download = `${name}.png`; link.click(); } }; img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData))); };
  const handleExportDataCSV = () => { const csvContent = ["Type,Name,Count", ...data.topLocs.map(x => `Location,"${x[0]}",${x[1]}`), ...data.topSpecs.map(x => `Species,"${x[0]}",${x[1]}`)].join("\n"); const blob = new Blob([csvContent], { type: 'text/csv' }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "demographics.csv"; link.click(); };

  return (
    <div className="h-full bg-white p-4 rounded-lg border border-slate-200 overflow-auto">
      <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-slate-700 flex items-center gap-2"><Globe className="h-4 w-4"/> Demographics</h3><div className="flex gap-2"><button onClick={handleExportDataCSV} className="text-xs text-slate-600 hover:text-blue-600 underline">Export Data</button></div></div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Locations */}
        <div>
           <div className="flex justify-between mb-2"><span className="text-xs font-bold text-blue-700 uppercase">Top Locations</span><button onClick={() => handleExport(locRef, 'locations')} className="text-xs text-blue-500 hover:underline">Save Image</button></div>
           <svg ref={locRef} width={width} height={locHeight} className="border border-slate-100 rounded bg-slate-50"><style>{`text { font-family: sans-serif; font-size: 13px; }`}</style>
              {data.topLocs.map(([name, count], i) => {
                 const y = 20 + i * (barHeight + gap);
                 const max = data.topLocs[0][1];
                 const w = Math.max(5, (count / max) * (width - textWidth - 50));
                 return (<g key={`l-${i}`}><text x={10} y={y + 16} fill="#475569">{name.substring(0, 20)}</text><rect x={textWidth} y={y} width={w} height={barHeight} rx={4} fill="#3b82f6" /><text x={textWidth + w + 8} y={y + 16} fill="#64748b" fontWeight="bold">{count}</text></g>);
              })}
           </svg>
        </div>

        {/* Species */}
        <div>
           <div className="flex justify-between mb-2"><span className="text-xs font-bold text-purple-700 uppercase">Top Taxa / Species</span><button onClick={() => handleExport(specRef, 'taxa')} className="text-xs text-purple-500 hover:underline">Save Image</button></div>
           <svg ref={specRef} width={width} height={specHeight} className="border border-slate-100 rounded bg-slate-50"><style>{`text { font-family: sans-serif; font-size: 13px; }`}</style>
              {data.topSpecs.map(([name, count], i) => {
                 const y = 20 + i * (barHeight + gap);
                 const max = data.topSpecs[0][1];
                 const w = Math.max(5, (count / max) * (width - textWidth - 50));
                 return (<g key={`s-${i}`}><text x={10} y={y + 16} fill="#475569">{name.substring(0, 20)}</text><rect x={textWidth} y={y} width={w} height={barHeight} rx={4} fill="#8b5cf6" /><text x={textWidth + w + 8} y={y + 16} fill="#64748b" fontWeight="bold">{count}</text></g>);
              })}
           </svg>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENT: Chat Panel ---
const ChatPanel = ({ papers, apiKey, modelId }: { papers: Paper[], apiKey: string, modelId: string }) => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<ChatMessage[]>([{ role: 'ai', text: 'Ask me anything about the extracted papers! (e.g., "Which studies focused on fire impacts in Canada?"). Note: this is an assistance feature only, and cannot be used as a replacement for scientific review. Do not draw conclusions from this chatbot alone.', timestamp: Date.now() }]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [history]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { role: 'user', text: input, timestamp: Date.now() };
    setHistory(prev => [...prev, userMsg]); setInput(''); setLoading(true);
    const answer = await askPaperChat(userMsg.text, papers, apiKey, modelId);
    setHistory(prev => [...prev, { role: 'ai', text: answer, timestamp: Date.now() }]);
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {history.map((msg, i) => (<div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-800'}`}>{msg.text}</div></div>))}
        {loading && <div className="flex justify-start"><div className="bg-white border border-slate-200 p-3 rounded-lg text-sm flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin"/> Thinking...</div></div>}
        <div ref={scrollRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-slate-200 flex gap-2"><input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask a question about your papers..." className="flex-1 p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"/><button type="submit" disabled={loading || !apiKey} className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"><Send className="h-4 w-4"/></button></form>
    </div>
  );
};

// --- MAIN APP ---

const App = () => {
  useEffect(() => { 
    // GA initialization logic can go here if needed
    console.log("GA Init"); 
  }, []);
  
  const [apiKey, setApiKey] = useState(''); 
  const [reviewTopic, setReviewTopic] = useState(''); 
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id); 
  const [inputText, setInputText] = useState('');
  const [papers, setPapers] = useState<Paper[]>([]);
  
  const [viewMode, setViewMode] = useState<'folder'|'flow'|'timeline'|'gap_analysis'|'geo_analysis'|'chat'>('folder'); 
  const [filteredPapers, setFilteredPapers] = useState<Paper[] | null>(null);

  const [isProcessing, setIsProcessing] = useState(false); 
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false); 
  const [isBulkSynthesizing, setIsBulkSynthesizing] = useState(false); 
  const [verifyingSuggestionId, setVerifyingSuggestionId] = useState<string | null>(null);
  
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0); 
  const [totalBatches, setTotalBatches] = useState(0);
  const [batchCount, setBatchCount] = useState(0); 
  const [retryStatus, setRetryStatus] = useState<string>('');
  const [quotaErrorOpen, setQuotaErrorOpen] = useState(false); 
  const [showRateLimitNotice, setShowRateLimitNotice] = useState(true);
  
  const stopSignal = useRef(false); 
  const [error, setError] = useState<string | null>(null);
  const [enableSpecies, setEnableSpecies] = useState(true); 
  const [isOptimized, setIsOptimized] = useState(false); 
  
  // New States for Grouping Toggle
  const [isDriverGrouped, setIsDriverGrouped] = useState(false);
  const [isResponseGrouped, setIsResponseGrouped] = useState(false);
  // NEW: Separate state for Terms Normalization status
  const [isTermsNormalized, setIsTermsNormalized] = useState(false);
  
  const [consolidationSuggestions, setConsolidationSuggestions] = useState<ConsolidationSuggestion[] | null>(null);
  const [isConsolidationComplete, setIsConsolidationComplete] = useState(false); 
  const [rejectedSuggestions, setRejectedSuggestions] = useState<string[]>([]);
  
  const [synthesisModalOpen, setSynthesisModalOpen] = useState(false); 
  const [synthesisThemeKey, setSynthesisThemeKey] = useState('');
  const [synthesisResult, setSynthesisResult] = useState<SynthesisResult | null>(null);

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [expandedThemes, setExpandedThemes] = useState<Record<string, boolean>>({});
  const [showSettings, setShowSettings] = useState(true);
  const [lockedItems, setLockedItems] = useState<string[]>([]); // Format: "cat:Name" or "theme:Cat|||Name"

  const [editingItem, setEditingItem] = useState<{ id: string, type: 'cat' | 'theme', originalName: string, parentCat?: string, value: string } | null>(null);
  
  // DRAG & DROP STATE
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  // BULK SYNTHESIS STATES
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkResults, setBulkResults] = useState<any[] | null>(null);
  const [bulkType, setBulkType] = useState<'sub' | 'main'>('sub');

  const resultsEndRef = useRef<HTMLDivElement>(null); 
  const activeModelId = selectedModel;
  const fileInputRef = useRef<HTMLInputElement>(null); 
  const [manualFixState, setManualFixState] = useState<{ isOpen: boolean, text: string, batchIndex: number } | null>(null);

  const handleStopProcessing = () => { stopSignal.current = true; setRetryStatus("Stopping..."); };
  
  const toggleLock = (e: React.MouseEvent, type: 'cat' | 'theme', name: string) => {
      e.stopPropagation();
      const key = type === 'cat' ? `cat:${name}` : `theme:${name}`;
      setLockedItems(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const startEditing = (type: 'cat' | 'theme', name: string, parentCat?: string) => {
    const id = type === 'cat' ? `cat:${name}` : `theme:${parentCat}|||${name}`;
    setEditingItem({ id, type, originalName: name, parentCat, value: name });
  };

  const saveEditing = () => {
    if (!editingItem) return;
    const { type, originalName, value, parentCat } = editingItem;
    const trimmed = value.trim();
    if (!trimmed || trimmed === originalName) {
        setEditingItem(null);
        return;
    }

    setPapers(prev => prev.map(p => {
        if (type === 'cat' && p.category === originalName) {
            return { ...p, category: trimmed };
        }
        if (type === 'theme' && p.category === parentCat && p.theme === originalName) {
            return { ...p, theme: trimmed };
        }
        return p;
    }));
    
    // Migrate locks if necessary
    setLockedItems(prev => {
        const oldKey = type === 'cat' ? `cat:${originalName}` : `theme:${parentCat}|||${originalName}`;
        const newKey = type === 'cat' ? `cat:${trimmed}` : `theme:${parentCat}|||${trimmed}`;
        if (prev.includes(oldKey)) {
            return [...prev.filter(k => k !== oldKey), newKey];
        }
        return prev;
    });

    setEditingItem(null);
    setIsOptimized(true); 
  };
  
  // DRAG HANDLERS
  const handleDragStart = (e: React.DragEvent, item: DragItem) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', JSON.stringify(item)); // Fallback
      setDraggedItem(item);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
      e.preventDefault(); // Allow drop
      setDragOverTarget(targetId);
  };
  
  const handleDragLeave = () => {
      setDragOverTarget(null);
  };

  const handleDrop = (e: React.DragEvent, target: DragItem) => {
      e.preventDefault();
      setDragOverTarget(null);
      
      if (!draggedItem) return;

      // Logic:
      // 1. Theme -> Category (Move)
      // 2. Theme -> Theme (Merge)
      // 3. Category -> Category (Merge)

      let newPapers = [...papers];
      let changeMade = false;

      // CASE 1: Drag Theme -> Category (Move to that category)
      if (draggedItem.type === 'theme' && target.type === 'cat') {
          if (draggedItem.parentCat === target.name) return; // Dropped on own parent
          
          newPapers = newPapers.map(p => {
              if (p.category === draggedItem.parentCat && p.theme === draggedItem.name) {
                  return { ...p, category: target.name };
              }
              return p;
          });
          changeMade = true;
      }
      // CASE 2: Drag Theme -> Theme (Merge into target theme)
      else if (draggedItem.type === 'theme' && target.type === 'theme') {
          if (draggedItem.name === target.name && draggedItem.parentCat === target.parentCat) return; // Dropped on self
          
          newPapers = newPapers.map(p => {
              if (p.category === draggedItem.parentCat && p.theme === draggedItem.name) {
                  return { ...p, category: target.parentCat!, theme: target.name };
              }
              return p;
          });
          changeMade = true;
      }
      // CASE 3: Drag Category -> Category (Merge into target category)
      else if (draggedItem.type === 'cat' && target.type === 'cat') {
          if (draggedItem.name === target.name) return; // Dropped on self
          
          newPapers = newPapers.map(p => {
              if (p.category === draggedItem.name) {
                  return { ...p, category: target.name };
              }
              return p;
          });
          changeMade = true;
      }
      
      if (changeMade) {
          setPapers(newPapers);
          setIsOptimized(true);
      }
      setDraggedItem(null);
  };

  const handleOptimizeTerms = async () => {
    if (!apiKey || papers.length === 0) return;
    setIsConsolidating(true); 
    setRetryStatus("Running metadata and group normalization...");
    setError(null);

    try {
        const optimization = await optimizeStructureWithGemini(
            papers,
            apiKey,
            reviewTopic,
            selectedModel,
            enableSpecies,
            (msg) => setRetryStatus(msg)
        );

        if (optimization && optimization.moves && optimization.moves.length > 0) {
            const movesMap = new Map(optimization.moves.map(m => [m.paper_id, m]));
            
            setPapers(prevPapers => prevPapers.map(p => {
                const move = movesMap.get(p.id);
                if (move) {
                    return {
                        ...p,
                        // Normalize primary fields (Driver/Response/Location/Species)
                        driver: move.new_driver || p.driver,
                        response: move.new_response || p.response,
                        location: move.new_location || p.location,
                        species: move.new_species || p.species,
                        
                        // Populate grouping fields with the new groups
                        driverGroup: move.new_driver_group || (move.new_driver || p.driver),
                        responseGroup: move.new_response_group || (move.new_response || p.response),
                        
                        // Update Category/Theme (often suggested for normalization)
                        category: move.new_category || p.category,
                        theme: move.new_theme || p.theme,
                    };
                }
                return p;
            }));
            setIsTermsNormalized(true); // Only set separate normalization state
            setError(`✅ Metadata optimization complete. Normalized ${optimization.moves.length} fields.`);
        } else {
            setIsTermsNormalized(true); 
            setError("✅ Metadata optimization complete. No significant field changes suggested.");
        }

        // After initial optimization, set both toggles to grouped state to reflect the refined data immediately.
        setIsDriverGrouped(true);
        setIsResponseGrouped(true);

    } catch (err: any) {
        setError(`Optimization failed: ${err.message}`);
    } finally {
        setIsConsolidating(false);
        setRetryStatus('');
    }
};

  const handleProcessAll = async (resumeFromIndex: number = 0, resumeText: string = '') => {
    if (!inputText.trim() && !resumeText) { setError("Please paste your full list of papers first."); return; }
    if (!apiKey) { setError("Please enter your Google Gemini API Key."); return; }

    trackEvent('start_extraction', { batch_size: inputText.length, model: activeModelId }); 
    setConsolidationSuggestions(null); 
    setIsConsolidationComplete(false); 
    stopSignal.current = false;
    
    // Clean Input
    const rawText = resumeText || inputText;
    const cleanedText = cleanRawText(rawText);
    const textBatches = createBatches(cleanedText, 25000); 

    setTotalBatches(textBatches.length); 
    setCurrentBatchIndex(resumeFromIndex); 
    setIsProcessing(true); 
    setError(null); 
    setRetryStatus('');
    
    let accumulatedPapers = [...papers]; 
    let localBatchCounter = batchCount;
    let pausedForFix = false; 

    try {
      for (let i = resumeFromIndex; i < textBatches.length; i++) {
        if (stopSignal.current) { setError("🛑 Stopped."); break; }
        setCurrentBatchIndex(i + 1);
        const taxonomy: Taxonomy = {};
        accumulatedPapers.forEach(p => { 
          if (!taxonomy[p.category]) taxonomy[p.category] = []; 
          if (!taxonomy[p.category].includes(p.theme)) taxonomy[p.category].push(p.theme); 
        });

        let result;
        let truncated = false;
        try {
            const analysis = await analyzeWithGemini(textBatches[i], taxonomy, apiKey, reviewTopic, activeModelId, enableSpecies, (msg) => setRetryStatus(msg));
            result = analysis.result;
            truncated = analysis.truncated;
        } catch (e: any) {
            if (e.message.includes("malformed data") || e.message.includes("JSON")) {
                setManualFixState({
                    isOpen: true,
                    text: textBatches[i],
                    batchIndex: i
                });
                pausedForFix = true;
                setIsProcessing(false);
                return; 
            }
            throw e; 
        }

        if (truncated) {
            setError("⚠️ Note: Some data in batch " + (i + 1) + " was truncated by the AI limit. Proceeding with partial data.");
        } else {
            setRetryStatus(''); 
        }

        localBatchCounter += 1;
        
        const newPapers: Paper[] = result.papers.map((p, idx) => ({
          id: `b${localBatchCounter}-p${idx}-${Date.now()}`,
          title: p.title, 
          abstractSnippet: p.abstract_summary, 
          category: p.main_category, 
          theme: p.sub_theme,
          driver: p.driver_variable || "Unspecified", 
          driverGroup: p.driver_variable || "Unspecified", 
          response: p.response_variable || "Unspecified", 
          responseGroup: p.response_variable || "Unspecified",
          effectDirection: (p.effect_direction as any) || 'Unclear',
          location: p.study_location || "Unspecified", 
          species: p.study_species || "Unspecified",
          keyFinding: p.key_finding, 
          impactKeywords: p.impact_keywords, 
          batchId: localBatchCounter, 
          authors: p.authors, 
          year: p.year, 
          journal: p.journal, 
          shortCitation: p.short_citation, 
          modelUsed: activeModelId
        }));

        accumulatedPapers = [...accumulatedPapers, ...newPapers];
        setPapers(accumulatedPapers);
        
        const newCats = new Set(newPapers.map(p => p.category));
        setExpandedCategories(prev => {
          const next = { ...prev };
          newCats.forEach(c => next[c] = true);
          return next;
        });

        setBatchCount(localBatchCounter);
        await wait(2000);
      }
      
      // AUTO-AUDIT LOGIC ADDED HERE
      if (!stopSignal.current && accumulatedPapers.length > 0) {
        setRetryStatus("Finalizing: Auditing Taxonomy...");
        
        // 1. Generate unique "Category ||| Theme" list
        const uniquePairs = new Set<string>();
        accumulatedPapers.forEach(p => uniquePairs.add(`${p.category} ||| ${p.theme}`));
        const taxonomyList = Array.from(uniquePairs);

        // 2. Call the superior structural auditor
        const audit = await auditTaxonomyWithGemini(taxonomyList, apiKey, reviewTopic, activeModelId, (msg) => setRetryStatus(msg));
        
        // 3. Apply fixes
        let finalPapers = accumulatedPapers;
        if (audit && audit.fixes && audit.fixes.length > 0) {
           finalPapers = accumulatedPapers.map(p => { 
             const fix = audit.fixes.find(f => f.original_category === p.category && f.original_theme === p.theme); 
             return fix ? { 
               ...p, 
               category: fix.new_category, 
               theme: fix.new_theme
             } : p; 
           });
           setPapers(finalPapers); 
           setError(`✅ Done! Processed ${accumulatedPapers.length} papers. Auto-merged ${audit.fixes.length} categories.`);
        } else {
           setError(`✅ Done! Processed ${accumulatedPapers.length} papers.`);
        }
        setIsOptimized(true);
      }

      setInputText(''); 
      setTimeout(() => resultsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

    } catch (err: any) {
      if (err instanceof QuotaExceededError) {
        setQuotaErrorOpen(true);
        setError("🛑 Stopped due to Quota Limit. Please check the modal.");
      } else {
        setError(`Stopped: ${err.message}`);
      }
    } finally {
      if (!pausedForFix) { 
         setIsProcessing(false);
         setTotalBatches(0);
         setCurrentBatchIndex(0);
         setRetryStatus('');
      }
      stopSignal.current = false;
    }
  };

  const handleManualFixSave = (newText: string) => {
      const resumeIndex = manualFixState?.batchIndex || 0;
      setManualFixState(null);
      setIsProcessing(true);
      
      const taxonomy: Taxonomy = {};
      papers.forEach(p => { 
        if (!taxonomy[p.category]) taxonomy[p.category] = []; 
        if (!taxonomy[p.category].includes(p.theme)) taxonomy[p.category].push(p.theme); 
      });
      
      analyzeWithGemini(newText, taxonomy, apiKey, reviewTopic, activeModelId, enableSpecies, (msg) => setRetryStatus(msg))
        .then(analysis => { 
             const result = analysis.result;
             
             const newPapers = result.papers.map((p, idx) => ({
                  id: `b${batchCount}-fixed-${idx}-${Date.now()}`,
                  title: p.title, 
                  abstractSnippet: p.abstract_summary, 
                  category: p.main_category, 
                  theme: p.sub_theme,
                  driver: p.driver_variable || "Unspecified", 
                  driverGroup: p.driver_variable || "Unspecified", 
                  response: p.response_variable || "Unspecified", 
                  responseGroup: p.response_variable || "Unspecified",
                  effectDirection: (p.effect_direction as any) || 'Unclear',
                  location: p.study_location || "Unspecified", 
                  species: p.study_species || "Unspecified",
                  keyFinding: p.key_finding, 
                  impactKeywords: p.impact_keywords, 
                  batchId: batchCount + 1, // Use the next batch ID
                  authors: p.authors, 
                  year: p.year, 
                  journal: p.journal, 
                  shortCitation: p.short_citation, 
                  modelUsed: activeModelId
            }));
            setPapers(prev => [...prev, ...newPapers]);
            setBatchCount(prev => prev + 1); // Increment batch count
            
            handleProcessAll(resumeIndex + 1); 
        })
        .catch(err => {
             setError("Manual fix failed: " + err.message);
             setManualFixState({ isOpen: true, text: newText, batchIndex: resumeIndex }); 
             setIsProcessing(false);
        });
  };

  const handleClearAll = () => { setPapers([]); setBatchCount(0); setInputText(''); setError(null); setConsolidationSuggestions(null); setIsConsolidationComplete(false); setFilteredPapers(null); setIsOptimized(false); setIsTermsNormalized(false); setRejectedSuggestions([]); setLockedItems([]); setIsDriverGrouped(false); setIsResponseGrouped(false); };
  
  // NEW: Accept Suggestion Handler
  const handleAcceptSuggestion = (suggestionId: string) => {
      const suggestion = consolidationSuggestions?.find(s => s.id === suggestionId);
      if (!suggestion) return;

      let newPapers = [...papers];
      
      // 1. Apply MERGE
      if (suggestion.suggested_merge) {
          const { themes_to_combine, new_theme_name } = suggestion.suggested_merge;
          newPapers = newPapers.map(p => {
              if (p.category === suggestion.main_category && themes_to_combine.includes(p.theme)) {
                  return { ...p, theme: new_theme_name };
              }
              return p;
          });
      }

      // 2. Apply MOVE
      if (suggestion.suggested_move) {
          const { theme, current_category, target_category } = suggestion.suggested_move;
          newPapers = newPapers.map(p => {
              if (p.category === current_category && p.theme === theme) {
                  return { ...p, category: target_category };
              }
              return p;
          });
      }

      // 3. Apply CATEGORY MERGE (and clean up zombie suggestions)
      if (suggestion.suggested_category_merge) {
          const { source_category, target_category } = suggestion.suggested_category_merge;
          newPapers = newPapers.map(p => {
              if (p.category === source_category) {
                  return { ...p, category: target_category };
              }
              return p;
          });

          // UPDATE PENDING SUGGESTIONS to reflect the category merge
          if (consolidationSuggestions) {
             const updatedSuggestions = consolidationSuggestions.map(s => {
                  if (s.id === suggestionId) return s; // Will be removed anyway

                  // If another suggestion was inside the merged category, update it
                  if (s.main_category === source_category) {
                      return { ...s, main_category: target_category };
                  }
                  // Update moves FROM the merged category
                  if (s.suggested_move && s.suggested_move.current_category === source_category) {
                      return { ...s, suggested_move: { ...s.suggested_move, current_category: target_category } };
                  }
                  // Update moves TO the merged category
                  if (s.suggested_move && s.suggested_move.target_category === source_category) {
                      return { ...s, suggested_move: { ...s.suggested_move, target_category: target_category } };
                  }
                  return s;
             });
             setConsolidationSuggestions(updatedSuggestions);
          }
      }

      // 4. Apply RENAME (and update pending suggestions)
      if (suggestion.suggested_rename) {
          const { current_name, new_name } = suggestion.suggested_rename;
          
          // Apply to papers
          newPapers = newPapers.map(p => {
              if (p.category === current_name) {
                  return { ...p, category: new_name };
              }
              return p;
          });

          // CRITICAL: Update other pending suggestions that reference the old name
          if (consolidationSuggestions) {
              const updatedSuggestions = consolidationSuggestions.map(s => {
                  if (s.id === suggestionId) return s; // Ignore current one (will be removed)
                  
                  // If another suggestion is inside the renamed category, update its main_category ref
                  if (s.main_category === current_name) {
                      return { ...s, main_category: new_name };
                  }
                  
                  // If another suggestion is a move FROM the renamed category
                  if (s.suggested_move && s.suggested_move.current_category === current_name) {
                      return { ...s, suggested_move: { ...s.suggested_move, current_category: new_name } };
                  }

                  // If another suggestion is a move TO the renamed category
                  if (s.suggested_move && s.suggested_move.target_category === current_name) {
                      return { ...s, suggested_move: { ...s.suggested_move, target_category: new_name } };
                  }
                  
                  // If another suggestion is a MERGE of this category
                  if (s.suggested_category_merge && s.suggested_category_merge.source_category === current_name) {
                       return { ...s, suggested_category_merge: { ...s.suggested_category_merge, source_category: new_name } };
                  }
                  if (s.suggested_category_merge && s.suggested_category_merge.target_category === current_name) {
                       return { ...s, suggested_category_merge: { ...s.suggested_category_merge, target_category: new_name } };
                  }

                  return s;
              });
              setConsolidationSuggestions(updatedSuggestions);
          }
      }

      setPapers(newPapers);
      setIsOptimized(true); // Structure is optimized, but not terms
      
      // Remove accepted suggestion from list
      setConsolidationSuggestions(prev => prev ? prev.filter(s => s.id !== suggestionId) : null);
  };

  // NEW: Reject Suggestion Handler
  const handleRejectSuggestion = (suggestionId: string) => {
      const suggestion = consolidationSuggestions?.find(s => s.id === suggestionId);
      if (!suggestion) return;

      const signature = getSuggestionSignature(suggestion);
      if (signature) {
          setRejectedSuggestions(prev => [...prev, signature]);
      }
      
      // Remove rejected suggestion from list
      setConsolidationSuggestions(prev => prev ? prev.filter(s => s.id !== suggestionId) : null);
  };

  // NEW: Handle Reverse Suggestion Logic
  const handleReverseSuggestion = async (suggestionId: string) => {
      const suggestion = consolidationSuggestions?.find(s => s.id === suggestionId);
      if (!suggestion) return;
      
      setVerifyingSuggestionId(suggestionId);
      
      try {
          if (suggestion.suggested_category_merge) {
              // CASE 1: Category Merge Reverse
              const { source_category, target_category } = suggestion.suggested_category_merge;
              const result = await reverseSuggestionWithGemini(source_category, target_category, apiKey, activeModelId, () => {});
              
              if (result && result.reason) {
                  // Flip the suggestion in place
                  setConsolidationSuggestions(prev => prev?.map(s => {
                      if (s.id === suggestionId && s.suggested_category_merge) {
                          return {
                              ...s,
                              suggested_category_merge: {
                                  source_category: target_category,
                                  target_category: source_category,
                                  reason: result.reason
                              }
                          };
                      }
                      return s;
                  }) || null);
              }
          } else if (suggestion.suggested_move) {
              // CASE 2: Move Sub-Section Reverse -> Convert to Main Category Merge
              // User logic: "Move Sub A from Cat X to Cat Y" reversed means "Merge Cat Y into Cat X"
              const { current_category, target_category } = suggestion.suggested_move;
              
              // We ask the AI to justify merging the Target into the Current (the reverse of moving the sub-theme out)
              const result = await reverseSuggestionWithGemini(target_category, current_category, apiKey, activeModelId, () => {});

              if (result && result.reason) {
                   setConsolidationSuggestions(prev => prev?.map(s => {
                      if (s.id === suggestionId) {
                          // TRANSFORM into a Category Merge suggestion
                          return {
                              ...s,
                              suggested_move: null,
                              suggested_category_merge: {
                                  source_category: target_category,
                                  target_category: current_category,
                                  reason: `(Reversed Move) ${result.reason}`
                              }
                          };
                      }
                      return s;
                   }) || null);
              }
          }

      } catch (err) {
          console.error("Reverse failed", err);
      } finally {
          setVerifyingSuggestionId(null);
      }
  };

  // NEW: Handle Verify Move Logic
  const handleVerifyMove = async (suggestionId: string) => {
      const suggestion = consolidationSuggestions?.find(s => s.id === suggestionId);
      if (!suggestion || !suggestion.suggested_move) return;

      setVerifyingSuggestionId(suggestionId);

      try {
          const { theme, current_category, target_category } = suggestion.suggested_move;
          
          // Get MORE papers for verification (up to 50)
          const themePapers = papers
            .filter(p => p.category === current_category && p.theme === theme)
            .slice(0, 50)
            .map(p => p.title);

          if (themePapers.length === 0) return;

          const verification = await verifyMoveWithGemini(theme, current_category, target_category, themePapers, apiKey, activeModelId, () => {});
          
          if (verification.isValid) {
               // Mark as verified
               setConsolidationSuggestions(prev => prev?.map(s => s.id === suggestionId ? { ...s, isVerified: true } : s) || null);
          } else {
               // Auto-reject / Remove from list if invalid
               setConsolidationSuggestions(prev => prev?.filter(s => s.id !== suggestionId) || null);
               // Optional: Show a toast saying "Suggestion removed based on deep verification."
          }
      } catch (err) {
          console.error("Verification failed", err);
      } finally {
          setVerifyingSuggestionId(null);
      }
  };

  const handleConsolidateThemes = async () => { 
      if (papers.length === 0 || !apiKey) return; 
      setIsConsolidating(true); 
      setConsolidationSuggestions(null);
      // Reset complete flag to hide the "Refine" message while processing
      setIsConsolidationComplete(false); 
      setRetryStatus("Consolidating Taxonomy...");
      
      try {
        const taxonomy: Taxonomy = {};
        const paperSamples: Record<string, string[]> = {};

        papers.forEach(p => { 
          // Build Taxonomy Structure
          if (!taxonomy[p.category]) taxonomy[p.category] = []; 
          if (!taxonomy[p.category].includes(p.theme)) taxonomy[p.category].push(p.theme); 
          
          // Build Paper Samples (Title only) to provide context for moves
          // FIXED: Use a cleaner key for the prompt
          const sampleKey = `${p.category}: ${p.theme}`;
          if (!paperSamples[sampleKey]) paperSamples[sampleKey] = [];
          if (paperSamples[sampleKey].length < 10) paperSamples[sampleKey].push(p.title);
        });

        // Use the new consolidation logic with rejected suggestions
        const consolidation = await consolidateThemesWithGemini(taxonomy, paperSamples, apiKey, reviewTopic, activeModelId, rejectedSuggestions, lockedItems, (msg) => setRetryStatus(msg));
        
        if (consolidation.suggestions && consolidation.suggestions.length > 0) {
           const suggestionsForUI: ConsolidationSuggestion[] = [];

           consolidation.suggestions.forEach(suggestion => {
              let isMeaningfulChange = false;

              // 1. Check MERGE Validity
              if (suggestion.suggested_merge) {
                 const { themes_to_combine, new_theme_name } = suggestion.suggested_merge;
                 const cleanNewName = new_theme_name.trim();
                 const cleanThemes = themes_to_combine.map(t => t.trim());
                 // Filter out self-merges
                 const isSelfMerge = cleanThemes.length === 1 && cleanThemes[0] === cleanNewName;
                 
                 // FILTER OUT LOCKED SUB-THEMES (If any involved are locked, ignore)
                 const involvesLocked = cleanThemes.some(t => lockedItems.includes(`theme:${suggestion.main_category}|||${t}`));

                 if (!isSelfMerge && cleanThemes.length > 0 && !involvesLocked) {
                     isMeaningfulChange = true;
                 } else {
                    suggestion.suggested_merge = null;
                 }
              }

              // 2. Check MOVE Validity
              if (suggestion.suggested_move) {
                 const { theme, current_category, target_category } = suggestion.suggested_move;
                 const isLocked = lockedItems.includes(`theme:${current_category}|||${theme}`);
                 if (current_category !== target_category && !isLocked) {
                     isMeaningfulChange = true;
                 } else {
                    suggestion.suggested_move = null;
                 }
              }

              // 3. Check CATEGORY MERGE Validity
              if (suggestion.suggested_category_merge) {
                 const { source_category, target_category } = suggestion.suggested_category_merge;
                 const isLocked = lockedItems.includes(`cat:${source_category}`) || lockedItems.includes(`cat:${target_category}`);
                 if (source_category !== target_category && !isLocked) {
                     isMeaningfulChange = true;
                 } else {
                    suggestion.suggested_category_merge = null;
                 }
              }

              // 4. Check RENAME Validity
              if (suggestion.suggested_rename) {
                 const { current_name, new_name } = suggestion.suggested_rename;
                 const isLocked = lockedItems.includes(`cat:${current_name}`);
                 if (current_name !== new_name && !isLocked) {
                     isMeaningfulChange = true;
                 } else {
                    suggestion.suggested_rename = null;
                 }
              }

              if (isMeaningfulChange) {
                  suggestionsForUI.push({
                      id: Math.random().toString(36).substr(2, 9),
                      main_category: suggestion.main_category,
                      suggested_merge: suggestion.suggested_merge,
                      suggested_rename: suggestion.suggested_rename,
                      suggested_move: suggestion.suggested_move,
                      suggested_category_merge: suggestion.suggested_category_merge
                  });
              }
           });

           if (suggestionsForUI.length === 0) {
                setConsolidationSuggestions([{ id: 'ok', main_category: 'Success', suggested_merge: { themes_to_combine: [], new_theme_name: 'Structure is Optimal', reason: 'No significant improvements found.' } }]); 
           } else {
               // DO NOT APPLY AUTOMATICALLY. Just set suggestions.
               setConsolidationSuggestions(suggestionsForUI);
           }
        } else { 
           setConsolidationSuggestions([{ id: 'ok', main_category: 'Success', suggested_merge: { themes_to_combine: [], new_theme_name: 'Structure is Optimal', reason: 'No significant improvements found.' } }]); 
        }
        setIsConsolidationComplete(true);
    } catch (e: any) { setError(e.message); } finally { setIsConsolidating(false); setRetryStatus(''); }
  };
  
  const handleSynthesizeSection = async (cat: string, theme: string) => { 
      if (!apiKey) { setError("No API Key"); return; }
      const targets = papers.filter(p => p.category === cat && p.theme === theme);
      if (!targets.length) return;
      setSynthesisThemeKey(`${cat}-${theme}`); 
      setSynthesisModalOpen(true); 
      setIsSynthesizing(true);
      try { 
        const data = targets.map(p => ({ keyFinding: p.keyFinding, impactKeywords: p.impactKeywords, shortCitation: p.shortCitation })); 
        const res = await synthesizeSectionWithGemini(theme, data, apiKey, reviewTopic, activeModelId, (m)=>setRetryStatus(m)); 
        setSynthesisResult(res); 
      } catch (e: any) { 
        setSynthesisResult({ summary: "Error", contradictionAnalysis: e.message }); 
      } finally { setIsSynthesizing(false); }
  };

  const handleSynthesizeMainCategory = async (cat: string) => {
      if (!apiKey) { setError("No API Key"); return; }
      const targets = papers.filter(p => p.category === cat);
      if (!targets.length) return;
      setSynthesisThemeKey(`${cat}`); // Just the category name
      setSynthesisModalOpen(true);
      setIsSynthesizing(true);
      try { 
        const data = targets.map(p => ({ keyFinding: p.keyFinding, impactKeywords: p.impactKeywords, shortCitation: p.shortCitation })); 
        const res = await synthesizeSectionWithGemini(cat, data, apiKey, reviewTopic, activeModelId, (m)=>setRetryStatus(m)); 
        setSynthesisResult(res); 
      } catch (e: any) { 
        setSynthesisResult({ summary: "Error", contradictionAnalysis: e.message }); 
      } finally { setIsSynthesizing(false); }
  };

  const handleOverallSynthesisAndExport = async () => { 
      if (!apiKey || papers.length === 0) return; 
      setIsBulkSynthesizing(true); 
      setError(null); 
      setRetryStatus('');
      try {
        const grouped: Record<string, Record<string, Paper[]>> = {}; 
        papers.forEach(p => { 
          if (!grouped[p.category]) grouped[p.category] = {}; 
          if (!grouped[p.category][p.theme]) grouped[p.category][p.theme] = []; 
          grouped[p.category][p.theme].push(p); 
        });
        
        const finalSections: any[] = [];
        for (const cat of Object.keys(grouped).sort()) { 
          for (const theme of Object.keys(grouped[cat]).sort()) {
            const pData = grouped[cat][theme].map((p: any) => ({ keyFinding: p.keyFinding, impactKeywords: p.impactKeywords, shortCitation: p.shortCitation }));
            setRetryStatus(`Bulk: ${theme}...`);
            const result = await synthesizeSectionWithGemini(theme, pData, apiKey, reviewTopic, activeModelId, (msg) => setRetryStatus(`Bulk: ${msg}`));
            finalSections.push({ category: cat, theme, result: { ...result, modelUsed: activeModelId } });
          } 
        }
        
        // --- CHANGED: Store in state and open modal instead of immediate download ---
        setBulkResults(finalSections);
        setBulkType('sub');
        setBulkModalOpen(true);
      } catch (err: any) { setError(err.message); } finally { setIsBulkSynthesizing(false); setRetryStatus(''); }
  };

  // NEW: Bulk Synthesis for Main Categories (Aggregating Sub-Themes)
  const handleBulkMainSynthesis = async () => {
      if (!apiKey || papers.length === 0) return; 
      setIsBulkSynthesizing(true); 
      setError(null); 
      setRetryStatus('');
      try {
        const uniqueCats = Array.from(new Set(papers.map(p => p.category))).sort();
        const finalSections: any[] = [];

        for (const cat of uniqueCats) {
            // Get all papers for this MAIN category, regardless of sub-theme
            const catPapers = papers.filter(p => p.category === cat);
            const pData = catPapers.map((p: any) => ({ keyFinding: p.keyFinding, impactKeywords: p.impactKeywords, shortCitation: p.shortCitation }));
            
            setRetryStatus(`Bulk Main: ${cat}...`);
            // We reuse synthesizeSectionWithGemini but pass the Main Category name as the "theme" context
            const result = await synthesizeSectionWithGemini(cat, pData, apiKey, reviewTopic, activeModelId, (msg) => setRetryStatus(`Bulk Main: ${msg}`));
            finalSections.push({ category: cat, result: { ...result, modelUsed: activeModelId } });
        }

        // --- CHANGED: Store in state and open modal instead of immediate download ---
        setBulkResults(finalSections);
        setBulkType('main');
        setBulkModalOpen(true);

      } catch (err: any) { setError(err.message); } finally { setIsBulkSynthesizing(false); setRetryStatus(''); }
  };
  
  const exportToCSV = () => { 
      if (papers.length === 0) return;
      const headers = ["ID", "Short Citation", "Main Category", "Sub-Theme", "Driver", "Response", "Driver Group", "Response Group", "Effect", "Location", "Species", "Key Finding", "Title", "Year", "Journal", "Abstract"];
      const csvContent = [headers.join(","), ...papers.map(p => [`"${p.id}"`, `"${p.shortCitation}"`, `"${p.category}"`, `"${p.theme}"`, `"${p.driver}"`, `"${p.response}"`, `"${p.driverGroup}"`, `"${p.responseGroup}"`, `"${p.effectDirection}"`, `"${p.location}"`, `"${p.species}"`, `"${p.keyFinding}"`, `"${p.title}"`, `"${p.year}"`, `"${p.journal}"`, `"${p.abstractSnippet}"`].join(","))].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv' }); 
      const link = document.createElement("a"); 
      link.href = URL.createObjectURL(blob); 
      link.download = "data.csv"; 
      document.body.appendChild(link); 
      link.click();
  };
  
  const exportStateJSON = () => { 
    if (papers.length === 0) return; 
    const dataToSave = {
        papers,
        reviewTopic,
        isTermsNormalized // Save this state!
    };
    const blob = new Blob([JSON.stringify(dataToSave, null, 2)], { type: 'application/json' }); 
    const link = document.createElement("a"); 
    link.href = URL.createObjectURL(blob); 
    link.download = "state.json"; 
    document.body.appendChild(link); 
    link.click(); 
    setTimeout(() => document.body.removeChild(link), 100);
  };
  
  const importStateJSON = (e: React.ChangeEvent<HTMLInputElement>) => { 
      const file = e.target.files?.[0]; 
      if (!file) return; 
      const reader = new FileReader();
      reader.onload = (evt) => { 
        try { 
          const json = JSON.parse(evt.target?.result as string); 
          if (json.papers) { 
            setPapers(json.papers); 
            setReviewTopic(json.reviewTopic||''); 
            const newExpanded: any = {}; 
            json.papers.forEach((p: Paper) => newExpanded[p.category] = true); 
            setExpandedCategories(newExpanded); 
            
            // Restore normalization state
            setIsTermsNormalized(json.isTermsNormalized || false);
            if (json.isTermsNormalized) {
                 // If previously normalized, default groupings to ON
                 setIsDriverGrouped(true);
                 setIsResponseGrouped(true);
            }
            // If data is loaded, assume it's not preliminary structure unless it is empty
            setIsOptimized(true);

            setError(`Loaded ${json.papers.length} papers.`); 
          } 
        } catch { setError("Invalid JSON"); } 
      };
      reader.readAsText(file);
  };

  const uniqueCategories = Array.from(new Set(papers.map(p => p.category))).sort();

  const renderListView = () => {
    
    // Check if we should show the hint (only if NO suggestions are pending)
    const showConsolidationHint = papers.length > 0 && (!consolidationSuggestions || consolidationSuggestions.length === 0) && !isConsolidating;

    let consolidationHintMessage = "";
    let consolidationHintTitle = "";
    let consolidationHintIcon = <Layers className='h-5 w-5' />;

    if (showConsolidationHint) {
        if (!isConsolidationComplete) {
            consolidationHintTitle = "Optimize Section Structure";
            consolidationHintMessage = "Click **Suggest Merges** to optimize your manuscript structure. The AI will analyze your Sub-Sections to suggest mergers, moves, and renames, helping you build a cleaner Table of Contents. You can manually edit or drag-and-drop sections after running.";
        } else {
            consolidationHintTitle = "Refine Section Structure";
            consolidationHintIcon = <RefreshCw className='h-5 w-5' />;
            consolidationHintMessage = "The previous optimization is complete. To continue refining your Table of Contents, click **Suggest Merges** again. You should re-run this step repeatedly until the AI confirms the structure is optimal, or you can manually adjust sections as needed.";
        }
    }
    
    return (
      <>
        {retryStatus && isBulkSynthesizing && (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 p-3 rounded border border-amber-100 font-medium mb-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              {retryStatus}
            </div>
        )}

        {/* Theme Consolidation Explanation and Suggestions Area */}
        {showConsolidationHint && (
            <div className="p-4 rounded-lg shadow-md border bg-blue-50 border-blue-200 mb-4">
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2 text-blue-800">
                    {consolidationHintIcon}
                    {consolidationHintTitle}
                </h3>
                <p className='text-sm text-blue-700' dangerouslySetInnerHTML={{ __html: consolidationHintMessage }} />
            </div>
        )}
        
        {/* New: Synthesis Explanation Box */}
        {papers.length > 0 && (
            <div className="p-4 rounded-lg shadow-md border bg-yellow-50 border-yellow-200 mb-4">
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2 text-yellow-800">
                    <Zap className='h-5 w-5' />
                    Synthesize Section Findings
                </h3>
                <p className='text-sm text-yellow-700'>
                    Click the ✨ **Sparkle button** next to any Sub-Section header to instantly generate a bulleted summary of all papers within that **single section**, complete with in-text citations, and an **analysis of any contradictory findings**. Use the **Bulk Synthesis & Export** button above to run this process for all sections simultaneously.
                </p>
            </div>
        )}

        {consolidationSuggestions && consolidationSuggestions.length > 0 && (
          <div className={`p-4 rounded-lg shadow-md border mb-4 ${consolidationSuggestions[0].main_category === 'Success' ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2 text-slate-800"><Layers className='h-4 w-4' /> Structuring Suggestions</h3>
            <div className="text-sm text-slate-700 font-medium space-y-4">
                {consolidationSuggestions[0].id === 'ok' ? (
                    <p className="text-green-700">No significant structural changes needed.</p>
                ) : (
                    consolidationSuggestions.map((s) => (
                        <div key={s.id} className="bg-white p-3 rounded border border-slate-200 shadow-sm flex flex-col gap-2">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    {s.suggested_merge && (
                                        <>
                                            <p className="font-bold text-blue-700 flex items-center gap-1"><GitGraph className="h-3 w-3"/> MERGE SUB-SECTIONS</p>
                                            <p className="text-xs text-slate-500 mb-1">In {s.main_category}:</p>
                                            <p className="text-slate-800">{s.suggested_merge.themes_to_combine.join(", ")} <ArrowRight className="h-3 w-3 inline mx-1 text-slate-400"/> <strong>{s.suggested_merge.new_theme_name}</strong></p>
                                            <p className="text-xs text-slate-500 mt-1 italic">"{s.suggested_merge.reason}"</p>
                                        </>
                                    )}
                                    {s.suggested_move && (
                                        <>
                                            <p className="font-bold text-purple-700 flex items-center gap-1"><Move className="h-3 w-3"/> MOVE SUB-SECTION {s.isVerified && <span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded ml-2 flex items-center gap-0.5"><Check className="h-2 w-2"/> Verified</span>}</p>
                                            <p className="text-slate-800">{s.suggested_move.theme}</p>
                                            <p className="text-xs text-slate-500 mb-1">{s.suggested_move.current_category} <ArrowRight className="h-3 w-3 inline mx-1 text-slate-400"/> <strong>{s.suggested_move.target_category}</strong></p>
                                            <p className="text-xs text-slate-500 mt-1 italic">"{s.suggested_move.reason}"</p>
                                        </>
                                    )}
                                    {s.suggested_category_merge && (
                                        <>
                                            <p className="font-bold text-indigo-700 flex items-center gap-1"><GitGraph className="h-3 w-3"/> MERGE MAIN SECTIONS</p>
                                            <p className="text-slate-800">{s.suggested_category_merge.source_category} <ArrowRight className="h-3 w-3 inline mx-1 text-slate-400"/> <strong>{s.suggested_category_merge.target_category}</strong></p>
                                            <p className="text-xs text-slate-500 mt-1 italic">"{s.suggested_category_merge.reason}"</p>
                                        </>
                                    )}
                                    {s.suggested_rename && (
                                        <>
                                            <p className="font-bold text-emerald-700 flex items-center gap-1"><RefreshCw className="h-3 w-3"/> RENAME SECTION</p>
                                            <p className="text-slate-800">{s.suggested_rename.current_name} <ArrowRight className="h-3 w-3 inline mx-1 text-slate-400"/> <strong>{s.suggested_rename.new_name}</strong></p>
                                            <p className="text-xs text-slate-500 mt-1 italic">"{s.suggested_rename.reason}"</p>
                                        </>
                                    )}
                                </div>
                                <div className="flex gap-2 ml-4">
                                    {/* VERIFY BUTTON */}
                                    {s.suggested_move && !s.isVerified && (
                                        <button 
                                          onClick={() => handleVerifyMove(s.id)} 
                                          className={`p-2 rounded transition-colors ${verifyingSuggestionId === s.id ? 'bg-purple-200 text-purple-800' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}
                                          title="Check more papers to verify"
                                          disabled={!!verifyingSuggestionId}
                                        >
                                          {verifyingSuggestionId === s.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <FileSearch className="h-4 w-4"/>}
                                        </button>
                                    )}
                                    
                                    {/* REVERSE BUTTON - NOW FOR BOTH MOVE AND CATEGORY MERGE */}
                                    {(s.suggested_category_merge || s.suggested_move) && (
                                        <button 
                                          onClick={() => handleReverseSuggestion(s.id)}
                                          className={`p-2 rounded transition-colors ${verifyingSuggestionId === s.id ? 'bg-indigo-200 text-indigo-800' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}
                                          title="Reverse direction / Merge instead"
                                          disabled={!!verifyingSuggestionId}
                                        >
                                          {verifyingSuggestionId === s.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <ArrowLeftRight className="h-4 w-4"/>}
                                        </button>
                                    )}

                                    <button onClick={() => handleAcceptSuggestion(s.id)} className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors" title="Accept Suggestion"><Check className="h-4 w-4"/></button>
                                    <button onClick={() => handleRejectSuggestion(s.id)} className="p-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors" title="Reject (Don't ask again)"><X className="h-4 w-4"/></button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
          </div>
        )}
        {uniqueCategories.map(cat => {
            const catPapers = papers.filter(p => p.category === cat);
            const themes = Array.from(new Set(catPapers.map(p => p.theme))).sort();
            const isCatLocked = lockedItems.includes(`cat:${cat}`);

            return (
              <div key={cat} className={`bg-white rounded-lg shadow-sm border overflow-hidden mb-3 ${isCatLocked ? 'border-orange-200' : 'border-slate-200'}`}
                   onDragOver={(e) => handleDragOver(e, `cat:${cat}`)}
                   onDrop={(e) => handleDrop(e, { type: 'cat', name: cat })}
                   draggable={!isCatLocked}
                   onDragStart={(e) => handleDragStart(e, { type: 'cat', name: cat })}
                   style={{ opacity: draggedItem?.type === 'cat' && draggedItem.name === cat ? 0.5 : 1, border: dragOverTarget === `cat:${cat}` ? '2px solid #3b82f6' : '' }}
                   onDragLeave={handleDragLeave}
              >
                <div onClick={() => setExpandedCategories(p => ({...p, [cat]: !p[cat]}))} className={`p-3 border-b flex justify-between cursor-pointer hover:bg-slate-50 ${isCatLocked ? 'bg-orange-50 border-orange-100' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex items-center gap-2 flex-1">
                        {!isCatLocked && <GripVertical className="h-4 w-4 text-slate-300 cursor-grab" />}
                        <FolderOpen className={`h-4 w-4 ${isCatLocked ? 'text-orange-500' : 'text-emerald-600'}`} /> 
                        
                        {editingItem && editingItem.id === `cat:${cat}` ? (
                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                <input 
                                    autoFocus
                                    className="text-sm font-bold text-slate-700 border border-blue-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500"
                                    value={editingItem.value}
                                    onChange={(e) => setEditingItem({...editingItem, value: e.target.value})}
                                    onKeyDown={(e) => { if(e.key === 'Enter') saveEditing(); }}
                                    onBlur={saveEditing}
                                />
                                <button onClick={saveEditing} className="p-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"><Check className="h-3 w-3"/></button>
                            </div>
                        ) : (
                            <span className="font-bold text-slate-700 group flex items-center gap-2">
                                {cat} 
                                {!isOptimized && <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">(Preliminary)</span>}
                                <button onClick={(e) => { e.stopPropagation(); startEditing('cat', cat); }} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-500 transition-opacity p-1"><Edit2 className="h-3 w-3"/></button>
                            </span>
                        )}
                        
                        <div className="flex items-center gap-1 ml-2">
                            <button onClick={(e) => toggleLock(e, 'cat', cat)} className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-200" title={isCatLocked ? "Unlock Main Category" : "Lock Main Category"}>
                                {isCatLocked ? <Lock className="h-3 w-3 text-orange-500" /> : <Unlock className="h-3 w-3" />}
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleSynthesizeMainCategory(cat); }} className="text-yellow-600 hover:bg-yellow-100 p-1 rounded" title="Synthesize Entire Main Category"><Zap className="h-3 w-3" /></button>
                        </div>
                    </div>
                    <span className="text-xs bg-slate-200 px-2 rounded-full">{catPapers.length}</span>
                </div>
                {expandedCategories[cat] && themes.map(theme => {
                    const themePapers = catPapers.filter(p => p.theme === theme);
                    const key = `${cat}-${theme}`;
                    const isThemeLocked = lockedItems.includes(`theme:${cat}|||${theme}`);

                    return (
                      <div key={theme} className="border-b border-slate-100 last:border-0"
                           draggable={!isThemeLocked}
                           onDragStart={(e) => handleDragStart(e, { type: 'theme', name: theme, parentCat: cat })}
                           onDragOver={(e) => handleDragOver(e, `theme:${cat}|||${theme}`)}
                           onDrop={(e) => handleDrop(e, { type: 'theme', name: theme, parentCat: cat })}
                           style={{ opacity: draggedItem?.type === 'theme' && draggedItem.name === theme && draggedItem.parentCat === cat ? 0.5 : 1, border: dragOverTarget === `theme:${cat}|||${theme}` ? '2px solid #3b82f6' : '' }}
                           onDragLeave={handleDragLeave}
                      >
                        <div className={`flex justify-between items-center p-2 pl-8 hover:bg-slate-50 ${isThemeLocked ? 'bg-orange-50/30' : ''}`}>
                            <div onClick={() => setExpandedThemes(p => ({...p, [key]: !p[key]}))} className="flex items-center gap-2 cursor-pointer flex-1">
                              {!isThemeLocked && <GripVertical className="h-3 w-3 text-slate-300 cursor-grab" />}
                              <Tag className={`h-3 w-3 ${isThemeLocked ? 'text-orange-400' : 'text-slate-400'}`} />
                              
                              {editingItem && editingItem.id === `theme:${cat}|||${theme}` ? (
                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                    <input 
                                        autoFocus
                                        className="text-sm font-medium text-slate-700 border border-blue-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500"
                                        value={editingItem.value}
                                        onChange={(e) => setEditingItem({...editingItem, value: e.target.value})}
                                        onKeyDown={(e) => { if(e.key === 'Enter') saveEditing(); }}
                                        onBlur={saveEditing}
                                    />
                                    <button onClick={saveEditing} className="p-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"><Check className="h-3 w-3"/></button>
                                </div>
                              ) : (
                                <span className="text-sm font-medium text-slate-700 group flex items-center gap-2">
                                    {theme}
                                    <button onClick={(e) => { e.stopPropagation(); startEditing('theme', theme, cat); }} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-500 transition-opacity p-1"><Edit2 className="h-3 w-3"/></button>
                                </span>
                              )}

                              <button onClick={(e) => toggleLock(e, 'theme', `${cat}|||${theme}`)} className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-200 ml-1" title={isThemeLocked ? "Unlock Sub-Theme" : "Lock Sub-Theme"}>
                                  {isThemeLocked ? <Lock className="h-3 w-3 text-orange-500" /> : <Unlock className="h-3 w-3" />}
                              </button>
                            </div>
                            <button onClick={() => handleSynthesizeSection(cat, theme)} className="text-yellow-600 hover:bg-yellow-100 p-1 rounded" title="Synthesize Sub-Theme"><Zap className="h-3 w-3" /></button>
                        </div>
                        {expandedThemes[key] && (
                          <div className="pl-12 pr-4 py-2 space-y-2">
                              {themePapers.map(paper => (
                                <div key={paper.id} className="p-3 bg-slate-50 rounded border border-slate-100 text-xs">
                                  <div className="font-bold text-slate-800 mb-1">{paper.title}</div>
                                  <div className="flex gap-2 mb-1 flex-wrap">
                                    <span className="bg-blue-50 text-blue-700 px-1 rounded border border-blue-100 text-[10px]">D: {paper.driver}</span>
                                    <span className="bg-purple-50 text-purple-700 px-1 rounded border border-purple-100 text-[10px]">R: {paper.response}</span>
                                    <span className="bg-slate-100 text-slate-600 px-1 rounded border border-slate-200 text-[10px] flex items-center gap-1"><Globe className="h-2 w-2"/> {paper.location}</span>
                                  </div>
                                  <p className="text-slate-600 mb-1">{paper.abstractSnippet}</p>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )
                })}
              </div>
            )
        })}
      </>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans">
      <QuotaModal isOpen={quotaErrorOpen} onClose={() => setQuotaErrorOpen(false)} exportFn={exportStateJSON} />
      <ManualFixModal isOpen={!!manualFixState} text={manualFixState?.text || ''} onSave={handleManualFixSave} onCancel={() => { setManualFixState(null); setIsProcessing(false); }} />
      <SynthesisModal isOpen={synthesisModalOpen} onClose={() => setSynthesisModalOpen(false)} themeKey={synthesisThemeKey} isSynthesizing={isSynthesizing} retryStatus={retryStatus} result={synthesisResult} />
      {/* --- ADDED: Bulk Synthesis Modal --- */}
      <BulkSynthesisModal isOpen={bulkModalOpen} onClose={() => setBulkModalOpen(false)} results={bulkResults} type={bulkType} />
      
      <header className="bg-emerald-900 text-white p-4 shadow-md flex justify-between items-center z-10">
        <div className="flex items-center gap-3"><BookOpen className="h-6 w-6 text-emerald-300" /><div><h1 className="text-xl font-bold tracking-tight">EcoSynthesisAI</h1><p className="text-xs text-emerald-300 opacity-80">Systematic Review Tool</p></div></div>
        <button onClick={() => setShowSettings(!showSettings)} className="p-2 hover:bg-emerald-800 rounded-full"><Settings className="h-5 w-5" /></button>
      </header>

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        <div className="w-full md:w-1/3 min-w-[350px] flex flex-col border-r border-slate-200 bg-white p-6 shadow-sm z-0">
           {showRateLimitNotice && <div className="hidden md:flex mb-4 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800"><div className="flex-1"><p className="font-bold flex items-center gap-1"><Info className="h-3 w-3"/> API Rate Limits</p><ul className="list-disc pl-4 mt-1 space-y-1"><li>Free Tier has restrictive limits on Gemini 2.5.</li><li>If stuck, switch model to Gemma. Do not combine AI models for extraction step.</li></ul></div><button onClick={() => setShowRateLimitNotice(false)} className="text-amber-600 hover:text-amber-900 self-start ml-2"><X className="h-3 w-3" /></button></div>}

           {showSettings && (
            <div className="mb-4 p-4 bg-slate-100 rounded-lg border border-slate-200 animate-in fade-in slide-in-from-top-2 space-y-4">
              <div><label className="block text-xs font-bold text-slate-500 uppercase">API Key</label><input type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="Paste Google AI Studio Key..." className="w-full p-2 text-sm border rounded" /></div>
              <div><label className="block text-xs font-bold text-slate-500 uppercase">Topic</label><textarea value={reviewTopic} onChange={e=>setReviewTopic(e.target.value)} placeholder="e.g. Urbanization effects on birds" rows={2} className="w-full p-2 text-sm border rounded resize-none" /></div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">AI Model Selection</label>
                <select value={selectedModel} onChange={(e) => { setSelectedModel(e.target.value); }} className="w-full p-2 text-sm border border-slate-300 rounded mb-2 bg-white">
                  {MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                
                {/* BLUE INFO BOX RESTORED */}
                <div className="mt-2 bg-blue-50 p-2 rounded border border-blue-100">
                  <p className="text-xs text-blue-800 font-medium flex items-center gap-1">
                    <Cpu className="h-3 w-3" /> {MODELS.find(m => m.id === selectedModel)?.name}
                  </p>
                  <p className="text-[10px] text-blue-600 mt-1">
                    {MODELS.find(m => m.id === selectedModel)?.desc}
                  </p>
                </div>
              </div>
              
              <div>
                  <label className="flex items-center gap-2 cursor-pointer mt-2">
                      <input type="checkbox" checked={!enableSpecies} onChange={() => setEnableSpecies(!enableSpecies)} className="rounded text-emerald-600 focus:ring-emerald-500" />
                      <span className="text-xs font-medium text-slate-600">My field does not examine species</span>
                  </label>
              </div>

              <div className='flex gap-2 pt-2 border-t border-slate-200'>
                 <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex justify-center items-center py-2 bg-blue-100 text-blue-700 rounded text-xs font-bold cursor-pointer hover:bg-blue-200"><Upload className="h-3 w-3 inline mr-1" /> Import</button>
                 <input ref={fileInputRef} type="file" accept=".json" onChange={importStateJSON} className="hidden" />
                 <button onClick={exportStateJSON} disabled={!papers.length} className="flex-1 py-2 bg-emerald-100 text-emerald-700 rounded text-xs font-bold hover:bg-emerald-200 disabled:opacity-50"><Save className="h-3 w-3 inline mr-1" /> Export</button>
              </div>
            </div>
           )}
           
           <div className="flex items-center justify-between mb-2"><h2 className="text-lg font-semibold flex items-center gap-2"><Plus className="h-5 w-5 text-emerald-600" /> Input Data</h2>{isProcessing && <span className="text-xs font-medium text-emerald-600 animate-pulse">Batch {currentBatchIndex}/{totalBatches}</span>}</div>
           <textarea className="flex-1 w-full p-4 border rounded-lg resize-none text-sm" placeholder="Paste raw paper text here..." value={inputText} onChange={e=>setInputText(e.target.value)} disabled={isProcessing}/>
           <div className="mt-4 flex flex-col gap-2">
             {error && <div className="text-red-600 text-xs bg-red-50 p-2 rounded border border-red-100">{String(error)}</div>}
             <button onClick={isProcessing ? handleStopProcessing : () => handleProcessAll()} disabled={!inputText.trim() || !apiKey} className={`py-3 rounded-lg font-bold text-white shadow-md flex items-center justify-center gap-2 ${isProcessing ? 'bg-red-500' : 'bg-emerald-600'}`}>
                {isProcessing ? <><Loader2 className="h-4 w-4 animate-spin"/> {retryStatus.includes("Stopping") ? "Stopping..." : retryStatus || "Processing..."}</> : (papers.length > 0 ? <><FastForward className="h-4 w-4" /> Continue Extraction</> : <><Play className="h-4 w-4" /> Start Extraction</>)}
             </button>
           </div>
        </div>

        <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden relative">
          <div className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shadow-sm z-10">
             <div className="flex bg-slate-100 p-1 rounded-lg">
                <button onClick={() => setViewMode('folder')} className={`flex gap-2 px-3 py-1.5 rounded text-xs font-bold ${viewMode==='folder'?'bg-white shadow-sm':'text-slate-500'}`}><List className="h-4 w-4"/> List</button>
                <button onClick={() => setViewMode('flow')} className={`flex gap-2 px-3 py-1.5 rounded text-xs font-bold ${viewMode==='flow'?'bg-white shadow-sm text-blue-600':'text-slate-500'}`}><GitGraph className="h-4 w-4"/> Flow</button>
                <button onClick={() => setViewMode('timeline')} className={`flex gap-2 px-3 py-1.5 rounded text-xs font-bold ${viewMode==='timeline'?'bg-white shadow-sm text-purple-600':'text-slate-500'}`}><BarChart2 className="h-4 w-4"/> Trends</button>
                {/* SPLIT ANALYSIS TABS */}
                <button onClick={() => setViewMode('gap_analysis')} className={`flex gap-2 px-3 py-1.5 rounded text-xs font-bold ${viewMode==='gap_analysis'?'bg-white shadow-sm text-emerald-600':'text-slate-500'}`}><Grid3X3 className="h-4 w-4"/> Gaps</button>
                <button onClick={() => setViewMode('geo_analysis')} className={`flex gap-2 px-3 py-1.5 rounded text-xs font-bold ${viewMode==='geo_analysis'?'bg-white shadow-sm text-amber-600':'text-slate-500'}`}><Globe className="h-4 w-4"/> Demographics</button>
                
                <button onClick={() => setViewMode('chat')} className={`flex gap-2 px-3 py-1.5 rounded text-xs font-bold ${viewMode==='chat'?'bg-white shadow-sm text-indigo-600':'text-slate-500'}`}><MessageSquare className="h-4 w-4"/> Chat</button>
             </div>
             
             <div className='flex items-center gap-2'>
                {/* --- UPDATED: Renamed Buttons and New Modal Logic --- */}
                <button onClick={handleOverallSynthesisAndExport} disabled={!papers.length || isBulkSynthesizing || !apiKey} className={`flex gap-1 px-1.5 py-1.5 border rounded text-[10px] font-bold uppercase tracking-wide ${papers.length ? 'hover:bg-yellow-50 text-yellow-700 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}>{isBulkSynthesizing ? <Loader2 className="h-3 w-3 animate-spin"/> : <Zap className="h-3 w-3 fill-yellow-700"/>} Synthesize Sub-Themes</button>
                <button onClick={handleBulkMainSynthesis} disabled={!papers.length || isBulkSynthesizing || !apiKey} className={`flex gap-1 px-1.5 py-1.5 border rounded text-[10px] font-bold uppercase tracking-wide ${papers.length ? 'hover:bg-orange-50 text-orange-700 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}>{isBulkSynthesizing ? <Loader2 className="h-3 w-3 animate-spin"/> : <FileText className="h-3 w-3 fill-orange-700"/>} Synthesize Main Categories</button>
                
                {/* Theme Consolidation Button */}
                <button 
                  onClick={handleConsolidateThemes}
                  disabled={papers.length === 0 || isConsolidating || !apiKey}
                  title={!apiKey ? "API Key required for theme merging." : papers.length === 0 ? "Add papers first." : "Run AI analysis to merge similar sub-themes or confirm distinctness."}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-colors border
                    ${papers.length === 0 || isConsolidating || !apiKey
                      ? 'text-slate-400 border-slate-100 cursor-not-allowed' 
                      : isConsolidationComplete
                        ? 'text-green-700 border-green-200 bg-green-50 hover:bg-green-100'
                        : 'text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100'
                      }`}
                >
                  {isConsolidating ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Layers className="h-3 w-3" />
                  )}
                  {isConsolidating 
                    ? 'Analyzing...' 
                    : isConsolidationComplete
                      ? 'Re-check Structure'
                      : 'Suggest Merges'}
                </button>

                <button 
                  onClick={handleClearAll}
                  className="flex items-center gap-1 px-2 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded border border-transparent hover:border-red-100 transition-colors"
                  title="Reset all data and inputs."
                >
                  <Trash2 className="h-3 w-3" />
                  Reset
                </button>
                <button 
                  onClick={exportToCSV}
                  disabled={papers.length === 0}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-colors border
                    ${papers.length === 0 
                      ? 'text-slate-300 border-slate-100 cursor-not-allowed' 
                      : 'text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100'}`}
                >
                  <Download className="h-3 w-3" />
                  Export CSV
                </button>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {retryStatus && <div className="flex items-center justify-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded mb-2"><Loader2 className="h-3 w-3 animate-spin" /> {retryStatus}</div>}
            
            {viewMode === 'flow' ? (
                <div className="h-full flex flex-col">
                    <div className="mb-4 text-xs text-slate-500 flex justify-between items-center">
                        <span>Click lines to filter papers below. Zoom to explore dense networks.</span>
                        {/* Removed the 'Manuscript Ready' badge */}
                    </div>
                    <div className="flex-1 min-h-[500px]">
                        <FlowDiagram 
                          papers={papers} 
                          onFilter={setFilteredPapers} 
                          isDriverGrouped={isDriverGrouped} 
                          isResponseGrouped={isResponseGrouped} 
                          setIsDriverGrouped={setIsDriverGrouped}
                          setIsResponseGrouped={setIsResponseGrouped}
                          isTermsNormalized={isTermsNormalized}
                          handleOptimizeTerms={handleOptimizeTerms}
                          isConsolidating={isConsolidating}
                          apiKey={apiKey}
                        />
                    </div>
                    {filteredPapers && (
                        <div className="mt-6 border-t border-slate-200 pt-4 animate-in slide-in-from-bottom-4">
                            <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2"><Filter className="h-4 w-4 text-blue-500"/> Selected Papers ({filteredPapers.length})<button onClick={()=>setFilteredPapers(null)} className="text-xs text-blue-500 underline font-normal ml-auto cursor-pointer">Clear</button></h3>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                {filteredPapers.map(p => (
                                    <div key={p.id} className="p-3 bg-white border border-slate-200 rounded shadow-sm text-xs">
                                        <div className="font-bold text-slate-800">{p.title}</div>
                                        <div className="flex gap-2 mt-1"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${p.effectDirection?.includes('Pos') ? 'bg-green-50 text-green-700 border-green-200' : p.effectDirection?.includes('Neg') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>{p.effectDirection} Effect</span><span className="text-slate-500">{p.shortCitation}</span></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : viewMode === 'timeline' ? (
                <div className="h-full">
                    <div className="mb-4 text-xs text-slate-500">Visualize how research topics have shifted over the years.</div>
                    <div className="h-[500px]">
                        <TemporalChart 
                          papers={papers} 
                          isDriverGrouped={isDriverGrouped} 
                          isResponseGrouped={isResponseGrouped} 
                          setIsDriverGrouped={setIsDriverGrouped}
                          setIsResponseGrouped={setIsResponseGrouped}
                          isTermsNormalized={isTermsNormalized}
                          handleOptimizeTerms={handleOptimizeTerms}
                          isConsolidating={isConsolidating}
                          apiKey={apiKey}
                        />
                    </div>
                </div>
            ) : viewMode === 'gap_analysis' ? (
               <div className="h-full border border-slate-200 rounded-lg overflow-hidden flex flex-col">
                  <GapHeatmap 
                    papers={papers} 
                    isDriverGrouped={isDriverGrouped} 
                    isResponseGrouped={isResponseGrouped} 
                    setIsDriverGrouped={setIsDriverGrouped}
                    setIsResponseGrouped={setIsResponseGrouped}
                    isTermsNormalized={isTermsNormalized}
                    handleOptimizeTerms={handleOptimizeTerms}
                    isConsolidating={isConsolidating}
                    apiKey={apiKey}
                  />
               </div>
            ) : viewMode === 'geo_analysis' ? (
               <div className="h-full border border-slate-200 rounded-lg overflow-hidden p-4 bg-white">
                  <GeoSpeciesChart papers={papers} />
               </div>
            ) : viewMode === 'chat' ? (
                <div className="h-full max-w-3xl mx-auto"><ChatPanel papers={papers} apiKey={apiKey} modelId={activeModelId} /></div>
            ) : (
                renderListView()
            )}
            <div ref={resultsEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
