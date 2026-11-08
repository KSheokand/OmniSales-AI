import Product from "../models/Product";
import Customer from "../models/Customer";

type CartItem = {
    sku: string;
    quantity: number;
};

type PromotionInput = {
    customerId: string;
    items: CartItem[];
    couponCode?: string;
};

export async function calculatePromotions(
    input: PromotionInput
) {
    if(!input.items.length){
        throw new Error("Cart cannot be empty");
    }

    const customer = await Customer.findOne({
        customerId: input.customerId,    
    }).lean();

    if(!customer){
        throw new Error("Customer not found");
    }

    for(const item of input.items){
        if(
            !item.sku || !Number.isInteger(item.quantity) ||
            item.quantity < 1 ||
            item.quantity >20
        ){
            throw new Error("Invalid cart item or quantity");
        }
    }

    const skus = [...new Set(input.items.map((item) => item.sku))];

    const products = await Product.find({
        sku: { $in: skus},
        active: true,
    }).lean();

    const productMap = new Map(
        products.map((product) => [product.sku, product])
    );

    if(productMap.size !== skus.length){
        throw new Error("One or more products are unavailable");
    }

    const lineItems = input.items.map((item) => {
        const product = productMap.get(item.sku)!;

        return {
            sku: item.sku,
            name: product.name,
            quantitiy: item.quantity,
            unitPrice: product.price,
            subtotal: product.price*item.quantity,
        };
    });

    const subtotal = lineItems.reduce(
        (total, item) => total + item.subtotal, 0
    );

    const loyaltyRate = customer.loyaltyTier === "Platinum" ? 0.08 : customer.loyaltyTier === "Gold" ? 0.05 : 0;

    const loyaltyDiscount = Math.round(subtotal*loyaltyRate);

    const hasBundle = new Set(input.items.map((item) => item.sku)).size >= 2;

    const bundleDiscount = hasBundle ? Math.round(subtotal * 0.05) : 0;

    const coupon = input.couponCode?.trim().toUpperCase();

    if(coupon && coupon !== "STYLE10"){
        throw new Error("Invalid coupon code");
    }

    const couponDiscount = coupon ? Math.round(subtotal*0.10) : 0;

    const totalDiscount = Math.min(subtotal, loyaltyDiscount + bundleDiscount + couponDiscount);

    const finalTotal = subtotal - totalDiscount;

    return {
        customerId: input.customerId,
        currency: "INR",
        lineItems,
        subtotal,
        discounts: {
            loyalty: loyaltyDiscount,
            bundle: bundleDiscount,
            coupon: couponDiscount,
        },
        totalDiscount,
        finalTotal,
        appliedCoupon: coupon ?? null,
    };
}