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
  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: serviceRoleKey,
    },
  })

  if (!userResponse.ok) {
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

  const user = await userResponse.json()

  return { user, token }
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
