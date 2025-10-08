import { GoogleGenAI } from '@google/genai';
import { Summary } from '../types';
import { loadCredentials } from './auth';

/**
 * Get the Gemini AI instance with user's API key
 */
function getAIInstance(): GoogleGenAI {
  const credentials = loadCredentials();
  if (!credentials?.geminiApiKey) {
    throw new Error("Gemini API key not found. Please log in again.");
  }
  return new GoogleGenAI({ apiKey: credentials.geminiApiKey });
}

/**
 * Generates a summary for a given chapter by streaming the response.
 * @param chapterContent The text content of the chapter to summarize.
 * @returns An async iterable stream of the generated content.
 */
export async function summarizeChapterStream(chapterContent: string) {
  const ai = getAIInstance();
  const prompt = `
You are an expert literary analyst. Your task is to analyze the provided book chapter and generate a concise summary.

The response must be in the following format, with each item on a new line:
- Three separate lines, each starting with "BULLET: ", summarizing a key event.
- One final line, starting with "QUOTE: ", containing a thematically significant or encapsulating quote from the chapter. This quote MUST be at least 15 words long to provide sufficient context. If the quote is spoken by a character, you MUST include who said it (e.g., "Nothing is fair," Jon said.).

Do not include any other text, explanations, or formatting.

Here is the chapter text:
---
${chapterContent}
---
`;

  try {
    const response = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response;
  } catch (error) {
    console.error("Error summarizing chapter:", error);
    const message = error instanceof Error ? error.message : "An unknown error occurred.";
    throw new Error(`Could not get a valid summary from the AI model. ${message}`);
  }
}


/**
 * Generates an image based on a chapter's summary.
 * @param summary The summary object containing bullets of key events.
 * @returns A base64 encoded string of the generated image.
 */
export async function generateChapterImage(summary: Summary): Promise<string> {
    const ai = getAIInstance();
    const sceneDescription = summary.bullets.join(' ');
    const prompt = `
        A stylized, thematic digital painting capturing the essence of a book scene.
        Key elements: "${sceneDescription}".
        Style: Cinematic digital painting with dramatic lighting, focusing on mood and symbolism.
        The final image must be suitable for a general audience, representing the theme artistically.
    `;

    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: '16:9',
            },
        });

        if (response.generatedImages?.[0]?.image?.imageBytes) {
            return response.generatedImages[0].image.imageBytes;
        }
        
        let feedbackMessage = "No specific reason provided by the API.";

        if (response.promptFeedback) {
            if (response.promptFeedback.blockReason) {
                feedbackMessage = `Request was blocked. Reason: ${response.promptFeedback.blockReason}.`;
            } else {
                const highSeverityRating = response.promptFeedback.safetyRatings?.find(
                    r => r.severity.startsWith('HIGH')
                );
                if (highSeverityRating) {
                    feedbackMessage = `Request was blocked by a safety filter for content related to '${highSeverityRating.category}'.`;
                }
            }
        }

        throw new Error(`The AI model did not return an image. ${feedbackMessage}`);

    } catch (error) {
        console.error("Error generating image:", error);
        const message = error instanceof Error ? error.message : "An unknown API error occurred.";
        throw new Error(`Could not generate image: ${message}`);
    }
}