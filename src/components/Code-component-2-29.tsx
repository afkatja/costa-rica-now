import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { NewsFeed } from "./NewsFeed";
import { mockNewsData, type NewsCategory } from "../utils/mockNewsData";
import { TrendingUp, Monitor, Heart, Lightbulb, Trophy, Music, Globe } from "lucide-react";

const categories = [
  { id: "all", label: "Todas", icon: Globe },
  { id: "business", label: "Negocios", icon: TrendingUp },
  { id: "technology", label: "Tecnología", icon: Monitor },
  { id: "health", label: "Salud", icon: Heart },
  { id: "science", label: "Ciencia", icon: Lightbulb },
  { id: "sports", label: "Deportes", icon: Trophy },
  { id: "entertainment", label: "Entretenimiento", icon: Music },
  { id: "general", label: "General", icon: Globe },
] as const;

export function NewsPage() {
  const [activeCategory, setActiveCategory] = useState<NewsCategory>("all");
  const [loading, setLoading] = useState(false);

  const handleCategoryChange = async (category: NewsCategory) => {
    setLoading(true);
    setActiveCategory(category);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    setLoading(false);
  };

  const getCurrentArticles = () => {
    if (activeCategory === "all") {
      // Combine all articles for "all" category
      return Object.values(mockNewsData).flat().sort((a, b) => 
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
    }
    return mockNewsData[activeCategory] || [];
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="mb-2">Últimas Noticias</h2>
        <p className="text-muted-foreground">
          Mantente informado con las noticias más recientes de Costa Rica
        </p>
      </div>

      <Tabs value={activeCategory} onValueChange={(value) => handleCategoryChange(value as NewsCategory)}>
        {/* Horizontal scrollable tabs for mobile */}
        <div className="mb-6">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 gap-1 h-auto p-1">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className="flex flex-col items-center gap-1 py-2 px-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline truncate">{category.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {/* Tab Content */}
        {categories.map((category) => (
          <TabsContent key={category.id} value={category.id} className="mt-0">
            <NewsFeed 
              articles={getCurrentArticles()} 
              loading={loading}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}