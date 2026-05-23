import handleCors, { corsHeaders } from "./cors.ts"

declare const Deno: any

interface SupabaseUser {
  id: string
  email?: string
  [key: string]: unknown
}

interface EdgeContext {
  user: SupabaseUser | null
  token: string | null
}

interface EdgeHandlerOptions {
  requireAuth?: boolean
}

type EdgeHandler = (req: Request, context: EdgeContext) => Promise<Response>

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

async function authenticateRequest(
  req: Request,
): Promise<EdgeContext | Response> {
  const authHeader = req.headers.get("authorization")
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Authorization header is required",
        },
      },
      401,
    )
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(
      {
        error: {
          code: "SERVER_CONFIG_ERROR",
          message: "Supabase auth environment is not configured",
        },
      },
      500,
    )
  }

  const token = authHeader.replace("Bearer ", "")

  // Add timeout and error handling for auth lookup
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout

  try {
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: serviceRoleKey,
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!userResponse.ok) {
      // Handle different types of auth failures appropriately
      if (userResponse.status === 401) {
        return jsonResponse(
          {
            error: {
              code: "UNAUTHORIZED",
              message: "Invalid authentication token",
            },
          },
          401,
        )
      }

      // For rate limiting (429) or server errors (5xx), propagate retryable status
      if (userResponse.status === 429) {
        return jsonResponse(
          {
            error: {
              code: "RATE_LIMITED",
              message: "Authentication service rate limit exceeded",
            },
          },
          429,
        )
      }

      // For 5xx server errors, map to appropriate retryable status
      if (userResponse.status >= 500) {
        return jsonResponse(
          {
            error: {
              code: "SERVICE_UNAVAILABLE",
              message: "Authentication service temporarily unavailable",
            },
          },
          userResponse.status === 502 ? 502 : 503,
        )
      }

      // For other client errors (4xx except 401/429), propagate as bad request
      return jsonResponse(
        {
          error: {
            code: "BAD_REQUEST",
            message: "Authentication request failed",
          },
        },
        userResponse.status,
      )
    }

    const user = await userResponse.json()
    return { user, token }
  } catch (error) {
    clearTimeout(timeoutId)

    // Handle different error types
    if (error instanceof Error && error.name === "AbortError") {
      return jsonResponse(
        {
          error: {
            code: "SERVICE_UNAVAILABLE",
            message: "Authentication service timeout",
          },
        },
        503,
      )
    }

    return jsonResponse(
      {
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "Authentication service unavailable",
        },
      },
      503,
    )
  }
}

export function withEdgeHandler(
  handler: EdgeHandler,
  options: EdgeHandlerOptions = {},
) {
  return async (req: Request) => {
    const corsResponse = handleCors(req)
    if (corsResponse) return corsResponse

    const context: EdgeContext = { user: null, token: null }

    if (options.requireAuth) {
      const authResult = await authenticateRequest(req)
      if (authResult instanceof Response) return authResult
      context.user = authResult.user
      context.token = authResult.token
    }

    return handler(req, context)
  }
}

export { corsHeaders, jsonResponse }
