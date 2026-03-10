'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// -- IMPORTY DO OBRÓBKI DŹWIĘKU --
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { writeFile, readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "fallback_build_key");

const PRIMARY_MODEL = "gemini-3.1-pro-preview";
const FALLBACK_MODEL = "gemini-3.1-flash-lite-preview";
const FAST_FALLBACK_MODEL = "gemini-3.0-pro";

/* ═══════════════════════════════════════════════════════════
   CREDITS
   ═══════════════════════════════════════════════════════════ */

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

export async function getUserCredits() {
    try {
        const { userId } = await auth();
        if (!userId) return 0;
        const user = await db.user.findUnique({ where: { userId: userId }, select: { credits: true } });
        return user ? user.credits : 1;
    } catch {
        return 0;
    }
}

/* ═══════════════════════════════════════════════════════════
   AUDIO OPTIMIZATION (FFmpeg)
   ═══════════════════════════════════════════════════════════ */

async function optimizeAudio(inputBuffer: Buffer, originalMime: string): Promise<{ base64: string, mimeType: string }> {
    return new Promise(async (resolve, reject) => {
        try {
            const tempId = randomUUID();
            const extension = originalMime.includes('video') ? 'mp4' : 'webm';
            const inputPath = join(tmpdir(), `${tempId}_in.${extension}`);
            const outputPath = join(tmpdir(), `${tempId}_out.mp3`);

            await writeFile(inputPath, inputBuffer);

            ffmpeg(inputPath)
                .noVideo()
                .audioCodec('libmp3lame')
                .audioChannels(1)
                .audioFrequency(16000)
                .audioFilters('volume=1.5')
                .save(outputPath)
                .on('end', async () => {
                    const cleanedBuffer = await readFile(outputPath);
                    await unlink(inputPath).catch(() => { });
                    await unlink(outputPath).catch(() => { });
                    resolve({
                        base64: cleanedBuffer.toString('base64'),
                        mimeType: 'audio/mp3'
                    });
                })
                .on('error', async (err) => {
                    console.error("[FFmpeg] Błąd konwersji:", err);
                    await unlink(inputPath).catch(() => { });
                    reject(err);
                });
        } catch (err) {
            reject(err);
        }
    });
}

/* ═══════════════════════════════════════════════════════════
   HELPER: tryModels — try primary → fallback → fast fallback
   ═══════════════════════════════════════════════════════════ */

async function tryModels(
    contentParts: any[],
    opts?: { responseMimeType?: string; systemInstruction?: string }
): Promise<string> {
    const models = [PRIMARY_MODEL, FALLBACK_MODEL, FAST_FALLBACK_MODEL];

    for (let i = 0; i < models.length; i++) {
        try {
            const config: any = { model: models[i] };
            if (opts?.systemInstruction) config.systemInstruction = opts.systemInstruction;
            if (opts?.responseMimeType) config.generationConfig = { responseMimeType: opts.responseMimeType };

            const model = genAI.getGenerativeModel(config);
            const result = await model.generateContent(contentParts);
            const text = (await result.response).text();
            console.log(`[Sonic] Used model: ${models[i]}`);
            return text;
        } catch (err) {
            console.warn(`[Sonic] ${models[i]} failed:`, (err as Error).message);
            if (i === models.length - 1) throw err;
        }
    }
    throw new Error("All models failed");
}

function parseJSON(text: string): any {
    const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
    try {
        return JSON.parse(clean);
    } catch {
        const match = clean.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        throw new Error("Failed to parse AI response as JSON.");
    }
}

/* ═══════════════════════════════════════════════════════════
   1. ANALYZE MEDIA — Car Diagnostics (updated)
   ═══════════════════════════════════════════════════════════ */

