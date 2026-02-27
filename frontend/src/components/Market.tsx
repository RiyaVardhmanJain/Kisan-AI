import {
    Star,
    ShoppingCart,
} from "lucide-react";

// Logger utility
const logPaymentFlow = (stage: string, data?: any) => {
    console.group(`Payment Flow: ${stage}`);
    if (data) console.log(data);
    console.groupEnd();
};

interface Product {
    id: number;
    name: string;
    image: string;
    price: number;
    rentalPrice: number;
    description: string;
    category: string;
    rating: number;
    available: boolean;
    stock: number;
    featured?: boolean;
    discount?: number;
    specifications?: string[];
}

const products: Product[] = [
    {
        id: 1,
        name: "Drip Irrigation Kit",
        image: "https://images.unsplash.com/photo-1591154669695-5f2a8d20c089?auto=format&fit=crop&q=80",
        price: 5000,
        rentalPrice: 800,
        description: "Water-efficient drip irrigation system ideal for Indian climate",
        category: "Irrigation",
        rating: 4.7,
        available: true,
        stock: 20,
        featured: true,
        specifications: ["Water-saving", "Easy Installation", "Weather-resistant", "Coverage: 1 Acre"]
    },
    {
        id: 2,
        name: "Seeds Packet",
        image: "https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?auto=format&fit=crop&q=80",
        price: 4999,
        rentalPrice: 0,
        description: "Premium indigenous seed varieties for Indian farming conditions",
        category: "Seeds",
        rating: 4.6,
        available: true,
        stock: 75,
        discount: 16,
        specifications: ["Indigenous Varieties", "High-yield", "Drought-resistant", "Non-GMO"]
    },
    {
        id: 3,
        name: "Kisan Sprayer Drone",
        image: "https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&q=80",
        price: 50000,
        rentalPrice: 2500,
        description: "Made in India drone for efficient crop spraying and monitoring",
        category: "Technology",
        rating: 4.9,
        available: true,
        stock: 8,
        featured: true,
        specifications: ["HD Camera", "25min Flight Time", "GPS Enabled", "10L Tank"]
    },
    {
        id: 4,
        name: "Digital Soil Testing Kit",
        image: "https://images.unsplash.com/photo-1611735341450-74d61e660ad2?auto=format&fit=crop&q=80",
        price: 8999,
        rentalPrice: 400,
        description: "Digital soil analysis kit with regional soil type database",
        category: "Tools",
        rating: 4.4,
        available: true,
        stock: 30,
        discount: 10,
        specifications: ["pH Testing", "NPK Analysis", "Mobile App", "Regional Database"]
    },
    {
        id: 5,
        name: "Polyhouse Control System",
        image: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&q=80",
        price: 65000,
        rentalPrice: 1200,
        description: "Automated polyhouse management system for Indian weather",
        category: "Technology",
        rating: 4.7,
        available: true,
        stock: 15,
        featured: true,
        specifications: ["Temperature Control", "Humidity Control", "Solar Powered", "Mobile Alerts"]
    },
    {
        id: 6,
        name: "Vermicompost Bundle",
        image: "https://images.unsplash.com/photo-1515150144380-bca9f1650ed9?auto=format&fit=crop&q=80",
        price: 3499,
        rentalPrice: 100,
        description: "Premium organic vermicompost for all Indian crops",
        category: "Chemicals",
        rating: 4.5,
        available: true,
        stock: 100,
        discount: 27,
        specifications: ["100% Organic", "Rich in Nutrients", "Local Earthworms", "No Chemicals"]
    }
]

