import { useState } from "react"
import { useTranslations } from "next-intl"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { ImageWithFallback } from "./figma/ImageWithFallback"
import { getImageProxyUrl } from "../lib/image-proxy"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "./ui/dialog"
import { ExternalLink } from "lucide-react"

interface NewsArticle {
  title: string
  description: string
  url: string
  urlToImage: string | null
  publishedAt: string
  source: {
    name: string
  }
}

interface NewsCardProps {
  article: NewsArticle
}

export function NewsCard({ article }: NewsCardProps) {
  const t = useTranslations("NewsPage")
  const [open, setOpen] = useState(false)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-CR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleReadMore = () => {
    window.open(article.url, "_blank", "noopener,noreferrer")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Card className="h-full flex flex-col cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]">
          <CardHeader className="p-0">
            {article.urlToImage && (
              <div className="relative aspect-video w-full overflow-hidden rounded-t-lg">
                <ImageWithFallback
                  src={getImageProxyUrl(article.urlToImage)}
                  alt={article.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover"
                />
              </div>
            )}
          </CardHeader>
          <CardContent className="flex-1 p-4">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="secondary" className="text-xs">
                {article.source.name}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDate(article.publishedAt)}
              </span>
            </div>
            <CardTitle className="mb-2 line-clamp-2">{article.title}</CardTitle>
            <CardDescription className="line-clamp-3">
              {article.description}
            </CardDescription>
          </CardContent>
          <CardFooter className="p-4 pt-0">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setOpen(true)}
            >
              {t("viewPreview")}
            </Button>
          </CardFooter>
        </Card>
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={() => {}}
      >
        {article.urlToImage && (
          <div className="relative aspect-video w-full overflow-hidden rounded-lg mb-4">
            <ImageWithFallback
              src={getImageProxyUrl(article.urlToImage)}
              alt={article.title}
              fill
              sizes="(max-width: 640px) 100vw, 640px"
              className="object-cover"
            />
          </div>
        )}
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="text-xs">
              {article.source.name}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDate(article.publishedAt)}
            </span>
          </div>
          <DialogTitle className="text-xl">{article.title}</DialogTitle>
          <DialogDescription className="text-base leading-relaxed mt-2">
            {article.description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button onClick={handleReadMore} className="w-full sm:w-auto">
            <ExternalLink className="mr-2 h-4 w-4" />
            {t("readFullArticle")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