export async function analyzeMedia(formData: FormData) {
    try {
        const file = formData.get('file') as File;
        const analysisGoal = formData.get('analysisGoal') as string || 'Wykryj usterkę';
        const marka = formData.get('marka') as string || 'Nieznana';
        const model = formData.get('model') as string || 'Nieznany';
        const rokProdukcji = formData.get('rokProdukcji') as string || 'Nieznany';
        const przebieg = formData.get('przebieg') as string || 'Nieznany';
        const typPaliwa = formData.get('typPaliwa') as string || 'Nieznany';
        const symptoms = formData.get('symptoms') as string || 'Brak';

        if (!file) return { error: 'No file received.' };

        const { userId } = await auth();
        if (!userId) return { error: "Zaloguj się, aby wykonać diagnozę." };

        const creditCheck = await checkAndDeductCredit(userId);
        if (creditCheck.error) return creditCheck;

        // Optimize audio if not an image or video
        const arrayBuffer = await file.arrayBuffer();
        const rawBuffer = Buffer.from(arrayBuffer);
        let finalBase64: string;
        let finalMimeType: string;

        if (file.type.startsWith('video/') || file.type.startsWith('image/')) {
            console.log(`[Sonic] Zachowywanie pliku wideo/zdjęcia bez obróbki: ${file.type}...`);
            finalBase64 = rawBuffer.toString('base64');
            finalMimeType = file.type;
        } else {
            try {
                console.log(`[Sonic] Optymalizacja audio: ${file.type}...`);
                const optimized = await optimizeAudio(rawBuffer, file.type);
                finalBase64 = optimized.base64;
                finalMimeType = optimized.mimeType;
            } catch {
                finalBase64 = rawBuffer.toString('base64');
                finalMimeType = file.type;
            }
        }

        const makeModelStr = `${marka} ${model}`.trim();

        const prompt = `
Jesteś doświadczonym, empatycznym MECHANIKIEM SAMOCHODOWYM i ekspertem diagnostycznym.
Analizujesz nagranie audio SAMOCHODU. Dźwięk został odszumiony cyfrowo — skup się na dźwiękach mechanicznych.

CEL ANALIZY UŻYTKOWNIKA: "${analysisGoal}"
KONTEKST POJAZDU:
- Marka: ${marka}
- Model: ${model}
- Rok produkcji: ${rokProdukcji}
- Przebieg: ${przebieg}
- Typ paliwa: ${typPaliwa}
- Opisane objawy: ${symptoms}

KRYTYCZNE ZASADY DIAGNOSTYCZNE:
1. NIE HALUCYNUJ: Jeśli audio jest za krótkie, niewyraźne lub niesłyszalne — przyznaj to. Ustaw severity na "SAFE" i confidence_score na 0.
2. DOSTOSUJ SIĘ DO CELU: Użytkownik wybrał cel "${analysisGoal}". Jeśli to "Wykryj usterkę" — szukaj usterek. Jeśli "Ocena stanu" — oceń ogólny stan silnika/podzespołów. Jeśli to coś innego — dostosuj analizę do tego celu.
3. TON: Mów jak przyjazny, godny zaufania ekspert. Unikaj zbyt robotycznego żargonu.
4. ROZUMOWANIE: Opisz DOKŁADNIE, co usłyszałeś i dlaczego wydałeś taki werdykt (np. "W 4 sekundzie słychać metaliczne stukanie...").
5. REALIZM KOSZTÓW: Uwzględnij wiek/markę/przebieg samochodu. Zaproponuj realistyczne kroki.
6. PEWNOŚĆ: Podaj szczerze od 0 do 100%.
7. JĘZYK: Wszystko po polsku (oprócz severity).
8. KONTEKST SAMOCHODOWY: Odnosisz się WYŁĄCZNIE do samochodów — silniki, skrzynia biegów, zawieszenie, hamulce, turbo, rozrząd, sprzęgło itp.

ZWRÓĆ CZYSTY JSON (BEZ MARKDOWN):
{
  "diagnosis_title": "Krótka nazwa problemu (np. Stuk korbowodowy, Wyciek oleju)",
  "severity": "LOW" | "MEDIUM" | "CRITICAL" | "SAFE",
  "confidence_score": 85,
  "reasoning": "Co dokładnie usłyszałeś, co doprowadziło do tej diagnozy?",
  "human_explanation": "Wytłumacz problem prostym językiem dla kierowcy.",
  "cost_and_action": "Szacunkowy koszt naprawy i rekomendowany następny krok.",
  "chat_opener": "Przyjazne pytanie otwierające czat w celu doprecyzowania szczegółów."
}`;

        const contentParts = [
            prompt,
            { inlineData: { mimeType: finalMimeType, data: finalBase64 } }
        ];

        const text = await tryModels(contentParts, { responseMimeType: "application/json" });
        const parsed = parseJSON(text);

        // Save to DB
        try {
            if (parsed && !parsed.error) {
                await db.diagnosisLog.create({
                    data: {
                        userId,
                        machineCategory: 'Auto',
                        makeModel: makeModelStr,
                        symptoms,
                        diagnosisTitle: parsed.diagnosis_title || 'Unknown',
                        severity: parsed.severity || 'Unknown',
                        confidenceScore: parsed.confidence_score || 0,
                        repairCost: parsed.cost_and_action || '',
                        actionPlan: parsed.human_explanation || '',
                    },
                });
            }
        } catch (dbError) {
            console.error("[Sonic] Failed to save diagnosis to DB:", dbError);
        }

        return parsed;

    } catch (error) {
        console.error("AI Error Details:", error);
        return { error: "Wystąpił nieoczekiwany problem podczas analizy pliku. Spróbuj nagrać go jeszcze raz." };
    }
}

