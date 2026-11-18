import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    const { images, paperNumber, subjectName, year } = await req.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: 'Please upload at least one snapped page photo.' },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.8-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const isMcq = Number(paperNumber) === 1;

    const prompt = `You are an expert Cameroon GCE Board examiner for ${subjectName} (${year}, Paper ${paperNumber}).
Analyze the attached snapped photos of the past question paper (and any marking guide pages if included).

Extract ALL questions in exact numerical order and return a JSON array of objects with these exact keys:
- "question_number": integer
- "question_text": string (format all math formulas, fractions, powers, and chemical equations using standard LaTeX wrapped in single $...$)
${
  isMcq
    ? `- "option_a": string
- "option_b": string
- "option_c": string
- "option_d": string
- "static_correct_answer": string (strictly one uppercase letter: "A", "B", "C", or "D")
- "static_explanation": string (clear step-by-step explanation showing why the correct option is right, using LaTeX where needed)`
    : `- "option_a": null
- "option_b": null
- "option_c": null
- "option_d": null
- "static_correct_answer": string (complete, accurate GCE marking-guide-standard final answer)
- "static_explanation": string (detailed step-by-step working, formulas, and explanations so any student can follow easily)`
}

Strictly output ONLY valid JSON array.`;

    const imageParts = images.map((base64DataUrl: string) => {
      const [meta, data] = base64DataUrl.split(',');
      const mimeType = meta.match(/:(.*?);/)?.[1] || 'image/jpeg';
      return {
        inlineData: {
          data,
          mimeType,
        },
      };
    });

    const result = await model.generateContent([prompt, ...imageParts]);
    const text = result.response.text();
    const questions = JSON.parse(text);

    return NextResponse.json({ questions });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'AI extraction failed. Try clearer photos.' },
      { status: 500 }
    );
  }
}
