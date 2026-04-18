import mongoose from 'mongoose';
import { orderItemSchema, statusHistorySchema } from './schemas.js';

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, required: true, default: 'Pending' },
    statusHistory: { type: [statusHistorySchema], default: [] },
    paymentMethod: { type: String, default: '' },
    shippingAddress: { type: String, default: '' },
    notes: { type: String, default: '' },
    items: { type: [orderItemSchema], default: [] },
    stockDeducted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
