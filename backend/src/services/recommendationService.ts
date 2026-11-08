import Product from "../models/Product";
import Customer from "../models/Customer";
import Inventory from "../models/Inventory";

interface RecommendationInput {
    customerId: string;
    budget?: number;
    category?: string;
    colors?: string[];
    occasion?: string;
    locationId?: string;
}

export async function getRecommendations(
    input: RecommendationInput
) {
    const customer = await Customer.findOne({
        customerId: input.customerId,
    }).lean();

    if(!customer){
        throw new Error("Customer not found");
    }

    const budget = input.budget ?? customer.preferences.budget;

    if(!Number.isFinite(budget) || budget < 0){
        throw new Error("Budget must be a non-negative number");
    }

    const preferredColors = (
        input.colors ?? customer.preferences.colors
    ).map((color) => color.toLowerCase());

    const preferredCategories = input.category ? [input.category.toLowerCase()] : customer.preferences.categories.map((category) => category.toLowerCase());

    const filter: Record<string, unknown> = {
        active: true,
        price: { $lte: budget },
    };

    if(preferredCategories.length > 0){
        filter.category = { $in: preferredCategories };
    }

    const products = await Product.find(filter).limit(100).lean();

    const inventoryFilter: Record<string, unknown> = {};

    if(input.locationId){
        inventoryFilter.locationId = input.locationId;
    }

    const inventory = await Inventory.find(inventoryFilter).lean();

    const inventoryBySku = new Map<string, number>();

    for(const record of inventory){
        const available = Math.max(0, record.stockAvailable - record.reservedQuantity);

        inventoryBySku.set(
            record.sku,
            (inventoryBySku.get(record.sku) ?? 0) + available
        );
    }

    const purchaseHistory = new Set(
        customer.purchaseHistory.map((purchase) => purchase.sku)
    );

    const recommendations = products.filter((product) => (inventoryBySku.get(product.sku) ?? 0) > 0).map((product) => {
        let score = 0;
        const reasons: string[] = [];

        if (
            preferredColors.includes(
                product.attributes.color.toLowerCase()
            )
        ) {
            score +=3;
            reasons.push("Matches your preferred colors");
        }

        if (
            customer.preferences.categories.map((category) => category.toLowerCase()).includes(product.category.toLowerCase())
        ){
            score += 3;
            reasons.push("Matcches your preferred categories");
        }

        if(purchaseHistory.has(product.sku)){
            score-=2;
            reasons.push("Previously purchased");
        }

        if(product.price <=budget){
            score +=2;
            reasons.push("Within your budget");
        }

        return {
            sku: product.sku,
            name: product.name,
            category: product.category,
            price: product.price,
            color: product.attributes.color,
            availableQuantity: inventoryBySku.get(product.sku) ?? 0,
            score,
            reasons,
            complementarySkus: product.complementarySkus,
        };
    }).sort((a,b) => b.score - a.score || a.price - b.price).slice(0,10);

    return {
        customerId: input.customerId,
        budget,
        locationId: input.locationId ?? null,
        count:recommendations.length,
        recommendations,
    };
}