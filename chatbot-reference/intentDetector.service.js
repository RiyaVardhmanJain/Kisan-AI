/**
 * Intent Detector Service
 * Handles detecting user intent from messages using rules and AI
 */

import { SIMPLE_PATTERNS, SIMPLE_RESPONSES, buildClassificationPrompt } from '../config/intents.config.js';
import { classifyWithOllama } from '../config/ollama.config.js';
import { isIntentAllowedForRole } from '../types.js';

/**
 * Quick rule-based classification for simple messages
 */
function quickClassify(message) {
    const trimmed = message.trim();

    for (const [intent, patterns] of Object.entries(SIMPLE_PATTERNS)) {
        if (patterns.some(p => p.test(trimmed))) {
            return {
                isSimple: true,
                intent,
                response: SIMPLE_RESPONSES[intent]
            };
        }
    }
    return { isSimple: false };
}

/**
 * Extract entities from message using patterns
 */
function extractEntities(message) {
    const lower = message.toLowerCase();
    const entities = {
        products: [],
        category: null,
        productType: null,
        orderNumber: null
    };

    // Extract categories
    if (/\bmen'?s?\b/i.test(lower)) entities.category = 'men';
    else if (/\bwomen'?s?\b/i.test(lower)) entities.category = 'women';
    else if (/\bchildren'?s?\b|\bkids?\b/i.test(lower)) entities.category = 'children';

    // Extract product types
    const types = ['shirt', 'pant', 'kurta', 'saree', 'dress', 'jacket', 'jeans'];
    for (const type of types) {
        if (lower.includes(type)) {
            entities.productType = type;
            break;
        }
    }

    // Extract order number
    const orderMatch = message.match(/ORD-?(\w+)/i) || message.match(/order\s*#?\s*(\d+)/i);
    if (orderMatch) {
        entities.orderNumber = orderMatch[0].toUpperCase();
    }

    return entities;
}

/**
 * Fallback classification when AI fails
 */
function fallbackClassify(message, userRole) {
    const lower = message.toLowerCase();
    const intents = [];
    const entities = extractEntities(message);

    // Wishlist patterns
    if (/wishlist|wish list|saved|favorites/i.test(lower)) {
        if (/add|save/i.test(lower)) intents.push('add_to_wishlist');
        else if (/remove|delete/i.test(lower)) intents.push('remove_from_wishlist');
        else intents.push('view_wishlist');
    }
    // Cart patterns
    else if (/cart|basket/i.test(lower)) {
        if (/add|put|include/i.test(lower)) intents.push('add_to_cart');
        else if (/remove|delete|take out/i.test(lower)) intents.push('remove_from_cart');
        else intents.push('view_cart');
    }
    // Order patterns
    else if (/order|orders|bought|purchase|tracking/i.test(lower)) {
        if (userRole === 'VENDOR' && /my products?|sold/i.test(lower)) {
            intents.push('view_vendor_orders');
        } else if (userRole === 'INTERNAL' && /all/i.test(lower)) {
            intents.push('view_all_orders');
        } else {
            intents.push('view_orders');
        }
    }
    // Product patterns
    else if (/products?|catalog|items?|shirt|pant|kurta|browse|shop/i.test(lower)) {
        if (userRole === 'VENDOR' && /my|mine/i.test(lower)) {
            intents.push('view_my_products');
        } else {
            intents.push('view_products');
        }
    }
    // Voucher patterns
    else if (/voucher|coupon|gift card|discount|promo/i.test(lower)) {
        intents.push('view_vouchers');
    }
    // Admin analytics
    else if (userRole === 'INTERNAL' && /analytics|dashboard|stats|report/i.test(lower)) {
        intents.push('view_admin_analytics');
    }
    // Vendor analytics
    else if (userRole === 'VENDOR' && /analytics|sales|earnings|performance/i.test(lower)) {
        intents.push('view_vendor_analytics');
    }
    // Default
    else {
        intents.push('general');
    }

    // Filter intents based on role
    const allowedIntents = intents.filter(i => isIntentAllowedForRole(i, userRole));

    return {
        intents: allowedIntents.length > 0 ? allowedIntents : ['general'],
        entities,
        confidence: 'low',
        source: 'rule'
    };
}

/**
 * AI-based classification
 */
async function aiClassify(message, userRole) {
    try {
        const prompt = buildClassificationPrompt(message);
        const parsed = await classifyWithOllama(prompt);

        if (!parsed || !parsed.intents) {
            return fallbackClassify(message, userRole);
        }

        // Extract and merge entities
        const ruleEntities = extractEntities(message);
        const entities = {
            products: parsed.entities?.products || [],
            category: parsed.entities?.category || ruleEntities.category,
            productType: ruleEntities.productType,
            orderNumber: parsed.entities?.orderNumber || ruleEntities.orderNumber
        };

        // Filter intents based on role
        const allowedIntents = (parsed.intents || ['general'])
            .filter(i => isIntentAllowedForRole(i, userRole));

        return {
            intents: allowedIntents.length > 0 ? allowedIntents : ['general'],
            entities,
            confidence: parsed.confidence || 'medium',
            source: 'ai'
        };
    } catch {
        return fallbackClassify(message, userRole);
    }
}

/**
 * Main intent detection function
 */
export async function detectIntents(message, userRole = 'PORTAL') {
    // Stage 1: Quick classification for simple messages
    const quick = quickClassify(message);

    if (quick.isSimple && quick.response) {
        return {
            reply: quick.response,
            detection: {
                intents: [quick.intent],
                entities: {},
                confidence: 'high',
                source: 'rule'
            },
            requiresContext: false
        };
    }

    // Fast path for wishlist commands
    const lower = message.toLowerCase();
    if (/wishlist|wish list|favorites/i.test(lower)) {
        const entities = extractEntities(message);
        let intent = 'view_wishlist';

        if (/add|save/i.test(lower)) intent = 'add_to_wishlist';
        else if (/remove|delete/i.test(lower)) intent = 'remove_from_wishlist';

        if (isIntentAllowedForRole(intent, userRole)) {
            return {
                detection: {
                    intents: [intent],
                    entities,
                    confidence: 'high',
                    source: 'rule'
                },
                requiresContext: intent === 'view_wishlist'
            };
        }
    }

    // Stage 2: AI classification
    const detection = await aiClassify(message, userRole);

    const viewIntents = [
        'view_orders', 'view_products', 'view_wishlist', 'view_cart',
        'view_vouchers', 'view_my_products', 'view_vendor_orders',
        'view_all_orders', 'view_all_products', 'view_all_users',
        'view_admin_analytics', 'view_vendor_analytics'
    ];
    const requiresContext = detection.intents.some(i => viewIntents.includes(i));

    return { detection, requiresContext };
}

/**
 * Check if intent is a mutation (requires confirmation)
 */
export function isMutationIntent(intent) {
    return ['add_to_wishlist', 'remove_from_wishlist', 'add_to_cart', 'remove_from_cart'].includes(intent);
}

/**
 * Check if user confirmed/rejected
 */
export function isConfirmIntent(intent) {
    return intent === 'confirm';
}

export function isRejectIntent(intent) {
    return intent === 'reject';
}
