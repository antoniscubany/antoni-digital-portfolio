'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");

// Przyjmujemy natywny format danych (FormData)
export async function analyzeMedia(formData: FormData) {
    try {
        // 1. Odbieramy plik i kontekst z formularza
        const file = formData.get('file') as File;
        const category = formData.get('category') as string || 'Unknown';
        const makeModel = formData.get('makeModel') as string || 'Unknown';
        const symptoms = formData.get('symptoms') as string || 'None provided';

        if (!file) {
            return { error: 'No file received.' };
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Data = buffer.toString('base64');
        const mimeType = file.type;

        // Gemini 3.1 Pro Preview
        const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro-preview" });

        const userContext = `Machine Category: ${category}\nMake & Model: ${makeModel}\nObserved Symptoms: ${symptoms}`;

        const prompt = `
      You are an empathetic, highly skilled Master Mechanic and Engineering Diagnostician.
      Analyze the provided media of a machine.

      USER CONTEXT: Category: ${category}, Make/Model: ${makeModel}, Symptoms: ${symptoms}

      DIAGNOSTIC RULES:
      1. TONE: Speak to the user like a friendly, trustworthy expert. Avoid overly robotic/academic jargon in the explanation. Use Polish language (Język polski).
      2. REASONING: Explain EXACTLY what you heard/saw that led to your conclusion (e.g., "At 0:04 I heard a metallic rhythm...").
      3. COST REALISM: Factor in the age/make of the car. For an old Mazda/BMW, a full engine rebuild (10k PLN) is often absurd; suggest a used engine swap (3k-5k PLN) instead.
      4. CONFIDENCE: State honestly how sure you are (0-100%). If audio is bad, lower the score and say you are guessing.
      5. LANGUAGE: All text fields (except severity) MUST be in Polish.

      RETURN ONLY PURE JSON. NO MARKDOWN.
      { 
        "diagnosis_title": "Short name of the issue (e.g., Rod Knock)",
        "severity": "LOW" | "MEDIUM" | "CRITICAL" | "SAFE", 
        "confidence_score": 85,
        "reasoning": "What exactly did you hear/see to make this conclusion? Build trust here.",
        "human_explanation": "Explain the problem in simple, non-technical terms to a normal person.",
        "cost_and_action": "Realistic cost estimate in PLN and the smartest next step (e.g., 'Tow it, do not drive').",
        "chat_opener": "A proactive, friendly question to start the chat based on the fault (e.g., 'Hey! I noticed that loud rod knock. Do you want to know if it's safe to drive to the shop?')"
      }
    `;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: mimeType,
                    data: base64Data
                }
            }
        ]);

        const response = await result.response;
        const text = response.text();

        // Parse JSON — strip any accidental markdown fences
        const cleanText = text
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();

        try {
            return JSON.parse(cleanText);
        } catch {
            console.error("JSON Parse Error. Raw text:", text);
            const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error("Failed to parse AI response as JSON.");
        }

    } catch (error) {
        console.error("AI Error Details:", error);

        let errorMessage = "Failed to analyze media.";
        if (error instanceof Error && error.message) {
            errorMessage += ` Details: ${error.message}`;
        }

        return { error: errorMessage };
    }
}