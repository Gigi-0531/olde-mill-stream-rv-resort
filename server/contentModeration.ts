import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface ModerationResult {
  isAllowed: boolean;
  reason?: string;
}

export async function moderateText(text: string): Promise<ModerationResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a content moderation assistant for a family-friendly RV resort community. 
          Analyze the following message and determine if it contains:
          - Violence or threats
          - Sexual content or inappropriate language
          - Hate speech or discrimination
          - Harassment or bullying
          - Illegal activity
          
          Respond with a JSON object: {"allowed": true/false, "reason": "explanation if not allowed"}
          Be lenient with normal conversation but strict about genuinely harmful content.`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 150,
    });

    const content = response.choices[0]?.message?.content || '{"allowed": true}';
    const result = JSON.parse(content);
    
    return {
      isAllowed: result.allowed !== false,
      reason: result.reason,
    };
  } catch (error) {
    console.error("Content moderation error:", error);
    return { isAllowed: true };
  }
}

export async function moderateImage(base64Image: string, mimeType: string = "image/jpeg"): Promise<ModerationResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an image content moderation assistant for a family-friendly RV resort community.
          Analyze this image and determine if it contains:
          - Violence, gore, or weapons
          - Nudity or sexual content
          - Hate symbols
          - Inappropriate content for a family community
          
          Respond with JSON: {"allowed": true/false, "reason": "explanation if not allowed"}
          Be strict about any inappropriate content.`,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 150,
    });

    const content = response.choices[0]?.message?.content || '{"allowed": true}';
    const result = JSON.parse(content);
    
    return {
      isAllowed: result.allowed !== false,
      reason: result.reason,
    };
  } catch (error) {
    console.error("Image moderation error:", error);
    // Fail closed for security - reject on errors
    return { isAllowed: false, reason: "Unable to verify image content" };
  }
}
