'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// We provide a fallback string so that Next.js static build doesn't crash if the env var is missing at build time
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "fallback_build_key");

export async function checkAndDeductCredit(userId: string) {
    let userDB = await db.user.findUnique({ where: { userId } });
    if (!userDB) {
        userDB = await db.user.create({ data: { userId, credits: 1 } });
    }

    if (userDB.credits <= 0) {
        return { error: "OUT_OF_CREDITS" };
    }

    await db.user.update({
        where: { userId },
        data: { credits: { decrement: 1 } }
    });

    return { success: true };
}

export async function addPurchasedCredits(userId: string, amount: number) {
    let userDB = await db.user.findUnique({ where: { userId } });
    if (!userDB) {
        await db.user.create({ data: { userId, credits: amount } });
    } else {
        await db.user.update({
            where: { userId },
            data: { credits: { increment: amount } }
        });
    }
    return { success: true };
}

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

        // ── Step 0: User Authentication & Credit Check
        const { userId } = await auth();

        if (!userId) {
            return { error: "Zaloguj się, aby wykonać diagnozę." };
        }

        const creditCheck = await checkAndDeductCredit(userId);
        if (creditCheck.error) {
            return creditCheck; // Will return { error: "OUT_OF_CREDITS" }
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Data = buffer.toString('base64');
        const mimeType = file.type;

        // Models: primary → fallback → last resort
        const PRIMARY_MODEL = "gemini-3.1-pro-preview";
        const FALLBACK_MODEL = "gemini-3-pro";
        const FAST_FALLBACK_MODEL = "gemini-3.0-flash";

        const userContext = `Machine Category: ${category}\nMake & Model: ${makeModel}\nObserved Symptoms: ${symptoms}`;

        const prompt = `
      You are an empathetic, highly skilled Master Mechanic and Engineering Diagnostician.
      Analyze the provided media of a machine.

      USER CONTEXT: Category: ${category}, Make/Model: ${makeModel}, Symptoms: ${symptoms}

      CRITICAL DIAGNOSTIC RULES:
      1. DO NOT HALLUCINATE: If the audio/video is too short, muffled, or unclear, DO NOT make up a diagnosis. Admit you cannot hear it clearly. Ask the user to record closer to the engine or provide more context. In this case, set severity to "SAFE" and confidence_score to 0.
      2. TONE: Speak to the user like a friendly, trustworthy expert. Avoid overly robotic/academic jargon. Use Polish language (Język polski).
      3. REASONING: Explain EXACTLY what you heard/saw that led to your conclusion (e.g., "At 0:04 I heard a metallic rhythm..."). If you didn't hear anything, say so.
      4. COST REALISM: Factor in the age/make of the car. Propose realistic next steps.
      5. CONFIDENCE: State honestly how sure you are (0-100%). If it's a guess, lower the score significantly.
      6. LANGUAGE: All text fields (except severity) MUST be in Polish.

      RETURN ONLY PURE JSON. NO MARKDOWN.
      { 
        "diagnosis_title": "Short name of the issue (e.g., Stuk korbowodowy, or 'Zbyt głośne tło')",
        "severity": "LOW" | "MEDIUM" | "CRITICAL" | "SAFE", 
        "confidence_score": 85,
        "reasoning": "What exactly did you hear/see to make this conclusion?",
        "human_explanation": "Explain the problem in simple terms. If unsure, explain why you need a better recording.",
        "cost_and_action": "Realistic cost estimate in PLN and the smartest next step.",
        "chat_opener": "A proactive, friendly question to start the chat."
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

        let text: string;

        try {
            // Try primary model: Gemini 3.1 Pro
            const model = genAI.getGenerativeModel({ model: PRIMARY_MODEL });
            const result = await model.generateContent(contentParts);
            text = (await result.response).text();
            console.log(`[Sonic] Used primary model: ${PRIMARY_MODEL}`);
        } catch (primaryError) {
            console.warn(`[Sonic] ${PRIMARY_MODEL} failed, attempting fallback to ${FALLBACK_MODEL}. Error:`, (primaryError as Error).message);

            try {
                // Try secondary model: Gemini 3 Pro
                const fallbackModel = genAI.getGenerativeModel({ model: FALLBACK_MODEL });
                const result = await fallbackModel.generateContent(contentParts);
                text = (await result.response).text();
                console.log(`[Sonic] Used secondary model: ${FALLBACK_MODEL}`);
            } catch (secondaryError) {
                console.warn(`[Sonic] ${FALLBACK_MODEL} failed, attempting FAST fallback to ${FAST_FALLBACK_MODEL}. Error:`, (secondaryError as Error).message);

                try {
                    // Try tertiary fallback: Gemini 2.5 Flash (highly available)
                    const fastModel = genAI.getGenerativeModel({ model: FAST_FALLBACK_MODEL });
                    const result = await fastModel.generateContent(contentParts);
                    text = (await result.response).text();
                    console.log(`[Sonic] Used tertiary fast model: ${FAST_FALLBACK_MODEL}`);
                } catch (tertiaryError) {
                    // If everything fails, it's a global API outtage or total overload
                    console.error("[Sonic] ALL models failed. Final error:", tertiaryError);
                    return { error: "Serwery AI są w tej chwili przeciążone. Spróbuj ponownie za kilka minut." };
                }
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

        // Save to DB (credits already deducted at start)
        try {
            if (userId && parsed && !parsed.error) {
                await db.diagnosisLog.create({
                    data: {
                        userId, // Links to User.userId due to updated Prisma relations
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

        // Return a generic, user-friendly error safely without tech jargon
        return { error: "Wystąpił nieoczekiwany problem podczas analizy pliku. Spróbuj nagrać go jeszcze raz." };
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

// ── Fetch user's credit balance
export async function getUserCredits() {
    try {
        const { userId } = await auth();
        if (!userId) return 0;

        const user = await db.user.findUnique({ where: { userId: userId }, select: { credits: true } });
        // If they don't exist yet, we visually assume 1 free credit, though DB guarantees 1 on create
        return user ? user.credits : 1;
    } catch (err) {
        return 0;
    }
}

// ── Virtual AI Mechanic Chat (Gemini)
export async function askMechanic(
    messages: { role: 'user' | 'model'; content: string }[],
    activeContext?: string
) {
    try {
        // Authenticate (chat is available to everyone, even guests, but we check if needed)

        // Ensure prompt emphasizes Polish output and professional mechanic tone
        const systemPrompt = `
Jesteś profesjonalnym, empatycznym mechnikiem samochodowym i przemysłowym (AI).
Pomagasz użytkownikom diagnozować usterki na podstawie ich opisu i odpowiadasz na ich pytania.
Pisz krótko, konkretnie i z pomocnym nastawieniem, unikając lania wody.
Zawsze używaj języka polskiego. NIE UŻYWAJ FORMATOWANIA MARKDOWN z wyjątkiem pogrubień gwiazdką (**ważne**). Żadnych nagłówków (#). Wstawiaj entery dla czytelnosi. 

${activeContext ? `AKTUALNY KONTEKST UŻYTKOWNIKA (Maszyna / Ostatni Skan):\n${activeContext}\nUżyj tego kontekstu do budowania swoich odpowiedzi, o ile to możliwe.` : ''}
`;

        const model = genAI.getGenerativeModel({
            model: "gemini-3.1-pro-preview",
            systemInstruction: systemPrompt
        });

        const history = messages.slice(0, -1).map(m => ({
            role: m.role,
            parts: [{ text: m.content }]
        }));

        const currentMessage = messages[messages.length - 1].content;

        const chat = model.startChat({
            history: history,
        });

        const result = await chat.sendMessage(currentMessage);
        const responseText = (await result.response).text();

        return { content: responseText };
    } catch (error) {
        console.error("[Sonic] askMechanic failed:", error);
        return { error: "Przepraszam, mam teraz brudne ręce i nie mogę odpisać. (Błąd połączenia z serwerem)." };
    }
}