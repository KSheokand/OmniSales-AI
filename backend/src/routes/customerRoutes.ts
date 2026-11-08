import { Router } from "express";
import Customer from "../models/Customer";

const router = Router();

// GET /api/customers/:customerId
router.get("/:customerId", async (req, res) => {
    try {
        const customer = await Customer.findOne({
            customerId: req.params.customerId,
        }).select("-__v").lean();

        if(!customer){
            return res.status(404).json({
                error: "Customer not found",
            });
        }

        return res.json({
            customer,
        });
    } catch (error) {
        console.error("Customer lookup failed:", error);

        return res.status(500).json({
            error: "Failed to retrieve customer",
        });
    }
});

export default router;