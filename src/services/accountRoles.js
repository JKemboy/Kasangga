// Supported account roles. Retired role names are not accepted.
export const ACCOUNT_ROLES = ["learner", "tutor", "lco", "oswe"];
export const normalizeRoles = (roles) => [
  ...new Set(roles.filter((role) => ACCOUNT_ROLES.includes(role))),
];
