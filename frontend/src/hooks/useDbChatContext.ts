import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const API_URL = `${API_BASE_URL}/api`;

export interface DbContextResult {
    intent: string;
    confidence: string;
    context: string | null;
    /** If set, skip the AI call — show this reply directly in chat */
    directReply?: string;
    requiresConsent?: boolean;
    success?: boolean;
}

/**
 * Call the backend chatbot context endpoint.
 * - Returns DB context for view intents (AI uses it)
 * - Returns directReply for mutation intents (skip AI, show directly)
 * - Returns null context for general questions (full AI pass-through)
 */
export async function getDbContext(
    message: string,
    token: string
): Promise<DbContextResult> {
    try {
        const res = await axios.post<DbContextResult>(
            `${API_URL}/chatbot/context`,
            { message },
            {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 8000,
            }
        );
        return res.data;
    } catch (err) {
        console.warn('DB context fetch failed, falling back to general:', err);
        return { intent: 'general', confidence: 'low', context: null };
    }
}
