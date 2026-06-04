import React, { ErrorInfo, ReactNode } from "react"
import { useTranslations } from "next-intl"

interface MapErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface MapErrorBoundaryState {
  hasError: boolean
  error?: Error
}

class MapErrorBoundaryClass extends React.Component<
  MapErrorBoundaryProps,
  MapErrorBoundaryState
> {
  constructor(props: MapErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): MapErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Map rendering error:", error, errorInfo)
  }

  render(): ReactNode {
    const { children, fallback } = this.props
    const { hasError } = this.state

    if (hasError) {
      if (fallback) {
        return <>{fallback}</>
      }

      return <MapErrorFallback />
    }

    return <>{children}</>
  }
}

function MapErrorFallback(): JSX.Element {
  const t = useTranslations("mapError")

  return (
    <div className="flex items-center justify-center h-64 bg-surface border border-neutral rounded-lg">
      <div className="text-center p-4">
        <div className="text-error mb-2">
          <svg
            className="w-12 h-12 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-foreground mb-1">
          {t("title")}
        </h3>
        <p className="text-sm text-muted-foreground">{t("message")}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
        >
          {t("refreshButton")}
        </button>
      </div>
    </div>
  )
}

export const MapErrorBoundary = MapErrorBoundaryClass
