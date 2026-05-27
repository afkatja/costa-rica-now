/**
 * Standardized error handling utilities
 * Provides consistent error handling patterns across the application
 */

// Base error class for application-specific errors
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly recoverable: boolean = true,
  ) {
    super(message)
    this.name = "AppError"
  }
}

// Network-related errors
export class NetworkError extends AppError {
  constructor(message: string, statusCode: number = 500) {
    super(message, "NETWORK_ERROR", statusCode, true)
    this.name = "NetworkError"
  }
}

// Validation errors
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", 400, true)
    this.name = "ValidationError"
  }
}

// Geolocation errors
export class GeolocationError extends AppError {
  constructor(
    message: string,
    public readonly geolocationCode?: number,
  ) {
    super(message, "GEOLOCATION_ERROR", 400, true)
    this.name = "GeolocationError"
  }
}

// Authentication errors
export class AuthenticationError extends AppError {
  constructor(message: string) {
    super(message, "AUTH_ERROR", 401, false)
    this.name = "AuthenticationError"
  }
}

/**
 * Standard error handler for async operations
 * Provides consistent error logging and user-friendly messages
 */
export function handleAsyncError<T>(
  operation: () => Promise<T>,
  options: {
    fallback?: T
    context?: string
    onError?: (error: Error) => void
  } = {},
): Promise<T> {
  const { fallback, context, onError } = options

  return operation().catch(error => {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred"
    const contextMessage = context ? `Error in ${context}:` : "Error:"

    console.error(contextMessage, error)

    if (onError) {
      onError(error instanceof Error ? error : new Error(errorMessage))
    }

    if (fallback !== undefined) {
      return fallback
    }

    throw error
  })
}

/**
 * Create a user-friendly error message from various error types
 */
export function createUserFriendlyMessage(
  error: unknown,
  context?: string,
): string {
  if (error instanceof GeolocationError) {
    switch (error.geolocationCode) {
      case 1:
        return "Location access denied. Please allow location access to get personalized recommendations."
      case 2:
        return "Location unavailable. Please check your device settings."
      case 3:
        return "Location request timed out. Please try again."
      default:
        return "Unable to get your location. Please try again."
    }
  }

  if (error instanceof NetworkError) {
    if (error.statusCode >= 500) {
      return "Service temporarily unavailable. Please try again later."
    }
    if (error.statusCode === 404) {
      return "The requested resource was not found."
    }
    return "Network error occurred. Please check your connection and try again."
  }

  if (error instanceof ValidationError) {
    return `Invalid input: ${error.message}`
  }

  if (error instanceof AuthenticationError) {
    return "Authentication required. Please sign in to continue."
  }

  if (error instanceof AppError) {
    return error.recoverable ? error.message : "An unexpected error occurred."
  }

  if (error instanceof Error) {
    return context ? `${context} failed: ${error.message}` : error.message
  }

  return context
    ? `${context} failed: Unknown error`
    : "An unexpected error occurred."
}

/**
 * Safe wrapper for operations that might throw
 * Returns a result tuple [data, error] pattern
 */
export async function safeOperation<T>(
  operation: () => Promise<T>,
): Promise<[T | null, Error | null]> {
  try {
    const result = await operation()
    return [result, null]
  } catch (error) {
    return [null, error instanceof Error ? error : new Error("Unknown error")]
  }
}

/**
 * Check if an error is recoverable
 */
export function isRecoverableError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.recoverable
  }

  if (error instanceof GeolocationError) {
    return true
  }

  if (error instanceof NetworkError) {
    return error.statusCode < 500
  }

  if (error instanceof ValidationError) {
    return true
  }

  return false
}
