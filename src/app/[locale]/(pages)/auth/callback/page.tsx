"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/utils/supabase/client"
import { Palmtree, MapPin } from "lucide-react"
import LoadingSpinner from "@/components/Loader"

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the hash fragment from the URL
        const hashFragment = window.location.hash

        if (hashFragment && hashFragment.length > 0) {
          // Exchange the auth code for a session
          const { data, error } = await supabase.auth.exchangeCodeForSession(
            hashFragment
          )

          if (error) {
            console.error("Error exchanging code for session:", error.message)
            router.push(
              "/auth/signin?error=" + encodeURIComponent(error.message)
            )
            return
          }

          if (data.session) {
            // Successfully signed in, redirect to app
            router.push("/")
            return
          }
        }

        // If we get here, something went wrong or no session found
        router.push("/auth/signin?error=No session found")
      } catch (error: any) {
        console.error("Auth callback error:", error)
        router.push(
          "/auth/signin?error=" +
            encodeURIComponent(error.message || "Authentication failed")
        )
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-blue-50">
      <div className="text-center space-y-6">
        <div className="flex justify-center items-center space-x-2">
          <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
            <Palmtree className="h-8 w-8 text-gray-50" />
          </div>
          <MapPin className="h-6 w-6 text-emerald-600" />
        </div>
        <div className="space-y-3">
          <LoadingSpinner size="lg" className="mx-auto text-emerald-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            Completing Sign In
          </h2>
          <p className="text-gray-600">
            Please wait while we verify your account...
          </p>
        </div>
      </div>
    </div>
  )
}
