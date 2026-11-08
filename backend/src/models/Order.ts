import mongoose, { Schema } from "mongoose";

const orderItemSchema = new Schema(
    {
       sku: {
        type: String,
        required: true,
       },
       name: {
        type: String,
        required: true,
       },
       quantity: {
        type: Number,
        required: true,
        min: 1,
       },
       unitPrice: {
        type: Number,
        required: true,
        min: 0,
       },
    },
    { _id: false }
);

const orderSchema = new Schema(
    {
        orderId: {
            type: String,
            required: true,
            unique: true,
        },
        customerId: {
            type: String,
            required: true,
            index: true,
        },
        locationId: {
            type: String,
            required: true,
        },
        items: {
            type: [orderItemSchema],
            required: true
        },
        subtotal: {
            type: Number,
            required: true,
            min: 0,
        },
        discounts: {
            loyalty: { type: Number, default: 0},
            bundle: { type: Number, default: 0},
            coupon: { type: Number, default: 0},
        },
        totalDiscount: {
            type: Number,
            required: true,
            min: 0,
        },
        finalTotal: {
            type: Number,
            required: true,
            min: 0,
        },
        appliedCoupon: {
            type: String,
            default: null,
        },
        status: {
            type: String,
            enum: ["confirmed","cancelled"],
            default: "confirmed",
        },
        paymentStatus: {
            type: String,
            enum: ["simulated", "not_required"],
            deafault: "simulated",
        },
    },
    { timestamps: true}
);

export default mongoose.model("Order", orderSchema);