import Groq from "groq-sdk";
import getAIPrompt, { KisanAIContext } from "./aiPrompt";

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true
});

interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface StreamingResponse {
  text: string;
  thinking?: string;
  done: boolean;
}

let activeCancelled = false;

export function cancelActiveRequest() {
  activeCancelled = true;
}

export const getAIResponse = async (
  userInput: string,
  context: Partial<KisanAIContext> = {},
  onStream?: (response: StreamingResponse) => void
): Promise<string> => {
  if (!import.meta.env.VITE_GROQ_API_KEY) {
    throw new Error("Missing required VITE_GROQ_API_KEY environment variable");
  }

  const fullContext: KisanAIContext = {
    userInput,
    userLanguage: context.userLanguage || "en",
    userLocation: context.userLocation,
    previousMessages: context.previousMessages || []
  };

  const fullPrompt = getAIPrompt(fullContext);
  const [systemPrompt, userMessage] = fullPrompt.split('USER QUERY:');
  
  const messages: GroqMessage[] = [
    {
      role: "system",
      content: systemPrompt.trim()
    },
    {
      role: "user",
      content: userMessage.trim()
    }
  ];

  try {
    if (onStream) {
      activeCancelled = false;
      // Streaming mode with 50% slower speed
      const stream = await groq.chat.completions.create({
        messages,
        model: "moonshotai/kimi-k2-instruct-0905",
        temperature: 0.7,
        max_tokens: 4096,
        top_p: 0.9,
        stream: true
      });

      let accumulatedResponse = "";
      let accumulatedThinking = "";
      let inThinkBlock = false;
      const processChunk = (input: string): { visible: string; thinking: string } => {
        // Split streamed content into visible parts and <think> reasoning
        let visible = "";
        let thinking = "";
        let remaining = input;
        while (remaining.length > 0) {
          if (inThinkBlock) {
            const endIdx = remaining.indexOf("</think>");
            if (endIdx === -1) {
              thinking += remaining;
              remaining = "";
              break;
            } else {
              thinking += remaining.slice(0, endIdx);
              remaining = remaining.slice(endIdx + "</think>".length);
              inThinkBlock = false;
            }
          } else {
            const startIdx = remaining.indexOf("<think>");
            if (startIdx === -1) {
              visible += remaining;
              remaining = "";
              break;
            } else {
              // Add text before <think> to visible, then enter think block
              visible += remaining.slice(0, startIdx);
              remaining = remaining.slice(startIdx + "<think>".length);
              inThinkBlock = true;
            }
          }
        }
        return { visible, thinking };
      };
      
      try {
        // No initial delay for fastest start
        // (was 500ms)
      for await (const chunk of stream) {
          if (activeCancelled) break;
        const content = chunk.choices[0]?.delta?.content || "";
          const { visible, thinking } = processChunk(content);
          if (visible) accumulatedResponse += visible;
          if (thinking) accumulatedThinking += thinking;
          if (visible || thinking) {
            onStream({ text: visible, thinking, done: false });
          }
          // No pacing per chunk for maximum speed
        }
      } finally {
        onStream({ text: "", thinking: "", done: true });
        activeCancelled = false;
      }

      const finalText = postProcessResponse(accumulatedResponse);
      // If no visible text was generated but we have thinking content, use a fallback
      if (!finalText || finalText.trim().length === 0) {
        return "I've processed your request and provided my reasoning above. Please let me know if you need any clarification or have additional questions.";
      }
      return finalText;
    } else {
      // Non-streaming mode with full speed
      const chatCompletion = await groq.chat.completions.create({
        messages,
        model: "openai/gpt-oss-20b",
        temperature: 0.7,
        max_tokens: 4096,
        top_p: 0.9,
        stream: false
      });

      if (!chatCompletion.choices[0]?.message?.content) {
        throw new Error("Empty response from Groq API");
      }

      return postProcessResponse(chatCompletion.choices[0].message.content);
    }
  } catch (error) {
    console.error("Groq API Error:", error);
    throw new Error(`Groq API Error: ${(error as Error).message}`);
  }
}

function postProcessResponse(response: string): string {
  return response
    // Remove any residual DeepSeek reasoning tags
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/\$(\d+)/g, '₹$1') // Convert $ to ₹
    .replace(/\b(\d+)\s*(?:acres?|hectares?)\b/gi, (_match, num) => {
      const acres = parseFloat(num);
      const hectares = acres * 0.404686;
      return `${num} acres (${hectares.toFixed(2)} hectares)`;
    })
    .replace(/\b(\d+)\s*(?:kg|kilograms?)\b/gi, (_match, num) => {
      const kg = parseFloat(num);
      const quintals = kg / 100;
      return `${num} kg (${quintals.toFixed(2)} quintals)`;
    })
    .trim();
}

export default { getAIResponse };