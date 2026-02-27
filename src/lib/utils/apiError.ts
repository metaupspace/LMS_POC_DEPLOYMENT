export class ApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export class ApiNotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'ApiNotFoundError';
    Object.setPrototypeOf(this, ApiNotFoundError.prototype);
  }
}

export class ApiBadRequestError extends ApiError {
  constructor(message = 'Bad request') {
    super(message, 400);
    this.name = 'ApiBadRequestError';
    Object.setPrototypeOf(this, ApiBadRequestError.prototype);
  }
}

export class ApiUnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
    this.name = 'ApiUnauthorizedError';
    Object.setPrototypeOf(this, ApiUnauthorizedError.prototype);
  }
}

export class ApiForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super(message, 403);
    this.name = 'ApiForbiddenError';
    Object.setPrototypeOf(this, ApiForbiddenError.prototype);
  }
}
