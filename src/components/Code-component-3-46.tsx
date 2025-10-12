interface CostaRicaMapProps {
  children?: React.ReactNode;
  className?: string;
}

export function CostaRicaMap({ children, className = "" }: CostaRicaMapProps) {
  return (
    <div className={`relative w-full h-96 bg-blue-50 rounded-lg border ${className}`}>
      <svg
        viewBox="0 0 400 200"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Costa Rica outline (simplified) */}
        <path
          d="M 50 120 
             L 80 100 
             L 120 90 
             L 160 85 
             L 200 80 
             L 240 85 
             L 280 90 
             L 320 100 
             L 350 120 
             L 360 140 
             L 350 160 
             L 320 170 
             L 280 175 
             L 240 180 
             L 200 175 
             L 160 170 
             L 120 160 
             L 80 150 
             L 50 140 
             Z"
          fill="#e2e8f0"
          stroke="#64748b"
          strokeWidth="2"
          className="hover:fill-slate-200 transition-colors"
        />
        
        {/* Pacific Ocean label */}
        <text x="30" y="180" className="text-xs fill-blue-600 font-medium">
          Océano Pacífico
        </text>
        
        {/* Caribbean Sea label */}
        <text x="250" y="30" className="text-xs fill-blue-600 font-medium">
          Mar Caribe
        </text>
        
        {/* Major cities for reference */}
        <circle cx="200" cy="130" r="2" fill="#374151" />
        <text x="205" y="135" className="text-xs fill-gray-700">San José</text>
        
        <circle cx="160" cy="100" r="1.5" fill="#374151" />
        <text x="135" y="95" className="text-xs fill-gray-700">Liberia</text>
        
        <circle cx="280" cy="140" r="1.5" fill="#374151" />
        <text x="285" y="145" className="text-xs fill-gray-700">Limón</text>
        
        <circle cx="120" cy="160" r="1.5" fill="#374151" />
        <text x="85" y="175" className="text-xs fill-gray-700">Puntarenas</text>
        
        {children}
      </svg>
    </div>
  );
}

// Helper function to convert lat/lng to SVG coordinates
export function coordsToSVG(lat: number, lng: number): { x: number; y: number } {
  // Costa Rica approximate bounds: 8.0-11.5°N, 82.5-86°W
  const minLat = 8.0;
  const maxLat = 11.5;
  const minLng = -86.0;
  const maxLng = -82.5;
  
  // Map to SVG viewBox (0-400, 0-200)
  const x = ((lng - minLng) / (maxLng - minLng)) * 350 + 25;
  const y = ((maxLat - lat) / (maxLat - minLat)) * 150 + 25;
  
  return { x, y };
}