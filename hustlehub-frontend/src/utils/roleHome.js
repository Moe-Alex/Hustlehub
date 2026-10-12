// The first page each role sees after logging in. Always based on the role, never on whatever page was open before,
// so a different person logging in on the same browser never lands on a page their role cannot open.

const HOME_BY_ROLE = {
  client: '/gigs',
  freelancer: '/my-gigs',
  admin: '/admin',
};

export const homeFor = (role) => HOME_BY_ROLE[role] || '/gigs';
