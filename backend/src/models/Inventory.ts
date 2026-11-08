import mongoose, { Schema, Document} from "mongoose";

export interface IInventory extends Document {
    sku: string;
    locationId: string;
    locationType: "store" | "warehouse";
    stockAvailable: number;
    reservedQuantity: number;
}

const InventorySchema = new Schema<IInventory>(
    {
        sku: { type: String, required: true},
        locationId: { type: String, required: true},
        locationType: {
            type: String,
            enum: ["store", "warehouse"],
            required: true,
        },
        stockAvailable: { type: Number, required: true, min: 0},
        reservedQuantity: { type: Number, default: 0, min: 0},
    },
    {timestamps: true}
);

InventorySchema.index({ sku: 1, locationId: 1}, {unique: true});

export default mongoose.model<IInventory>("Inventory", InventorySchema);