/* ═══════════════════════════════════════════════════════════
   2. ANALYZE BIKE FAULT — Bicycle Diagnostics
   ═══════════════════════════════════════════════════════════ */

export async function analyzeBikeFault(formData: FormData) {
    try {
        const file = formData.get('file') as File;
        const context = formData.get('context') as string || 'Brak opisu';
        const bikeType = formData.get('bikeType') as string || 'Nieznany';
        const component = formData.get('component') as string || 'Nieznany';

        if (!file) return { error: 'Nie przesłano pliku.' };

        const { userId } = await auth();
        if (!userId) return { error: "Zaloguj się, aby wykonać diagnozę roweru." };

        const creditCheck = await checkAndDeductCredit(userId);
        if (creditCheck.error) return creditCheck;

        const arrayBuffer = await file.arrayBuffer();
        const rawBuffer = Buffer.from(arrayBuffer);
        const finalBase64 = rawBuffer.toString('base64');
        const finalMimeType = file.type;

        const prompt = `
Jesteś doświadczonym, profesjonalnym MECHANIKIEM ROWEROWYM z 20-letnim stażem w serwisie rowerów.
Analizujesz ZDJĘCIE LUB WIDEO roweru przesłane przez użytkownika w celu zdiagnozowania usterki.

KONTEKST OD UŻYTKOWNIKA:
- Typ roweru: ${bikeType}
- Komponent, którego dotyczy problem: ${component}
- Opis usterki: ${context}

KRYTYCZNE ZASADY DIAGNOSTYCZNE:
1. NIE HALUCYNUJ: Jeśli zdjęcie/wideo jest niewyraźne lub nie widać problemu — przyznaj to. Poproś o lepsze zdjęcie lub więcej informacji.
2. INSTRUKCJE NAPRAWY: Podaj KONKRETNE, krok po kroku instrukcje co i jak zrobić. Wymień potrzebne narzędzia.
3. BEZPIECZEŃSTWO: Jeśli usterka dotyczy hamulców, kierownicy lub ramy — zawsze zaznacz to jako CRITICAL i zalecaj wizytę w serwisie.
4. REALIZM: Oceń czy naprawa jest do zrobienia samodzielnie (DIY) czy wymaga serwisu.
5. KOSZTY: Podaj szacunkowy koszt części zamiennych w PLN.
6. KOMPONENTY ROWEROWE: Łańcuch, kaseta, przerzutki, hamulce (tarczowe/V-brake), opony, szprychy, piasta, suport, korba, pedały, kierownica, mostek, sztyca, siodło, amortyzator, rama.
7. TON: Przyjazny ekspert. Mów jak kolega z warsztatu rowerowego.
8. JĘZYK: Wszystko po polsku.

ZWRÓĆ CZYSTY JSON (BEZ MARKDOWN):
{
  "diagnosis_title": "Krótka nazwa problemu (np. Zużyty łańcuch, Pęknięta szprycha)",
  "severity": "LOW" | "MEDIUM" | "CRITICAL" | "SAFE",
  "confidence_score": 85,
  "affected_component": "Nazwa komponentu (np. Łańcuch, Przerzutka tylna)",
  "diagnosis_details": "Co widzisz na zdjęciu/wideo i co to oznacza?",
  "repair_instructions": "Krok po kroku instrukcja naprawy (ponumerowana lista)",
  "tools_needed": "Lista potrzebnych narzędzi",
  "diy_possible": true,
  "estimated_cost": "Szacunkowy koszt części (np. 50-80 PLN)",
  "chat_opener": "Przyjazne pytanie otwierające czat, np. pytanie o szczegóły które pomogą w diagnozie."
}`;

        const contentParts = [
            prompt,
            { inlineData: { mimeType: finalMimeType, data: finalBase64 } }
        ];

        const text = await tryModels(contentParts, { responseMimeType: "application/json" });
        const parsed = parseJSON(text);

        // Save to DB as bike diagnosis
        try {
            if (parsed && !parsed.error) {
                await db.diagnosisLog.create({
                    data: {
                        userId,
                        machineCategory: 'Rower',
                        makeModel: `${bikeType} — ${component}`,
                        symptoms: context,
                        diagnosisTitle: parsed.diagnosis_title || 'Unknown',
                        severity: parsed.severity || 'Unknown',
                        confidenceScore: parsed.confidence_score || 0,
                        repairCost: parsed.estimated_cost || '',
                        actionPlan: parsed.repair_instructions || '',
                    },
                });
            }
        } catch (dbError) {
            console.error("[Sonic] Failed to save bike diagnosis to DB:", dbError);
        }

        return parsed;

    } catch (error) {
        console.error("[Sonic] Bike analysis error:", error);
        return { error: "Wystąpił problem z analizą zdjęcia/wideo roweru. Spróbuj ponownie." };
    }
}

