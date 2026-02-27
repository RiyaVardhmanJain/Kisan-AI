const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { detectIntent, isMutationIntent } = require('../chatbot/intentDetector');
const { buildDbContext } = require('../chatbot/dbContextBuilder');
const {
    hasPendingAction,
    createPendingAction,
    executeAction,
    rejectAction,
} = require('../chatbot/mutationHandler');

/**
 * POST /api/chatbot/context
 * Main chatbot endpoint:
 * - Detects intent
 * - Handles confirm/reject for pending mutation actions
 * - Returns DB context (for view intents) or a directReply (for mutations)
 */
router.post('/context', protect, async (req, res) => {
    try {
        const { message } = req.body;
        const userId = req.user._id;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Message is required' });
        }

        const { intent, confidence } = detectIntent(message.trim());

        // ── Confirm/Reject for pending mutations ──────────────────────────────
        if (intent === 'confirm' && hasPendingAction(userId)) {
            const result = await executeAction(userId);
            return res.json({
                intent,
                confidence,
                context: null,
                directReply: result.message,
                success: result.success,
            });
        }

        if (intent === 'reject' && hasPendingAction(userId)) {
            const result = rejectAction(userId);
            return res.json({
                intent,
                confidence,
                context: null,
                directReply: result.message,
                success: result.success,
            });
        }

        // ── Mutation intents → consent flow ───────────────────────────────────
        if (isMutationIntent(intent)) {
            const result = await createPendingAction(intent, message.trim(), userId);
            return res.json({
                intent,
                confidence,
                context: null,
                directReply: result.message,
                requiresConsent: result.requiresConsent || false,
                success: result.success,
            });
        }

        // ── View intents → fetch DB context ───────────────────────────────────
        if (intent !== 'general') {
            const context = await buildDbContext(intent, userId);
            return res.json({ intent, confidence, context });
        }

        // ── General → pass through (AI handles it) ────────────────────────────
        return res.json({ intent, confidence, context: null });
    } catch (err) {
        console.error('[Chatbot] Context error:', err);
        res.status(500).json({ error: 'Failed to process chatbot request', details: err.message });
    }
});

/**
 * GET /api/chatbot/health
 */
router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
