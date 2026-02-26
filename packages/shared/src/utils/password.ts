/**
 * Password strength validation utility
 * ZERO runtime dependencies — pure JS only
 */

export interface PasswordStrength {
  /** Strength score from 0 (weakest) to 4 (strongest) */
  score: number;
  /** Human-readable feedback for missing requirements */
  feedback: string[];
  /** Whether the password meets minimum requirements (score >= 3) */
  isValid: boolean;
}

/**
 * Validate password strength and return a score with feedback.
 *
 * Scoring (0-4):
 *   +1  length >= 8  characters
 *   +1  length >= 12 characters
 *   +1  mixed case (upper AND lower)
 *   +1  at least one digit
 *   +1  at least one special character
 *
 * Maximum raw sum is 5, capped at 4.
 * A password is considered valid when score >= 3.
 */
export function validatePasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  // Requirement 1: minimum length
  if (password.length >= 8) {
    score++;
  } else {
    feedback.push('At least 8 characters');
  }

  // Bonus: longer password
  if (password.length >= 12) {
    score++;
  }

  // Requirement 2: mixed case
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) {
    score++;
  } else {
    feedback.push('Upper and lowercase letters');
  }

  // Requirement 3: digit
  if (/\d/.test(password)) {
    score++;
  } else {
    feedback.push('At least one number');
  }

  // Requirement 4: special character
  if (/[^A-Za-z0-9]/.test(password)) {
    score++;
  } else {
    feedback.push('At least one special character');
  }

  const cappedScore = Math.min(score, 4);

  return {
    score: cappedScore,
    feedback,
    isValid: cappedScore >= 3,
  };
}

/**
 * Get a label for the strength score.
 */
export function getPasswordStrengthLabel(score: number): string {
  switch (score) {
    case 0:
      return 'Very weak';
    case 1:
      return 'Weak';
    case 2:
      return 'Fair';
    case 3:
      return 'Strong';
    case 4:
      return 'Very strong';
    default:
      return '';
  }
}

/**
 * Get a color key for the strength score (for UI rendering).
 * Returns a semantic color name that each platform can map to its own palette.
 */
export function getPasswordStrengthColor(score: number): 'red' | 'orange' | 'yellow' | 'green' {
  if (score <= 1) return 'red';
  if (score === 2) return 'orange';
  if (score === 3) return 'yellow';
  return 'green';
}
