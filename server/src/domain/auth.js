const EMAIL_MAX = 254;
const PASSWORD_MAX = 128;

function validateText(value, name, label, maxLength) {
  if (value === undefined || value === null || value === '') {
    return `${label} is required`;
  }
  if (typeof value !== 'string') {
    return `${label} must be a string`;
  }
  if (name === 'email' && value.trim() === '') {
    return `${label} is required`;
  }
  if (value.length > maxLength) {
    return `${label} must be at most ${maxLength} characters`;
  }
  return null;
}

export function validateLoginInput(body) {
  const source = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const fields = [];

  const emailError = validateText(source.email, 'email', 'Email', EMAIL_MAX);
  if (emailError) fields.push({ field: 'email', message: emailError });

  const passwordError = validateText(source.password, 'password', 'Password', PASSWORD_MAX);
  if (passwordError) fields.push({ field: 'password', message: passwordError });

  return {
    valid: fields.length === 0,
    fields,
    email: typeof source.email === 'string' ? source.email : undefined,
    password: typeof source.password === 'string' ? source.password : undefined,
  };
}
