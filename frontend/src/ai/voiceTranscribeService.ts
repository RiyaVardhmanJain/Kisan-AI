import Groq from "groq-sdk";

// Initialize the Groq client
const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true
});

export interface TranscriptionOptions {
  language?: string;
  prompt?: string;
  response_format?: "json" | "text" | "srt" | "verbose_json" | "vtt";
  temperature?: number;
  timestamp_granularities?: ("word" | "segment")[];
}

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
  }>;
  segments?: Array<{
    id: number;
    seek: number;
    start: number;
    end: number;
    text: string;
    tokens: number[];
    temperature: number;
    avg_logprob: number;
    compression_ratio: number;
    no_speech_prob: number;
  }>;
}

/**
 * Transcribe audio using Groq's Whisper API
 * @param audioBlob - The audio blob to transcribe
 * @param options - Transcription options
 * @returns Promise with transcription result
 */
export const transcribeAudio = async (
  audioBlob: Blob,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> => {
  if (!import.meta.env.VITE_GROQ_API_KEY) {
    throw new Error("Missing required VITE_GROQ_API_KEY environment variable");
  }

  try {
    // Validate audio blob
    if (!audioBlob || audioBlob.size === 0) {
      throw new Error("No audio data provided");
    }

    // Check file size (limit to 25MB for Groq API)
    if (audioBlob.size > 25 * 1024 * 1024) {
      throw new Error("Audio file too large. Please keep recordings under 25MB.");
    }

    // Create a File object from the Blob
    const audioFile = new File([audioBlob], "audio.webm", { type: audioBlob.type });

    // Create transcription with Groq
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-large-v3-turbo",
      language: options.language || "auto", // Auto-detect language
      prompt: options.prompt || "Agricultural and farming related conversation. Include technical terms, crop names, and farming practices.",
      response_format: (options.response_format === "json" || options.response_format === "text" || options.response_format === "verbose_json")
        ? options.response_format
        : "verbose_json",
      timestamp_granularities: options.timestamp_granularities || ["word", "segment"],
      temperature: options.temperature || 0.0,
    });

    // Validate transcription result
    if (!transcription || !transcription.text) {
      throw new Error("No transcription result received");
    }

    return transcription as TranscriptionResult;
  } catch (error) {
    console.error("Voice transcription error:", error);
    
    // Handle specific Groq API errors
    if (error instanceof Error) {
      if (error.message.includes("rate limit")) {
        throw new Error("Voice transcription rate limit exceeded. Please try again in a moment.");
      } else if (error.message.includes("quota")) {
        throw new Error("Voice transcription quota exceeded. Please try again later.");
      } else if (error.message.includes("invalid")) {
        throw new Error("Invalid audio format. Please try recording again.");
      }
    }
    
    throw new Error(`Voice transcription failed: ${(error as Error).message}`);
  }
};

/**
 * Get supported languages for transcription
 */
export const getSupportedLanguages = (): string[] => {
  return [
    "auto", "en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "ar", "hi", "bn", "ta", "te", "mr", "gu", "kn", "ml", "pa", "or", "as", "ne", "si", "my", "km", "lo", "th", "vi", "id", "ms", "tl", "sw", "am", "ha", "yo", "ig", "zu", "xh", "af", "sq", "az", "eu", "be", "bg", "ca", "cs", "da", "et", "fi", "gl", "el", "he", "hr", "hu", "is", "ga", "lv", "lt", "mk", "mt", "no", "pl", "ro", "sk", "sl", "sv", "tr", "uk", "cy", "fa", "ur"
  ];
};

/**
 * Detect language from audio (simple implementation)
 * @param audioBlob - The audio blob to analyze
 * @returns Promise with detected language code
 */
export const detectLanguage = async (audioBlob: Blob): Promise<string> => {
  try {
    const result = await transcribeAudio(audioBlob, {
      response_format: "verbose_json",
      language: "auto"
    });
    return result.language || "en";
  } catch (error) {
    console.error("Language detection error:", error);
    return "en"; // Fallback to English
  }
};

export default {
  transcribeAudio,
  getSupportedLanguages,
  detectLanguage
};
