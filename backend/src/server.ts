import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDatabase } from "./config/database";
import productRoutes from "./routes/productRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes";
import customerRoutes from "./routes/customerRoutes";
import promotionRoutes from "./routes/promotionRoutes";
import recommendationRoutes from "./routes/recommendationRoutes";
import checkoutRoutes from "./routes/checkoutRoutes";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/products", productRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/checkout", checkoutRoutes);


app.get("/api/health", (_req, res) => {
    res.json({
        status: "ok",
        service: "omnisales-backend",
        timeStamp: new Date().toISOString(),
    });
});

const PORT = Number(process.env.PORT) || 5000;

async function startServer(){
    try {
        await connectDatabase();

        app.listen(PORT, () => {
            console.log(`Omnisales backend running on port ${PORT}`);
        });
    } catch (error){
        console.error("Failed to start backend:", error);
        process.exit(1);
    }
}

startServer();
