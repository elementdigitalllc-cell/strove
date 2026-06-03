export const PASSWORD_RULES = [
  { id: 'len', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'upper', label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { id: 'num', label: 'One number', test: (p) => /\d/.test(p) },
  { id: 'special', label: 'One special character (!@#$%^&…)', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export function evaluatePassword(p) {
  return PASSWORD_RULES.map((r) => ({ ...r, met: r.test(p) }));
}

export function isPasswordValid(p) {
  return PASSWORD_RULES.every((r) => r.test(p));
}
