/**
 * Resource Number Validation & Formatting Utility
 * Lightweight, zero-runtime-dependency validator for permanent resource identifiers.
 * Guarantees zero client-bundle bloat while preserving exact schema semantics.
 */

export interface ResourceValidationResult {
  valid: boolean;
  resourceNumber?: string;
  error?: string;
}

/**
 * Lightweight schema validator for permanent resource numbers.
 * A resource number must be numeric, 1 to 6 digits.
 */
export const resourceNumberSchema = {
  safeParse(val: unknown) {
    if (typeof val !== 'string') {
      return {
        success: false as const,
        error: { issues: [{ message: 'Expected string input.' }] },
      };
    }
    const trimmed = val.trim();
    if (trimmed.length < 1) {
      return {
        success: false as const,
        error: {
          issues: [
            { message: 'Please enter a resource number (for example: 001).' },
          ],
        },
      };
    }
    if (trimmed.length > 6) {
      return {
        success: false as const,
        error: {
          issues: [{ message: 'Resource numbers must be 6 digits or fewer.' }],
        },
      };
    }
    if (!/^\d+$/.test(trimmed)) {
      return {
        success: false as const,
        error: {
          issues: [
            {
              message:
                'Resource numbers contain digits only. Please enter a number like 001.',
            },
          ],
        },
      };
    }
    return {
      success: true as const,
      data: trimmed,
    };
  },
};

/**
 * Validates and formats a resource number input.
 * Preserves leading zeroes, and auto-pads single/double digits to at least 3 digits.
 * For example:
 *   '001' -> '001'
 *   '1'   -> '001'
 *   '42'  -> '042'
 *   '100' -> '100'
 */
export function validateAndFormatResourceNumber(
  rawInput: string
): ResourceValidationResult {
  const trimmed = rawInput.trim();

  const parseResult = resourceNumberSchema.safeParse(trimmed);
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0];
    return {
      valid: false,
      error: issue
        ? issue.message
        : 'Please enter a valid resource number (e.g. 001).',
    };
  }

  // Preserve explicit leading zeroes or pad to standard 3 digits
  const padded = trimmed.length < 3 ? trimmed.padStart(3, '0') : trimmed;

  return {
    valid: true,
    resourceNumber: padded,
  };
}
