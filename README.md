# EcoSynthesisAI: The Systematic Review Assistant

EcoSynthesisAI is a browser-based tool designed to automate one of the most tedious parts of systematic reviews. It uses advanced Artificial Intelligence (Google's Gemini and Gemma models) to read thousands of research abstracts, extract structured data (Drivers, Responses, Locations, Species), and organize them into a coherent taxonomy.

> **Note:** EcoSynthesisAI does *not* perform web searches or fetch papers. It assumes the user already has a curated list of papers (e.g., from Web of Science) and needs help organizing and understanding them.

Although it was originally designed to assist with Ecology reviews, the tool is based entirely on Google's AI models and therefore should be applicable to any field of science.

## Why use EcoSynthesisAI?

Conducting a large-scale systematic review often requires a team to hold thousands of disparate findings in their heads simultaneously to find patterns. EcoSynthesisAI solves this "cognitive bottleneck" by turning a flat list of papers into a structured workspace.

1. **From Abstract to Outline**
The tool automatically sorts papers into connected Themes (Main Sections) and Sub-Themes (Sub-Sections) that mirror the structure of a final review paper. This transforms a chaotic spreadsheet into a logical Table of Contents before you even start writing.

2. **Streamlined Collaboration**
By organizing literature into distinct conceptual buckets, research teams can easily split the writing workload. A researcher assigned to the "Physiological Responses" section only needs to review the papers specifically sorted into that theme, rather than wading through the entire library.

3. **Accelerated Insight**
Instead of researchers manually cross-referencing hundreds of PDFs to find disagreements in the literature, the tool's Synthesis Engine instantly flags papers that provide conflicting evidence on a topic while also summarizing the overall evidence present in each theme. This allows researchers to immediately pinpoint the most contentious or complex areas of their field and focus their intellectual energy where it matters most.

4. **Private & Client-Side**
Because the tool runs entirely in your browser (client-side), your ideas and research data are only communicated with Google's AI models and never sent elsewhere. Your API key is only used to access Google servers and otherwise never leaves your browser.
---

## 🚀 Quick Start Guide

### 1. Prerequisites

To use EcoSynthesisAI, you need a **Google AI Studio API Key** (free with a Google account).

- Go to [Google AI Studio](https://aistudio.google.com)
- Create a new project
- Click **"Get API Key"** in the top left

**Note:**  
As of December 2025, the free tier works well with the Gemma model while Gemini 2.5 has strict limits per day. Large workloads that require Gemini's more advanced model may require a paid tier to increase rate limits.

---
### 2. Launching the Tool

## 📖 Step-by-Step Instructions

### Phase 1: Input & Configuration

- **Enter API Key:**  
  Paste your Google AI Studio key into the password field.

- **Define Topic (optional):**  
  Enter a short description of your review topic (e.g., *"Impact of urbanization on bird song"*).  
  This provides context for the AI.

- **Select AI Model:**
  
  - **Gemini 2.5 Flash**  
    Best quality and reasoning. Recommended when accuracy is the priority.  
    *Free tier limits are low (≈20 requests/day as of Dec 2025).*
  
  - **Gemma 3 27B**  
    Higher rate limits. Use this if you hit Gemini’s quota.

- **Input Data:**  
  Paste your raw list of papers into the large text box.

  **Format Requirements:**
  - Accepts text copied from Excel, CSV, or plain text
  - Should include Title, Abstract, Authors, and Year
  - Ensure **one blank line** between papers for proper separation

---

### Phase 2: Extraction & Sorting

- Click **Start Extraction** (green button)
- **Wait** while papers are processed in batches  
  (e.g., *"Batch 1/5"*)

> **Do not close the tab during processing.**

- **Preliminary Categories:**  
  As batches finish, folders appear on the right and are labeled **(Preliminary)**.  
  These reflect early structure while the AI learns field-specific patterns.

---

### Phase 3: Final Optimization

After all batches are processed, the tool performs a **Post-Hoc Optimization**.

**What it does:**

- Merges synonyms  
  (e.g., *Rainfall* → *Precipitation*)
- Fixes repeated subcategories  
- Reorganizes folders into a clean manuscript-like taxonomy

**Completion:**  
When all **(Preliminary)** tags disappear, the final categorization is complete.

---

### Phase 4: Handling Errors (Manual Fix Window)

Some input text may contain encoding errors (“Mojibake”: *Ã©* instead of *é*) or malformed content.

- If a batch fails, a **Data Repair Required** window appears.
- **Your task:**  
  Inspect the displayed text and correct any obvious issues  
  (gibberish blocks, broken titles, etc.)
- Click **Retry Batch** to continue processing.

---

## 📊 Visualizations & Analysis

Switch between analysis modes using the tabs at the top of the interface.

### 📁 List View
Standard folder view.

**Features:**
- Click the **⚡ Sparkle Icon** next to a sub-theme to generate:  
  - A written synthesis  
  - A contradiction analysis  
    - e.g., highlighting conflicting findings across papers

### 🔀 Flow Diagram
A Sankey diagram linking **Drivers (Causes)** to **Responses (Effects)**.

- Hover to highlight connected papers

### 📈 Trends
A time-series showing **research interest over time**.

- Filters available for Drivers or Responses

### ▦ Gaps
A heatmap showing the **Research Vacuum**.

- Dark green = many papers  
- White = research gap

### 🌎 Demographics
Geographic and taxonomic (species/group) distributions.

### 💬 Chat
Ask natural-language questions about your dataset.  
Example: *"Which papers found negative effects of fire in Canada?"*

> **Warning:** Always verify results generated through Chat.

---

## 💾 Saving & Exporting

Avoid losing progress!

- **Export Progress:**  
  Click **Export** to download a `.json` file of all extracted data and categories.

- **Resume Later:**  
  After refreshing the page, click **Import** and load your saved JSON.

- **Export Data:**  
  Use **Download CSV** to export tables for Excel/R.  
  Figures also provide downloadable data tables.

- **Export Images:**  
  All charts include a **Save Image** button for high-resolution PNGs.

---

## ⚠️ Troubleshooting

### "Google's API has blocked further requests..."
- **Cause:** Rate limit reached  
- **Fix:**  
  - Wait 60 seconds (if per-minute limit)  
  - Switch to **Gemma 3** (higher daily quota)

### "AI returned malformed data..."
- **Cause:** Very long or corrupted abstract  
- **Fix:**  
  - Use the **Manual Fix** window  
  - Or shorten the abstract before re-pasting

### "The tool seems stuck on 'Finalizing'..."
- **Cause:** Large-dataset taxonomy resolution  
- **Fix:**  
  - Wait (can take several minutes)  
  - If >30 minutes, check browser console (F12)  
  - Safe-refresh and reload your exported JSON

---

## 🔒 Privacy & Security

- **Client-Side Execution:**  
  All processing occurs in your browser.

- **Direct Connection:**  
  Your API key is sent only from your device to Google’s servers.  
  It is **never** sent to us or stored by us.

- **Minimal Analytics:**  
  A tag allows Google Analytics to record that the tool was opened—no data content is tracked.

- **Data Persistence:**  
  Data lives in browser memory only.  
  **Closing the tab without exporting will erase your progress.**

**Save often!**

---
