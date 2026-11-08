import { Router } from "express";
import { getRecommendations } from "../services/recommendationService";

const router = Router();

router.post("/", async (req, res) => {
    try {
        const {
            customerId,
            budget,
            category,
            colors,
            occasion,
            locationId
        } = req.body ?? {};

        if (
            typeof customerId !== "string" ||
            customerId.trim() === ""
        ){
            return res.status(400).json({
                error: "A valid customerId is required",
            });
        }

        if (
            budget !== undefined &&
            (typeof budget !== "number" ||
                !Number.isFinite(budget) ||
                budget < 0)
        ) {
            return res.status(400).json({
                error: "Budget must be a non-negative number",
            });
        }

        if (
            colors !== undefined &&
            (!Array.isArray(colors) ||
             !colors.every((color: unknown) => typeof color === "string"))
        ) {
            return res.status(400).json({
                error: "Colors must be an array of strings",
            });
        }

        const result = await getRecommendations({
            customerId: customerId.trim(),
            budget,
            category,
            colors,
            occasion,
            locationId,
        });

        return res.json(result);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";

        if( message === "Customer not found"){
            return res.status(404).json({error: message});
        }

        if( message === "Budget must be a non-negative number"){
            return res.status(400).json({error: message});
        }

        console.error("Recommendation failed:", error);

        return res.status(500).json({
            error: "Failed to generate recommendations",
        })
    }
});

export default router;