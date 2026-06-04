// Retry logic with exponential backoff for external API calls

import { RETRY_CONFIG, TIMEOUT_CONFIG } from "./config.ts"

export interface RetryOptions {
  maxAttempts?: number
  baseDelayMs?: number
  maxDelayMs?: number
  backoffFactor?: number
  timeoutMs?: number
  shouldRetry?: (error: Error, attempt: number) => boolean
}

export interface FetchWithRetryOptions extends RetryOptions {
  url: string
  method?: string
  headers?: Record<string, string>
  body?: string
  redirect?: RequestRedirect
}

export class RetryError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: Error,
    public readonly errors: Error[],
  ) {
    super(message)
    this.name = "RetryError"
  }
}

/**
 * Default retry condition - retry on network errors and 5xx status codes
 */
function defaultShouldRetry(error: Error, attempt: number, maxAttempts?: number): boolean {
  // Don't retry if we've exceeded max attempts (use provided override or default)
  const effectiveMaxAttempts = maxAttempts ?? RETRY_CONFIG.MAX_ATTEMPTS
  if (attempt >= effectiveMaxAttempts) {
    return false
  }

  // Retry on network errors
  if (error.name === "TypeError" || error.message.includes("fetch")) {
    return true
  }

  // Retry on 5xx server errors
  if (error.message.includes("HTTP error: 5")) {
    return true
  }

  // Retry on timeout errors
  if (
    error.message.includes("timeout") ||
    error.message.includes("AbortError")
  ) {
    return true
  }

  // Retry on 429 (Too Many Requests) and 408 (Request Timeout)
  if (
    error.message.includes("HTTP error: 429") ||
    error.message.includes("HTTP error: 408")
  ) {
    return true
  }

  return false
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  backoffFactor: number,
): number {
  const exponentialDelay = baseDelayMs * Math.pow(backoffFactor, attempt - 1)
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs)

  // Add jitter to prevent thundering herd (±25% random variation)
  const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1)
  return Math.max(0, cappedDelay + jitter)
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Create an AbortController with timeout
 */
function createTimeoutController(timeoutMs: number): { controller: AbortController; timeoutId: ReturnType<typeof setTimeout> } {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  return { controller, timeoutId }
}

/**
 * Fetch with retry logic and exponential backoff
 */
export async function fetchWithRetry(
  options: FetchWithRetryOptions,
): Promise<Response> {
  const {
    url,
    method = "GET",
    headers = {},
    body,
    redirect = "follow",
    maxAttempts = RETRY_CONFIG.MAX_ATTEMPTS,
    baseDelayMs = RETRY_CONFIG.BASE_DELAY_MS,
    maxDelayMs = RETRY_CONFIG.MAX_DELAY_MS,
    backoffFactor = RETRY_CONFIG.BACKOFF_FACTOR,
    timeoutMs = TIMEOUT_CONFIG.USGS_TIMEOUT_MS,
    shouldRetry = defaultShouldRetry,
  } = options

  const errors: Error[] = []
  let lastError: Error = new Error("Unknown error")

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(
        `[retry] Attempt ${attempt}/${maxAttempts} for ${method} ${url}`,
      )

      // Create timeout controller for this attempt
      const { controller, timeoutId } = createTimeoutController(timeoutMs)

      try {
        const response = await fetch(url, {
          method,
          headers,
          body,
          redirect,
          signal: controller.signal,
        })

        // Check if response is successful
        if (!response.ok) {
          const error = new Error(
            `HTTP error: ${response.status} ${response.statusText}`,
          )
          ;(error as any).status = response.status
          ;(error as any).response = response

          // Don't retry on client errors (4xx) except 429 and 408
          if (
            response.status >= 400 &&
            response.status < 500 &&
            response.status !== 429 &&
            response.status !== 408
          ) {
            throw error
          }

          throw error
        }

        console.log(
          `[retry] Success on attempt ${attempt}/${maxAttempts} for ${url}`,
        )
        return response
      } catch (error) {
        // Clear timeout on error
        clearTimeout(timeoutId)

        lastError = error instanceof Error ? error : new Error(String(error))
        errors.push(lastError)

        console.error(
          `[retry] Attempt ${attempt} failed for ${url}:`,
          lastError.message,
        )

        // Check if we should retry
        if (!shouldRetry(lastError, attempt, maxAttempts) || attempt === maxAttempts) {
          break
        }

        // Calculate delay and wait
        const delay = calculateDelay(
          attempt,
          baseDelayMs,
          maxDelayMs,
          backoffFactor,
        )
        console.log(
          `[retry] Waiting ${Math.round(delay)}ms before retry ${attempt + 1}`,
        )
        await sleep(delay)
      }
  } catch (error) {
    console.error(`[retry] Unexpected error for ${url}:`, error)
    throw error
  }

  // All attempts failed
  const retryError = new RetryError(
    `Failed to fetch ${url} after ${maxAttempts} attempts. Last error: ${lastError.message}`,
    maxAttempts,
    lastError,
    errors,
  )

  console.error(`[retry] All ${maxAttempts} attempts failed for ${url}:`, {
    attempts: maxAttempts,
    lastError: lastError.message,
    allErrors: errors.map(e => e.message),
  })

  throw retryError
}

/**
 * Fetch multiple URLs with retry logic (parallel)
 */
export async function fetchMultipleWithRetry(
  requests: Array<{
    url: string
    options?: Omit<FetchWithRetryOptions, "url">
  }>,
): Promise<Array<{ url: string; response?: Response; error?: Error }>> {
  console.log(`[retry] Fetching ${requests.length} URLs in parallel with retry`)

  const results = await Promise.allSettled(
    requests.map(async ({ url, options = {} }) => {
      try {
        const response = await fetchWithRetry({ url, ...options })
        return { url, response }
      } catch (error) {
        const errorObj =
          error instanceof Error ? error : new Error(String(error))
        console.error(`[retry] Failed to fetch ${url}:`, errorObj.message)
        return { url, error: errorObj }
      }
    }),
  )

  return results.map(result =>
    result.status === "fulfilled"
      ? result.value
      : {
          url: "unknown",
          error: new Error(`Promise rejected: ${result.reason}`),
        },
  )
}

/**
 * Retry wrapper for any async function
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = RETRY_CONFIG.MAX_ATTEMPTS,
    baseDelayMs = RETRY_CONFIG.BASE_DELAY_MS,
    maxDelayMs = RETRY_CONFIG.MAX_DELAY_MS,
    backoffFactor = RETRY_CONFIG.BACKOFF_FACTOR,
    shouldRetry = defaultShouldRetry,
  } = options

  const errors: Error[] = []
  let lastError: Error = new Error("Unknown error")

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[retry] Async attempt ${attempt}/${maxAttempts}`)
      const result = await fn()
      console.log(`[retry] Async success on attempt ${attempt}/${maxAttempts}`)
      return result
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      errors.push(lastError)

      console.error(
        `[retry] Async attempt ${attempt} failed:`,
        lastError.message,
      )

      // Check if we should retry
      if (!shouldRetry(lastError, attempt) || attempt === maxAttempts) {
        break
      }

      // Calculate delay and wait
      const delay = calculateDelay(
        attempt,
        baseDelayMs,
        maxDelayMs,
        backoffFactor,
      )
      console.log(
        `[retry] Waiting ${Math.round(delay)}ms before async retry ${attempt + 1}`,
      )
      await sleep(delay)
    }
  }

  // All attempts failed
  throw new RetryError(
    `Async operation failed after ${maxAttempts} attempts. Last error: ${lastError.message}`,
    maxAttempts,
    lastError,
    errors,
  )
}
