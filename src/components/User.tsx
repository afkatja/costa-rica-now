"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Settings, LogOut, User as UserIcon, LogIn } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "../providers/auth-provider"
import { createNavigation } from "next-intl/navigation"

export default function Header() {
  const { useRouter } = createNavigation()
  const { user, signOut } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSignIn = () => {
    router.push("/auth/signin")
  }

  const handleSignOut = async () => {
    setLoading(true)
    try {
      await signOut()
      toast({
        title: "Signed out successfully",
        description: "You have been signed out of your account.",
      })
    } catch (error: any) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const userInitials = user?.email?.substring(0, 2).toUpperCase() || "U"

  return (
    <div className="flex items-center space-x-4">
      {user && (
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{user?.email}</p>
          </div>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-medium">
              {userInitials}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      <div className="flex items-center space-x-2">
        {user ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-gray-900"
              disabled={loading}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              disabled={loading}
              className="text-gray-600 hover:text-red-600"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignIn}
            disabled={loading}
            className="text-gray-600 hover:text-red-600"
          >
            <LogIn className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
