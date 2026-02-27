/**
 * Mutation Handler Service
 * Handles add/remove wishlist and cart actions with consent flow
 */

import prisma from '../../db.js';

// In-memory store for pending actions (per user)
const pendingActions = new Map();

/**
 * Check if user has a pending action
 */
export function hasPendingAction(userId) {
    return pendingActions.has(userId);
}

/**
 * Get pending action for user
 */
export function getPendingAction(userId) {
    return pendingActions.get(userId);
}

/**
 * Clear pending action for user
 */
export function clearPendingAction(userId) {
    pendingActions.delete(userId);
}

/**
 * Find product by name or partial match
 */
async function findProduct(searchTerm) {
    // First try exact match
    let product = await prisma.product.findFirst({
        where: {
            productName: { equals: searchTerm, mode: 'insensitive' },
            published: true,
            isGiftCard: false
        }
    });

    // Then try contains match
    if (!product) {
        product = await prisma.product.findFirst({
            where: {
                productName: { contains: searchTerm, mode: 'insensitive' },
                published: true,
                isGiftCard: false
            }
        });
    }

    return product;
}

/**
 * Get or create cart for user
 */
async function getOrCreateCart(userId) {
    let cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
        cart = await prisma.cart.create({ data: { userId } });
    }
    return cart;
}

/**
 * Create pending action for consent
 */
export async function createPendingAction(intent, entities, userId) {
    // Need product info for wishlist/cart actions
    if (!entities.products || entities.products.length === 0) {
        const actionType = intent.includes('cart') ? 'cart' : 'wishlist';
        return {
            success: false,
            message: `Please specify which product you want to ${intent.includes('add') ? 'add to' : 'remove from'} your ${actionType}. For example: "Add Blue Cotton Shirt to ${actionType}"`
        };
    }

    const searchTerm = entities.products[0];
    const product = await findProduct(searchTerm);

    if (!product) {
        return {
            success: false,
            message: `I couldn't find a product matching "${searchTerm}". Please try with the exact product name.`
        };
    }

    // Handle wishlist intents
    if (intent === 'add_to_wishlist' || intent === 'remove_from_wishlist') {
        const existing = await prisma.wishlist.findUnique({
            where: { userId_productId: { userId, productId: product.id } }
        });

        if (intent === 'add_to_wishlist' && existing) {
            return { success: true, message: `${product.productName} is already in your wishlist!` };
        }
        if (intent === 'remove_from_wishlist' && !existing) {
            return { success: false, message: `${product.productName} is not in your wishlist.` };
        }

        const action = {
            type: intent,
            productId: product.id,
            productName: product.productName,
            price: product.salesPrice,
            createdAt: Date.now()
        };
        pendingActions.set(userId, action);

        const confirmMessage = intent === 'add_to_wishlist'
            ? `Would you like to add **${product.productName}** (Rs.${product.salesPrice.toFixed(2)}) to your wishlist?`
            : `Would you like to remove **${product.productName}** from your wishlist?`;

        return { success: true, message: confirmMessage, requiresConsent: true };
    }

    // Handle cart intents
    if (intent === 'add_to_cart' || intent === 'remove_from_cart') {
        const cart = await getOrCreateCart(userId);
        const existingItem = await prisma.cartItem.findFirst({
            where: { cartId: cart.id, productId: product.id }
        });

        if (intent === 'add_to_cart') {
            // Check stock
            if (product.currentStock <= 0) {
                return { success: false, message: `Sorry, **${product.productName}** is currently out of stock.` };
            }

            const action = {
                type: 'add_to_cart',
                productId: product.id,
                productName: product.productName,
                price: product.salesPrice,
                cartId: cart.id,
                existingItemId: existingItem?.id,
                createdAt: Date.now()
            };
            pendingActions.set(userId, action);

            const msg = existingItem
                ? `**${product.productName}** is already in your cart (qty: ${existingItem.quantity}). Would you like to add one more?`
                : `Would you like to add **${product.productName}** (Rs.${product.salesPrice.toFixed(2)}) to your cart?`;

            return { success: true, message: msg, requiresConsent: true };
        }

        if (intent === 'remove_from_cart') {
            if (!existingItem) {
                return { success: false, message: `${product.productName} is not in your cart.` };
            }

            const action = {
                type: 'remove_from_cart',
                productId: product.id,
                productName: product.productName,
                cartItemId: existingItem.id,
                createdAt: Date.now()
            };
            pendingActions.set(userId, action);

            return {
                success: true,
                message: `Would you like to remove **${product.productName}** from your cart?`,
                requiresConsent: true
            };
        }
    }

    return { success: false, message: 'Unknown action. Please try again.' };
}

/**
 * Execute confirmed action
 */
export async function executeAction(userId) {
    const action = pendingActions.get(userId);

    if (!action) {
        return { success: false, message: 'No pending action. What would you like to do?' };
    }

    // Check if action is expired (5 minutes)
    if (Date.now() - action.createdAt > 5 * 60 * 1000) {
        pendingActions.delete(userId);
        return { success: false, message: 'The action has expired. Please try again.' };
    }

    try {
        // Wishlist: Add
        if (action.type === 'add_to_wishlist') {
            const existing = await prisma.wishlist.findUnique({
                where: { userId_productId: { userId, productId: action.productId } }
            });
            if (existing) {
                pendingActions.delete(userId);
                return { success: true, message: `${action.productName} is already in your wishlist!` };
            }
            await prisma.wishlist.create({ data: { userId, productId: action.productId } });
            pendingActions.delete(userId);
            return { success: true, message: `Added **${action.productName}** to your wishlist!` };
        }

        // Wishlist: Remove
        if (action.type === 'remove_from_wishlist') {
            await prisma.wishlist.delete({
                where: { userId_productId: { userId, productId: action.productId } }
            });
            pendingActions.delete(userId);
            return { success: true, message: `Removed **${action.productName}** from your wishlist.` };
        }

        // Cart: Add
        if (action.type === 'add_to_cart') {
            if (action.existingItemId) {
                // Increment quantity
                await prisma.cartItem.update({
                    where: { id: action.existingItemId },
                    data: { quantity: { increment: 1 } }
                });
            } else {
                // Create new cart item
                await prisma.cartItem.create({
                    data: {
                        cartId: action.cartId,
                        productId: action.productId,
                        quantity: 1
                    }
                });
            }
            pendingActions.delete(userId);
            return { success: true, message: `Added **${action.productName}** to your cart!` };
        }

        // Cart: Remove
        if (action.type === 'remove_from_cart') {
            await prisma.cartItem.delete({ where: { id: action.cartItemId } });
            pendingActions.delete(userId);
            return { success: true, message: `Removed **${action.productName}** from your cart.` };
        }

        return { success: false, message: 'Unknown action type.' };
    } catch (error) {
        pendingActions.delete(userId);
        console.error('[Mutation] Execute error:', error);
        return { success: false, message: 'Something went wrong. Please try again.' };
    }
}

/**
 * Reject pending action
 */
export function rejectAction(userId) {
    if (!pendingActions.has(userId)) {
        return { success: true, message: 'No action to cancel. How can I help you?' };
    }

    const action = pendingActions.get(userId);
    pendingActions.delete(userId);

    return { success: true, message: `Cancelled. ${action.productName} was not modified. Anything else?` };
}
