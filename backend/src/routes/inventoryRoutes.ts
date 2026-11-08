import { Router } from "express";
import Inventory from "../models/Inventory";
import Product from "../models/Product";
import { loadEnvFile } from "node:process";

const router = Router();

// GET /api/inventory/:sku
router.get("/:sku", async (req, res) => {
    try {
        const { sku } = req.params;

        const product = await Product.findOne({
            sku,
            active: true,
        }).lean();

        if(!product){
            return res.status(404).json({
                error: "Product not found",
            });
        }

        const records = await Inventory.find({sku}).lean();

        const locations = records.map((record) => ({
            locationId: record.locationId,
            locationType: record.locationType,
            stockAvailabe: record.stockAvailable,
            reserverdQuantity: record.reservedQuantity,
            availableQuantitiy: Math.max(
                0, record.stockAvailable - record.reservedQuantity
            ),
        }));

        return res.json({
            sku,
            productName: product.name,
            locations,
        });
    } catch (error){
        console.error("Inventory lookup failed:", error);

        return res.status(500).json({
            error: "Failed to retrieve inventory",
        });
    }
});

// GET /api/inventory/:sku/:locationId
router.get("/:sku/:locationId", async (req, res) => {
    try {
        const { sku, locationId } = req.params;
        
        const record = await Inventory.findOne({
            sku,
            locationId,
        }).lean();

        if(!record){
            return res.status(404).json({
                error: "No inventory record found for this product and location",
            });
        }

        const availableQuantity = Math.max(
            0, record.stockAvailable - record.reservedQuantity
        );

        return res.json({
            sku,
            locationId,
            locationType: record.locationType,
            stockAvailable: record.stockAvailable,
            reservedQuantity: record.reservedQuantity,
            availableQuantity,
            inStock: availableQuantity > 0,
        });
    } catch (error){
        console.error("Location inventory lookup failed:", error);

        return res.json(500).json({
            error: "Failed to retrieve inventory",
        });
    }
});

export default router;