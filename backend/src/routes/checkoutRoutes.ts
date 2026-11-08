import { Router } from "express";
import { randomUUID } from "node:crypto";

import Product from "../models/Product";
import Inventory from "../models/Inventory";
import Order from "../models/Order";
import { calculatePromotions } from "../services/promotionService";

const router = Router();

// POST /api/checkout/simulate
router.post("/simulate", async (req, res) => {
  try {
    const {
      customerId,
      locationId,
      items,
      couponCode,
    } = req.body ?? {};

    if (
      typeof customerId !== "string" ||
      typeof locationId !== "string" ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        error: "customerId, locationId and non-empty items are required",
      });
    }

    // Validate quantities and combine duplicate SKUs.
    const quantities = new Map<string, number>();

    for (const item of items) {
      if (
        !item ||
        typeof item.sku !== "string" ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1
      ) {
        return res.status(400).json({
          error: "Invalid cart item or quantity",
        });
      }

      const quantity =
        (quantities.get(item.sku) ?? 0) + item.quantity;

      if (quantity > 20) {
        return res.status(400).json({
          error: "Maximum quantity per product is 20",
        });
      }

      quantities.set(item.sku, quantity);
    }

    const cartItems = Array.from(quantities.entries()).map(
      ([sku, quantity]) => ({ sku, quantity })
    );

    // Confirm that products exist and are active.
    const products = await Product.find({
      sku: { $in: cartItems.map((item) => item.sku) },
      active: true,
    }).lean();

    const productMap = new Map(
      products.map((product) => [product.sku, product])
    );

    if (productMap.size !== cartItems.length) {
      return res.status(400).json({
        error: "One or more products are unavailable",
      });
    }

    // Check available stock at the selected location.
    const inventoryRecords = await Inventory.find({
      sku: { $in: cartItems.map((item) => item.sku) },
      locationId,
    }).lean();

    const inventoryMap = new Map(
      inventoryRecords.map((record) => [
        record.sku,
        Math.max(
          0,
          record.stockAvailable - record.reservedQuantity
        ),
      ])
    );

    for (const item of cartItems) {
      const available = inventoryMap.get(item.sku) ?? 0;

      if (available < item.quantity) {
        return res.status(409).json({
          error: "Insufficient stock",
          sku: item.sku,
          requested: item.quantity,
          available,
        });
      }
    }

    // Use the existing backend promotion engine.
    const pricing = await calculatePromotions({
      customerId,
      items: cartItems,
      couponCode,
    });

    const orderItems = cartItems.map((item) => {
      const product = productMap.get(item.sku)!;

      return {
        sku: item.sku,
        name: product.name,
        quantity: item.quantity,
        unitPrice: product.price,
      };
    });

    const orderId = `DEMO-${randomUUID().slice(0, 8).toUpperCase()}`;

    const order = await Order.create({
      orderId,
      customerId,
      locationId,
      items: orderItems,
      subtotal: pricing.subtotal,
      discounts: pricing.discounts,
      totalDiscount: pricing.totalDiscount,
      finalTotal: pricing.finalTotal,
      appliedCoupon: pricing.appliedCoupon,
      status: "confirmed",
      paymentStatus: "simulated",
    });

    return res.status(201).json({
      message: "Simulated order confirmed successfully",
      order: {
        orderId: order.orderId,
        customerId: order.customerId,
        locationId: order.locationId,
        items: order.items,
        subtotal: order.subtotal,
        discounts: order.discounts,
        totalDiscount: order.totalDiscount,
        finalTotal: order.finalTotal,
        appliedCoupon: order.appliedCoupon,
        status: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
      },
      notice:
        "Demo checkout only. No payment was collected and inventory was not reserved.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    if (
      message === "Customer not found" ||
      message === "Invalid coupon code" ||
      message === "Cart cannot be empty" ||
      message === "Invalid cart item or quantity" ||
      message === "One or more products are unavailable"
    ) {
      return res.status(400).json({ error: message });
    }

    console.error("Simulated checkout failed:", error);

    return res.status(500).json({
      error: "Failed to process simulated checkout",
    });
  }
});

export default router;