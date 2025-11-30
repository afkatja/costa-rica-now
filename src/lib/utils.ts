import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const d = typeof date === "string" ? new Date(date) : date
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return "just now"
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? "" : "s"} ago`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? "" : "s"} ago`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays === 1 ? "" : "s"} ago`
  }

  return formatDate(d)
}

export const dayInMs = 86500000
export const hourInMs = 3600000

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + "..."
}

function isEnumMember({
  value,
  enumType,
}: {
  value: string
  enumType: Record<string, any>
}): boolean {
  return Object.values(enumType).includes(value as unknown as typeof enumType)
}

export function stringToEnum<T extends Record<string, string>>(
  inputString: string,
  enumType: T
): T[keyof T] | undefined {
  if (isEnumMember({ value: inputString, enumType })) {
    return inputString as T[keyof T]
  }
  return undefined
}
