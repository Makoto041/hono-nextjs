import { GoogleGenerativeAI } from "@google/generative-ai";
import mime from "mime-types";
import { Buffer } from "buffer";

export async function analyzeImageWithGemini(
  base64Image: string,
  filename: string,
  prompt: string
) {
  const apiKey = process.env.GEMINI_API_KEY!;
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const mimeType = mime.lookup(filename) || "application/octet-stream";

  const result = await model.generateContent([
    { inlineData: { mimeType, data: base64Image } },
    { text: prompt },
  ]);

  const responseText = result.response?.text() || "";
  const cleanedText = responseText.replace(/```json|```/g, "").trim();
  console.log("Gemini response:", cleanedText);
  return JSON.parse(cleanedText);
}
