/**
 * CMS Error Hierarchy
 * Standardized error classes for validation, authorization, not-found, and conflicts.
 */

export class CmsError extends Error {
  readonly code: string;

  constructor(message: string, code: string = 'CMS_ERROR') {
    super(message);
    this.name = 'CmsError';
    this.code = code;
  }
}

export class CmsValidationError extends CmsError {
  readonly fieldErrors: Record<string, string[]>;

  constructor(message: string, fieldErrors: Record<string, string[]> = {}) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'CmsValidationError';
    this.fieldErrors = fieldErrors;
  }
}

export class CmsNotFoundError extends CmsError {
  constructor(entity: string, id: string) {
    super(`${entity} with identifier "${id}" was not found.`, 'NOT_FOUND');
    this.name = 'CmsNotFoundError';
  }
}

export class CmsAuthorizationError extends CmsError {
  constructor(message: string = 'User is not authorized to perform this administrative operation.') {
    super(message, 'UNAUTHORIZED');
    this.name = 'CmsAuthorizationError';
  }
}

export class CmsConflictError extends CmsError {
  constructor(message: string) {
    super(message, 'CONFLICT');
    this.name = 'CmsConflictError';
  }
}
