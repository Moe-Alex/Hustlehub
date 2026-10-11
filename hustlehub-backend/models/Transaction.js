// The payment created for every booking. Freelancer income is the sum of these.

const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
    gig: { type: mongoose.Schema.Types.ObjectId, ref: 'Gig', required: true },
    gigTitle: { type: String, required: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'ZAR' },
    status: { type: String, enum: ['completed'], default: 'completed' },
    reference: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

transactionSchema.set('toJSON', {
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model('Transaction', transactionSchema);
