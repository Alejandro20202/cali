export type RobotCommand = "forward" | "back" | "left" | "right";

export interface RobotState {
  x: number;
  y: number;
}

type Listener = (state: RobotState, command: RobotCommand) => void;

/**
 * Simple logical robot that moves on a square grid and keeps track of
 * every command executed. Pure logic makes it friendly for Jest tests.
 */
export class RobotSimulator {
  private readonly listeners = new Set<Listener>();
  private state: RobotState = { x: 0, y: 0 };
  private readonly history: { command: RobotCommand; state: RobotState }[] = [];

  constructor(private readonly limit: number = 4) {}

  get gridRadius() {
    return this.limit;
  }

  getPosition(): RobotState {
    return { ...this.state };
  }

  getMovementLog() {
    return this.history.map((entry, index) => ({
      id: `${index}-${entry.command}`,
      command: entry.command,
      state: entry.state,
    }));
  }

  onChange(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  forward() {
    return this.move(0, 1, "forward");
  }

  back() {
    return this.move(0, -1, "back");
  }

  left() {
    return this.move(-1, 0, "left");
  }

  right() {
    return this.move(1, 0, "right");
  }

  private move(deltaX: number, deltaY: number, command: RobotCommand) {
    const nextState = {
      x: this.clamp(this.state.x + deltaX),
      y: this.clamp(this.state.y + deltaY),
    };
    this.state = nextState;
    this.history.push({ command, state: { ...nextState } });
    for (const listener of this.listeners) {
      listener(this.getPosition(), command);
    }
    return this.getPosition();
  }

  private clamp(value: number) {
    return Math.min(this.limit, Math.max(-this.limit, value));
  }
}
