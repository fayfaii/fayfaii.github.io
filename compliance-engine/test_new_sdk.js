import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
console.log("Testing with API Key prefix:", apiKey ? apiKey.substring(0, 15) : "None");

const ai = new GoogleGenAI({ apiKey: apiKey });

async function run() {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: 'Hello! Confirm if this request succeeded.',
        });
        console.log("\n🎉 CONNECTION SUCCESSFUL!");
        console.log("AI Response:", response.text);
    } catch (e) {
        console.error("\n❌ Connection Failed:", e.message);
    }
}

run();
