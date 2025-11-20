import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { RotateCcw, Zap, Volume2, Star } from "lucide-react";
import { RobotSimulator, type RobotCommand } from "../features/robotics/RobotSimulator";

const commandLabels: { command: RobotCommand; label: string; emoji: string; color: string }[] = [
  { command: "forward", label: "Arriba", emoji: "⬆️", color: "from-blue-400 to-blue-600" },
  { command: "back", label: "Abajo", emoji: "⬇️", color: "from-orange-400 to-orange-600" },
  { command: "left", label: "Izquierda", emoji: "⬅️", color: "from-green-400 to-green-600" },
  { command: "right", label: "Derecha", emoji: "➡️", color: "from-red-400 to-red-600" },
];

type Particle = { id: number; x: number; y: number; emoji: string };
type Coin = { id: number; x: number; y: number; emoji: string; value: number };

export default function RobotSimulatorView() {
  const simulatorRef = useRef(new RobotSimulator(5));
  const [position, setPosition] = useState(simulatorRef.current.getPosition());
  const [movementLog, setMovementLog] = useState(simulatorRef.current.getMovementLog());
  const [isMoving, setIsMoving] = useState(false);
  const [celebration, setCelebration] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [soundOn, setSoundOn] = useState(true);
  const [coins, setCoins] = useState<Coin[]>([]);
  const [score, setScore] = useState(0);

  const gridDimension = useMemo(() => simulatorRef.current.gridRadius * 2 + 1, []);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    if (celebration) {
      timeout = setTimeout(() => setCelebration(false), 600);
    }
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [celebration]);

  const spawnCoins = useCallback(
    (count: number, avoid: { x: number; y: number }) => {
      const newCoins: Coin[] = [];
      const radius = simulatorRef.current.gridRadius;
      while (newCoins.length < count) {
        const x = Math.floor(Math.random() * (radius * 2 + 1)) - radius;
        const y = Math.floor(Math.random() * (radius * 2 + 1)) - radius;
        const clash = newCoins.some((c) => c.x === x && c.y === y) || (avoid.x === x && avoid.y === y);
        if (clash) continue;
        newCoins.push({
          id: Math.random(),
          x,
          y,
          emoji: ["🪙", "💎", "⭐"][Math.floor(Math.random() * 3)],
          value: 10,
        });
      }
      return newCoins;
    },
    [],
  );

  useEffect(() => {
    setCoins(spawnCoins(4, simulatorRef.current.getPosition()));
  }, [spawnCoins]);

  const execute = useCallback(
    (command: RobotCommand) => {
      if (isMoving) return;
      setIsMoving(true);
      const instance = simulatorRef.current;
      const newState = instance[command]();

      setTimeout(() => {
        setPosition(newState);
        setMovementLog(instance.getMovementLog());
        setIsMoving(false);

        setCoins((current) => {
          let collected = 0;
          const remaining = current.filter((coin) => {
            const hit = coin.x === newState.x && coin.y === newState.y;
            if (hit) collected += coin.value;
            return !hit;
          });
          if (collected > 0) {
            setScore((prev) => prev + collected);
            const toSpawn = spawnCoins(current.length - remaining.length, newState);
            return [...remaining, ...toSpawn];
          }
          return current;
        });

        if (instance.getMovementLog().length % 5 === 0) {
          setCelebration(true);
          const newParticles = [...Array(8)].map(() => ({
            id: Math.random(),
            x: 50 + (Math.random() - 0.5) * 40,
            y: 50 + (Math.random() - 0.5) * 40,
            emoji: ["🎉", "⭐", "🌟", "✨", "🎊", "🚀"][Math.floor(Math.random() * 6)],
          }));
          setParticles(newParticles);
          if (soundOn && typeof window !== "undefined") {
            void new Audio("/assets/audio/click.wav").play().catch(() => {});
          }
        }
      }, 300);
    },
    [isMoving, soundOn, spawnCoins],
  );

  const reset = () => {
    simulatorRef.current = new RobotSimulator(simulatorRef.current.gridRadius);
    setPosition(simulatorRef.current.getPosition());
    setMovementLog([]);
    setCelebration(false);
    setParticles([]);
    setCoins(spawnCoins(4, simulatorRef.current.getPosition()));
    setScore(0);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isMoving) return;
      const key = event.key.toLowerCase();
      if (["arrowup", "w"].includes(key)) {
        event.preventDefault();
        execute("forward");
      } else if (["arrowdown", "s"].includes(key)) {
        event.preventDefault();
        execute("back");
      } else if (["arrowleft", "a"].includes(key)) {
        event.preventDefault();
        execute("left");
      } else if (["arrowright", "d"].includes(key)) {
        event.preventDefault();
        execute("right");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [execute, isMoving]);

  const cells = [];
  for (let row = simulatorRef.current.gridRadius; row >= -simulatorRef.current.gridRadius; row -= 1) {
    for (let col = -simulatorRef.current.gridRadius; col <= simulatorRef.current.gridRadius; col += 1) {
      const isRobot = position.x === col && position.y === row;
      const coinHere = coins.find((c) => c.x === col && c.y === row);
      cells.push(
        <div
          key={`${row}-${col}`}
          className={`relative border-4 border-white flex items-center justify-center text-3xl transition-all duration-300 rounded-lg ${
            isRobot
              ? "bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-2xl scale-110 animate-bounce"
              : "bg-gradient-to-br from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300"
          }`}
        >
          {coinHere && !isRobot && (
            <span className="absolute inset-0 flex items-center justify-center text-3xl animate-pulse drop-shadow">
              {coinHere.emoji}
            </span>
          )}
          {isRobot ? (
            <span className="relative text-4xl drop-shadow">
              🤩
              <span className="absolute -top-3 -right-3 text-xl animate-spin">⚙️</span>
            </span>
          ) : (
            ""
          )}
        </div>,
      );
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-blue-100 to-pink-100 p-6 md:p-12 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-10 left-6 text-5xl animate-bounce">🤖</div>
        <div className="absolute top-20 right-12 text-4xl animate-bounce" style={{ animationDelay: "0.5s" }}>
          🎮
        </div>
        <div className="absolute bottom-32 left-10 text-5xl animate-bounce" style={{ animationDelay: "0.9s" }}>
          🚀
        </div>
        <div className="absolute bottom-10 right-16 text-4xl animate-bounce" style={{ animationDelay: "1.3s" }}>
          ✨
        </div>
      </div>

      <style>{`
        @keyframes particle-burst {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(${(Math.random() - 0.5) * 200}px, -200px) scale(0); opacity: 0; }
        }
        .particle { animation: particle-burst 1s ease-out forwards; }
      `}</style>

      <div className="max-w-6xl mx-auto relative z-10 space-y-8">
        <div className="text-center mb-10 animate-fade-in">
          <h1 className="text-6xl md:text-7xl font-black bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent mb-4 drop-shadow-lg">
            🤖 ¡Robot Aventurero!
          </h1>
          <p className="text-xl md:text-2xl text-slate-700 font-bold">Ayuda al robot a explorar la cuadrícula</p>
          <p className="text-lg text-slate-600 mt-2">{movementLog.length} movimientos realizados 🎯</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
          <div className="space-y-6">
            <div className="rounded-3xl border-8 border-white shadow-2xl bg-gradient-to-b from-sky-200 to-sky-100 p-8 backdrop-blur">
              <div
                className="grid gap-2 aspect-square w-full mx-auto"
                style={{
                  gridTemplateColumns: `repeat(${gridDimension}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${gridDimension}, minmax(0, 1fr))`,
                }}
              >
                {cells}
              </div>

              <div className="mt-6 text-center bg-white rounded-2xl px-6 py-4 border-4 border-slate-200">
                <p className="text-sm text-slate-600 font-bold">📍 Posición del Robot</p>
                <p className="text-4xl font-black text-transparent bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text">
                  ({position.x}, {position.y})
                </p>
                <p className="text-sm text-slate-500 font-semibold mt-2 flex items-center gap-2 justify-center">
                  <span className="text-yellow-500">🪙</span> Monedas: {score}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-3xl border-8 border-white shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-2xl font-black text-slate-800">🎮 Controles</h2>
                <button
                  onClick={() => setSoundOn((prev) => !prev)}
                  className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold border-2 ${
                    soundOn ? "bg-emerald-100 text-emerald-700 border-emerald-300" : "bg-slate-100 text-slate-600 border-slate-300"
                  }`}
                >
                  <Volume2 size={18} />
                  {soundOn ? "Sonido ON" : "Sonido OFF"}
                </button>
              </div>

              <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
                {commandLabels.map(({ command, label, emoji, color }) => (
                  <button
                    key={command}
                    onClick={() => execute(command)}
                    disabled={isMoving}
                    className={`flex flex-col items-center justify-center gap-2 px-3 py-4 rounded-2xl border-4 border-white font-bold text-white shadow-xl transition-all duration-200 transform hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-br ${color}`}
                  >
                    <span className="text-4xl">{emoji}</span>
                    <span className="text-xs font-bold">{label}</span>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => execute("forward")}
                  disabled={isMoving}
                  className="flex-1 px-5 py-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-500 text-white font-black text-lg border-4 border-white shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
                >
                  <Zap size={24} />
                  Movimiento rápido
                </button>
                <button
                  onClick={reset}
                  className="flex-1 px-5 py-4 rounded-2xl bg-gradient-to-r from-red-400 to-red-600 text-white font-black text-lg border-4 border-white shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
                >
                  <RotateCcw size={24} />
                  Reiniciar
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border-8 border-white shadow-2xl bg-gradient-to-b from-yellow-50 to-orange-50 p-6 flex flex-col h-fit sticky top-6">
            <h2 className="text-2xl font-black text-slate-800 mb-4 text-center">📋 Historial</h2>

            {movementLog.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <span className="text-5xl mb-3">👇</span>
                <p className="text-xs text-slate-600 font-bold">¡Presiona los botones para mover al robot!</p>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl px-4 py-3 mb-4 border-4 border-yellow-200 text-center">
                  <p className="text-xs text-slate-600 font-bold">Total de movimientos</p>
                  <p className="text-3xl font-black text-yellow-600">{movementLog.length}</p>
                </div>

                <ul className="space-y-2 flex-1 overflow-y-auto pr-2">
                  {[...movementLog].reverse().map((entry, idx) => {
                    const emojis: { [key in RobotCommand]: string } = {
                      forward: "⬆️",
                      back: "⬇️",
                      left: "⬅️",
                      right: "➡️",
                    };
                    return (
                      <li
                        key={entry.id}
                        className="flex items-center gap-3 bg-white rounded-xl px-3 py-2 border-3 border-yellow-200 shadow-md hover:shadow-lg transition-all"
                      >
                        <span className="text-xl font-bold">{emojis[entry.command]}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-700 capitalize">
                            {entry.command === "forward" && "Adelante"}
                            {entry.command === "back" && "Atrás"}
                            {entry.command === "left" && "Izquierda"}
                            {entry.command === "right" && "Derecha"}
                          </p>
                          <p className="text-xs text-slate-500">
                            ({entry.state.x}, {entry.state.y})
                          </p>
                        </div>
                        <span className="text-xs font-bold text-yellow-600">#{movementLog.length - idx}</span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        </div>

        {particles.map((p) => (
          <div
            key={p.id}
            className="particle fixed text-4xl pointer-events-none"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
            }}
          >
            {p.emoji}
          </div>
        ))}

        {celebration && (
          <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
            <div className="text-center">
              <Star className="absolute animate-spin text-yellow-400" size={80} style={{ left: "45%", top: "45%" }} />
              <div className="text-7xl animate-bounce">🎉</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
