import { Router } from "express";
import Product from "../models/Product";

const router = Router();

// GET /api/products
router.get("/", async (req, res) => {
    try {
        const { category, search, maxPrice } = req.query;

        const filter: Record<string, unknown> = {active: true};

        if(typeof category === "string"){
            filter.category = category.toLowerCase();
        }

        if(typeof search === "string" && search.trim()){
            filter.$text = { $search: search.trim()};
        }

        if(typeof maxPrice === "string"){
            const price = Number(maxPrice);

            if(!Number.isFinite(price) || price < 0){
                return res.status(400).json({
                    error: "maxPrice must be a non-negative number",
                });
            }

            filter.price = { $lte: price};
        }

        const products = await Product.find(filter).select("-__v").sort({name:1}).limit(100).lean();

        return res.json({
            count: products.length,
            products,
        });
    } catch (error){
        console.error("Product search failed:", error);
        return res.status(500).json({error: "Failed to fetch products"});
    }
});

// GET /api/products/:sku
router.get("/:sku", async (req, res) => {
    try {
        const product = await Product.findOne({
            sku: req.params.sku,
            active: true
        }).select("-__v").lean();

        if(!product){
            return res.status(404).json({error: "Product not found"});
        }

        return res.json(product);
    } catch (error){
        console.error("Product lookup failed:", error);
        return res.status(500).json({error: "Failed to fetch product"});
    }
});

export default router;