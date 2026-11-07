// A registered person. Passwords are stored only as bcrypt hashes and are never returned by default.

const mongoose = require('mongoose');
const { ROLES } = require('../config/constants');

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true, minlength: 3, maxlength: 30 },
    // Lower-cased copy so "Moe_Alex" and "moe_alex" count as the same username.
    usernameLower: { type: String, required: true, unique: true, select: false },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.CLIENT },
    // Raised on logout. Tokens carry the version they were issued with, so raising it ends every session at once.
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userSchema.pre('validate', function setUsernameLower() {
  if (this.username) this.usernameLower = this.username.toLowerCase();
});

// Shape of every user returned to a client: id instead of _id, and no secrets.
userSchema.set('toJSON', {
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.password;
    delete ret.usernameLower;
    delete ret.tokenVersion;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
