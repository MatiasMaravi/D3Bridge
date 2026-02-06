import type { Render } from "@anywidget/types";
import * as d3 from "d3";
import "./swatches.css";
// Definimos las paletas fuera para no recrearlas en cada render
const PALETTES = [
  { name: "Observable10", scheme: d3.schemeObservable10 },
  { name: "Category10", scheme: d3.schemeCategory10 },
  { name: "Accent", scheme: d3.schemeAccent },
  { name: "Dark2", scheme: d3.schemeDark2 },
  { name: "Paired", scheme: d3.schemePaired },
  { name: "Pastel1", scheme: d3.schemePastel1 },
  { name: "Pastel2", scheme: d3.schemePastel2 },
  { name: "Set1", scheme: d3.schemeSet1 },
  { name: "Set2", scheme: d3.schemeSet2 },
  { name: "Set3", scheme: d3.schemeSet3 },
  { name: "Tableau10", scheme: d3.schemeTableau10 },
];

export const render: Render = ({ model, el }) => {
  // 1. Configuración del contenedor principal
  el.classList.add("vp-swatches-container");

  // 2. Etiqueta principal (Leemos del modelo de Python)
  const lab = document.createElement("label");
  lab.textContent = "Selecciona una paleta de colores:";
  lab.classList.add("vp-swatches-label");
  el.appendChild(lab);

  // 3. Contenedor Grid
  const grid = document.createElement("div");
  grid.classList.add("vp-swatches-grid");

  // Variable para rastrear la fila seleccionada visualmente
  let selectedRow: HTMLDivElement | null = null;

  // Función para actualizar la UI y el Modelo
  const selectPalette = (row: HTMLDivElement, name: string, colors: readonly string[]) => {
    // a. Quitar clase de selección del elemento previo
    if (selectedRow) {
      selectedRow.classList.remove("vp-swatches-row--selected");
    }

    // b. Agregar clase de selección al nuevo elemento
    selectedRow = row;
    selectedRow.classList.add("vp-swatches-row--selected");

    // c. GUARDAR EN PYTHON
    // Guardamos tanto el nombre como la lista de colores para consistencia
    model.set("palette_name", name);
    model.set("value", [...colors]); // Convertimos a array mutable por seguridad
    model.save_changes();
  };

  // 4. Generar las tarjetas
  PALETTES.forEach((palette) => {
    const colors = palette.scheme;
    const n = colors.length;
    
    // Cálculo de contraste
    let isDark = false;
    try {
      isDark = d3.lab(colors[0]).l < 50;
    } catch (e) { console.warn("Color error", e); }

    const row = document.createElement("div");
    row.classList.add("vp-swatches-row");

    // SVG
    const svg = d3.create("svg")
      .attr("viewBox", [0, 0, n, 1])
      .attr("preserveAspectRatio", "none")
      .attr("class", "vp-swatches-svg");

    svg.selectAll("rect")
      .data(colors as string[]) // Assert string array
      .join("rect")
      .attr("x", (_d, i) => i)
      .attr("width", 1)
      .attr("height", 1)
      .attr("fill", (d) => d);

    row.appendChild(svg.node()!);

    // Etiqueta Nombre
    const nameLabel = document.createElement("div");
    nameLabel.textContent = palette.name;
    nameLabel.classList.add("vp-swatches-name");
    nameLabel.classList.add(isDark ? "vp-swatches-name--dark" : "vp-swatches-name--light");

    row.appendChild(nameLabel);

    // Click Event
    row.addEventListener("click", () => {
      selectPalette(row, palette.name, colors);
    });

    grid.appendChild(row);

    // 5. Verificar selección inicial basada en el modelo de Python
    const currentName = model.get("palette_name");
    if (currentName === palette.name) {
       // Usamos setTimeout para asegurar que el DOM esté listo o simplemente llamamos directo
       // Nota: No llamamos a save_changes() aquí para evitar bucles al cargar
       selectPalette(row, palette.name, colors);
    }
  });

  el.appendChild(grid);

  // Fallback: Si no hay nada seleccionado en Python, seleccionar el primero
  if (!model.get("palette_name") && PALETTES.length > 0) {
     const first = PALETTES[0];
     // Simulamos click en el primer elemento del grid
     const firstRow = grid.children[0] as HTMLDivElement;
     selectPalette(firstRow, first.name, first.scheme);
  }

  // 6. Escuchar cambios desde Python (sincronización bidireccional)
  model.on("change:palette_name", () => {
    const newPaletteName = model.get("palette_name");
    
    // Buscar la paleta correspondiente y actualizar la UI
    PALETTES.forEach((palette, index) => {
      if (palette.name === newPaletteName) {
        const row = grid.children[index] as HTMLDivElement;
        
        // Solo actualizar UI si es diferente a la selección actual
        if (selectedRow !== row) {
          // Quitar selección anterior
          if (selectedRow) {
            selectedRow.classList.remove("vp-swatches-row--selected");
          }
          
          // Agregar selección nueva
          selectedRow = row;
          selectedRow.classList.add("vp-swatches-row--selected");
        }
      }
    });
  });
};