const ProductCard = ({ product }: { product: Product }) => {
    const handlePayment = async () => {
        try {
            logPaymentFlow('Initializing Payment', {
                productName: product.name,
                amount: 1
            });

            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                amount: 100, // ₹1 in paise
                currency: "INR",
                name: "Krishi Tech",
                description: `Test Payment for: ${product.name}`,
                image: product.image,
                handler: function (response: any) {
                    logPaymentFlow('Payment Success', {
                        paymentId: response.razorpay_payment_id,
                        orderId: response.razorpay_order_id,
                        signature: response.razorpay_signature
                    });
                    // Here you would typically verify the payment on your backend
                    alert('Payment Successful! Order will be processed shortly.');
                },
                prefill: {
                    name: "Test User",
                    email: "test@example.com",
                    contact: "9999999999"
                },
                notes: {
                    productId: product.id,
                    category: product.category
                },
                theme: {
                    color: "#63A361"
                }
            };

            const razorpay = new (window as any).Razorpay(options);

            razorpay.on('payment.failed', function (response: any) {
                logPaymentFlow('Payment Failed', response.error);
                alert('Payment failed. Please try again.');
            });

            logPaymentFlow('Opening Payment Modal');
            razorpay.open();

        } catch (error) {
            logPaymentFlow('Payment Error', {
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                timestamp: new Date().toISOString()
            });
            alert('Something went wrong. Please try again later.');
        }
    };

    return (
        <div
            className="flex overflow-hidden relative flex-col p-4 rounded-2xl border shadow-lg sm:p-6 bg-white border-[#5B532C]/20"
        >
            <div className="flex relative z-10 flex-col h-full">
                {/* Category & Rating */}
                <div className="flex justify-between items-center mb-4 sm:mb-6">
                    <span className="text-sm font-medium text-[#5B532C]/80">{product.category}</span>
                    <div className="flex gap-1 items-center">
                        <Star className="w-4 h-4 text-[#FFC50F] fill-[#FFC50F]" />
                        <span className="text-sm font-medium text-[#5B532C]">{product.rating}</span>
                    </div>
                </div>

                {/* Product Image */}
                <div className="overflow-hidden relative mb-4 w-full h-32 rounded-xl sm:mb-6 sm:h-48">
                    <img
                        src={product.image}
                        alt={product.name}
                        className="object-cover w-full h-full"
                    />
                </div>

                {/* Title & Badges */}
                <div className="mb-3 sm:mb-4">
                    {(product.featured || product.discount) && (
                        <div className="flex gap-2 mb-2">
                            {product.featured && (
                                <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-[#63A361]/10 text-[#63A361]">
                                    Featured
                                </span>
                            )}
                            {product.discount && (
                                <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-[#FFC50F]/20 text-[#5B532C]">
                                    {product.discount}% OFF
                                </span>
                            )}
                        </div>
                    )}
                    <h3 className="text-lg font-semibold tracking-tight leading-tight text-[#5B532C] sm:text-xl">
                        {product.name}
                    </h3>
                </div>

                {/* Description */}
                <p className="mb-4 text-[#5B532C]/80 sm:mb-8 text-sm/relaxed">
                    {product.description}
                </p>

                {/* Specifications - Hidden on mobile */}
                {product.specifications && (
                    <div className="hidden flex-wrap gap-2 mb-8 sm:flex">
                        {product.specifications.map((spec, i) => (
                            <span
                                key={i}
                                className="px-3 py-1 text-xs font-medium text-[#5B532C]/80 bg-[#FDE7B3]/10 rounded-full"
                            >
                                {spec}
                            </span>
                        ))}
                    </div>
                )}

                {/* Updated Pricing Display */}
                <div className="mt-auto space-y-4">
                    <div className="flex justify-between items-center pt-4 border-t border-[#5B532C]/20">
                        <span className="text-sm font-medium text-[#5B532C]/80">Price</span>
                        <div className="text-right">
                            <span className="text-xl font-bold text-[#5B532C] sm:text-2xl">₹{product.price.toLocaleString()}</span>
                        </div>
                    </div>
                    {product.rentalPrice > 0 && (
                        <div className="flex justify-between items-center pt-4 border-t border-[#5B532C]/20">
                            <span className="text-sm font-medium text-[#5B532C]/80">Rental Price</span>
                            <span className="text-lg font-semibold text-[#63A361] sm:text-xl">₹{product.rentalPrice} per Hour</span>
                        </div>
                    )}

                    {/* Updated Action Button */}
                    <button
                        onClick={handlePayment}
                        className="flex gap-2 justify-center items-center px-4 py-3 w-full font-medium text-white rounded-xl sm:px-6 bg-[#63A361] hover:bg-[#5B532C] transition-all duration-300"
                    >
                        <ShoppingCart className="w-5 h-5" />
                        Buy Now
                    </button>
                </div>
            </div>
        </div>
    );
};

const Market = () => {

    const filteredProducts = products.sort((a, b) => b.rating - a.rating);

    return (

        <div className="px-4 py-8 mx-auto max-w-6xl sm:px-6 lg:px-8 sm:py-12">
            {/* Header */}
            <div
                className="mb-8 text-center"
            >
                <h2 className="mb-4 text-3xl font-bold tracking-tight text-[#5B532C] md:text-4xl">
                    Smart Farming Marketplace
                </h2>
                <p className="mx-auto max-w-2xl text-base leading-relaxed text-[#5B532C]/80">
                    Purchase or rent premium farming equipment and supplies
                </p>
            </div>


            {/* Responsive Products Grid */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6 lg:gap-8">
                {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </div>
    );
};

export default Market;