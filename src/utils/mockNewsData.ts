// Mock data that matches NewsAPI structure for Costa Rica news
export const mockNewsData = {
  all: [
    {
      title: "Costa Rica impulsa nuevas políticas de energía renovable",
      description: "El gobierno costarricense anuncia un plan ambicioso para alcanzar la neutralidad de carbono mediante la expansión de energías limpias y sostenibles.",
      url: "https://example.com/costa-rica-energia-renovable",
      urlToImage: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=800&h=400&fit=crop",
      publishedAt: "2024-12-15T10:30:00Z",
      source: { name: "La Nación" }
    },
    {
      title: "Biodiversidad costarricense: nuevo parque nacional protege especies únicas",
      description: "Se establece un nuevo parque nacional en la región sur del país para proteger el hábitat de especies endémicas en peligro de extinción.",
      url: "https://example.com/biodiversidad-parque-nacional",
      urlToImage: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=400&fit=crop",
      publishedAt: "2024-12-14T15:45:00Z",
      source: { name: "Semanario Universidad" }
    },
    {
      title: "Economía digital: Costa Rica líder en transformación tecnológica",
      description: "El país se posiciona como hub tecnológico regional con nuevas inversiones en startups y desarrollo de infraestructura digital.",
      url: "https://example.com/economia-digital-cr",
      urlToImage: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop",
      publishedAt: "2024-12-14T08:20:00Z",
      source: { name: "CRHoy" }
    }
  ],
  business: [
    {
      title: "Sector turístico costarricense registra crecimiento del 15%",
      description: "Los datos oficiales muestran una recuperación significativa del turismo, superando las expectativas post-pandemia.",
      url: "https://example.com/turismo-crecimiento",
      urlToImage: "https://images.unsplash.com/photo-1539650116574-75c0c6d73023?w=800&h=400&fit=crop",
      publishedAt: "2024-12-15T09:15:00Z",
      source: { name: "El Financiero" }
    },
    {
      title: "Exportaciones de café alcanzan récord histórico",
      description: "La calidad excepcional del café costarricense impulsa las ventas internacionales a niveles nunca antes vistos.",
      url: "https://example.com/cafe-exportaciones",
      urlToImage: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800&h=400&fit=crop",
      publishedAt: "2024-12-13T16:30:00Z",
      source: { name: "La República" }
    }
  ],
  technology: [
    {
      title: "Costa Rica inaugura primer laboratorio de inteligencia artificial",
      description: "El nuevo centro de investigación promete impulsar la innovación tecnológica y formar talento especializado en IA.",
      url: "https://example.com/laboratorio-ia",
      urlToImage: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&h=400&fit=crop",
      publishedAt: "2024-12-15T11:00:00Z",
      source: { name: "TecnoCR" }
    }
  ],
  health: [
    {
      title: "Sistema de salud costarricense implementa telemedicina rural",
      description: "Nueva plataforma digital permite consultas médicas remotas en comunidades alejadas, mejorando el acceso a la atención sanitaria.",
      url: "https://example.com/telemedicina-rural",
      urlToImage: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=400&fit=crop",
      publishedAt: "2024-12-14T14:20:00Z",
      source: { name: "Ministerio de Salud" }
    }
  ],
  sports: [
    {
      title: "Selección de fútbol de Costa Rica clasifica a eliminatorias",
      description: "La Tricolor asegura su participación en la siguiente fase de las eliminatorias mundialistas con una victoria contundente.",
      url: "https://example.com/seleccion-futbol",
      urlToImage: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&h=400&fit=crop",
      publishedAt: "2024-12-15T20:45:00Z",
      source: { name: "Deportes CR" }
    }
  ],
  entertainment: [
    {
      title: "Festival Internacional de Cine de Costa Rica anuncia programación",
      description: "El evento cultural más importante del año presenta una selección diversa de producciones nacionales e internacionales.",
      url: "https://example.com/festival-cine",
      urlToImage: "https://images.unsplash.com/photo-1489599162788-7b34ae2a4c3c?w=800&h=400&fit=crop",
      publishedAt: "2024-12-13T12:00:00Z",
      source: { name: "Cultura CR" }
    }
  ],
  science: [
    {
      title: "Científicos costarricenses descubren nueva especie de rana",
      description: "El hallazgo en las montañas de Talamanca contribuye al conocimiento de la biodiversidad única del país.",
      url: "https://example.com/nueva-especie-rana",
      urlToImage: "https://images.unsplash.com/photo-1453396450673-3fe83d2db2c4?w=800&h=400&fit=crop",
      publishedAt: "2024-12-12T10:15:00Z",
      source: { name: "Ciencia CR" }
    }
  ],
  general: [
    {
      title: "Costa Rica celebra 200 años de independencia con eventos especiales",
      description: "Una serie de actividades culturales y cívicas conmemoran el bicentenario de la independencia nacional.",
      url: "https://example.com/bicentenario-independencia",
      urlToImage: "https://images.unsplash.com/photo-1529258283598-8d6fe60b27f4?w=800&h=400&fit=crop",
      publishedAt: "2024-12-14T18:00:00Z",
      source: { name: "Gobierno de Costa Rica" }
    }
  ]
};

export type NewsCategory = keyof typeof mockNewsData;