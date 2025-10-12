import { notFound } from "next/navigation"
import { getRequestConfig } from "next-intl/server"

const locales = ["en", "es"]

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) || "en"
  // console.log({ locale })

  // Validate that the incoming `locale` parameter is valid
  if (!locale || !locales.includes(locale)) notFound()

  return {
    messages: (await import(`../messages/${locale}.json`)).default,
    locale,
  }
})
