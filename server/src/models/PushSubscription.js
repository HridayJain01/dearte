import mongoose from 'mongoose';

// One installed app that agreed to notifications. The endpoint is the address its
// push service gave the phone; the keys encrypt what is sent to it. `user` is set
// when the phone was signed in, so a buyer's devices can be told apart later.
const pushSubscriptionSchema = new mongoose.Schema(
  {
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

export const PushSubscription =
  mongoose.models.PushSubscription || mongoose.model('PushSubscription', pushSubscriptionSchema);
