import pathlib
import anywidget
import traitlets
import urllib3
from traitlets import Unicode, Any

class ObservableInputWidget(anywidget.AnyWidget):
    """Widget para crear inputs interactivos usando Observable Inputs.

    Esta clase permite usar componentes de @observablehq/inputs como
    radio buttons, selects, checkboxes, sliders, etc. directamente en
    Jupyter notebooks.

    Attributes:
        value (Any): Valor actual seleccionado en el input.
        elementId (Unicode): Identificador opcional del elemento DOM.
    """
    value = Any(allow_none=True).tag(sync=True)
    elementId = Unicode().tag(sync=True)

    @staticmethod
    def createRadio(options: list, 
                    value: str = None, 
                    label: str = "", 
                    d3_version: str = "7",
                    inputs_version: str = "0.10"):
        """Crea un widget de radio buttons estilo Observable.

        Args:
            options (list): Lista de tuplas (label, value) o lista de strings.
            value (str, optional): Valor inicial seleccionado.
            label (str, optional): Etiqueta del grupo de radio buttons.
            d3_version (str, optional): Versión de d3. Por defecto "7".
            inputs_version (str, optional): Versión de @observablehq/inputs. Por defecto "0.10".

        Returns:
            str: Código fuente del módulo JS.
        """
        return ObservableInputWidget._createInputWidget(
            input_type="radio",
            options=options,
            value=value,
            label=label,
            d3_version=d3_version,
            inputs_version=inputs_version
        )

    @staticmethod
    def createSelect(options: list, 
                     value: str = None, 
                     label: str = "",
                     multiple: bool = False,
                     d3_version: str = "7",
                     inputs_version: str = "0.10"):
        """Crea un widget de select/dropdown estilo Observable.

        Args:
            options (list): Lista de tuplas (label, value) o lista de strings.
            value (str, optional): Valor inicial seleccionado.
            label (str, optional): Etiqueta del select.
            multiple (bool, optional): Permitir selección múltiple. Por defecto False.
            d3_version (str, optional): Versión de d3. Por defecto "7".
            inputs_version (str, optional): Versión de @observablehq/inputs. Por defecto "0.10".

        Returns:
            str: Código fuente del módulo JS.
        """
        return ObservableInputWidget._createInputWidget(
            input_type="select",
            options=options,
            value=value,
            label=label,
            multiple=multiple,
            d3_version=d3_version,
            inputs_version=inputs_version
        )

    @staticmethod
    def createCheckbox(options: list, 
                       value: list = None, 
                       label: str = "",
                       d3_version: str = "7",
                       inputs_version: str = "0.10"):
        """Crea un widget de checkboxes estilo Observable.

        Args:
            options (list): Lista de tuplas (label, value) o lista de strings.
            value (list, optional): Valores iniciales seleccionados.
            label (str, optional): Etiqueta del grupo.
            d3_version (str, optional): Versión de d3. Por defecto "7".
            inputs_version (str, optional): Versión de @observablehq/inputs. Por defecto "0.10".

        Returns:
            str: Código fuente del módulo JS.
        """
        return ObservableInputWidget._createInputWidget(
            input_type="checkbox",
            options=options,
            value=value,
            label=label,
            d3_version=d3_version,
            inputs_version=inputs_version
        )

    @staticmethod
    def createRange(min_val: float = 0, 
                    max_val: float = 100, 
                    step: float = 1,
                    value: float = None, 
                    label: str = "",
                    d3_version: str = "7",
                    inputs_version: str = "0.10"):
        """Crea un widget de slider/range estilo Observable.

        Args:
            min_val (float, optional): Valor mínimo. Por defecto 0.
            max_val (float, optional): Valor máximo. Por defecto 100.
            step (float, optional): Incremento. Por defecto 1.
            value (float, optional): Valor inicial.
            label (str, optional): Etiqueta del slider.
            d3_version (str, optional): Versión de d3. Por defecto "7".
            inputs_version (str, optional): Versión de @observablehq/inputs. Por defecto "0.10".

        Returns:
            str: Código fuente del módulo JS.
        """
        return ObservableInputWidget._createInputWidget(
            input_type="range",
            min_val=min_val,
            max_val=max_val,
            step=step,
            value=value,
            label=label,
            d3_version=d3_version,
            inputs_version=inputs_version
        )

    @staticmethod
    def _createInputWidget(input_type: str,
                           options: list = None,
                           value=None,
                           label: str = "",
                           multiple: bool = False,
                           min_val: float = 0,
                           max_val: float = 100,
                           step: float = 1,
                           d3_version: str = "7",
                           inputs_version: str = "0.10"):
        """Construye el módulo JS del widget de input.

        Args:
            input_type (str): Tipo de input (radio, select, checkbox, range).
            options (list, optional): Opciones para inputs basados en opciones.
            value: Valor inicial.
            label (str, optional): Etiqueta del input.
            multiple (bool, optional): Para select múltiple.
            min_val (float, optional): Mínimo para range.
            max_val (float, optional): Máximo para range.
            step (float, optional): Step para range.
            d3_version (str, optional): Versión de d3.
            inputs_version (str, optional): Versión de @observablehq/inputs.

        Returns:
            str: Código fuente del módulo JS generado.
        """
        d3_import = f'import * as d3 from "https://esm.sh/d3@{d3_version}";'
        inputs_import = f'import * as Inputs from "https://esm.sh/@observablehq/inputs@{inputs_version}";'
        
        # Construir las opciones según el tipo
        if input_type in ["radio", "select", "checkbox"] and options:
            # Convertir opciones a Map de JS
            options_js = "new Map(["
            for opt in options:
                if isinstance(opt, tuple) and len(opt) == 2:
                    options_js += f'["{opt[0]}", "{opt[1]}"], '
                else:
                    options_js += f'["{opt}", "{opt}"], '
            options_js = options_js.rstrip(", ") + "])"
        else:
            options_js = "[]"

        # Valor por defecto
        if value is None:
            if input_type == "range":
                value_js = str(min_val)
            elif options and len(options) > 0:
                first_opt = options[0]
                if isinstance(first_opt, tuple):
                    value_js = f'"{first_opt[1]}"'
                else:
                    value_js = f'"{first_opt}"'
            else:
                value_js = "null"
        elif isinstance(value, str):
            value_js = f'"{value}"'
        elif isinstance(value, list):
            value_js = str(value)
        else:
            value_js = str(value)

        # Generar código según el tipo de input
        if input_type == "radio":
            input_creation = f'''
            const input = Inputs.radio({options_js}, {{
                value: {value_js},
                label: "{label}"
            }});
            '''
        elif input_type == "select":
            multiple_str = "true" if multiple else "false"
            input_creation = f'''
            const input = Inputs.select({options_js}, {{
                value: {value_js},
                label: "{label}",
                multiple: {multiple_str}
            }});
            '''
        elif input_type == "checkbox":
            input_creation = f'''
            const input = Inputs.checkbox({options_js}, {{
                value: {value_js},
                label: "{label}"
            }});
            '''
        elif input_type == "range":
            input_creation = f'''
            const input = Inputs.range([{min_val}, {max_val}], {{
                value: {value_js},
                step: {step},
                label: "{label}"
            }});
            '''
        else:
            input_creation = "const input = document.createElement('div');"

        jsStr = """
{d3_import}
{inputs_import}

function render({{ model, el }}) {{
    // Estilos del contenedor
    el.style.padding = "10px";
    el.style.fontFamily = "system-ui, -apple-system, sans-serif";

    function createInput() {{
        el.innerHTML = "";
        
        {input_creation}
        
        el.appendChild(input);
        
        // Sincronizar valor inicial con el modelo
        const initialValue = input.value;
        if (initialValue !== undefined) {{
            model.set("value", initialValue);
            model.save_changes();
        }}
        
        // Escuchar cambios en el input
        input.addEventListener("input", (event) => {{
            const newValue = input.value;
            model.set("value", newValue);
            model.save_changes();
        }});
        
        // Escuchar cambios desde Python
        model.on("change:value", () => {{
            const modelValue = model.get("value");
            if (input.value !== modelValue) {{
                input.value = modelValue;
            }}
        }});
    }}
    
    createInput();
}}

export default {{ render }};
        """.format(
            d3_import=d3_import,
            inputs_import=inputs_import,
            input_creation=input_creation
        )

        return jsStr


