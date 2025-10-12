import { Newspaper, Cloud, Mountain } from "lucide-react";
import { Button } from "./ui/button";

export type PageType = "news" | "weather" | "seismic";

interface NavigationProps {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
}

const pages = [
  { id: "news" as const, label: "Noticias", icon: Newspaper },
  { id: "weather" as const, label: "Clima", icon: Cloud },
  { id: "seismic" as const, label: "Sísmica", icon: Mountain },
];

export function Navigation({ currentPage, onPageChange }: NavigationProps) {
  return (
    <nav className="flex gap-2 mb-6">
      {pages.map((page) => {
        const Icon = page.icon;
        return (
          <Button
            key={page.id}
            variant={currentPage === page.id ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(page.id)}
            className="flex items-center gap-2"
          >
            <Icon className="h-4 w-4" />
            {page.label}
          </Button>
        );
      })}
    </nav>
  );
}