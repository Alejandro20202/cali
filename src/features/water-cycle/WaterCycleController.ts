export type WaterCyclePhase = "evaporation" | "condensation" | "precipitation";

export interface PhaseConfig {
  name: WaterCyclePhase;
  duration: number;
  onUpdate: (progress: number) => void;
}

/**
 * Coordinates the cyclic animation of the water cycle.
 * It keeps track of the current phase, normalizes time deltas and
 * notifies listeners whenever the phase changes.
 */
export class WaterCycleController {
  private readonly phases: PhaseConfig[];
  private readonly listeners = new Set<(phase: WaterCyclePhase) => void>();
  private phaseIndex = 0;
  private elapsed = 0;

  constructor(phases: PhaseConfig[]) {
    if (!phases.length) {
      throw new Error("WaterCycleController requires at least one phase");
    }
    this.phases = phases;
  }

  get currentPhase(): WaterCyclePhase {
    return this.phases[this.phaseIndex].name;
  }

  onPhaseChange(listener: (phase: WaterCyclePhase) => void): () => void {
    this.listeners.add(listener);
    listener(this.currentPhase);
    return () => this.listeners.delete(listener);
  }

  setPhase(phase: WaterCyclePhase) {
    const targetIndex = this.phases.findIndex((p) => p.name === phase);
    if (targetIndex === -1) {
      throw new Error(`Unknown water cycle phase: ${phase}`);
    }
    if (targetIndex === this.phaseIndex) return;
    this.phaseIndex = targetIndex;
    this.elapsed = 0;
    this.emit();
  }

  update(deltaSeconds: number): WaterCyclePhase {
    if (deltaSeconds <= 0) {
      return this.currentPhase;
    }

    const phase = this.phases[this.phaseIndex];
    this.elapsed += deltaSeconds;
    const progress = Math.min(this.elapsed / phase.duration, 1);
    phase.onUpdate(progress);

    if (progress >= 1) {
      this.advancePhase();
    }

    return phase.name;
  }

  private advancePhase() {
    this.elapsed = 0;
    this.phaseIndex = (this.phaseIndex + 1) % this.phases.length;
    this.emit();
  }

  private emit() {
    for (const listener of this.listeners) {
      listener(this.currentPhase);
    }
  }
}