class RadioInput(ObservableInputWidget):
    """Widget de radio buttons usando Observable Inputs."""
    
    def __init__(self, options: list, value: str = None, label: str = "", **kwargs):
        """
        Args:
            options (list): Lista de tuplas (label, value) o strings.
            value (str, optional): Valor inicial.
            label (str, optional): Etiqueta del grupo.
        """
        self._esm = ObservableInputWidget.createRadio(options, value, label)
        super().__init__(**kwargs)
        if value:
            self.value = value


class SelectInput(ObservableInputWidget):
    """Widget de select/dropdown usando Observable Inputs."""
    
    def __init__(self, options: list, value: str = None, label: str = "", multiple: bool = False, **kwargs):
        """
        Args:
            options (list): Lista de tuplas (label, value) o strings.
            value (str, optional): Valor inicial.
            label (str, optional): Etiqueta del select.
            multiple (bool, optional): Selección múltiple.
        """
        self._esm = ObservableInputWidget.createSelect(options, value, label, multiple)
        super().__init__(**kwargs)
        if value:
            self.value = value


class CheckboxInput(ObservableInputWidget):
    """Widget de checkboxes usando Observable Inputs."""
    
    def __init__(self, options: list, value: list = None, label: str = "", **kwargs):
        """
        Args:
            options (list): Lista de tuplas (label, value) o strings.
            value (list, optional): Valores iniciales seleccionados.
            label (str, optional): Etiqueta del grupo.
        """
        self._esm = ObservableInputWidget.createCheckbox(options, value, label)
        super().__init__(**kwargs)
        if value:
            self.value = value


