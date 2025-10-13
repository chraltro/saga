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

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Chat with Gemini 2.5 Flash using chapter context
 * @param messages The conversation history
 * @param systemContext The context to provide to the AI (chapter content or summaries)
 * @param isFirstMessage Whether this is the first message in the conversation
 * @param allowSpoilers Whether to allow information beyond current chapter
 * @param currentChapter The current chapter number (1-indexed)
 * @returns An async iterable stream of the generated content.
 */
export async function chatWithGeminiStream(
  messages: ChatMessage[],
  systemContext: string,
  isFirstMessage: boolean = false,
  allowSpoilers: boolean = false,
  currentChapter: number = 1
) {
  const ai = getAIInstance();

  // Build the conversation history with system context
  const contents: string[] = [];

  // Only send full context on first message to save tokens
  if (isFirstMessage && systemContext) {
    const spoilerWarning = allowSpoilers
      ? ''
      : `\n\n🚫 CRITICAL SPOILER PROTECTION:\n- The reader is currently on Chapter ${currentChapter}\n- NEVER reveal events, plot points, or character fates from chapters AFTER Chapter ${currentChapter}\n- If asked about future events, politely say you can only discuss up to their current chapter\n- DO NOT hint at or foreshadow future events\n- Stay strictly within the boundaries of what they've read so far`;

    contents.push(`Context from the book:\n---\n${systemContext}\n---\n\nYou are a friendly, conversational assistant helping readers discuss this book.

Key instructions:
- Keep responses BRIEF (2-4 sentences max for simple questions)
- Be conversational, not analytical or academic
- Use the reader's language level - match their tone
- Only elaborate if specifically asked for details
- Use markdown formatting (bold, italics, lists) when helpful
- Focus on what the reader asked, don't over-explain
- Remember the context above for the rest of our conversation${spoilerWarning}

Answer naturally as if chatting with a friend about a book you both read.`);
  } else if (!isFirstMessage) {
    const spoilerReminder = allowSpoilers
      ? ''
      : ` Remember: NO SPOILERS beyond Chapter ${currentChapter}!`;

    // Just a reminder for subsequent messages
    contents.push(`You are discussing a book with the reader. Keep responses brief and conversational (2-4 sentences for simple questions).${spoilerReminder}`);
  }

  // Add conversation history (only last 4 exchanges to save tokens)
  const recentMessages = messages.slice(-8); // Last 4 user + 4 assistant messages
  recentMessages.forEach(msg => {
    contents.push(`${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`);
  });

  const fullPrompt = contents.join('\n\n');

  try {
    const response = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
    });
    return response;
  } catch (error) {
    console.error("Error in chat:", error);
    let message = error instanceof Error ? error.message : "An unknown error occurred.";

    // Provide helpful error message for quota limits
    if (message.includes('429') || message.includes('quota') || message.includes('RESOURCE_EXHAUSTED')) {
      throw new Error(`Rate limit reached. The Gemini API free tier has limits on how much you can use per minute. Please wait a moment and try again, or consider using shorter context options to reduce token usage.`);
    }

    throw new Error(`Could not get a response from the AI model. ${message}`);
  }
}