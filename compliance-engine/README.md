# 🛡️ Cross-Agency AI Customs Compliance & Tariff Classifier

This directory contains the backend compliance engine and interactive officer dashboard. It uses a hybrid RAG (Retrieval-Augmented Generation) system to audit imports/exports against local ministerial laws and classify commodities into AHTN 8-digit tariff codes.

---

## 📌 Context Recall (For AI Assistants)
> **If the user says: *"let's get back to customs tariff project"*, refer to this README.md as the source of truth for current project state, configuration, and instructions.**

---

## 📁 Project Structure

*   **`server.js`**: Express backend server. Parses uploaded screenshots/PDFs using Multer, performs keyword searches against `regulations.json`, uploads large reference documents to Gemini Files API with a 24-hour cache, and communicates with Gemini, OpenAI, Claude, or MiniMax APIs.
*   **`regulations.json`**: Mini RAG database containing specific agency controls (DOF, MOC, FDA, DLD, Excise) with matching keywords and permit requirements.
*   **`customs act.pdf`**: The full 923-page **Customs Tariff Royal Decree (No. 7) B.E. 2564 (2021 CE)** used as the primary legal source of truth.
*   **`public/`**: Frontend dashboard files (HTML, CSS, JS) implementing:
    *   Drag-and-drop file uploaders (PNG/JPG/PDF)
    *   Model Provider selection dropdown menu (Gemini, Claude, ChatGPT, MiniMax)
    *   Conditional "Deep Audit" checkbox toggle (to reference the 923-page PDF on Gemini)
    *   Dynamic, language-tailored loading status animations

---

## ⚙️ Environment Configuration (`.env`)

Create a `.env` file in this folder with your API keys:
```env
GEMINI_API_KEY=AQ.Ab8RN6JcFO8JS3... (Your Gemini Key)
OPENAI_API_KEY=                     (Optional - for ChatGPT)
ANTHROPIC_API_KEY=                  (Optional - for Claude)
MINIMAX_API_KEY=                    (Optional - for MiniMax)
MINIMAX_BASE_URL=https://api.minimax.io/v1
```

---

## 🚀 How to Run the App

1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Start the server**:
    ```bash
    npm start
    ```
    This launches the local server at **[http://localhost:3000](http://localhost:3000)**.
3.  **Audit Modes**:
    *   **Standard Mode (Fast, 2-3 seconds)**: Uses local RAG rules + AI internal knowledge. Works with all LLM engines.
    *   **Deep Legal Audit (Slow, ~45-60 seconds)**: Only available on Google Gemini. Check the `Reference 923-Page Customs Tariff PDF` box to upload and attach the complete tariff schedule for exact legal matches.
