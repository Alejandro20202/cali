import { useMemo, useRef, useState } from "react";
import { RobotSimulator, type RobotCommand } from "../features/robotics/RobotSimulator";

const commandLabels: { command: RobotCommand; label: string }[] = [
  { command: "forward", label: "Avanzar" },
  { command: "back", label: "Retroceder" },
  { command: "left", label: "Izquierda" },
  { command: "right", label: "Derecha" },
];

export default function RobotSimulatorView() {
  const simulatorRef = useRef(new RobotSimulator(4));
  const [position, setPosition] = useState(simulatorRef.current.getPosition());
  const [movementLog, setMovementLog] = useState(simulatorRef.current.getMovementLog());

  const gridDimension = useMemo(() => simulatorRef.current.gridRadius * 2 + 1, []);

  const execute = (command: RobotCommand) => {
    const instance = simulatorRef.current;
    const newState = instance[command]();
    setPosition(newState);
    setMovementLog(instance.getMovementLog());
  };

  const reset = () => {
    simulatorRef.current = new RobotSimulator(simulatorRef.current.gridRadius);
    setPosition(simulatorRef.current.getPosition());
    setMovementLog([]);
  };

  const cells = [];
  for (let row = simulatorRef.current.gridRadius; row >= -simulatorRef.current.gridRadius; row -= 1) {
    for (let col = -simulatorRef.current.gridRadius; col <= simulatorRef.current.gridRadius; col += 1) {
      const isRobot = position.x === col && position.y === row;
      cells.push(
        <div
          key={`${row}-${col}`}
          className={`border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs transition-colors ${
            isRobot ? "bg-emerald-500 text-white font-semibold shadow-inner" : "bg-white dark:bg-slate-800 text-slate-500"
          }`}
        >
          {isRobot ? "🤖" : ""}
        </div>,
      );
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Simulación de Robots</h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Usa comandos básicos para mover un robot virtual en una cuadrícula. El diseño usa CSS Grid para mantener la
          experiencia estable en pantallas pequeñas.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex flex-wrap gap-2">
            {commandLabels.map(({ command, label }) => (
              <button
                key={command}
                className="flex-1 min-w-[120px] px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-sm font-medium shadow hover:opacity-90 transition"
                onClick={() => execute(command)}
              >
                {label}
              </button>
            ))}
            <button
              className="w-full md:w-auto px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              onClick={reset}
            >
              Reiniciar
            </button>
          </div>

          <div
            className="grid aspect-square sm:aspect-[4/3] w-full max-w-full mx-auto rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-950"
            style={{
              gridTemplateColumns: `repeat(${gridDimension}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${gridDimension}, minmax(0, 1fr))`,
            }}
          >
            {cells}
          </div>

          <div className="text-center text-sm text-slate-500 dark:text-slate-400">
            Posición actual:{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              ({position.x}, {position.y})
            </span>
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 space-y-3">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Panel de movimientos</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Cada comando queda registrado para analizar patrones.</p>

          {movementLog.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 italic">Sin movimientos aún.</p>
          ) : (
            <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {movementLog.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-200"
                >
                  <span className="font-medium capitalize">{entry.command}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    ({entry.state.x}, {entry.state.y})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </section>
  );
}
