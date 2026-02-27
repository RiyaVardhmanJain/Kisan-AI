/**
 * Ollama Configuration
 * Handles communication with local Ollama AI model
 */

import axios from 'axios';

// Ollama configuration
export const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
export const MODEL_NAME = process.env.OLLAMA_MODEL || 'deepseek-r1:1.5b';

/**
 * Call Ollama for response generation
 */
export async function callOllama(prompt) {
    try {
        const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
            model: MODEL_NAME,
            prompt,
            stream: false,
            options: { temperature: 0.7, top_p: 0.9 }
        }, { timeout: 120000 });

        let text = response.data.response || '';
        // Clean DeepSeek thinking tags if present
        text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        return text;
    } catch (error) {
        console.error('[Ollama] Generate error:', error.message);
        throw new Error('Failed to generate response');
    }
}

/**
 * Call Ollama for intent classification (JSON mode)
 */
export async function classifyWithOllama(prompt) {
    try {
        const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
            model: MODEL_NAME,
            prompt,
            stream: false,
            format: 'json',
            options: { temperature: 0.1, top_p: 0.9 }
        }, { timeout: 30000 });

        let result = response.data.response || '';
        result = result.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        return JSON.parse(result);
    } catch (error) {
        console.error('[Ollama] Classification error:', error.message);
        return null;
    }
}

/**
 * Check if Ollama is running and model is available
 */
export async function checkOllamaHealth() {
    try {
        const response = await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 5000 });
        const models = response.data.models || [];
        const hasModel = models.some(m => m.name?.includes(MODEL_NAME.split(':')[0]));
        return { available: true, hasModel, models: models.map(m => m.name) };
    } catch {
        return { available: false, hasModel: false, models: [] };
    }
}
