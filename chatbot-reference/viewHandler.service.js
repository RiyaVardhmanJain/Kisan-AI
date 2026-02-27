/**
 * View Handler Service
 * Fetches data from database based on detected intents
 */

import prisma from '../../db.js';

/**
 * Build context data for view intents
 */
export async function buildContext(detection, userId, userRole) {
    const parts = [];

    for (const intent of detection.intents) {
        const data = await fetchData(intent, detection.entities, userId, userRole);
        if (data) parts.push(data);
    }

    return parts.join('\n\n---\n\n');
}

/**
 * Fetch data based on intent
 */
async function fetchData(intent, entities, userId, userRole) {
    switch (intent) {
        case 'view_orders':
            return fetchUserOrders(userId, entities);
        case 'view_products':
            return fetchProducts(entities);
        case 'view_wishlist':
            return fetchWishlist(userId);
        case 'view_cart':
            return fetchCart(userId);
        case 'view_vouchers':
            return fetchVouchers(userId);
        case 'view_my_products':
            return userRole === 'VENDOR' ? fetchVendorProducts(userId) : null;
        case 'view_vendor_orders':
            return userRole === 'VENDOR' ? fetchVendorOrders(userId) : null;
        case 'view_vendor_analytics':
            return userRole === 'VENDOR' ? fetchVendorAnalytics(userId) : null;
        case 'view_all_orders':
            return userRole === 'INTERNAL' ? fetchAllOrders(entities) : null;
        case 'view_all_products':
            return userRole === 'INTERNAL' ? fetchAllProducts() : null;
        case 'view_all_users':
            return userRole === 'INTERNAL' ? fetchAllUsers() : null;
        case 'view_admin_analytics':
            return userRole === 'INTERNAL' ? fetchAdminAnalytics() : null;
        default:
            return null;
    }
}

/**
 * Fetch user's orders
 */
