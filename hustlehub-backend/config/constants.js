// Values shared by models, validators and controllers so they can never drift apart.

const ROLES = { CLIENT: 'client', FREELANCER: 'freelancer', ADMIN: 'admin' };

// Admins are created with "npm run seed:admin" - nobody can register as one through the API.
const SELF_REGISTER_ROLES = [ROLES.CLIENT, ROLES.FREELANCER];

const GIG_CATEGORIES = ['Design', 'Development', 'Writing', 'Marketing', 'Tutoring', 'Photography', 'Other'];

module.exports = { ROLES, SELF_REGISTER_ROLES, GIG_CATEGORIES };
