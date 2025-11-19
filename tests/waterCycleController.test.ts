import { WaterCycleController, type PhaseConfig } from "../src/features/water-cycle/WaterCycleController";

const createPhases = () => {
  const log: string[] = [];
  const phases: PhaseConfig[] = [
    { name: "evaporation", duration: 1, onUpdate: (progress) => log.push(`evap:${progress.toFixed(2)}`) },
    { name: "condensation", duration: 1, onUpdate: (progress) => log.push(`cond:${progress.toFixed(2)}`) },
    { name: "precipitation", duration: 1, onUpdate: (progress) => log.push(`prec:${progress.toFixed(2)}`) },
  ];
  return { log, phases };
};

describe("WaterCycleController", () => {
  test("avanza fases de manera secuencial", () => {
    const { log, phases } = createPhases();
    const controller = new WaterCycleController(phases);
    const phaseHistory: string[] = [];
    controller.onPhaseChange((phase) => phaseHistory.push(phase));

    controller.update(0.5);
    controller.update(0.5); // cambiar a condensación
    controller.update(1); // condensación completa
    controller.update(1); // precipitación completa

    expect(phaseHistory).toEqual(["evaporation", "condensation", "precipitation", "evaporation"]);
    expect(log).toContain("evap:1.00");
    expect(log).toContain("cond:1.00");
    expect(log).toContain("prec:1.00");
  });

  test("setPhase permite saltar entre transiciones", () => {
    const { phases } = createPhases();
    const controller = new WaterCycleController(phases);
    controller.update(1);
    controller.setPhase("precipitation");
    expect(controller.currentPhase).toBe("precipitation");
    controller.update(1);
    expect(controller.currentPhase).toBe("evaporation");
  });

  test("onPhaseChange ejecuta mocks y se puede desuscribir", () => {
    const { phases } = createPhases();
    const controller = new WaterCycleController(phases);
    const listener = jest.fn();
    const unsubscribe = controller.onPhaseChange(listener);
    controller.update(1);
    unsubscribe();
    controller.update(1);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
