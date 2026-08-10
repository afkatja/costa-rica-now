export interface KnowledgeSeed {
  title: string
  content: string
  category: string
  location?: string
  tags: string[]
  sourceType: string
  metadata?: Record<string, unknown>
}

export const beachSeeds: KnowledgeSeed[] = [
  {
    title: "Manuel Antonio Beach Guide",
    content: "Manuel Antonio features pristine white sand beaches with crystal-clear waters, surrounded by lush rainforest. The main beaches are Playa Espadilla, Playa Manuel Antonio (inside the national park), and Playa Biesanz. Best visited during dry season (December-April). Tides vary between 0.3m and 3m. Wave heights typically range 0.5-2.5m. Surf conditions are generally good for beginners at Playa Espadilla.",
    category: "beaches",
    location: "Manuel Antonio",
    tags: ["beach", "snorkeling", "swimming", "national park", "white sand"],
    sourceType: "beach",
  },
  {
    title: "Tamarindo Beach and Surf Conditions",
    content: "Tamarindo is one of Costa Rica's most popular surf destinations on the Guanacaste coast. Wave heights average 1-2m year-round with occasional swells up to 3m. Best surf season is May-November (rainy season) when southern hemisphere swells arrive. Tides are semi-diurnal with two high and two low tides daily. The beach has dark golden sand and is known for consistent surf breaks suitable for intermediate surfers.",
    category: "beaches",
    location: "Tamarindo",
    tags: ["beach", "surf", "surfing", "waves", "guanacaste"],
    sourceType: "beach",
  },
  {
    title: "Jacó Beach Marine Conditions",
    content: "Jacó is located on the Central Pacific Coast with consistent wave conditions year-round. Wave heights range 0.5-2m with occasional swells reaching 3m during rainy season. Tides significantly affect beach access and surf conditions. The beach features dark volcanic sand. Popular for both surfing and swimming, though rip currents can be strong during high tide. Best swimming at low tide near the river mouth.",
    category: "beaches",
    location: "Jacó",
    tags: ["beach", "surf", "swimming", "central pacific", "waves"],
    sourceType: "beach",
  },
  {
    title: "Puerto Viejo Caribbean Beaches",
    content: "Puerto Viejo on the Southern Caribbean coast offers a different beach experience with turquoise waters and white sand. The main beaches are Playa Cocles, Playa Chiquita, and Punta Uva. Wave heights are generally calmer than the Pacific coast (0.3-1.5m). Tides are less extreme than the Pacific. Water temperatures are consistently warm (26-30°C). Best conditions for snorkeling are at Punta Uva, especially during March-October.",
    category: "beaches",
    location: "Puerto Viejo",
    tags: ["beach", "caribbean", "snorkeling", "white sand", "calm waters"],
    sourceType: "beach",
  },
  {
    title: "Tortuguero Canals and Beach Ecology",
    content: "Tortuguero on the Northern Caribbean coast is famous for its canal system and sea turtle nesting. The beach is a crucial nesting site for green sea turtles (July-October). Wave conditions are generally calm due to offshore reef protection. Tides are moderate. The dark volcanic sand beach stretches for 22 miles. Best visited during turtle nesting season for wildlife viewing. The canals offer kayaking and boat tours through rainforest.",
    category: "beaches",
    location: "Tortuguero",
    tags: ["beach", "turtle nesting", "canals", "wildlife", "caribbean"],
    sourceType: "beach",
  },
  {
    title: "Dominical Surf and Beach Guide",
    content: "Dominical on the Southern Pacific coast is known for powerful beach breaks and consistent surf. Wave heights average 1-3m with larger swells during rainy season (May-November). The beach features dark sand and strong rip currents. Best for experienced surfers. Tides range 1-4m. The nearby Marino Ballena National Park offers whale watching (August-October) and snorkeling at low tide.",
    category: "beaches",
    location: "Dominical",
    tags: ["beach", "surf", "advanced surfing", "southern pacific", "whale watching"],
    sourceType: "beach",
  },
  {
    title: "Uvia Beach and Marino Ballena",
    content: "Uvita is home to the famous Whale's Tail formation at Marino Ballena National Park, visible at low tide. The beach is part of a marine protected area. Wave heights are moderate (0.5-2m). Tides reveal the sandbar formation twice daily. Best visited during whale season (August-October). Snorkeling is excellent during calm conditions at high tide. The area is known for its eco-lodges and sustainable tourism.",
    category: "beaches",
    location: "Uvita",
    tags: ["beach", "whale tail", "national park", "snorkeling", "southern pacific"],
    sourceType: "beach",
  },
  {
    title: "Sámara Beach Family Guide",
    content: "Sámara in Guanacaste features a sheltered bay with calm waters, making it ideal for swimming and families. Wave heights are typically low (0.3-1m) due to the protected bay. The beach has golden sand and palm trees. Tides are moderate. The bay is horseshoe-shaped, providing natural protection from strong currents. Excellent for paddleboarding, kayaking, and beginner surfing. Sea turtles nest on nearby Playa Camaronal.",
    category: "beaches",
    location: "Sámara",
    tags: ["beach", "family", "calm waters", "swimming", "guanacaste"],
    sourceType: "beach",
  },
  {
    title: "Puerto Jiménez and Golfo Dulce",
    content: "Puerto Jiménez is the gateway to Corcovado National Park on the Osa Peninsula. Beaches here border the Golfo Dulce, a tropical fjord with calm, warm waters. Wave heights are minimal (0.1-0.8m) inside the gulf. Tides are significant (2-4m). Excellent for kayaking, paddleboarding, and wildlife viewing. Dolphin and whale watching are popular. The area has dark sand beaches with rainforest backdrop.",
    category: "beaches",
    location: "Puerto Jiménez",
    tags: ["beach", "corcovado", "golfo dulce", "wildlife", "kayaking"],
    sourceType: "beach",
  },
  {
    title: "Costa Rica Tide Patterns and Safety",
    content: "Costa Rica experiences semi-diurnal tides (two high and two low tides daily) on both coasts. Pacific coast tides range 1-4m, while Caribbean tides are smaller (0.3-1m). Rip currents are common at Pacific beach breaks, especially during outgoing tides. Always check local tide tables before swimming. The best time for beach activities is during incoming tide (rising) or around slack tide. Never swim at unguarded beaches during high surf advisories.",
    category: "beaches",
    location: "General",
    tags: ["tides", "safety", "rip currents", "swimming", "general information"],
    sourceType: "beach",
  },
]
