const AI_SERVICE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? "http:/localhost:8000";

export interface ChatMessage {
    role: "user" | "assistant";
    content: string
}

export type SalesChannel = "web" | "kiosk" | "messaging";

export interface ChatRequest {
    message: string;
    customer_id: string;
    location_id: string;
    history?: ChatMessage[];
    channel?: SalesChannel;
}

export interface RecommendedProduct {
    sku: string;
    name: string;
    category: string;
    price: number;
    color: string;
    availableQuantity: number;
    score?: number;
    reasons?: string[];
    complementarySkus?: string[];
}

export interface ComplementaryProduct {
    sku: string;
    name?: string;
    price?: number;
    category?: string;
    availableQuantity?: number;
    available?: boolean;
    error?: string;
}

export interface ComplementaryProductsResponse {
    baseProduct: {
        sku: string;
        name: string;
    };
    locationId: string;
    complementaryProducts: ComplementaryProduct[];
}

export interface ChatResponse {
    customerId?: string;
    budget?: number;
    category?: string;
    locationId?: string;
    colors?: string[];
    occasion?: string;
    response?: string;
    error?: string;
    recommendations?: {
        count?: number;
        recommendations?: RecommendedProduct[];
    };
}

export interface CartItem {
    sku: string;
    name: string;
    price: number;
    quantity: number;
}

export interface PromotionResult {
    customerId: string;
    currency: string;
    lineItems: Array<{
        sku: string;
        name: string;
        unitPrice: number;
        subtotal: number;
    }>;
    subtotal: number;
    discounts: {
        loyalty: number;
        bundle: number;
        coupon: number;
    };
    totalDiscount: number;
    finalTotal: number;
    appliedCoupon: string | null;
}

export interface CheckoutResult {
    message: string;
    order: {
        orderId: string;
        customerId: string;
        locationId: string;
        items: Array<{
            sku: string;
            name: string;
            quantity: number;
            unitPrice: number;
        }>;
        subtotal: number;
        discounts: {
            loyalty: number;
            bundle: number;
            coupon: number;
        };
        totalDiscount: number;
        finalTotal: number;
        appliedCoupon: string | null;
        status: string;
        paymentStatus: string;
        createdAt: string;
    };
    notice: string;
}

export async function sendChatMessage(
    request: ChatRequest
): Promise<ChatResponse> {
    const response = await fetch(`${AI_SERVICE_URL}/api/chat`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
    });

    if(!response.ok){
        const message = await response.text()
        throw new Error(message || `Request failed: ${response.status}`);
    }

    return response.json();
}

export async function getComplementaryProducts(
    sku: string,
    locationId = "STORE001"
): Promise<ComplementaryProductsResponse> {
    const aiUrl = process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? "http://localhost:8000";

    const response = await fetch(
        `${aiUrl}/api/products/${encodeURIComponent(sku)}/complementary?location_id=${encodeURIComponent(locationId)}`
    );

    if(!response.ok) {
        throw new Error(`Could not retrieve complementary products (${response.status})`);
    }

    return response.json();
}

async function postCommerce<T>(
    path: string,
    body: unknown
): Promise<T> {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5000";

    const response = await fetch(`${backendUrl}${path}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if(!response.ok) {
        let message = `Request failed: ${response.status}`;

        try {
            const result = await response.json();
            message = result.error ?? result.message ?? message;
        } catch {

        }

        throw new Error(message);
    }

    return response.json() as Promise<T>;
}

export function calculateCartPromotions(
    customerId: string,
    items: Array<{sku: string; quantity: number}>,
    couponCode?: string
): Promise<PromotionResult> {
    return postCommerce<PromotionResult>("/api/promotions/apply", {
        customerId,
        items,
        couponCode: couponCode || undefined,
    });
}

export function simulateCheckout(
    customerId: string,
    locationId: string,
    items: Array<{ sku: string, quantity: number }>,
    couponCode?: string
): Promise<CheckoutResult> {
    return postCommerce<CheckoutResult>("/api/checkout/simulate", {
        customerId,
        locationId,
        items,
        couponCode: couponCode || undefined,
    });
}

