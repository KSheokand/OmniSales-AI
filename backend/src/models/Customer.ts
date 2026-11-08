import mongoose, { Schema, Document} from "mongoose";

export interface ICustomer extends Document {
    customerId: string;
    name: string;
    age: number;
    preferences: {
        categories: string[];
        colors: string[];
        budget: number;
        preferredChannel: string;
    };
    purchaseHistory: {
        sku: string;
        quantity: number;
        amount: number;
    }[];
    loyaltyTier: string;
    loyaltyPoints: number;
    preferredStores: string;
}

const CustomerSchema = new Schema<ICustomer>(
    {
        customerId: { type: String, required: true, unique: true},
        name: { type: String, required: true},
        age: { type: Number, required: true, min: 18},
        preferences: {
            categories: { type: [String], default: []},
            colors: { type: [String], default: []},
            budget: { type: Number, required: true, min: 0},
            preferredChannel: {
                type: String,
                enum: ["web", "mobile", "kiosk", "messaging"],
                default: "web",
            },
        },
        purchaseHistory: [
            {
                sku: { type: String, required: true},
                quantity: { type: Number, required: true, min: 1},
                amount: { type: Number, requried: true, min: 0},
            },
        ],
        loyaltyTier: {
            type: String,
            enum: ["Bronze", "Silver", "Gold", "Platinum"],
            default: "Bronze",
        },
        loyaltyPoints: { type: Number, default: 0, min: 0},
        preferredStores: { type: String, required: true},
    },
    {timestamps: true}
);

export default mongoose.model<ICustomer>("Customer", CustomerSchema);
