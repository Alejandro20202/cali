export interface Vector2 {
  x: number;
  y: number;
}

export interface RegionState {
  id: string;
  position: Vector2;
}

export interface DragSession {
  regionId: string;
  startPointer: Vector2;
  startPosition: Vector2;
  snapStep?: number;
}

export function startRegionDrag(region: RegionState, pointer: Vector2, snapStep = 0): DragSession {
  return {
    regionId: region.id,
    startPointer: { ...pointer },
    startPosition: { ...region.position },
    snapStep,
  };
}

export function updateRegionDrag(session: DragSession, pointer: Vector2): Vector2 {
  const delta = {
    x: pointer.x - session.startPointer.x,
    y: pointer.y - session.startPointer.y,
  };
  let nextPosition = {
    x: session.startPosition.x + delta.x,
    y: session.startPosition.y + delta.y,
  };

  if (session.snapStep && session.snapStep > 0) {
    nextPosition = {
      x: Math.round(nextPosition.x / session.snapStep) * session.snapStep,
      y: Math.round(nextPosition.y / session.snapStep) * session.snapStep,
    };
  }

  return nextPosition;
}

export function toggleRegionSelection(currentSelection: string | null, targetRegionId: string): string | null {
  return currentSelection === targetRegionId ? null : targetRegionId;
}
