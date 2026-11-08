import dotenv from "dotenv";
import mongoose from "mongoose";

import { connectDatabase } from "./config/database.js";
import Product from "./models/Product.js";
import Customer from "./models/Customer.js";
import Inventory from "./models/Inventory.js";

dotenv.config();

const storeIds = ["STORE001", "STORE002", "STORE003"];
const warehouseId = "WAREHOUSE001";

const catalog = [
  {
    sku: "SHIRT001",
    name: "Classic Navy Formal Shirt",
    category: "formalwear",
    price: 1799,
    color: "navy",
    tags: ["formal", "classic", "party"],
    occasions: ["office", "formal-party"],
    sizes: ["S", "M", "L", "XL"],
    complementarySkus: ["TROUSER001", "SHOE001"],
  },
  {
    sku: "SHIRT002",
    name: "White Slim Fit Shirt",
    category: "formalwear",
    price: 1599,
    color: "white",
    tags: ["formal", "classic"],
    occasions: ["office", "formal-party"],
    sizes: ["S", "M", "L", "XL"],
    complementarySkus: ["TROUSER001"],
  },
  {
    sku: "TROUSER001",
    name: "Charcoal Formal Trousers",
    category: "formalwear",
    price: 1499,
    color: "charcoal",
    tags: ["formal", "classic"],
    occasions: ["office", "formal-party"],
    sizes: ["S", "M", "L", "XL"],
    complementarySkus: ["SHIRT001", "SHOE001"],
  },
  {
    sku: "SHOE001",
    name: "Black Formal Shoes",
    category: "footwear",
    price: 1299,
    color: "black",
    tags: ["formal", "classic", "party"],
    occasions: ["office", "formal-party"],
    sizes: ["7", "8", "9", "10", "11"],
    complementarySkus: ["SHIRT001", "TROUSER001"],
  },
  {
    sku: "JACKET001",
    name: "Casual Denim Jacket",
    category: "outerwear",
    price: 2499,
    color: "blue",
    tags: ["casual", "denim"],
    occasions: ["casual", "weekend"],
    sizes: ["S", "M", "L", "XL"],
    complementarySkus: ["TSHIRT001"],
  },
  {
    sku: "TSHIRT001",
    name: "Essential Black T-Shirt",
    category: "casualwear",
    price: 799,
    color: "black",
    tags: ["casual", "basic"],
    occasions: ["casual", "weekend"],
    sizes: ["S", "M", "L", "XL"],
    complementarySkus: ["JACKET001"],
  },
];

const colors = ["black", "white", "navy", "blue", "grey"];
const categories = ["formalwear", "casualwear", "footwear", "accessories"];

const products = [
  ...catalog.map((item) => ({
    sku: item.sku,
    name: item.name,
    description: `${item.name}, designed for versatile everyday style.`,
    category: item.category,
    price: item.price,
    attributes: {
      color: item.color,
      sizes: item.sizes,
      occasion: item.occasions,
    },
    tags: item.tags,
    complementarySkus: item.complementarySkus,
    imageUrl: "",
    active: true,
  })),
];

for (let i = 7; i <= 30; i++) {
  const category = categories[(i - 7) % categories.length];
  const color = colors[(i - 7) % colors.length];
  const sku = `PRODUCT${String(i).padStart(3, "0")}`;

  products.push({
    sku,
    name: `${color[0].toUpperCase()}${color.slice(1)} ${category} Item ${i}`,
    description: `Synthetic ${category} product in ${color}.`,
    category,
    price: 499 + ((i * 137) % 3000),
    attributes: {
      color,
      sizes: category === "footwear"
        ? ["7", "8", "9", "10", "11"]
        : ["S", "M", "L", "XL"],
      occasion: category === "formalwear"
        ? ["office", "formal-party"]
        : ["casual", "weekend"],
    },
    tags: [category, color],
    complementarySkus: [],
    imageUrl: "",
    active: true,
  });
}

const firstNames = [
  "Aarav", "Ananya", "Rohan", "Diya", "Kabir",
  "Meera", "Arjun", "Isha", "Vivaan", "Sara",
];

const lastNames = [
  "Sharma", "Singh", "Verma", "Kapoor", "Mehta",
  "Malhotra", "Gupta", "Kaur", "Rao", "Das",
];

async function seed() {
  try {
    await connectDatabase();

    await Product.bulkWrite(
      products.map((product) => ({
        updateOne: {
          filter: { sku: product.sku },
          update: { $set: product },
          upsert: true,
        },
      }))
    );

    const customers = firstNames.map((name, index) => ({
      customerId: `CUST${String(index + 1).padStart(3, "0")}`,
      name: `${name} ${lastNames[index]}`,
      age: 21 + (index % 12),
      preferences: {
        categories: [categories[index % categories.length]],
        colors: [colors[index % colors.length]],
        budget: 2000 + index * 500,
        preferredChannel: [
          "web",
          "mobile",
          "kiosk",
          "messaging",
        ][index % 4],
      },
      purchaseHistory:
        index % 2 === 0
          ? [{ sku: "SHIRT001", quantity: 1, amount: 1799 }]
          : [],
      loyaltyTier: [
        "Bronze",
        "Silver",
        "Gold",
        "Platinum",
      ][index % 4],
      loyaltyPoints: index * 100,
      preferredStore: storeIds[index % storeIds.length],
    }));

    await Customer.bulkWrite(
      customers.map((customer) => ({
        updateOne: {
          filter: { customerId: customer.customerId },
          update: { $set: customer },
          upsert: true,
        },
      }))
    );

    const inventoryRecords = products.flatMap((product, productIndex) => {
      const locations = [...storeIds, warehouseId];

      return locations.map((locationId, locationIndex) => ({
        sku: product.sku,
        locationId,
        locationType: locationIndex === 3 ? "warehouse" : "store",
        stockAvailable: (productIndex + locationIndex) % 12 + 3,
        reservedQuantity: 0,
      }));
    });

    await Inventory.bulkWrite(
      inventoryRecords.map((record) => ({
        updateOne: {
          filter: {
            sku: record.sku,
            locationId: record.locationId,
          },
          update: { $set: record },
          upsert: true,
        },
      }))
    );

    console.log(`Seeded ${products.length} products.`);
    console.log(`Seeded ${customers.length} customers.`);
    console.log(`Seeded ${inventoryRecords.length} inventory records.`);
  } finally {
    await mongoose.disconnect();
  }
}

seed().catch((error) => {
  console.error("Seeding failed:", error);
  process.exitCode = 1;
});