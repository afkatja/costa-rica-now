import { Metadata } from "next"

const title = "Costa Rica Now"
const description =
  "your AI powered travel assistant in Costa Rica with news, real-time weather reports, earthquake and volcanic activity and interactive itinerary planner"

const baseUrl = "https://costaricanow.com"

export async function generateMetadata(): Promise<Metadata> {
  return {
    title,
    metadataBase: new URL(baseUrl),
    description: "",
    keywords:
      `Costa Rica, travel, assistant, travel planner, itinerary assistant,`
        .split(",")
        .map(k => k.trim())
        .filter(Boolean),
    icons: {
      icon: "/favicon/icon.ico",
      apple: "/favicon/apple-touch-icon.png",
      shortcut: "/favicon/safari-pinned-tab.svg",
    },
    robots: "index, follow",
    // alternates: {
    //   canonical:
    //     locale === "en"
    //       ? `${baseUrl}${pathname}`
    //       : `${baseUrl}/${locale}${pathname}`,
    //   languages: {
    //     "x-default": `${baseUrl}${pathname}`,
    //     ...Object.fromEntries(
    //       locales.map(loc => [
    //         loc,
    //         loc === "en"
    //           ? `${baseUrl}${pathname}`
    //           : `${baseUrl}/${loc}${pathname}`,
    //       ])
    //     ),
    //   },
    // },
    openGraph: {
      title,
      description: `${title} - ${description}`,
      images: [
        {
          url: "/images/finca-guarumo-v4.4.jpg",
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      type: "website",
      // locale: "en_US",
      // alternateLocale: ["es_CR", "ru_RU", "nl_NL", "de_DE"],
      siteName: "Costa Rica Now",
      url: baseUrl,
      countryName: "Costa Rica",
    },
    // twitter: {
    //   card: "summary_large_image",
    //   site: "@fincaguarumo", // if you have a Twitter/X account
    //   title: "Finca Guarumo – Eco-Villa & Birding Paradise in Costa Rica",
    //   description:
    //     "Stay at Villa Bruno in the Osa Peninsula. A sustainable jungle experience with birds, wildlife, rural tours, and Corcovado nearby.",
    //   images: [
    //     {
    //       url: "/images/finca-guarumo-v4.4.jpg",
    //       alt: "Finca Guarumo – Villa Bruno jungle view",
    //     },
    //   ],
    // },
  }
}
