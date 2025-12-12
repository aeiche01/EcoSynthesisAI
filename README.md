# EcoSynthesisAI: The Systematic Review Assistant

EcoSynthesisAI is a browser-based tool designed to automate the most tedious parts of systematic reviews. It uses advanced Artificial Intelligence (Google's Gemini and Gemma models) to read thousands of research abstracts, extract structured data (Drivers, Responses, Locations, Species), and organize them into a coherent taxonomy. Note that this tool does not find papers based on topics or criteria by searching the web. Instead, it assumes that the user has already curated a full list of papers relevant to their topic of interest that they plan to include in their review, and that the user now needs to better organize and understand this list.

Because this tool runs entirely in your browser (Client-Side), your data and API keys remain private and are never sent to a third-party backend server.

### 🚀 Quick Start Guide

1. Prerequisites

To use this tool, you need a Google AI Studio API Key. This is free, you should just need a Google account (e.g., Gmail).

  - Go to [Google AI Studio](aistudio.google.com).

  - Create a new project (basically just a place to house your API key).

  - Click "Get API Key" in the top left.

Note: The Free Tier is sufficient for small-to-medium reviews. For heavy usage (thousands of papers per day), you may need a paid tier to increase rate limits.

2. Launching the Tool


### 📖 Step-by-Step Instructions

  #### Phase 1: Input & Configuration

  - Enter API Key: Paste your Google AI Studio key into the password field.

  - Define Topic: (Optional but recommended) Enter a short sentence describing your review topic or its title (e.g., "Impact of urbanization on bird song"). This helps the AI understand context.

  - Select AI Model:

      - Gemini 2.5 Flash: Best for quality and complex reasoning. Use this if accuracy is your priority. May have pretty severe limits (e.g., as of December 2025, the free tier for Gemini 2.5 only has 20 requests allowed per day).

      - Gemma 3 27b: Higher rate limits (quota). Use this if you are hitting limits with Gemini.

  - Input Data: Paste your raw list of papers into the large text area on the left.

      - Format: You can paste directly from Excel, CSV, or a text file. The tool expects standard bibliographic formats (Title, Abstract, Authors, Year). Ensure there is at least one blank line between different papers to help the tool separate them.

  #### Phase 2: Extraction & Sorting

  - Click the green "Start Extraction" button.

  - __Wait__: The tool processes papers in batches. You will see a progress indicator (e.g., "Batch 1/5"). Note: Do not close the tab while processing.
  
  - Preliminary Categories: As batches finish, folders will appear on the right. These are marked (Preliminary). This means the AI is still building its understanding of your specific field based on the provided papers.

  ### Phase 3: The "Final Optimization"

  Once all batches are read, the tool automatically runs a "Post-Hoc Optimization".

  - **What is it**? The AI looks at the entire dataset at once to find patterns. It merges synonyms (e.g., changing "Rainfall" and "Precipitation" to the same "Precipitation" category), attempts to fix repeating subdivisions (e.g."Phenological Mismatch" appears in two different categories) and reorganizes folders into a clean manuscript structure.
  
  - Completion: When the "(Preliminary)" tags disappear, your data are categorized. The intent is that the categories are what the sections/subsections of your review may look like.

  ### Phase 4: Handling Errors (The "Manual Fix" Window)

  Sometimes, raw text contains "Mojibake" (garbled characters like Ã© instead of é) or weird formatting that confuses the AI.

  - If a batch fails, extraction will pause, and a "Data Repair Required" window will pop up.
  
  - __Action__: Look at the text in the box. Fix any obvious errors (like deleting a massive block of gibberish text or fixing a broken title).
  
  - Click "Retry Batch". The tool will resume exactly where it left off.

### 📊 Visualizations & Analysis

Use the tabs at the top of the main view to switch between different analytical tools:

  - 📁 List View: The standard folder structure.
      - Feature: Click the ⚡ Sparkle Icon next to any sub-theme to generate a written synthesis and contradiction analysis for that specific topic. **Contradiction analysis** means that the AI will point out any papers that have conflicting results on the same topic (e.g., John Doe et al. 2020 found that deer expand their ranges due to climate change, while Jane Doe et al. 2024 found that deer have contracted their ranges in increasing temperatures).

  - 🔀 Flow Diagram: A Sankey diagram showing connections between Drivers (Causes) and Responses (Effects).
    - Hover: Hover over any bar to highlight connected papers.

  - 📈 Trends: A line chart showing research interest over time.
    - Filters: Toggle between tracking "Drivers" or "Responses".

  - ▦ Gaps: A heatmap showing the "Research Vacuum."
    - **Reading it**: Dark green squares = lots of papers. White squares = no papers (a potential research gap).

  - 🌎 Demographics: Geographic distribution and taxonomic spread (Species/Groups).

  - 💬 Chat: A "Chat with your Data" feature. Ask questions like "Which papers found negative effects of fire in Canada?". Essentially allows for user-generated prompts to be sent to the AI, and the AI will constrain its answers to only the data that has been sorted/categorized. **Please be careful with this feature**. Verify everything.

- 💾 Saving & Exporting

You never want to lose your work!

  - Save Progress: Click "Export" in the settings panel to download a .json file containing all your extracted papers and categories.

  - Resume Later: Refresh the page and click the "Import" button, navigate to your saved .json, and import it to pick up exactly where you left off.

  - Export Data: Click the Download CSV button in the header to get a spreadsheet for Excel/R. There should also be a download data button available for every figure as well.

  - Export Images: Every chart has an Image or Save Image button to download a high-res PNG for your manuscript.

- ⚠️ Troubleshooting

"Google's API has blocked further requests..."

  - Cause: You hit the Free Tier rate limit.

  - Fix: Wait 60 seconds and try again, if this is a requests per minute problem. It is also likely you hit your maximim requests per day. In that case, switch the model to Gemma 3 (which has higher limits).

"AI returned malformed data..."

  - Cause: A specific paper title or abstract was too long or contained broken text, cutting off the AI's response.

  - Fix: The tool usually catches this and opens the "Manual Fix" window. If it persists, try manually shortening the abstract in your source text before pasting.

"The tool seems stuck on 'Finalizing'..."

  - Cause: Determining the final taxonomy for hundreds of papers takes time.

  - Fix: Please be patient. If it takes longer than 30 minutes, check your browser console (F12) for errors. You can safe-refresh and load your last exported JSON to try again.

🔒 Privacy & Security

  - Client-Side Execution: All processing happens in your web browser.

  - Direct Connection: Your API key is sent directly from your computer to Google's servers. It is never sent to us or stored in any database we control.
    
    - We note that there is a tag placed in the webpage that only allows Google Analytics to know whether the tool is used, just to keep us in the loop on the tool's popularity.

  - Data Persistence: Data is stored in your browser's memory. If you close the tab without exporting, data is lost. Save often!