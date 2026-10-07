// Gig management. Anyone logged in can browse; only freelancers create gigs; only the owner can edit; the owner or an admin can delete.

const mongoose = require('mongoose');
const Gig = require('../models/Gig');
const logger = require('../utils/logger');
const escapeRegex = require('../utils/escapeRegex');
const { round2 } = require('../utils/money');
const { parsePagination, buildPagination } = require('../utils/pagination');
const { ROLES } = require('../config/constants');

const SORT_OPTIONS = {
  newest: { createdAt: -1 },
  price_asc: { price: 1, createdAt: -1 },
  price_desc: { price: -1, createdAt: -1 },
};

const ownsGig = (gig, user) => String(gig.freelancer._id || gig.freelancer) === user.id;

// GET /api/gigs - active gigs, with search, filters and pagination
async function listGigs(req, res, next) {
  try {
    const pagination = parsePagination(req.query);
    const { q, category, minPrice, maxPrice, sort = 'newest' } = req.query;

    const filter = { isActive: true };
    if (category) filter.category = category;

    const price = {};
    if (minPrice !== undefined) price.$gte = minPrice;
    if (maxPrice !== undefined) price.$lte = maxPrice;
    if (Object.keys(price).length > 0) filter.price = mongoose.trusted(price);

    if (q) {
      const pattern = new RegExp(escapeRegex(q), 'i');
      filter.$or = [
        { title: mongoose.trusted({ $regex: pattern }) },
        { description: mongoose.trusted({ $regex: pattern }) },
      ];
    }

    const [gigs, total] = await Promise.all([
      Gig.find(filter).sort(SORT_OPTIONS[sort]).skip(pagination.skip).limit(pagination.limit).populate('freelancer', 'username'),
      Gig.countDocuments(filter),
    ]);

    return res.status(200).json({ success: true, data: gigs, pagination: buildPagination(pagination, total) });
  } catch (err) {
    return next(err);
  }
}

// GET /api/gigs/mine - every gig (active or not) belonging to the logged-in freelancer
async function listMyGigs(req, res, next) {
  try {
    const gigs = await Gig.find({ freelancer: req.user.id }).sort({ createdAt: -1 }).populate('freelancer', 'username');
    return res.status(200).json({ success: true, data: gigs });
  } catch (err) {
    return next(err);
  }
}

// GET /api/gigs/:id
async function getGig(req, res, next) {
  try {
    const gig = await Gig.findById(req.params.id).populate('freelancer', 'username');

    // Inactive gigs are only visible to their owner and admins.
    const canSeeInactive = gig && (ownsGig(gig, req.user) || req.user.role === ROLES.ADMIN);
    if (!gig || (!gig.isActive && !canSeeInactive)) {
      return res.status(404).json({ success: false, message: 'Gig not found.' });
    }

    return res.status(200).json({ success: true, data: gig });
  } catch (err) {
    return next(err);
  }
}

// POST /api/gigs - freelancers only
async function createGig(req, res, next) {
  try {
    // Fields are picked one by one (never spread req.body) so clients cannot set freelancer or other protected fields.
    const { title, description, category, price, deliveryDays, isActive } = req.body;

    const gig = await Gig.create({
      title,
      description,
      category,
      price: round2(price),
      deliveryDays,
      isActive: isActive === undefined ? true : isActive,
      freelancer: req.user.id,
    });
    await gig.populate('freelancer', 'username');

    logger.info(`Gig created: "${gig.title}" by ${req.user.email}`);
    return res.status(201).json({ success: true, message: 'Gig created.', data: gig });
  } catch (err) {
    return next(err);
  }
}

// PUT /api/gigs/:id - the owner only
async function updateGig(req, res, next) {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) {
      return res.status(404).json({ success: false, message: 'Gig not found.' });
    }
    if (!ownsGig(gig, req.user)) {
      logger.warn(`Blocked: ${req.user.email} tried to edit gig ${gig.id} owned by someone else`);
      return res.status(403).json({ success: false, message: 'You can only modify your own gigs.' });
    }

    const { title, description, category, price, deliveryDays, isActive } = req.body;
    Object.assign(gig, {
      title,
      description,
      category,
      price: round2(price),
      deliveryDays,
      ...(isActive !== undefined && { isActive }),
    });
    await gig.save();
    await gig.populate('freelancer', 'username');

    logger.info(`Gig updated: ${gig.id} by ${req.user.email}`);
    return res.status(200).json({ success: true, message: 'Gig updated.', data: gig });
  } catch (err) {
    return next(err);
  }
}

// DELETE /api/gigs/:id - the owner, or an admin removing a gig for moderation
async function deleteGig(req, res, next) {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) {
      return res.status(404).json({ success: false, message: 'Gig not found.' });
    }
    if (!ownsGig(gig, req.user) && req.user.role !== ROLES.ADMIN) {
      logger.warn(`Blocked: ${req.user.email} tried to delete gig ${gig.id} owned by someone else`);
      return res.status(403).json({ success: false, message: 'You can only delete your own gigs.' });
    }

    await gig.deleteOne();
    logger.info(`Gig deleted: ${gig.id} by ${req.user.email} (${req.user.role})`);
    return res.status(200).json({ success: true, message: 'Gig deleted.' });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listGigs, listMyGigs, getGig, createGig, updateGig, deleteGig };
