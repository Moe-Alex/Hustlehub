// The payment record created for every booking request. It stays 'pending' until the freelancer
// completes the work ('completed'), or becomes 'cancelled' if the freelancer rejects the booking.
// Freelancer income is the sum of completed transactions only.

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
    status: { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'pending' },
    reference: { type: String, required: true, unique: true },
    // When the work was completed. Income counts in the tax year of this date, not of the booking date.
    completedAt: { type: Date },
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
