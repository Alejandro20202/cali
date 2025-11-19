import { render, screen } from "@testing-library/react";
import App from "./App";

test("muestra la interfaz infantil con las opciones disponibles", () => {
  render(<App />);
  expect(screen.getByText(/Elige una aventura/i)).toBeInTheDocument();
  expect(screen.getByText("Ciclo del Agua 3D")).toBeInTheDocument();
  expect(screen.getByText("Simulador Robot 3D")).toBeInTheDocument();
});
