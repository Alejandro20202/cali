import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Droplet, Map, Bot, Sparkles } from "lucide-react";

type Adventure = {
  id: number;
  title: string;
  emoji: string;
  fromColor: string;
  toColor: string;
  hoverFrom: string;
  hoverTo: string;
  description: string;
  path: string;
  Icon: typeof Droplet;
};

const adventures: Adventure[] = [
  {
    id: 1,
    title: "Ciclo del Agua 3D",
    emoji: "💧",
    fromColor: "from-blue-400",
    toColor: "to-cyan-400",
    hoverFrom: "from-blue-500",
    hoverTo: "to-cyan-500",
    description: "Observa cómo el agua viaja por el cielo y la tierra.",
    path: "/three",
    Icon: Droplet,
  },
  {
    id: 2,
    title: "Mapa 3D Interactivo",
    emoji: "🗺️",
    fromColor: "from-green-400",
    toColor: "to-emerald-400",
    hoverFrom: "from-green-500",
    hoverTo: "to-emerald-500",
    description: "Explora cada región moviendo tus propias piezas.",
    path: "/mapa3d",
    Icon: Map,
  },
  {
    id: 3,
    title: "Simulador Robot 3D",
    emoji: "🤖",
    fromColor: "from-purple-400",
    toColor: "to-pink-400",
    hoverFrom: "from-purple-500",
    hoverTo: "to-pink-500",
    description: "Lleva al robot a nuevas aventuras paso a paso.",
    path: "/robots",
    Icon: Bot,
  },
];

export default function KidsInterface() {
  const [hovered, setHovered] = useState<number | null>(null);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden">
      <DecorativeSparkles />

      <div className="text-center mb-12 animate-fade-in space-y-4">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Explora y aprende</p>
        <h1 className="text-4xl md:text-6xl font-extrabold text-transparent bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 bg-clip-text animate-pulse">
          ¡Bienvenido! 🌟
        </h1>
        <p className="text-xl md:text-2xl text-slate-600 font-semibold">Elige una aventura para descubrir algo nuevo.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-3 w-full max-w-6xl">
        {adventures.map((adventure, index) => {
          const isHovered = hovered === adventure.id;
          const Icon = adventure.Icon;

          return (
            <div
              key={adventure.id}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 0.2}s`, animationFillMode: "both" }}
            >
              <button
                onClick={() => navigate(adventure.path)}
                onMouseEnter={() => setHovered(adventure.id)}
                onMouseLeave={() => setHovered(null)}
                className={`w-full h-72 rounded-3xl border-4 border-white shadow-2xl bg-gradient-to-br ${isHovered ? `${adventure.hoverFrom} ${adventure.hoverTo}` : `${adventure.fromColor} ${adventure.toColor}`} transform transition-all duration-300 ${isHovered ? "scale-105 -rotate-1" : "scale-100 rotate-0"} hover:shadow-3xl flex flex-col items-center justify-center gap-4 p-6 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/80`}
              >
                <div className={`text-7xl transition-transform duration-300 ${isHovered ? "scale-125 rotate-12" : "scale-100"}`}>
                  {adventure.emoji}
                </div>

                <Icon
                  size={56}
                  className={`text-white transition-transform duration-300 ${isHovered ? "rotate-360" : ""}`}
                  style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.35))" }}
                />

                <div className="space-y-1">
                  <h2 className="text-2xl font-bold text-white drop-shadow-lg">{adventure.title}</h2>
                  <p className="text-sm text-white/90 leading-tight">{adventure.description}</p>
                </div>
              </button>
            </div>
          );
        })}
      </div>
      <p className="mt-10 text-sm text-slate-400 text-center max-w-xl">Toca cualquiera de los botones para entrar a la actividad. ¡Siempre puedes volver presionando el botón de atrás del navegador!</p>
    </div>
  );
}

function DecorativeSparkles() {
  return (
    <>
      <Sparkles className="absolute top-10 left-6 text-yellow-400 animate-bounce" size={36} />
      <Sparkles className="absolute top-20 right-12 text-pink-400 animate-bounce" size={32} style={{ animationDelay: "0.5s" }} />
      <Sparkles className="absolute bottom-32 left-10 text-blue-400 animate-bounce" size={40} style={{ animationDelay: "0.9s" }} />
      <Sparkles className="absolute bottom-10 right-16 text-green-400 animate-bounce" size={34} style={{ animationDelay: "1.3s" }} />
    </>
  );
}
