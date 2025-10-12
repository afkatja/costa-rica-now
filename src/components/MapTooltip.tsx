import { ReactNode } from "react";
import { Card, CardContent } from "./ui/card";

interface MapTooltipProps {
  children: ReactNode;
  isVisible: boolean;
  x: number;
  y: number;
  className?: string;
}

export function MapTooltip({ children, isVisible, x, y, className = "" }: MapTooltipProps) {
  if (!isVisible) return null;

  return (
    <div 
      className={`absolute z-50 pointer-events-none ${className}`}
      style={{ 
        left: x, 
        top: y,
        transform: 'translate(-50%, -100%)'
      }}
    >
      <Card className="shadow-lg border-2 max-w-xs">
        <CardContent className="p-3">
          {children}
        </CardContent>
      </Card>
    </div>
  );
}