class RangeInput(ObservableInputWidget):
    """Widget de slider/range usando Observable Inputs."""
    
    def __init__(self, min_val: float = 0, max_val: float = 100, step: float = 1, 
                 value: float = None, label: str = "", **kwargs):
        """
        Args:
            min_val (float, optional): Valor mínimo.
            max_val (float, optional): Valor máximo.
            step (float, optional): Incremento.
            value (float, optional): Valor inicial.
            label (str, optional): Etiqueta del slider.
        """
        self._esm = ObservableInputWidget.createRange(min_val, max_val, step, value, label)
        super().__init__(**kwargs)
        if value is not None:
            self.value = value
#Esta clase no depende de "ObservableInputWidget",
# Esto es así porque "Swatches" no es un input genérico en Observable Inputs,
class SwatchesInput(anywidget.AnyWidget):
    """
    Widget de selección de paletas de colores D3.
    Muestra todas las paletas disponibles y permite seleccionar una.
    El valor es la lista completa de colores de la paleta seleccionada.
    
    Paletas disponibles:
    - Observable10, Category10, Accent, Dark2, Paired
    - Pastel1, Pastel2, Set1, Set2, Set3, Tableau10
    """
    _esm = pathlib.Path(__file__).parent / "static" / "widgets" / "swatches.js"
    _css = pathlib.Path(__file__).parent / "static" / "widgets" / "swatches.css"
    #Lista de paleta de colores
    value = traitlets.List(allow_none=True).tag(sync=True)

    # Guardamos el NOMBRE para saber cual resaltar en la UI
    palette_name = traitlets.Unicode(allow_none=True).tag(sync=True)