async function fetchUserOrders(userId, entities) {
    const where = { userId };

    // Filter by order number if provided
    if (entities.orderNumber) {
        where.orderNumber = { contains: entities.orderNumber, mode: 'insensitive' };
    }

    const orders = await prisma.order.findMany({
        where,
        include: {
            items: {
                include: { product: true }
            }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
    });

    if (orders.length === 0) {
        return entities.orderNumber
            ? `No order found with number "${entities.orderNumber}".`
            : 'You have no orders yet.';
    }

    const list = orders.map(o => {
        const date = new Date(o.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
        const itemCount = o.items.length;
        return `• ${o.orderNumber}: ${itemCount} item(s) - ₹${o.total.toFixed(2)} - ${o.status.toUpperCase()} - ${date}`;
    }).join('\n');

    return `YOUR ORDERS (${orders.length}):\n${list}`;
}

/**
 * Fetch products based on filters
 */
async function fetchProducts(entities) {
    const where = { published: true, isGiftCard: false };

    if (entities.category) {
        where.productCategory = { equals: entities.category, mode: 'insensitive' };
    }
    if (entities.productType) {
        where.productType = { contains: entities.productType, mode: 'insensitive' };
    }
    if (entities.products && entities.products.length > 0) {
        where.productName = {
            contains: entities.products[0],
            mode: 'insensitive'
        };
    }

    const products = await prisma.product.findMany({
        where,
        orderBy: [{ isTrending: 'desc' }, { purchaseCount: 'desc' }],
        take: 10
    });

    if (products.length === 0) {
        return 'No products found matching your criteria.';
    }

    const list = products.map(p => {
        const trending = p.isTrending ? '🔥 ' : '';
        return `• ${trending}${p.productName} (${p.productCategory}/${p.productType}) - ₹${p.salesPrice.toFixed(2)}`;
    }).join('\n');

    return `PRODUCTS (${products.length}):\n${list}`;
}

/**
 * Fetch user's wishlist
 */
async function fetchWishlist(userId) {
    const items = await prisma.wishlist.findMany({
        where: { userId },
        include: { product: true },
        orderBy: { addedAt: 'desc' }
    });

    if (items.length === 0) {
        return 'Your wishlist is empty. Browse products and save your favorites!';
    }

    const list = items.map(i =>
        `• ${i.product.productName} - ₹${i.product.salesPrice.toFixed(2)}`
    ).join('\n');

    return `YOUR WISHLIST (${items.length} items):\n${list}`;
}

/**
 * Fetch user's cart
 */
async function fetchCart(userId) {
    const cart = await prisma.cart.findUnique({
        where: { userId },
        include: {
            items: {
                include: { product: true }
            }
        }
    });

    if (!cart || cart.items.length === 0) {
        return 'Your cart is empty. Start shopping!';
    }

    let total = 0;
    const list = cart.items.map(i => {
        const price = i.customPrice || i.product.salesPrice;
        const subtotal = price * i.quantity;
        total += subtotal;
        const sizeColor = [i.size, i.color].filter(Boolean).join(', ');
        return `• ${i.product.productName}${sizeColor ? ` (${sizeColor})` : ''} x${i.quantity} - ₹${subtotal.toFixed(2)}`;
    }).join('\n');

    return `YOUR CART (${cart.items.length} items):\n${list}\n\n💰 Total: ₹${total.toFixed(2)}`;
}

/**
 * Fetch user's vouchers
 */
async function fetchVouchers(userId) {
    const vouchers = await prisma.voucher.findMany({
        where: {
            OR: [
                { issuedTo: userId },
                { sentTo: userId }
            ],
            status: 'ACTIVE'
        },
        orderBy: { createdAt: 'desc' },
        take: 10
    });

    if (vouchers.length === 0) {
        return 'You have no active vouchers or gift cards.';
    }

    const giftCards = vouchers.filter(v => v.type === 'GIFT_CARD');
    const coupons = vouchers.filter(v => v.type === 'COUPON');

    let result = [];

    if (giftCards.length > 0) {
        const gcList = giftCards.map(v =>
            `• ${v.code}: ₹${v.balance?.toFixed(2) || v.value.toFixed(2)} remaining`
        ).join('\n');
        result.push(`🎁 GIFT CARDS (${giftCards.length}):\n${gcList}`);
    }

    if (coupons.length > 0) {
        const cpList = coupons.map(v => {
            const discount = v.discountType === 'PERCENTAGE'
                ? `${v.value}% off`
                : `₹${v.value.toFixed(2)} off`;
            return `• ${v.code}: ${discount}`;
        }).join('\n');
        result.push(`🏷️ COUPONS (${coupons.length}):\n${cpList}`);
    }

    return result.join('\n\n');
}

/**
 * Fetch vendor's products
 */
async function fetchVendorProducts(vendorId) {
    const products = await prisma.product.findMany({
        where: { vendorId },
        orderBy: { createdAt: 'desc' },
        take: 20
    });

    if (products.length === 0) {
        return 'You have not listed any products yet.';
    }

    const list = products.map(p => {
        const status = p.published ? '✅' : '⏸️';
        return `${status} ${p.productName} - ₹${p.salesPrice.toFixed(2)} (Stock: ${p.currentStock})`;
    }).join('\n');

    return `YOUR PRODUCTS (${products.length}):\n${list}`;
}

/**
 * Fetch orders for vendor's products
 */
async function fetchVendorOrders(vendorId) {
    const orderItems = await prisma.orderItem.findMany({
        where: {
            product: { vendorId }
        },
        include: {
            order: true,
            product: true
        },
        orderBy: { createdAt: 'desc' },
        take: 20
    });

    if (orderItems.length === 0) {
        return 'No orders for your products yet.';
    }

    // Group by order
    const orderMap = new Map();
    for (const item of orderItems) {
        if (!orderMap.has(item.orderId)) {
            orderMap.set(item.orderId, {
                order: item.order,
                items: []
            });
        }
        orderMap.get(item.orderId).items.push(item);
    }

    const list = Array.from(orderMap.values()).slice(0, 10).map(({ order, items }) => {
        const date = new Date(order.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short'
        });
        const total = items.reduce((sum, i) => sum + i.subtotal, 0);
        return `• ${order.orderNumber}: ${items.length} item(s) - ₹${total.toFixed(2)} - ${order.status} - ${date}`;
    }).join('\n');

    return `ORDERS FOR YOUR PRODUCTS (${orderMap.size}):\n${list}`;
}

/**
 * Fetch vendor analytics summary
 */
async function fetchVendorAnalytics(vendorId) {
    const [products, orderItems] = await Promise.all([
        prisma.product.aggregate({
            where: { vendorId },
            _count: true,
            _sum: { currentStock: true }
        }),
        prisma.orderItem.findMany({
            where: { product: { vendorId } },
            select: { subtotal: true, quantity: true }
        })
    ]);

    const totalRevenue = orderItems.reduce((sum, i) => sum + i.subtotal, 0);
    const totalSold = orderItems.reduce((sum, i) => sum + i.quantity, 0);

    return `📊 YOUR VENDOR ANALYTICS:
• Products Listed: ${products._count}
• Total Stock: ${products._sum.currentStock || 0}
• Items Sold: ${totalSold}
• Total Revenue: ₹${totalRevenue.toFixed(2)}`;
}

/**
 * Fetch all orders (admin)
 */
async function fetchAllOrders(entities) {
    const where = {};
    if (entities.orderNumber) {
        where.orderNumber = { contains: entities.orderNumber, mode: 'insensitive' };
    }

    const [orders, stats] = await Promise.all([
        prisma.order.findMany({
            where,
            include: { user: true },
            orderBy: { createdAt: 'desc' },
            take: 15
        }),
        prisma.order.groupBy({
            by: ['status'],
            _count: true
        })
    ]);

    if (orders.length === 0) {
        return 'No orders found.';
    }

    const statusCounts = stats.map(s => `${s.status}: ${s._count}`).join(', ');

    const list = orders.map(o => {
        const date = new Date(o.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short'
        });
        return `• ${o.orderNumber} | ${o.user.name} | ₹${o.total.toFixed(2)} | ${o.status} | ${date}`;
    }).join('\n');

    return `📦 ALL ORDERS:\nStatus: ${statusCounts}\n\n${list}`;
}

