import mongoose, {Schema, Document} from "mongoose";

export interface IProduct extends Document {
    sku: string;
    name: string;
    description: string;
    category: string;
    price: number;
    attributes: {
        color: string;
        sizes: string[];
        occasion: string[];
        fit?: string;
    };
    tags: string[];
    complementarySkus: string[];
    imageUrl: string;
    active: boolean;
}

const ProductSchema = new Schema<IProduct>(
    {
        sku: { type: String, required: true, unique: true, index: true},
        name: { type: String, required: true },
        description: { type: String, default: ""},
        category: { type: String, required: true, index: true},
        price: { type: Number, required: true, min: 0},
        attributes: {
            color: { type: String, required: true},
            sizes: { type: [String], default: []},
            occasion: { type: [String], default: []},
            fit: String,
        },
        tags: { type: [String], default: [] },
        complementarySkus: { type: [String], default: []},
        imageUrl: {type: String, default: ""},
        active: {type: Boolean, default:true},
    },
    {timestamps: true}
);

ProductSchema.index({
    name: "text",
    description: "text",
    tags: "text",
});

export default mongoose.model<IProduct>("Product", ProductSchema);