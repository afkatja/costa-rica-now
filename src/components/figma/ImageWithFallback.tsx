import Image from "next/image"
import React, { useEffect, useState } from "react"
import { cn } from "../../lib/utils"

const ERROR_IMG_SRC =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=="

interface ImageWithFallbackProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "alt" | "width" | "height"> {
  src: string | undefined
  alt?: string
  width?: number | string
  height?: number | string
  fill?: boolean
  sizes?: string
  priority?: boolean
}

export function ImageWithFallback(props: ImageWithFallbackProps) {
  const [didError, setDidError] = useState(false)

  const { src, alt, style, className, width, height, fill, sizes, priority, ...rest } = props

  useEffect(() => {
    if (!src) {
      setDidError(true)
    } else {
      setDidError(false)
    }
  }, [src])

  const handleError = () => {
    setDidError(true)
  }

  const imageWidth =
    typeof width === "string" ? parseInt(width, 10) || undefined : width
  const imageHeight =
    typeof height === "string" ? parseInt(height, 10) || undefined : height

  if (didError || !src) {
    return (
      <div
        className={cn(
          "inline-block bg-gray-100 text-center align-middle",
          className,
        )}
        style={style}
      >
        <div className="flex items-center justify-center w-full h-full">
          <Image
            src={ERROR_IMG_SRC}
            alt="Error loading image"
            width={imageWidth || 120}
            height={imageHeight || 80}
            {...rest}
            data-original-url={src}
          />
        </div>
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={alt ?? "Image"}
      className={className}
      style={style}
      fill={fill}
      sizes={sizes}
      priority={priority}
      width={fill ? undefined : imageWidth || 120}
      height={fill ? undefined : imageHeight || 80}
      {...rest}
      onError={handleError}
    />
  )
}
