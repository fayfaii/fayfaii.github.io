import express from 'express';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
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

// Cache variables for uploading customs act.pdf to Gemini Files API
let customsActFileUri = null;
let customsActUploadedTime = null;

async function getCustomsActUri(aiClient) {
    const filePath = path.join(__dirname, 'customs act.pdf');
    if (!fs.existsSync(filePath)) {
        console.log("ℹ️ customs act.pdf not found in compliance-engine folder. Running audit without it.");
        return null;
    }

    // Check if cached URI is valid (less than 24 hours old)
    const oneDayInMs = 24 * 60 * 60 * 1000;
    if (customsActFileUri && customsActUploadedTime && (Date.now() - customsActUploadedTime < oneDayInMs)) {
        console.log("🔄 API: Using cached Gemini Files API URI for customs act.pdf");
        return customsActFileUri;
    }

    try {
        console.log("📤 API: Uploading customs act.pdf to Gemini Files API (this may take a few seconds)...");
        const uploadResult = await aiClient.files.upload({
            file: filePath,
            mimeType: 'application/pdf'
        });
        customsActFileUri = uploadResult.uri;
        customsActUploadedTime = Date.now();
        console.log(`✅ API: customs act.pdf uploaded successfully! URI: ${customsActFileUri}`);
        return customsActFileUri;
    } catch (error) {
        console.error("❌ API: Failed to upload customs act.pdf to Gemini Files API:", error.message);
        return null;
    }
}

// API Endpoint: Run Customs Compliance Audit
app.post('/api/audit', upload.single('fileAttachment'), async (req, res) => {
    try {
        const { commodityDescription, originCountry, tradeDirection, language, webLink, aiProvider, useCustomsAct } = req.body;
        const provider = aiProvider || 'gemini';

        // Check API key for selected provider
        if (provider === 'gemini' && !process.env.GEMINI_API_KEY) {
            return res.status(400).json({ success: false, error: "GEMINI_API_KEY is not configured on the server. Please add it to your .env file." });
        }
        if (provider === 'openai' && !process.env.OPENAI_API_KEY) {
            return res.status(400).json({ success: false, error: "OPENAI_API_KEY is not configured on the server. Please add it to your .env file." });
        }
        if (provider === 'claude' && !process.env.ANTHROPIC_API_KEY) {
            return res.status(400).json({ success: false, error: "ANTHROPIC_API_KEY is not configured on the server. Please add it to your .env file." });
        }
        if (provider === 'minimax' && !process.env.MINIMAX_API_KEY) {
            return res.status(400).json({ success: false, error: "MINIMAX_API_KEY is not configured on the server. Please add it to your .env file." });
        }

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

        const languageInstruction = language === 'th'
            ? "IMPORTANT: You must write the entire report in the THAI language (ภาษาไทย) using professional Thai customs and legal terminology. Translate HS/AHTN descriptions, GIR rationales, agency names, and action checklists into fluent, professional Thai."
            : "IMPORTANT: You must write the entire report in English.";

        const systemInstructions = `
You are a Senior Customs Compliance Auditor and Tariff Nomenclature Classifier for the Thai Customs Department. 
Your job is to assist officers in analyzing imports/exports.

An attached reference document (the Customs Tariff Royal Decree B.E. 2564 / AHTN 2022 Tariff Schedule) may be provided in the request context. If present, consult it as the primary legal source of truth to determine the correct AHTN 8-digit tariff code and check duty categories.

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

        let report = "";

        if (provider === 'gemini') {
            console.log("🧠 API: Invoking Gemini AI compliance auditor...");
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

            const contentParts = [systemInstructions, userPrompt];
            if (filePart) {
                contentParts.push(filePart);
            }

            // Check and attach the Customs Act PDF reference if requested and available
            if (useCustomsAct === 'true' || useCustomsAct === true) {
                const customsActUri = await getCustomsActUri(ai);
                if (customsActUri) {
                    console.log("📎 API: Attaching customs act.pdf to Gemini prompt...");
                    contentParts.push({
                        fileData: {
                            fileUri: customsActUri,
                            mimeType: 'application/pdf'
                        }
                    });
                }
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
            report = result.text;

        } else if (provider === 'openai') {
            console.log("🧠 API: Invoking OpenAI compliance auditor...");
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

            const userContent = [{ type: 'text', text: userPrompt }];
            if (req.file) {
                if (req.file.mimetype.startsWith('image/')) {
                    userContent.push({
                        type: 'image_url',
                        image_url: {
                            url: `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`
                        }
                    });
                } else {
                    userContent.push({
                        type: 'text',
                        text: `\n\n[System Note: A file named "${req.file.originalname}" of type ${req.file.mimetype} was uploaded. Note that this model only supports image uploads visually. For deep PDF scanning, please select Gemini or Claude.]`
                    });
                }
            }

            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemInstructions },
                    { role: 'user', content: userContent }
                ]
            });
            report = response.choices[0].message.content;

        } else if (provider === 'claude') {
            console.log("🧠 API: Invoking Anthropic Claude compliance auditor...");
            const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

            const userContent = [{ type: 'text', text: userPrompt }];
            if (req.file) {
                if (req.file.mimetype.startsWith('image/')) {
                    userContent.push({
                        type: 'image',
                        source: {
                            type: 'base64',
                            media_type: req.file.mimetype,
                            data: req.file.buffer.toString("base64")
                        }
                    });
                } else if (req.file.mimetype === 'application/pdf') {
                    userContent.push({
                        type: 'document',
                        source: {
                            type: 'base64',
                            media_type: 'application/pdf',
                            data: req.file.buffer.toString("base64")
                        }
                    });
                } else {
                    userContent.push({
                        type: 'text',
                        text: `\n\n[System Note: A file named "${req.file.originalname}" of type ${req.file.mimetype} was uploaded. Note that Claude only supports image or PDF uploads. For other types of uploads, please select Gemini.]`
                    });
                }
            }

            const response = await anthropic.messages.create({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 4096,
                system: systemInstructions,
                messages: [
                    { role: 'user', content: userContent }
                ]
            });
            report = response.content[0].text;

        } else if (provider === 'minimax') {
            console.log("🧠 API: Invoking MiniMax compliance auditor...");
            const minimax = new OpenAI({
                baseURL: process.env.MINIMAX_BASE_URL || 'https://api.minimax.io/v1',
                apiKey: process.env.MINIMAX_API_KEY
            });

            const userContent = [{ type: 'text', text: userPrompt }];
            if (req.file) {
                if (req.file.mimetype.startsWith('image/')) {
                    userContent.push({
                        type: 'image_url',
                        image_url: {
                            url: `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`
                        }
                    });
                } else {
                    userContent.push({
                        type: 'text',
                        text: `\n\n[System Note: A file named "${req.file.originalname}" of type ${req.file.mimetype} was uploaded. Note that this model only supports image uploads visually. For deep PDF scanning, please select Gemini or Claude.]`
                    });
                }
            }

            const response = await minimax.chat.completions.create({
                model: 'MiniMax-M3',
                messages: [
                    { role: 'system', content: systemInstructions },
                    { role: 'user', content: userContent }
                ]
            });
            report = response.choices[0].message.content;
        }

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
