import { Router } from "express";
import { calculatePromotions } from "../services/promotionService";

const router = Router();

// POST /api/promotions/apply
router.post("/apply", async (req, res) => {
    try {
        const { customerId, items, couponCode} = req.body ?? {};

        if (
            typeof customerId !== "string" ||
            !Array.isArray(items)
        ) {
            return res.status(400).json({
                error: "customerId and items are required",
            });
        }

        const result = await calculatePromotions({
            customerId,
            items,
            couponCode,
        });

        return res.json(result);
    } catch(error){
        const message = error instanceof Error ? error.message: "Unknown error";

        if (
            message === "Customer not found" ||
            message === "Invalid coupon code" ||
            message === "Cart cannot be empty" ||
            message === "Invalid cart item or quantity" ||
            message === "One or more products are unavailable"
        ) {
            return res.status(400).json({
                error: message,
            });
        }

        console.error("Promotion calculation failed:", error);

        return res.status(500).json({
            error: "Failed to calculate promotions",
        });
    }
});

export default router;