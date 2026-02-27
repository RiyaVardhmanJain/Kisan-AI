/**
 * Chatbot Types and Constants
 * Defines available intents based on user role
 */

// Base intents available to all authenticated users
export const BASE_INTENTS = [
    'greeting',
    'help',
    'thanks',
    'confirm',
    'reject',
    'general'
];

// Customer/Portal intents - can view their own data
export const CUSTOMER_INTENTS = [
    'view_orders',
    'view_products',
    'view_wishlist',
    'view_cart',
    'add_to_wishlist',
    'remove_from_wishlist',
    'add_to_cart',
    'remove_from_cart',
    'view_vouchers'
];

// Vendor intents - can manage their products and view sales
export const VENDOR_INTENTS = [
    ...CUSTOMER_INTENTS,
    'view_my_products',
    'view_vendor_orders',
    'view_vendor_analytics'
];

// Admin intents - full access
export const ADMIN_INTENTS = [
    ...VENDOR_INTENTS,
    'view_all_orders',
    'view_all_products',
    'view_all_users',
    'view_admin_analytics'
];

/**
 * Get available intents based on user role
 */
export function getIntentsForRole(role) {
    const roleIntents = {
        'INTERNAL': [...BASE_INTENTS, ...ADMIN_INTENTS],
        'VENDOR': [...BASE_INTENTS, ...VENDOR_INTENTS],
        'PORTAL': [...BASE_INTENTS, ...CUSTOMER_INTENTS]
    };

    return roleIntents[role] || [...BASE_INTENTS, ...CUSTOMER_INTENTS];
}

/**
 * Check if an intent is allowed for a role
 */
export function isIntentAllowedForRole(intent, role) {
    const allowedIntents = getIntentsForRole(role);
    return allowedIntents.includes(intent);
}
