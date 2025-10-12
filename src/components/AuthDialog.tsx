"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Palmtree, MapPin } from "lucide-react"
import { useAuth } from "@/providers/auth-provider"
import LoadingSpinner from "@/components/Loader"
import OneTapComponent from "@/components/OneTapSignin"
import { supabase } from "@/utils/supabase/client"
import GoogleButton from "@/components/GoogleButton"

type AuthMode = "signin" | "signup"

interface AuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultMode?: AuthMode
}

export default function AuthDialog({
  open,
  onOpenChange,
  defaultMode = "signin",
}: AuthDialogProps) {
  const [mode, setMode] = useState<AuthMode>(defaultMode)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()

  const resetForm = () => {
    setEmail("")
    setPassword("")
    setConfirmPassword("")
    setError("")
    setSuccess("")
    setLoading(false)
  }

  const handleModeSwitch = (newMode: AuthMode) => {
    setMode(newMode)
    resetForm()
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const { error } = await signIn(email, password)
      if (error) throw error
      onOpenChange(false)
      resetForm()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long")
      setLoading(false)
      return
    }

    try {
      const { data, error } = await signUp(email, password)
      if (error) throw error

      if (data?.user && !data?.session) {
        setSuccess("Please check your email for a confirmation link!")
      } else if (data?.session) {
        onOpenChange(false)
        resetForm()
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
      })
      onOpenChange(false)
      resetForm()
    } catch (error: any) {
      setError(error.message)
    }
  }

  const handleDialogClose = (open: boolean) => {
    onOpenChange(open)
    if (!open) {
      resetForm()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-4">
          <div className="flex justify-center items-center space-x-2">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
              <Palmtree className="h-8 w-8 text-white" />
            </div>
            {mode === "signup" && (
              <MapPin className="h-6 w-6 text-emerald-600" />
            )}
          </div>
          <div className="text-center">
            <DialogTitle className="text-2xl font-bold text-gray-900">
              {mode === "signin" ? "Welcome Back" : "Join Us"}
            </DialogTitle>
            <DialogDescription className="text-gray-600 mt-2">
              {mode === "signin"
                ? "Sign in to continue planning your Costa Rica adventure"
                : "Create your account and start exploring Costa Rica"}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Google Sign In */}
          <div className="flex items-center justify-center">
            <GoogleButton
              onClick={handleGoogleLogin}
              title={
                mode === "signin" ? "Login with Google" : "Signup with Google"
              }
            />
          </div>

          <OneTapComponent />

          {/* Form */}
          <form
            onSubmit={mode === "signin" ? handleSignIn : handleSignUp}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-gray-700"
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-gray-700"
              >
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder={
                  mode === "signin"
                    ? "Enter your password"
                    : "Create a password (min 6 characters)"
                }
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={mode === "signup" ? 6 : undefined}
                className="w-full"
                disabled={loading}
              />
            </div>

            {mode === "signup" && (
              <div className="space-y-2">
                <Label
                  htmlFor="confirmPassword"
                  className="text-sm font-medium text-gray-700"
                >
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  className="w-full"
                  disabled={loading}
                />
              </div>
            )}

            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription className="text-green-700">
                  {success}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium py-2 px-4 rounded-md transition-all duration-200 transform hover:scale-[1.02]"
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  {mode === "signin" ? "Signing in..." : "Creating account..."}
                </>
              ) : mode === "signin" ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          {/* Mode Switch */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              {mode === "signin"
                ? "Don't have an account? "
                : "Already have an account? "}
              <button
                type="button"
                onClick={() =>
                  handleModeSwitch(mode === "signin" ? "signup" : "signin")
                }
                className="font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                {mode === "signin" ? "Sign up here" : "Sign in here"}
              </button>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
