import { RobotSimulator } from "../src/features/robotics/RobotSimulator";

describe("RobotSimulator", () => {
  test("ejecuta comandos básicos y respeta límites", () => {
    const simulator = new RobotSimulator(1);
    expect(simulator.getPosition()).toEqual({ x: 0, y: 0 });
    simulator.forward();
    simulator.forward();
    expect(simulator.getPosition()).toEqual({ x: 0, y: 1 });
    simulator.right();
    expect(simulator.getPosition()).toEqual({ x: 1, y: 1 });
    simulator.right(); // excedería límite
    expect(simulator.getPosition()).toEqual({ x: 1, y: 1 });
    simulator.back();
    expect(simulator.getPosition()).toEqual({ x: 1, y: 0 });
  });

  test("registra historial de movimientos", () => {
    const simulator = new RobotSimulator(2);
    simulator.forward();
    simulator.left();
    const log = simulator.getMovementLog();
    expect(log).toHaveLength(2);
    expect(log[0]).toMatchObject({ command: "forward", state: { x: 0, y: 1 } });
    expect(log[1]).toMatchObject({ command: "left", state: { x: -1, y: 1 } });
  });
});
