/**
 * Intent Configuration
 * Defines patterns and prompts for intent detection
 */

// Simple patterns for quick classification (no AI needed)
export const SIMPLE_PATTERNS = {
    greeting: [/^(hi|hello|hey|good morning|good afternoon|good evening)[!?.\s]*$/i],
    thanks: [/^(thanks|thank you|thx|ty)[!?.\s]*$/i],
    help: [/^help[!?.\s]*$/i, /^what can you do/i, /^how can you help/i],
    confirm: [/^(yes|yeah|sure|okay|ok|confirm|yep|yup)[!?.\s]*$/i],
    reject: [/^(no|nope|cancel|nevermind|never mind|nah)[!?.\s]*$/i]
};

// Quick responses for simple intents
export const SIMPLE_RESPONSES = {
    greeting: "Hello! 👋 I'm your shopping assistant. I can help you with:\n\n• Viewing your orders\n• Managing your wishlist\n• Finding products\n• Checking your cart\n\nHow can I help you today?",
    thanks: "You're welcome! Let me know if you need anything else. 😊",
    help: "I can help you with:\n\n📦 **Orders** - \"Show my orders\", \"Order status\"\n💝 **Wishlist** - \"View wishlist\", \"Add to wishlist\"\n🛍️ **Products** - \"Show products\", \"Find shirts\"\n🛒 **Cart** - \"What's in my cart?\"\n🎁 **Vouchers** - \"My gift cards\", \"Available coupons\"\n\nJust ask naturally!"
};

// AI classification prompt template
export const AI_CLASSIFICATION_PROMPT = `You are an e-commerce chatbot intent classifier. Analyze the user message and return JSON.

AVAILABLE INTENTS:
- view_orders: User wants to see their order history or order status
- view_products: User wants to browse or search products
- view_wishlist: User wants to see their saved/wishlist items
- view_cart: User wants to see what's in their shopping cart
- add_to_wishlist: User wants to save a product to wishlist
- remove_from_wishlist: User wants to remove a saved product from wishlist
- add_to_cart: User wants to add a product to cart
- remove_from_cart: User wants to remove a product from cart
- view_vouchers: User wants to see gift cards or coupons
- view_my_products: Vendor wants to see their listed products
- view_vendor_orders: Vendor wants to see orders for their products
- view_all_orders: Admin viewing all orders
- view_all_products: Admin viewing all products
- view_all_users: Admin viewing user list
- general: General questions or unclear intent

ENTITY EXTRACTION:
- Extract product names, categories (men/women/children), types (shirt/pant/kurta)
- Extract order numbers if mentioned (format: ORD-XXXXX or just numbers)

USER MESSAGE: "{message}"

Return ONLY this JSON format:
{"intents":["intent_name"],"entities":{"products":[],"category":null,"orderNumber":null},"confidence":"high|medium|low"}`;
/**
 * Build AI classification prompt with user message
 */
export function buildClassificationPrompt(message) {
    return AI_CLASSIFICATION_PROMPT.replace('{message}', message);
}
