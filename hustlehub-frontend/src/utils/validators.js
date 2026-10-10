// Client-side checks that mirror the server rules, so people get instant feedback.
// The server still validates everything again - these only improve the experience.

export const GIG_CATEGORIES = ['Design', 'Development', 'Writing', 'Marketing', 'Tutoring', 'Photography', 'Other'];

export function validateLogin({ email, password }) {
  const errors = {};
  if (!email.trim()) errors.email = 'Enter your email address.';
  else if (!/^\S+@\S+\.\S+$/.test(email.trim())) errors.email = 'Enter a valid email address.';
  if (!password) errors.password = 'Enter your password.';
  return errors;
}

export function validateRegister({ username, email, password, role }) {
  const errors = {};
  if (!username.trim()) errors.username = 'Choose a username.';
  else if (!/^[a-zA-Z0-9_]{3,30}$/.test(username.trim())) errors.username = 'Use 3 to 30 letters, numbers or underscores.';

  if (!email.trim()) errors.email = 'Enter your email address.';
  else if (!/^\S+@\S+\.\S+$/.test(email.trim())) errors.email = 'Enter a valid email address.';

  if (password.length < 8) errors.password = 'Use at least 8 characters.';
  else if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^a-zA-Z0-9]/.test(password)) {
    errors.password = 'Include an uppercase letter, a lowercase letter, a number and a special character.';
  }

  if (!['client', 'freelancer'].includes(role)) errors.role = 'Choose how you will use HustleHub+.';
  return errors;
}

export function validateGig({ title, description, category, price, deliveryDays }) {
  const errors = {};
  if (title.trim().length < 3 || title.trim().length > 100) errors.title = 'Title must be 3 to 100 characters.';
  if (description.trim().length < 10 || description.trim().length > 2000) errors.description = 'Description must be 10 to 2000 characters.';
  if (!GIG_CATEGORIES.includes(category)) errors.category = 'Choose a category.';

  const priceNumber = Number(price);
  if (price === '' || Number.isNaN(priceNumber) || priceNumber < 1 || priceNumber > 100000) errors.price = 'Price must be between R1 and R100 000.';

  const days = Number(deliveryDays);
  if (deliveryDays === '' || !Number.isInteger(days) || days < 1 || days > 90) errors.deliveryDays = 'Delivery must be a whole number of days from 1 to 90.';
  return errors;
}
