import { GoogleGenerativeAI } from "@google/generative-ai";
import mime from "mime-types";

/* ===== モデル名を env から取得。無ければデフォルト ===== */
const OCR_MODELS = process.env.GEMINI_MODELS?.split(",") ?? [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
];

const RETRY_STATUSES = [503, 504, 429];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function analyzeImageWithGemini(
  base64Image: string,
  filename: string,
  prompt: string,
  modelIndex = 0
) {
  const apiKey = process.env.GEMINI_API_KEY!;
  const mimeType = mime.lookup(filename) || "application/octet-stream";

  for (let i = modelIndex; i < OCR_MODELS.length; i++) {
    const modelName = OCR_MODELS[i];
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    try {
      const result = await model.generateContent([
        { inlineData: { mimeType, data: base64Image } },
        { text: prompt },
      ]);
      const raw = result.response?.text() ?? "";
      const jsonStr = raw.replace(/```json|```/g, "").trim();

      try {
        const parsed = JSON.parse(jsonStr);
        console.info(`✔️ Used model: ${modelName}`);
        return parsed;
      } catch (e) {
        // JSON フォーマットがおかしければ次モデルへ
        console.warn(`${modelName} returned invalid JSON, fallback…`);
      }
    } catch (err: any) {
      const status = err?.response?.status ?? err?.status ?? 500;
      const isRetryable = RETRY_STATUSES.includes(status);
      const isLast = i === OCR_MODELS.length - 1;

      if (!isRetryable || isLast) {
        console.error(`${modelName} failed:`, err);
        throw err;
      }
      console.warn(
        `${modelName} => ${status}. Fallback to ${OCR_MODELS[i + 1]}`
      );
    }

    // バックオフ (1s, 2s …)
    await sleep(1000 * 2 ** i);
  }
}
