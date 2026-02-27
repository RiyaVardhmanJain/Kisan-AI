/**
 * Intent Detector for KisanAI Chatbot
 * Rule-based keyword matching — fast, no AI call needed
 */

const INTENT_PATTERNS = {
    view_lots: [
        /\b(my\s+)?crops?\b/i,
        /\b(stored|storage)\s+(crops?|produce|items?)\b/i,
        /\blots?\b/i,
        /\bproduce\b/i,
        /\bwhat('s| is)\s+(stored|in\s+storage)\b/i,
        /\bshelf\s*life\b/i,
        /\bsell\s*by\b/i,
        /\bspoil/i,
        /\bat\s*risk\b/i,
        /\bcondition\b/i,
    ],
    view_warehouses: [
        /\b(show|list|view|see)\s+(my\s+)?warehouse/i,
        /\bmy\s+warehouse/i,
        /\bgodown/i,
        /\bstorage\s*(facility|unit|space|capacity)/i,
        /\bhow\s+much\s+space\b/i,
        /\b(warehouse|storage)\s+capacity\b/i,
    ],
    view_conditions: [
        /\btemp(erature)?\b/i,
        /\bhumidity\b/i,
        /\bconditions?\b/i,
        /\bcheck\s+(my\s+)?(warehouse|storage)/i,
        /\bis\s+(my\s+)?(warehouse|storage)\s+safe/i,
        /\bhow\s+(is|are)\s+(the\s+)?(storage|warehouse)\s+conditions?\b/i,
        /\bsensor/i,
        /\bmonitor/i,
    ],
    view_alerts: [
        /\balerts?\b/i,
        /\bwarning/i,
        /\bnotif/i,
        /\bspoilage\b/i,
        /\bbreach/i,
        /\brisk/i,
        /\bexpir/i,
        /\boverdue\b/i,
    ],
    view_summary: [
        /\bsummary\b/i,
        /\boverview\b/i,
        /\bdashboard\b/i,
        /\bstatus\b/i,
        /\bhow('s| is)\s+(my|everything)\b/i,
        /\btotal\b/i,
        /\breport\b/i,
    ],
    // ── Mutation intents ──────────────────────────────────────────────────────
    add_lot: [
        /\badd\s+.{1,30}\s+(lot|crop|produce|quintals?|qtl)\b/i,
        /\bstore\s+\d+\s+\w+/i,
        /\b(create|register|log)\s+(a\s+)?(new\s+)?(lot|crop|produce)\b/i,
        /\bput\s+\d+\s*(quintals?|qtl|kg)\b/i,
        /\badd\s+\d+\s*(quintals?|qtl)/i,
    ],
    add_warehouse: [
        /\b(add|create|register|new)\s+(a\s+)?warehouse\b/i,
        /\bopen\s+(a\s+)?new\s+(warehouse|godown|storage)\b/i,
        /\bset\s+up\s+(a\s+)?(warehouse|storage)\b/i,
    ],
    update_lot_status: [
        /\bmark\s+.{1,40}\s+as\s+(sold|spoiled?|at.?risk|good|harvested?)\b/i,
        /\bupdate\s+.{0,30}\s+(status|condition|lot)\b/i,
        /\bchange\s+.{0,30}\s+(status|condition)\b/i,
        /\bset\s+.{0,30}\s+(status|condition)\s+to\b/i,
        /\blot\s+.{0,20}\s+(is\s+)?(sold|spoiled?|at.?risk|done)\b/i,
    ],
    delete_lot: [
        /\b(delete|remove|destroy|dispose|discard)\s+(the\s+)?.{0,30}(lot|crop|produce)\b/i,
        /\b(delete|remove)\s+lot\b/i,
        /\b(remove|delete)\s+(crop|produce|lot)\s+(from|in|at)\b/i,
        /\b(remove|delete|discard)\b/i, // extra score when combined with lot/crop patterns
        /\b(remove|delete).*(lot|crop)\b/i,
    ],
    confirm: [
        /^(yes|yeah|yep|yup|ok|okay|sure|confirm|do it|go ahead|proceed|haan|ha)[!.\s]*$/i,
    ],
    reject: [
        /^(no|nope|nah|cancel|stop|dont|abort|nahin|nahi)[!.\s]*$/i,
    ],
};

/**
 * Detect intent from a user message.
 * Mutation intents take priority over view intents on any tie.
 */
function detectIntent(message) {
    const trimmed = message.trim().toLowerCase();

    // Exact match for confirm/reject first (short messages)
    if (INTENT_PATTERNS.confirm.some((p) => p.test(trimmed))) {
        return { intent: 'confirm', confidence: 'high' };
    }
    if (INTENT_PATTERNS.reject.some((p) => p.test(trimmed))) {
        return { intent: 'reject', confidence: 'high' };
    }

    // Score ALL intents
    const scores = {};
    for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
        if (intent === 'confirm' || intent === 'reject') continue;
        scores[intent] = patterns.filter((p) => p.test(trimmed)).length;
    }

    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) return { intent: 'general', confidence: 'low' };

    // Among intents with the max score, prefer mutation intents
    const MUTATION_SET = new Set(MUTATION_INTENTS);
    const candidates = Object.entries(scores).filter(([, s]) => s === maxScore).map(([i]) => i);
    const mutationCandidate = candidates.find((i) => MUTATION_SET.has(i));
    const bestIntent = mutationCandidate || candidates[0];

    return {
        intent: bestIntent,
        confidence: maxScore >= 2 ? 'high' : 'medium',
    };
}

const MUTATION_INTENTS = ['add_lot', 'add_warehouse', 'update_lot_status', 'delete_lot'];
const isMutationIntent = (intent) => MUTATION_INTENTS.includes(intent);

module.exports = { detectIntent, INTENT_PATTERNS, isMutationIntent };