/* ═══════════════════════════════════════════════════════════
   3. IDENTIFY ENGINE — Shazam for Engines
   ═══════════════════════════════════════════════════════════ */

export async function identifyEngine(formData: FormData) {
    try {
        const file = formData.get('file') as File;
        if (!file) return { error: 'Nie przesłano nagrania.' };

        const { userId } = await auth();
        if (!userId) return { error: "Zaloguj się, aby zidentyfikować silnik." };

        const creditCheck = await checkAndDeductCredit(userId);
        if (creditCheck.error) return creditCheck;

        const arrayBuffer = await file.arrayBuffer();
        const rawBuffer = Buffer.from(arrayBuffer);
        let finalBase64: string;
        let finalMimeType: string;

        try {
            const optimized = await optimizeAudio(rawBuffer, file.type);
            finalBase64 = optimized.base64;
            finalMimeType = optimized.mimeType;
        } catch {
            finalBase64 = rawBuffer.toString('base64');
            finalMimeType = file.type;
        }

        const prompt = `
Jesteś EKSPERTEM od silników samochodowych — rozpoznajesz silniki po dźwięku jak Shazam rozpoznaje muzykę.
Masz ogromną wiedzę o dźwiękach silników różnych marek i modeli.

Przeanalizuj nagranie dźwięku silnika i zidentyfikuj JAKI TO SILNIK.

ZASADY:
1. Na podstawie charakterystyki dźwięku (obroty biegu jałowego, takt, turbo, typ wtrysku, liczba cylindrów, brzmienie wydechu) — określ:
   - Typ silnika (benzyna/diesel/elektryczny/hybryda)
   - Przybliżoną pojemność
   - Liczbę cylindrów
   - Układ (R4, V6, V8, B6, itp.)
   - Potencjalną markę/model jeśli jesteś pewny
2. PEWNOŚĆ: Bądź bezwzględnie szczery z procentem pewności. Jeśli nie jesteś pewny — powiedz to.
3. NIE HALUCYNUJ: Jeśli dźwięk jest zbyt krótki/cichy/niejasny — przyznaj to. Ustaw confidence na 0.
4. SZCZEGÓŁY DŹWIĘKU: Opisz CO dokładnie słyszysz (np. "głęboki, basowy pomruk typowy dla V8", "charakterystyczny syk turbo").
5. JĘZYK: Po polsku.

ZWRÓĆ CZYSTY JSON (BEZ MARKDOWN):
{
  "engine_name": "Pełna identyfikacja (np. BMW N54 3.0 R6 Turbo Benzyna)",
  "engine_type": "Benzyna" | "Diesel" | "Elektryczny" | "Hybryda",
  "displacement": "np. 3.0L",
  "cylinders": "np. 6 cylindrów (R6)",
  "confidence_percent": 72,
  "sound_description": "Opis tego, co słyszysz w nagraniu i dlaczego uważasz, że to ten silnik.",
  "possible_cars": "Auta, które mogą mieć ten silnik (np. BMW 335i, 135i, Z4 35is)"
}`;

        const contentParts = [
            prompt,
            { inlineData: { mimeType: finalMimeType, data: finalBase64 } }
        ];

        const text = await tryModels(contentParts, { responseMimeType: "application/json" });
        const parsed = parseJSON(text);

        // Save engine detection to DB
        try {
            if (parsed && !parsed.error) {
                await db.diagnosisLog.create({
                    data: {
                        userId,
                        machineCategory: 'Silnik',
                        makeModel: parsed.engine_name || 'Nieznany silnik',
                        symptoms: parsed.sound_description || '',
                        diagnosisTitle: `Silnik: ${parsed.engine_name || 'Nieznany'}`,
                        severity: 'SAFE',
                        confidenceScore: parsed.confidence_percent || 0,
                        repairCost: '',
                        actionPlan: parsed.possible_cars || '',
                    },
                });
            }
        } catch (dbError) {
            console.error("[Sonic] Failed to save engine detection to DB:", dbError);
        }

        return parsed;

    } catch (error) {
        console.error("[Sonic] Engine identification error:", error);
        return { error: "Nie udało się zidentyfikować silnika. Spróbuj nagrać dźwięk ponownie." };
    }
}

