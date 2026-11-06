// A client's booking request for a gig. It starts as 'pending'; only the freelancer can accept or
// reject it, and only an accepted booking can be completed. The title and price are copied in at booking time so the
// record stays accurate even if the gig is later edited or deleted.

const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    gig: { type: mongoose.Schema.Types.ObjectId, ref: 'Gig', required: true },
    gigTitle: { type: String, required: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    price: { type: Number, required: true, min: 0 },
    notes: { type: String, trim: true, maxlength: 500, default: '' },
    status: { type: String, enum: ['pending', 'accepted', 'rejected', 'completed'], default: 'pending' },
  },
  { timestamps: true }
);

bookingSchema.set('toJSON', {
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model('Booking', bookingSchema);
