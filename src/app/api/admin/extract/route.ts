import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { images, paperNumber, subjectName, year, previousContext } = await req.json();
    if (!images?.length) return NextResponse.json({ error: 'Upload at least 1 photo.' }, { status: 400 });

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const isMcq = Number(paperNumber) === 1;

    const prompt = `You are an expert Cameroon GCE Board examiner for ${subjectName} (${year}, Paper ${paperNumber}).
FORMATTING RULE: Never use LaTeX, $ symbols, or \\text{}. Write all numbers, SI units, math formulas, and chemical formulas in clean plain text and standard Unicode symbols (e.g., 800 N, 32,000 J, m/s², cm³, ×, ÷, √, π, θ, °, Ω, μ, H₂O, CO₂, (3x² + 2)/5). Keep each static_explanation ultra-brief (1 short sentence, max 15 words).
${previousContext ? `CONTEXT FROM PREVIOUS PAGE:\n${previousContext}\n` : ''}
Extract ALL questions on the attached page in numerical order and return a JSON array with keys:
- "question_number": integer
- "question_text": string
${isMcq
  ? `- "option_a": string\n- "option_b": string\n- "option_c": string\n- "option_d": string\n- "static_correct_answer": "A"|"B"|"C"|"D"\n- "static_explanation": string`
  : `- "option_a": null\n- "option_b": null\n- "option_c": null\n- "option_d": null\n- "static_correct_answer": string\n- "static_explanation": string`}
Output ONLY valid JSON array.`;

    const imageParts = images.map((url: string) => {
      const [meta, data] = url.split(',');
      const mimeType = meta.match(/:(.*?);/)?.[1] || 'image/jpeg';
      return { inlineData: { data, mimeType } };
    });

    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      generationConfig: {
        responseMimeType: 'application/json',
        // @ts-ignore
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const result = await model.generateContent([prompt, ...imageParts]);
    return NextResponse.json({ questions: JSON.parse(result.response.text()) });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Extraction failed.' }, { status: 500 });
  }
      }
