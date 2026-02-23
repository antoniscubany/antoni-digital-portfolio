'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");

export async function analyzeMedia(
    base64Data: string,
    mimeType: string,
    context: { category: string; makeModel: string; symptoms: string }
) {
    try {
        // Gemini 2.0 Flash — fast multimodal (audio, video, image)
        const model = genAI.getGenerativeModel({ model: "gemini-3.1-pro" });

        const userContext = `Machine Category: ${context.category}\nMake & Model: ${context.makeModel || 'Unknown'}\nObserved Symptoms: ${context.symptoms || 'None provided'}`;

        const prompt = `
    You are an Elite Multimodal Diagnostic AI — a Master Mechanic, Acoustician, and Visual Inspector.
    You will receive an image, audio, OR video of a machine.
    Analyze ALL available cues simultaneously:
    - ACOUSTIC: knocking, grinding, hissing, belt squeal, bearing whine, rhythm anomalies
    - VISUAL: smoke, vibrations, warning lights, broken/worn parts, fluid leaks, rust, discoloration

    USER PROVIDED CONTEXT:
    """
    ${userContext}
    """

    STRICT RULES OF ENGAGEMENT:
    1. CONTEXT IS KING: If the context says it's a "Washing Machine", DO NOT diagnose a "Car Engine". If it says "BMW", tailor the faults to common BMW issues.
    2. ANTI-HALLUCINATION: If the input is just wind, silence, people talking, music, a selfie, or a non-machine image, output "NON-MECHANICAL NOISE" and "INFO" severity. Do NOT invent a mechanical fault.
    3. THE "NOMINAL" RULE: If the machine looks/sounds perfectly normal, smooth, and rhythmic (no visual damage, no acoustic anomalies), you MUST diagnose it as "SYSTEM NOMINAL".
    4. BE SPECIFIC: Do not say "Engine is broken". Say "Worn serpentine belt" or "Connecting rod bearing failure (Rod Knock)".
    5. MULTIMODAL CROSS-REFERENCE: If you have both audio AND visual data (e.g. video), cross-reference them. A grinding sound + visible rust on a bearing = higher confidence.

    RETURN ONLY PURE JSON. NO MARKDOWN. NO BACKTICKS.
    Structure:
    { 
      "detected_source": "Short specific string based on context & input", 
      "sound_profile": "Detailed description of acoustic/visual anomaly (or lack thereof)", 
      "diagnosis": "Precise mechanical fault estimation (or 'System Nominal')", 
      "severity": "LOW" | "MEDIUM" | "CRITICAL" | "INFO" | "SAFE", 
      "estimated_cost": "Cost estimate in PLN (e.g., '1500 - 3000 PLN' or 'N/A')", 
      "action_plan": "Specific, actionable technical recommendation" 
    }
    `;

        // Strip the data URI header if present (e.g. "data:audio/webm;base64,...")
        const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: mimeType,
                    data: cleanBase64
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