import React from "react"
import Image from "next/image"

type Props = {
  data: { icon: any; description: string }
  children: React.ReactNode
}

const formatDescription = (description: string) => {
  return description.charAt(0).toUpperCase() + description.slice(1)
}

const MapTooltipContent = ({ data, children }: Props) => {
  return data ? (
    <div className="space-y-2 p-2">
      <div className="flex items-center gap-2">
        {data.icon && (
          <Image
            src={data.icon}
            alt="Weather icon"
            width={64}
            height={64}
            className="object-cover"
          />
        )}
        <div>
          <div className="text-sm text-gray-600">
            {formatDescription(data.description)}
          </div>
        </div>
      </div>

      {children}
    </div>
  ) : (
    <div className="text-sm text-gray-500">No weather data available</div>
  )
}

export default MapTooltipContent