/**
 * Fetch all products (admin)
 */
async function fetchAllProducts() {
    const [products, stats] = await Promise.all([
        prisma.product.findMany({
            take: 15,
            orderBy: { createdAt: 'desc' }
        }),
        prisma.product.aggregate({
            _count: true,
            _sum: { currentStock: true }
        })
    ]);

    const list = products.map(p => {
        const status = p.published ? '✅' : '⏸️';
        return `${status} ${p.productName} | ₹${p.salesPrice.toFixed(2)} | Stock: ${p.currentStock}`;
    }).join('\n');

    return `🛍️ ALL PRODUCTS (${stats._count}):\nTotal Stock: ${stats._sum.currentStock || 0}\n\n${list}`;
}

/**
 * Fetch all users (admin)
 */
async function fetchAllUsers() {
    const stats = await prisma.user.groupBy({
        by: ['role'],
        _count: true
    });

    const roleCounts = stats.map(s => `${s.role}: ${s._count}`).join(', ');

    const recentUsers = await prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: { name: true, email: true, role: true, createdAt: true }
    });

    const list = recentUsers.map(u => {
        const date = new Date(u.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short'
        });
        return `• ${u.name} (${u.role}) - ${u.email} - ${date}`;
    }).join('\n');

    return `👥 USERS:\n${roleCounts}\n\nRecent:\n${list}`;
}

/**
 * Fetch admin analytics
 */
async function fetchAdminAnalytics() {
    const [orderStats, productStats, userStats, revenueData] = await Promise.all([
        prisma.order.aggregate({
            _count: true,
            _sum: { total: true }
        }),
        prisma.product.aggregate({
            _count: true,
            _sum: { currentStock: true }
        }),
        prisma.user.count(),
        prisma.order.groupBy({
            by: ['status'],
            _count: true,
            _sum: { total: true }
        })
    ]);

    const pendingOrders = revenueData.find(r => r.status === 'pending')?._count || 0;
    const deliveredRevenue = revenueData.find(r => r.status === 'delivered')?._sum.total || 0;

    return `📊 ADMIN DASHBOARD:

💰 Revenue: ₹${(orderStats._sum.total || 0).toFixed(2)}
📦 Total Orders: ${orderStats._count}
⏳ Pending Orders: ${pendingOrders}
✅ Delivered Revenue: ₹${deliveredRevenue.toFixed(2)}

🛍️ Products: ${productStats._count}
📦 Total Stock: ${productStats._sum.currentStock || 0}

👥 Total Users: ${userStats}`;
}
