// A service listed by a freelancer.

const mongoose = require('mongoose');
const { GIG_CATEGORIES } = require('../config/constants');

const gigSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 100 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
    category: { type: String, required: true, enum: GIG_CATEGORIES },
    price: { type: Number, required: true, min: 1, max: 100000 },
    deliveryDays: { type: Number, required: true, min: 1, max: 90 },
    isActive: { type: Boolean, default: true },
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);

gigSchema.set('toJSON', {
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model('Gig', gigSchema);
