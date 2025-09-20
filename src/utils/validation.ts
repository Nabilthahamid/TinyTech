// Validation utilities for forms and data

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];

  if (!email) {
    errors.push("Email is required");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Please enter a valid email address");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];

  if (!password) {
    errors.push("Password is required");
  } else if (password.length < 6) {
    errors.push("Password must be at least 6 characters long");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateRequired(
  value: string,
  fieldName: string
): ValidationResult {
  const errors: string[] = [];

  if (!value || value.trim().length === 0) {
    errors.push(`${fieldName} is required`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validatePostTitle(title: string): ValidationResult {
  const errors: string[] = [];

  if (!title || title.trim().length === 0) {
    errors.push("Post title is required");
  } else if (title.length < 3) {
    errors.push("Post title must be at least 3 characters long");
  } else if (title.length > 100) {
    errors.push("Post title must be less than 100 characters");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validatePostContent(content: string): ValidationResult {
  const errors: string[] = [];

  if (!content || content.trim().length === 0) {
    errors.push("Post content is required");
  } else if (content.length < 10) {
    errors.push("Post content must be at least 10 characters long");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
