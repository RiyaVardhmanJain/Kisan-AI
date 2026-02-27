/**
 * Chatbot Routes
 * API endpoints for the chatbot functionality
 */

import { Router } from 'express';
import { ValidationError, NotFoundError, asyncHandler } from '../middleware/errorHandler.js'
import { authenticate } from '../auth/auth.middleware.js';
import { detectIntents, isMutationIntent, isConfirmIntent, isRejectIntent } from './services/intentDetector.service.js';
import { buildContext } from './services/viewHandler.service.js';
import { createPendingAction, executeAction, rejectAction, hasPendingAction } from './services/mutationHandler.service.js';
import { callOllama, checkOllamaHealth, MODEL_NAME, OLLAMA_URL } from './config/ollama.config.js';

const router = Router();

/**
 * POST /api/chatbot/chat
 * Main chat endpoint - handles messages and returns responses
 */
router.post("/chat", authenticate, asyncHandler(async (req, res) => {
        const { message } = req.body;
        const userId = req.userId;
        const userRole = req.userRole;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Message is required'
            });
        }

        const trimmedMessage = message.trim();
        if (trimmedMessage.length === 0) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Message cannot be empty'
            });
        }

        // Detect intents from message
        const processed = await detectIntents(trimmedMessage, userRole);
        const intent = processed.detection.intents[0];

        // Handle confirm/reject for pending actions
        if (isConfirmIntent(intent) && hasPendingAction(userId)) {
            const result = await executeAction(userId);
            return res.json({ reply: result.message });
        }

        if (isRejectIntent(intent) && hasPendingAction(userId)) {
            const result = rejectAction(userId);
            return res.json({ reply: result.message });
        }

        // Quick response (greeting, thanks, help)
        if (processed.reply && !processed.requiresContext) {
            return res.json({ reply: processed.reply });
        }

        // Mutation intents (add/remove from wishlist)
        if (isMutationIntent(intent)) {
            const result = await createPendingAction(intent, processed.detection.entities, userId);
            return res.json({
                reply: result.message,
                requiresConsent: result.requiresConsent || false
            });
        }

        // View intents - build context and generate response
        const context = await buildContext(processed.detection, userId, userRole);

        // If we have context, try to generate a natural response with AI
        // Otherwise, return the raw context or a default message
        if (context) {
            try {
                const prompt = `You are a helpful shopping assistant for an e-commerce store. Be brief, friendly, and use emojis sparingly.

DATA:
${context}

User asked: "${trimmedMessage}"

Respond naturally using the data above. Format prices with ₹. Keep response concise.`;

                const aiReply = await callOllama(prompt);
                return res.json({ reply: aiReply || context });
            } catch {
                // AI failed, return raw context
                return res.json({ reply: context });
            }
        }

        // General/unclear intent - try to generate helpful response
        try {
            const generalPrompt = `You are a helpful shopping assistant for this specific e-commerce website. The user said: "${trimmedMessage}"
            
If the user's query is about general topics (like weather, general knowledge, math, coding) or unrelated to shopping on this website, politely decline and say "Sorry, I am here to answer queries related to the website."

Only answer if it relates to shopping, products, orders, cart, wishlist, or account help. Provide a brief, helpful response.`;

            const reply = await callOllama(generalPrompt);
            return res.json({ reply: reply || "I'm not sure I understood. Could you please rephrase? I can help with orders, products, wishlist, and more!" });
        } catch {
            return res.json({
                reply: "I'm not sure I understood. Could you please rephrase? I can help with orders, products, wishlist, and more!"
            });
        }

    }));

/**
 * GET /api/chatbot/health
 * Health check for chatbot service
 */
router.get('/health', async (req, res) => {
    try {
        const ollamaStatus = await checkOllamaHealth();

        res.json({
            status: ollamaStatus.available ? 'healthy' : 'degraded',
            ollama: {
                url: OLLAMA_URL,
                available: ollamaStatus.available,
                model: MODEL_NAME,
                hasModel: ollamaStatus.hasModel
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

/**
 * GET /api/chatbot/suggestions
 * Get suggested prompts based on user role
 */
router.get('/suggestions', authenticate, (req, res) => {
    const userRole = req.userRole;

    const baseSuggestions = [
        "Show my orders",
        "What's in my cart?",
        "View my wishlist",
        "Show trending products"
    ];

    const vendorSuggestions = [
        "Show my listed products",
        "View orders for my products",
        "My sales analytics"
    ];

    const adminSuggestions = [
        "Show all orders",
        "View admin dashboard",
        "Show all users"
    ];

    let suggestions = [...baseSuggestions];

    if (userRole === 'VENDOR') {
        suggestions = [...suggestions, ...vendorSuggestions];
    } else if (userRole === 'INTERNAL') {
        suggestions = [...suggestions, ...vendorSuggestions, ...adminSuggestions];
    }

    res.json({ suggestions });
});

export default router;
