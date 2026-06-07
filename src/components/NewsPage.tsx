"use client"
import { useState, useEffect } from "react"
import { useTranslations, useLocale } from "next-intl"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { NewsFeed } from "./NewsFeed"
import { supabase } from "../utils/supabase/client"
import {
  TrendingUp,
  Monitor,
  Heart,
  Lightbulb,
  Trophy,
  Music,
  Globe,
} from "lucide-react"
import { NewsCategory } from "../types/news"

const categoryIcons = {
  all: Globe,
  business: TrendingUp,
  technology: Monitor,
  health: Heart,
  science: Lightbulb,
  sports: Trophy,
  entertainment: Music,
  general: Globe,
} as const

export function NewsPage() {
  const t = useTranslations("NewsPage")
  const locale = useLocale()
  const [activeCategory, setActiveCategory] = useState<NewsCategory>("all")
  const [articles, setArticles] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch news articles from the edge function
  const fetchNews = async (category: NewsCategory) => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.functions.invoke("news-service", {
        body: {
          language: locale as "en" | "es",
          category: category,
          limit: 20,
        },
      })

      if (error) {
        throw new Error(error.message || "Failed to fetch news")
      }

      if (!data?.success) {
        throw new Error(data?.error?.message || "Failed to fetch news")
      }
      console.log(data.articles[0])

      setArticles(data.articles || [])
    } catch (err) {
      console.error("Error fetching news:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch news")
      setArticles([])
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchNews(activeCategory)
  }, [locale])

  // Handle category change
  const handleCategoryChange = async (category: NewsCategory) => {
    setActiveCategory(category)
    await fetchNews(category)
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="mb-2">{t("title")}</h2>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <Tabs
        value={activeCategory}
        onValueChange={value => handleCategoryChange(value as NewsCategory)}
      >
        {/* Horizontal scrollable tabs for mobile */}
        <div className="mb-6">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 gap-1 h-auto p-1">
            {(Object.keys(categoryIcons) as NewsCategory[]).map(categoryId => {
              const Icon = categoryIcons[categoryId]
              const label = t(`categories.${categoryId}` as any)
              return (
                <TabsTrigger
                  key={categoryId}
                  value={categoryId}
                  className="flex flex-col items-center gap-1 py-2 px-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline truncate">{label}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>
        </div>

        {/* Tab Content */}
        {(Object.keys(categoryIcons) as NewsCategory[]).map(categoryId => (
          <TabsContent key={categoryId} value={categoryId} className="mt-0">
            {error ? (
              <div className="p-4 text-center text-muted-foreground">
                {t("error")}
                <p className="text-sm mt-2">{error}</p>
              </div>
            ) : (
              <NewsFeed articles={articles} loading={loading} />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
