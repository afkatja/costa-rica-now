import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { useTranslations } from "next-intl";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { getImageProxyUrl } from "../lib/image-proxy";

interface NewsArticle {
  title: string;
  description: string;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  source: {
    name: string;
  };
}

interface NewsCardProps {
  article: NewsArticle;
}

export function NewsCard({ article }: NewsCardProps) {
  const t = useTranslations('NewsPage');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleReadMore = () => {
    window.open(article.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card className="h-full flex flex-col cursor-pointer" onClick={handleReadMore}>
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
        <CardTitle className="mb-2 line-clamp-2">
          {article.title}
        </CardTitle>
        <CardDescription className="line-clamp-3">
          {article.description}
        </CardDescription>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button 
          onClick={handleReadMore}
          className="w-full"
          variant="outline"
        >
            {t('readMore')}
        </Button>
      </CardFooter>
    </Card>
  );
}