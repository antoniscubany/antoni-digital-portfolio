'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
console.log("Config: API Key loaded:", apiKey ? "YES (starts with " + apiKey.substring(0, 5) + "...)" : "NO");

const genAI = new GoogleGenerativeAI(apiKey || "");

export async function analyzeAudio(audioBase64: string) {
    try {
        // 1. Wybór modelu (Gemini 1.5 Flash jest szybki i tani, Pro jest dokładniejszy)
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        // 2. Przygotowanie danych (Prompt Systemowy V2 - Smart Filter)
        const prompt = `
    You are an elite Mechanical & Acoustic Engineer AI. Your job is to diagnose machine faults based on audio.

    STEP 1: CLASSIFY THE AUDIO TYPE.
    - Is it Human Speech / Music / Silence / TV? -> If yes, Diagnosis is "NON-MECHANICAL".
    - Is it a Machine / Engine / Tool / Appliance? -> If yes, proceed to diagnosis.

    STEP 2: ANALYZE (Only if Mechanical).
    - Identify specific anomalies (knocking, hissing, grinding).

    RETURN ONLY RAW JSON. NO MARKDOWN.
    JSON Structure:
    { 
      "detected_source": "Car Engine / Appliance / Music / Unknown", 
      "sound_profile": "Describe sound (e.g. Rhythmic Metallic clunking, Jazz Music, Silence)", 
      "diagnosis": "Specific fault OR 'No Fault Detected' OR 'Not a Machine'", 
      "severity": "LOW" | "MEDIUM" | "CRITICAL" | "INFO", 
      "estimated_cost": "Cost in PLN or 'N/A'", 
      "action_plan": "Technical recommendation or 'Please record a machine sound'" 
    }
    `;

        // 3. Czyszczenie Base64 (usuwamy nagłówek "data:audio/...")
        const base64Data = audioBase64.split(',')[1];

        // 4. Wysyłka do AI
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: "audio/webm", // MediaRecorder in browser typically uses webm
                    data: base64Data
                }
            }
        ]);

        const response = await result.response;
        const text = response.text();

        // 5. Parsowanie JSON (czyszczenie ewentualnych znaczników markdown)
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(cleanText);

    } catch (error: any) {
        console.error("AI Error Details:", error);

        // Wyciąganie konkretnego powodu błędu, jeśli to możliwe
        let errorMessage = "Failed to analyze audio signal.";
        if (error.message) {
            errorMessage += ` Details: ${error.message}`;
        }

        return { error: errorMessage };
    }
}