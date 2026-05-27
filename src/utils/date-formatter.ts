/**
 * Centralized date formatting utilities
 * Eliminates duplicate date formatting logic across the application
 */

import { getDateTimeFormat } from "../config/app"

/**
 * Format date according to locale and format type
 */
export function formatDate(
  date: Date | string | number,
  locale: string = "es-CR",
  format: "date" | "time" | "full" = "date",
): string {
  const dateObj =
    typeof date === "string" || typeof date === "number" ? new Date(date) : date

  const formatConfig = getDateTimeFormat(locale)
  const options = formatConfig[format]

  return dateObj.toLocaleString(locale, options)
}

/**
 * Format time only
 */
export function formatTime(
  date: Date | string | number,
  locale: string = "es-CR",
): string {
  return formatDate(date, locale, "time")
}

/**
 * Format date and time (full format)
 */
export function formatDateTime(
  date: Date | string | number,
  locale: string = "es-CR",
): string {
  return formatDate(date, locale, "full")
}

/**
 * Format relative time (e.g., "2 days ago")
 */
export function formatRelativeTime(
  date: Date | string | number,
  locale: string = "es-CR",
): string {
  const dateObj =
    typeof date === "string" || typeof date === "number" ? new Date(date) : date

  const now = new Date()
  const diffTime = dateObj.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })

  if (Math.abs(diffDays) === 0) {
    return locale === "es-CR" ? "hoy" : "today"
  }

  return rtf.format(diffDays, "day")
}

/**
 * Get formatted date with fallback options
 * Handles multiple date field names commonly used in the application
 */
export function getFormattedDate(
  data: {
    time?: string | number
    date?: string
    datetime?: string
    formattedDateTime?: string
    formattedTime?: string
  },
  locale: string = "es-CR",
  format: "date" | "time" | "full" = "full",
): string {
  // Check for pre-formatted values first
  if (format === "full" && data.formattedDateTime) {
    return data.formattedDateTime
  }
  if (format === "time" && data.formattedTime) {
    return data.formattedTime
  }

  // Try different date field names
  const dateValue = data.time || data.date || data.datetime

  if (!dateValue) {
    return locale === "es-CR" ? "Fecha desconocida" : "Unknown date"
  }

  return formatDate(dateValue, locale, format)
}

/**
 * Check if a date is recent (within last 24 hours)
 */
export function isRecent(
  date: Date | string | number,
  hours: number = 24,
): boolean {
  const dateObj =
    typeof date === "string" || typeof date === "number" ? new Date(date) : date

  const now = new Date()
  const diffHours = (now.getTime() - dateObj.getTime()) / (1000 * 60 * 60)

  return diffHours >= 0 && diffHours <= hours
}

/**
 * Get date range string (e.g., "Jan 1 - Jan 3, 2024")
 */
export function formatDateRange(
  startDate: Date | string | number,
  endDate: Date | string | number,
  locale: string = "es-CR",
): string {
  const start =
    typeof startDate === "string" || typeof startDate === "number"
      ? new Date(startDate)
      : startDate
  const end =
    typeof endDate === "string" || typeof endDate === "number"
      ? new Date(endDate)
      : endDate

  const formatConfig = getDateTimeFormat(locale)

  // If same day, just show the date
  if (start.toDateString() === end.toDateString()) {
    return start.toLocaleDateString(locale, formatConfig.date)
  }

  // If same year, omit year from start date
  if (start.getFullYear() === end.getFullYear()) {
    const startFormat = { ...formatConfig.date, year: undefined as any }
    return `${start.toLocaleDateString(locale, startFormat)} - ${end.toLocaleDateString(locale, formatConfig.date)}`
  }

  // Different years, show full date for both
  return `${start.toLocaleDateString(locale, formatConfig.date)} - ${end.toLocaleDateString(locale, formatConfig.date)}`
}
