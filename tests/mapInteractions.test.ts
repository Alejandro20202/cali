import { startRegionDrag, updateRegionDrag, toggleRegionSelection } from "../src/features/map/interactions";

describe("Funciones de interacción del mapa", () => {
  test("startRegionDrag y updateRegionDrag respetan el snap", () => {
    const session = startRegionDrag({ id: "andina", position: { x: 0, y: 0 } }, { x: 0, y: 0 }, 0.5);
    const updated = updateRegionDrag(session, { x: 0.7, y: 1.2 });
    expect(updated).toEqual({ x: 0.5, y: 1 });
  });

  test("toggleRegionSelection alterna la selección", () => {
    const selected = toggleRegionSelection(null, "caribe");
    expect(selected).toBe("caribe");
    const deselected = toggleRegionSelection(selected, "caribe");
    expect(deselected).toBeNull();
    const newSelection = toggleRegionSelection(deselected, "andina");
    expect(newSelection).toBe("andina");
  });
});
