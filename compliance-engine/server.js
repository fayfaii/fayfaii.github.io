import express from 'express';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { htmlToText } from 'html-to-text';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Setup in-memory file uploads (saves disk space and prevents server clutter)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Resolve paths in ES Module environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static frontend dashboard files
app.use(express.static(path.join(__dirname, 'public')));

// Load Regulations Database
const dbPath = path.join(__dirname, 'regulations.json');
let regulationsDb = [];
try {
    const rawData = fs.readFileSync(dbPath, 'utf8');
    regulationsDb = JSON.parse(rawData);
} catch (error) {
    console.error("❌ Error loading regulations.json database:", error.message);
    process.exit(1);
}

// Helper: Fetch text contents from a webpage link
async function fetchWebpageText(url) {
    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) CustomsComplianceEngine/1.0' }
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const html = await response.text();
        const text = htmlToText(html, {
            wordwrap: 130,
            selectors: [
                { selector: 'a', options: { ignoreHref: true } },
                { selector: 'img', format: 'skip' }
            ]
        });
        return text.substring(0, 8000); // return first 8000 chars
    } catch (e) {
        console.error(`⚠️ Error reading link: ${e.message}`);
        return null;
    }
}

// Simple RAG Filter: Finds matching regulations based on keywords in the product description
function searchRegulations(query) {
    const q = query.toLowerCase();
    const matchedRegulations = [];

    regulationsDb.forEach(agencyData => {
        const matchingControls = [];
        
        agencyData.controls.forEach(control => {
            const hasKeywordMatch = control.keywords.some(keyword => q.includes(keyword));
            if (hasKeywordMatch) {
                matchingControls.push(control);
            }
        });

        if (matchingControls.length > 0) {
            matchedRegulations.push({
                agency: agencyData.agency,
                statute: agencyData.statute,
                scope: agencyData.scope,
                controls: matchingControls
            });
        }
    });

    return matchedRegulations;
}

// API Endpoint: Run Customs Compliance Audit
app.post('/api/audit', upload.single('fileAttachment'), async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ success: false, error: "GEMINI_API_KEY is not configured on the server." });
    }

    try {
        const { commodityDescription, originCountry, tradeDirection, language, webLink } = req.body;
        let finalDescription = commodityDescription || "";
        let filePart = null;

        // 1. Handle Web Link Scrape
        let isLinkBlocked = false;
        if (webLink && webLink.trim().startsWith('http')) {
            console.log(`🌐 API: Fetching content from link: ${webLink}...`);
            const webText = await fetchWebpageText(webLink.trim());
            if (webText) {
                finalDescription += `\n\nProduct Information scraped from Web Link (${webLink}):\n\n${webText}`;
            } else {
                isLinkBlocked = true;
            }
        }

        // 2. Handle File Attachment
        if (req.file) {
            console.log(`📎 API: Loading uploaded file: ${req.file.originalname} (${req.file.mimetype})...`);
            filePart = {
                inlineData: {
                    data: req.file.buffer.toString("base64"),
                    mimeType: req.file.mimetype
                }
            };
            finalDescription += `\n\nAttachment File: ${req.file.originalname}. (Inspect the attached file content for product details)`;
        }

        // If the link failed and no other inputs are provided, return a specific block error
        if (isLinkBlocked && !commodityDescription.trim() && !req.file) {
            return res.status(400).json({ 
                success: false, 
                error: "Could not access the website link. The website returned a 403 Forbidden error (this is common for e-commerce sites like Power Buy that use Cloudflare anti-bot security). Please copy-paste the text of the product specs into the description box instead!" 
            });
        }

        if (!finalDescription.trim()) {
            return res.status(400).json({ success: false, error: "Please provide either a commodity description, an uploaded file, or a URL link." });
        }

        // 3. Regulation search (RAG)
        const matchedRules = searchRegulations(finalDescription);
        let rulesContext = matchedRules.length > 0
            ? JSON.stringify(matchedRules, null, 2)
            : "No specific OGA restrictions found in database. Apply general customs rules.";

        console.log("🧠 API: Invoking Gemini AI compliance auditor...");
        const ai = new GoogleGenAI({ apiKey: apiKey });

        const languageInstruction = language === 'th'
            ? "IMPORTANT: You must write the entire report in the THAI language (ภาษาไทย) using professional Thai customs and legal terminology. Translate HS/AHTN descriptions, GIR rationales, agency names, and action checklists into fluent, professional Thai."
            : "IMPORTANT: You must write the entire report in English.";

        const systemInstructions = `
You are a Senior Customs Compliance Auditor and Tariff Nomenclature Classifier for the Thai Customs Department. 
Your job is to assist officers in analyzing imports/exports.

If an attachment file (photo or PDF) is provided, inspect it carefully. Identify the product's composition, brand, model, materials, or technical specs from the document/photo.

Your output must do the following:
1. Determine the 8-digit ASEAN Harmonized Tariff Nomenclature (AHTN) 2022 code.
2. Explain the WCO General Interpretative Rules (GIR) applied.
3. Perform a Cross-Agency Compliance check (prohibitions, restrictions, permits) based on the current ministerial laws provided in the context.

Use the following legal context (retrieved from Thai ministry databases) to check restrictions:
---
${rulesContext}
---

${languageInstruction}

Structure your final report in clean Markdown with the following sections:
- **🔍 CLASSIFICATION REPORT**: Show the HS Code (6-digit), AHTN Code (8-digit), Heading Description, and a detailed GIR Rationale (e.g., GIR 1, GIR 3(b) for composites, etc.).
- **🏛️ CROSS-AGENCY COMPLIANCE CHECK**: List the status for each relevant ministry (Commerce, Fisheries, FDA, Livestock, Excise). State if the item is "Permitted", "Prohibited", or "Restricted (Permit Required)" based on the context rules.
- **📝 OFFICER ACTION CHECKS**: List bullet points of what documents, licenses, or National Single Window (NSW) permit forms the importer must submit (e.g., Form Thor.4, FDA L.4, Health Certificate, import license).
`;

        const userPrompt = `
Analyze the following trade declaration:
- Commodity/Item Input: "${finalDescription}"
- Country of Origin: "${originCountry || 'Not Specified'}"
- Direction: "${tradeDirection || 'Import'}"
`;

        const contentParts = [systemInstructions, userPrompt];
        if (filePart) {
            contentParts.push(filePart);
        }

        let result;
        let retries = 4;
        let delay = 3000;
        
        while (retries > 0) {
            try {
                result = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: contentParts
                });
                break; // success, break out of loop
            } catch (error) {
                if (error.message.includes("503") || error.message.includes("UNAVAILABLE") || error.message.includes("demand")) {
                    retries--;
                    if (retries === 0) throw error;
                    console.log(`⚠️ API: Model busy. Retrying in ${delay/1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2;
                } else {
                    throw error;
                }
            }
        }

        const report = result.text;
        res.json({ success: true, report });

    } catch (error) {
        console.error("❌ API Error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`========================================================`);
    console.log(`🚀 Thai Customs AI Compliance Server running locally!`);
    console.log(`🔗 Web Dashboard: http://localhost:${port}`);
    console.log(`========================================================`);
});