/* ═══════════════════════════════════════════════════════════
   4. ASK MECHANIC — Car Chat (updated)
   ═══════════════════════════════════════════════════════════ */

export async function askMechanic(
    messages: { role: 'user' | 'model'; content: string }[],
    activeContext?: string,
    diagnosisHistory?: { diagnosisTitle: string; severity: string; confidenceScore: number; makeModel: string; createdAt: string }[]
) {
    try {
        const historyContext = diagnosisHistory && diagnosisHistory.length > 0
            ? `\n\nHISTORIA DIAGNOZ UŻYTKOWNIKA (${diagnosisHistory.length} raportów):\n${diagnosisHistory.slice(0, 5).map((d, i) =>
                `${i + 1}. ${d.diagnosisTitle} | ${d.severity} | ${d.confidenceScore}% pewności | ${d.makeModel || 'brak modelu'} | ${new Date(d.createdAt).toLocaleDateString('pl-PL')}`
            ).join('\n')}`
            : '';

        const systemPrompt = `Jesteś profesjonalnym, empatycznym MECHANIKIEM SAMOCHODOWYM (AI) o imieniu Mechanik.
Specjalizujesz się WYŁĄCZNIE w samochodach — silniki, skrzynie biegów, zawieszenie, elektronika, hamulce, diagnostyka OBD.
Pomagasz użytkownikom diagnozować usterki SAMOCHODOWE na podstawie ich opisu i wyników skanów audio.
Pisz krótko, konkretnie i z pomocnym nastawieniem, unikając lania wody.
Zawsze używaj języka polskiego. NIE UŻYWAJ FORMATOWANIA MARKDOWN z wyjątkiem pogrubień gwiazdką (**ważne**). Żadnych nagłówków (#). Wstawiaj entery dla czytelności.
Jeśli użytkownik pyta o coś niezwiązanego z samochodami — grzecznie przekieruj rozmowę z powrotem na temat motoryzacji.
${activeContext ? `\nAKTUALNA DIAGNOZA (ostatni skan):\n${activeContext}\nOdnoś się do tej diagnozy przy odpowiedziach.` : ''}${historyContext}`;

        const history = messages.slice(0, -1).map(m => ({
            role: m.role,
            parts: [{ text: m.content }]
        }));
        const currentMessage = messages[messages.length - 1].content;

        const model = genAI.getGenerativeModel({
            model: PRIMARY_MODEL,
            systemInstruction: systemPrompt
        });

        const chat = model.startChat({ history });
        const result = await chat.sendMessage(currentMessage);
        const responseText = (await result.response).text();

        return { content: responseText };
    } catch (error) {
        console.error("[Sonic] askMechanic failed:", error);
        return { error: "Przepraszam, mam teraz brudne ręce i nie mogę odpisać. (Błąd połączenia z serwerem)." };
    }
}

