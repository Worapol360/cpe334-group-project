export function checkRole(user, role) {
  return Boolean(user) && user.role === role;
}
