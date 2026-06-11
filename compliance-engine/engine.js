import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { htmlToText } from 'html-to-text';

// Load environment variables
dotenv.config();

// Initialize terminal interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const promptUser = (query) => new Promise((resolve) => rl.question(query, resolve));

// Load Regulations Database
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'regulations.json');

let regulationsDb = [];
try {
    const rawData = fs.readFileSync(dbPath, 'utf8');
    regulationsDb = JSON.parse(rawData);
} catch (error) {
    console.error("❌ Error loading regulations.json database:", error.message);
    process.exit(1);
}

// Check API Key
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.log("\n⚠️  GEMINI_API_KEY is not set in your environment variables.");
    console.log("Please create a file named '.env' in this 'compliance-engine' folder and add your key:");
    console.log("GEMINI_API_KEY=your_actual_gemini_api_key_here\n");
}

// Helper: Determine MIME type of file attachment
function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
    if (ext === '.png') return 'image/png';
    if (ext === '.pdf') return 'application/pdf';
    return null;
}

// Helper: Convert file to Gemini API attachment format
function fileToGenerativePart(filePath, mimeType) {
    return {
        inlineData: {
            data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
            mimeType: mimeType
        }
    };
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
        
        // Return first 8000 characters to stay within token sizes safely
        return text.substring(0, 8000);
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

// Main AI Reasoning Function with Multimodal support
async function auditCustomsDeclaration(inputSource, origin, direction, lang = "en") {
    if (!process.env.GEMINI_API_KEY) {
        console.log("❌ Cannot run AI analysis: GEMINI_API_KEY is missing. Setup a .env file first.");
        return;
    }

    let commodityDescription = inputSource;
    let filePart = null;
    
    // 1. Detect if input is a URL link
    const isUrl = inputSource.startsWith("http://") || inputSource.startsWith("https://");
    
    // 2. Detect if input is a local file path
    const isFile = fs.existsSync(inputSource) && fs.lstatSync(inputSource).isFile();

    if (isUrl) {
        console.log(`🌐 Scraper: Fetching content from link: ${inputSource}...`);
        const webText = await fetchWebpageText(inputSource);
        if (webText) {
            commodityDescription = `Product Information scraped from Web Link (${inputSource}):\n\n${webText}`;
        } else {
            console.log("⚠️ Could not scrape link. Proceeding with URL string as description.");
        }
    } else if (isFile) {
        const mimeType = getMimeType(inputSource);
        if (mimeType) {
            console.log(`📎 Attachment: Loading document/photo: ${inputSource} (${mimeType})...`);
            filePart = fileToGenerativePart(inputSource, mimeType);
            // We use the filename as a text hint for the model
            commodityDescription = `Attachment File: ${path.basename(inputSource)}. (Inspect the attached file content for product details)`;
        } else {
            console.log("⚠️ Unsupported file format. Please use .jpg, .png, or .pdf.");
        }
    }

    console.log("🔍 Retrieving cross-agency regulations from database...");
    const matchedRules = searchRegulations(commodityDescription);
    
    let rulesContext = "";
    if (matchedRules.length > 0) {
        rulesContext = JSON.stringify(matchedRules, null, 2);
        console.log(`✅ Retrieved ${matchedRules.length} agency-specific controls.`);
    } else {
        rulesContext = "No specific OGA restrictions found in database. Apply general customs rules.";
        console.log("ℹ️ No specific agency controls matched. Applying general rules.");
    }

    console.log("🧠 Invoking Gemini AI compliance auditor...");

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        const languageInstruction = lang.toLowerCase() === 'th'
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
- Commodity/Item Input: "${commodityDescription}"
- Country of Origin: "${origin}"
- Direction: "${direction}"
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
                    console.log(`⚠️ Model busy (503). Retrying in ${delay/1000}s... (${retries} retries left)`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2; // exponential backoff
                } else {
                    throw error; // throw other errors immediately
                }
            }
        }
        const responseText = result.text;

        console.log("\n====================================================================");
        console.log("📋 THAI CUSTOMS INTEGRATED COMPLIANCE REPORT");
        console.log("====================================================================");
        console.log(responseText);
        console.log("====================================================================\n");

    } catch (error) {
        console.error("❌ Gemini API Error:", error.message);
    }
}

// Main CLI loop or Direct arguments
async function main() {
    const args = process.argv.slice(2);
    
    // If arguments are passed, run direct audit and exit
    if (args.length >= 3) {
        const commodity = args[0];
        const origin = args[1];
        const direction = args[2];
        const lang = args[3] || "en";
        
        console.log("=========================================================");
        console.log("🛡️  Thai Customs Cross-Agency AI Compliance (Direct Run)");
        console.log("=========================================================");
        await auditCustomsDeclaration(commodity, origin, direction, lang);
        rl.close();
        process.exit(0);
    }

    // Otherwise, run interactive prompt loop
    console.log("=========================================================");
    console.log("🛡️  Thai Customs Cross-Agency AI Compliance Prototype");
    console.log("=========================================================");
    
    if (!process.env.GEMINI_API_KEY) {
        console.log("\n(Note: Set your GEMINI_API_KEY in .env to enable the Gemini AI reasoning report.)\n");
    }

    while (true) {
        console.log("\n💡 Tip: You can enter text, a URL link, or a local file path (.jpg, .png, .pdf)");
        const commodity = await promptUser("📦 Enter commodity details/link/filepath (or 'exit' to quit): ");
        if (commodity.toLowerCase() === 'exit') {
            break;
        }
        
        const origin = await promptUser("🌍 Enter Country of Origin: ");
        const direction = await promptUser("🔄 Enter Direction (Import/Export): ");
        const langInput = await promptUser("🌐 Enter Output Language (th/en) [default: en]: ");
        const lang = langInput.toLowerCase().trim() === 'th' ? 'th' : 'en';

        await auditCustomsDeclaration(commodity, origin, direction, lang);
    }
    
    rl.close();
    console.log("\nGoodbye!");
}

main();
