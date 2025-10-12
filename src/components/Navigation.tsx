import { Newspaper, Cloud, Mountain } from "lucide-react"
import { createNavigation } from "next-intl/navigation"
import { useTranslations } from "next-intl"
import { cn } from "../lib/utils"

export type PageType = "news" | "weather" | "seismic"

interface NavigationProps {}

export function Navigation({}: NavigationProps) {
  const { Link, usePathname } = createNavigation()
  const t = useTranslations("Navigation")
  const pathname = usePathname()
  console.log({ pathname })

  const pages = [
    { id: "news" as const, labelKey: "news", icon: Newspaper },
    { id: "weather" as const, labelKey: "weather", icon: Cloud },
    { id: "seismic" as const, labelKey: "seismic", icon: Mountain },
  ]

  return (
    <nav className="flex gap-2">
      {pages.map(page => {
        const Icon = page.icon
        return (
          <Link
            key={page.id}
            href={page.id}
            className={cn(
              pathname.includes(page.id)
                ? "text-accent font-bold"
                : "text-primary",
              "flex items-center gap-2 hover:text-accent transition-colors"
            )}
          >
            <Icon className="h-4 w-4" />
            {t(page.labelKey)}
          </Link>
        )
      })}
    </nav>
  )
}
