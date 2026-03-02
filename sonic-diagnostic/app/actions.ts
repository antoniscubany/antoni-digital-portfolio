'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

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

        // Models: primary → fallback
        const PRIMARY_MODEL = "gemini-3.1-pro-preview";
        const FALLBACK_MODEL = "gemini-3-pro";

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

        const contentParts = [
            prompt,
            {
                inlineData: {
                    mimeType: mimeType,
                    data: base64Data
                }
            }
        ];

        // Helper: check if error is an overload/rate-limit
        const isOverloadError = (err: unknown): boolean => {
            if (!(err instanceof Error)) return false;
            const msg = err.message.toLowerCase();
            return msg.includes('429') ||
                msg.includes('503') ||
                msg.includes('resource_exhausted') ||
                msg.includes('overloaded') ||
                msg.includes('rate limit') ||
                msg.includes('quota');
        };

        let text: string;
        let usedModel = PRIMARY_MODEL;

        try {
            // Try primary model: Gemini 3.1 Pro
            const model = genAI.getGenerativeModel({ model: PRIMARY_MODEL });
            const result = await model.generateContent(contentParts);
            const response = await result.response;
            text = response.text();
            console.log(`[Sonic] Used primary model: ${PRIMARY_MODEL}`);
        } catch (primaryError) {
            if (isOverloadError(primaryError)) {
                // Fallback to Gemini 3 Pro
                console.warn(`[Sonic] ${PRIMARY_MODEL} overloaded, falling back to ${FALLBACK_MODEL}`);
                usedModel = FALLBACK_MODEL;
                const fallbackModel = genAI.getGenerativeModel({ model: FALLBACK_MODEL });
                const result = await fallbackModel.generateContent(contentParts);
                const response = await result.response;
                text = response.text();
                console.log(`[Sonic] Used fallback model: ${FALLBACK_MODEL}`);
            } else {
                throw primaryError; // Re-throw non-overload errors
            }
        }

        // Parse JSON — strip any accidental markdown fences
        const cleanText = text
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();

        let parsed;
        try {
            parsed = JSON.parse(cleanText);
        } catch {
            console.error("JSON Parse Error. Raw text:", text);
            const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error("Failed to parse AI response as JSON.");
            }
        }

        // Save to DB if user is authenticated
        try {
            const { userId } = await auth();
            if (userId && parsed && !parsed.error) {
                await db.diagnosisLog.create({
                    data: {
                        userId,
                        machineCategory: category,
                        makeModel,
                        symptoms,
                        diagnosisTitle: parsed.diagnosis_title || 'Unknown',
                        severity: parsed.severity || 'Unknown',
                        confidenceScore: parsed.confidence_score || 0,
                        repairCost: parsed.cost_and_action || '',
                        actionPlan: parsed.human_explanation || '',
                    },
                });
                console.log(`[Sonic] Saved diagnosis for user ${userId}`);
            }
        } catch (dbError) {
            // Don't fail the whole request if DB save fails
            console.error("[Sonic] Failed to save diagnosis to DB:", dbError);
        }

        return parsed;

    } catch (error) {
        console.error("AI Error Details:", error);

        let errorMessage = "Failed to analyze media.";
        if (error instanceof Error && error.message) {
            errorMessage += ` Details: ${error.message}`;
        }

        return { error: errorMessage };
    }
}

// ── Fetch user's saved diagnosis history from DB
export async function getUserDiagnosisHistory() {
    try {
        const { userId } = await auth();
        // If no user is logged in, return empty array silently
        if (!userId) {
            return [];
        }

        const history = await db.diagnosisLog.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });

        // Ensure serialization of dates to string for Client Components
        return history.map(log => ({
            ...log,
            createdAt: log.createdAt.toISOString()
        }));

    } catch (error) {
        console.error("[Sonic] Failed to fetch diagnosis history:", error);
        return [];
    }
}