/* ═══════════════════════════════════════════════════════════
   5. ASK BIKE MECHANIC — Bicycle Chat
   ═══════════════════════════════════════════════════════════ */

export async function askBikeMechanic(
    messages: { role: 'user' | 'model'; content: string }[],
    activeContext?: string
) {
    try {
        // Token limit: max 20 messages
        if (messages.length > 20) {
            return { error: "LIMIT_REACHED", content: "Osiągnięto limit konwersacji (20 wiadomości). Zacznij nową diagnozę roweru, aby kontynuować." };
        }

        const systemPrompt = `Jesteś profesjonalnym, przyjaznym MECHANIKIEM ROWEROWYM (AI) o imieniu Serwisant.
Specjalizujesz się WYŁĄCZNIE w rowerach — naprawy, konserwacja, dobór części, regulacja przerzutek, hamulców, kół.
Znasz się na rowerach szosowych, MTB, gravelowych, miejskich, e-bike'ach.
Pomagasz użytkownikom: diagnozować usterki, dawać instrukcje naprawy krok po kroku, dobierać narzędzia i części.
Pisz krótko, konkretnie i z pomocnym nastawieniem. Używaj nazw fachowych ale tłumacz je.
Zawsze używaj języka polskiego. NIE UŻYWAJ FORMATOWANIA MARKDOWN z wyjątkiem pogrubień gwiazdką (**ważne**). Żadnych nagłówków (#). Wstawiaj entery dla czytelności.
Jeśli użytkownik pyta o coś niezwiązanego z rowerami — grzecznie przekieruj rozmowę z powrotem na temat rowerów.
${activeContext ? `\nAKTUALNA DIAGNOZA ROWERU:\n${activeContext}\nOdnoś się do tej diagnozy.` : ''}`;

        const history = messages.slice(0, -1).map(m => ({
            role: m.role,
            parts: [{ text: m.content }]
        }));
        const currentMessage = messages[messages.length - 1].content;

        const model = genAI.getGenerativeModel({
            model: PRIMARY_MODEL,
            systemInstruction: systemPrompt
        });

        const chat = model.startChat({ history });
        const result = await chat.sendMessage(currentMessage);
        const responseText = (await result.response).text();

        return { content: responseText };
    } catch (error) {
        console.error("[Sonic] askBikeMechanic failed:", error);
        return { error: "Przepraszam, pompuję właśnie koło i nie mogę odpisać. (Błąd połączenia z serwerem)." };
    }
}

/* ═══════════════════════════════════════════════════════════
   6. FETCH DIAGNOSIS HISTORY
   ═══════════════════════════════════════════════════════════ */

export async function getUserDiagnosisHistory() {
    try {
        const { userId } = await auth();
        if (!userId) return [];

        const history = await db.diagnosisLog.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });

        return history.map(log => ({
            ...log,
            createdAt: log.createdAt.toISOString()
        }));
    } catch (error) {
        console.error("[Sonic] Failed to fetch diagnosis history:", error);
        return [];
    }
}