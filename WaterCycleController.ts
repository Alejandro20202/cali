export interface WaterCycleState {
  progress: number;
  phase: "evaporation" | "condensation" | "precipitation";
}

export class WaterCycleController {
  private state: WaterCycleState = { progress: 0, phase: "evaporation" };

  startCycle() {
    this.state = { progress: 0, phase: "evaporation" };
  }

  advancePhase() {
    const order: WaterCycleState["phase"][] = ["evaporation", "condensation", "precipitation"];
    const currentIndex = order.indexOf(this.state.phase);
    const nextPhase = order[(currentIndex + 1) % order.length];
    this.state = { phase: nextPhase, progress: 0 };
  }

  getState() {
    return { ...this.state };
  }
}
