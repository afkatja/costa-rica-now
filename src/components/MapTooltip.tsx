import { ReactNode } from "react"
import { InfoWindow } from "@vis.gl/react-google-maps"

interface MapTooltipProps {
  children: ReactNode
  anchor?: any
  onClose?: () => void
  header: React.ReactNode
}

export function MapTooltip({
  children,
  onClose,
  header,
  anchor,
}: MapTooltipProps) {
  return (
    <InfoWindow
      anchor={anchor}
      onClose={onClose}
      headerContent={
        <h3 className="font-semibold text-lg mb-2 ml-2">{header}</h3>
      }
    >
      <div className="min-w-[200px]">{children}</div>
    </InfoWindow>
  )
}
