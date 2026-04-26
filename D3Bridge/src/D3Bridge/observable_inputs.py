import pathlib
import anywidget
import traitlets
import urllib3
from traitlets import Unicode, Any

class ObservableInputWidget(anywidget.AnyWidget):
    """Widget for creating interactive inputs using Observable Inputs.

    This class allows using components from @observablehq/inputs like
    radio buttons, selects, checkboxes, sliders, etc. directly in
    Jupyter notebooks.

    Attributes:
        value (Any): Current selected value in the input.
        elementId (Unicode): Optional DOM element identifier.
    """
    value = Any(allow_none=True).tag(sync=True)
    elementId = Unicode().tag(sync=True)

    @staticmethod
    def createRadio(options: list, 
                    value: str = None, 
                    label: str = "", 
                    d3_version: str = "7",
                    inputs_version: str = "0.10"):
        """Creates an Observable-style radio buttons widget.

        Args:
            options (list): List of tuples (label, value) or list of strings.
            value (str, optional): Initial selected value.
            label (str, optional): Label for the radio buttons group.
            d3_version (str, optional): D3 version. Defaults to "7".
            inputs_version (str, optional): @observablehq/inputs version. Defaults to "0.10".

        Returns:
            str: Source code of the JS module.
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
        """Creates an Observable-style select/dropdown widget.

        Args:
            options (list): List of tuples (label, value) or list of strings.
            value (str, optional): Initial selected value.
            label (str, optional): Label for the select.
            multiple (bool, optional): Allow multiple selection. Defaults to False.
            d3_version (str, optional): D3 version. Defaults to "7".
            inputs_version (str, optional): @observablehq/inputs version. Defaults to "0.10".

        Returns:
            str: Source code of the JS module.
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
        """Creates an Observable-style checkboxes widget.

        Args:
            options (list): List of tuples (label, value) or list of strings.
            value (list, optional): Initial selected values.
            label (str, optional): Group label.
            d3_version (str, optional): D3 version. Defaults to "7".
            inputs_version (str, optional): @observablehq/inputs version. Defaults to "0.10".

        Returns:
            str: Source code of the JS module.
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
        """Creates an Observable-style slider/range widget.

        Args:
            min_val (float, optional): Minimum value. Defaults to 0.
            max_val (float, optional): Maximum value. Defaults to 100.
            step (float, optional): Increment step. Defaults to 1.
            value (float, optional): Initial value.
            label (str, optional): Slider label.
            d3_version (str, optional): D3 version. Defaults to "7".
            inputs_version (str, optional): @observablehq/inputs version. Defaults to "0.10".

        Returns:
            str: Source code of the JS module.
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
        """Builds the JS module for the input widget.

        Args:
            input_type (str): Type of input (radio, select, checkbox, range).
            options (list, optional): Options for choice-based inputs.
            value: Initial value.
            label (str, optional): Input label.
            multiple (bool, optional): Allow multiple selection for select.
            min_val (float, optional): Minimum value for range.
            max_val (float, optional): Maximum value for range.
            step (float, optional): Step configuration for range.
            d3_version (str, optional): D3 version.
            inputs_version (str, optional): @observablehq/inputs version.

        Returns:
            str: Source code of the generated JS module.
        """
        d3_import = f'import * as d3 from "https://esm.sh/d3@{d3_version}";'
        inputs_import = f'import * as Inputs from "https://esm.sh/@observablehq/inputs@{inputs_version}";'
        
        # Build options according to type
        if input_type in ["radio", "select", "checkbox"] and options:
            # Convert options to JS Map
            options_js = "new Map(["
            for opt in options:
                if isinstance(opt, tuple) and len(opt) == 2:
                    options_js += f'["{opt[0]}", "{opt[1]}"], '
                else:
                    options_js += f'["{opt}", "{opt}"], '
            options_js = options_js.rstrip(", ") + "])"
        else:
            options_js = "[]"

        # Default value
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

        # Generate code according to input type
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
    // Container styles
    el.style.padding = "10px";
    el.style.fontFamily = "system-ui, -apple-system, sans-serif";
    el.style.color = "#333";

    function createInput() {{
        el.innerHTML = "";
        
        {input_creation}
        
        el.appendChild(input);
        
        // Sync initial value with the model
        const initialValue = input.value;
        if (initialValue !== undefined) {{
            model.set("value", initialValue);
            model.save_changes();
        }}
        
        // Listen to input changes
        input.addEventListener("input", (event) => {{
            const newValue = input.value;
            model.set("value", newValue);
            model.save_changes();
        }});
        
        // Listen to changes from Python
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
    """Radio buttons widget using Observable Inputs."""
    
    def __init__(self, options: list, value: str = None, label: str = "", **kwargs):
        """
        Args:
            options (list): List of tuples (label, value) or strings.
            value (str, optional): Initial value.
            label (str, optional): Group label.
        """
        self._esm = ObservableInputWidget.createRadio(options, value, label)
        super().__init__(**kwargs)
        if value:
            self.value = value


class SelectInput(ObservableInputWidget):
    """Select/dropdown widget using Observable Inputs."""
    
    def __init__(self, options: list, value: str = None, label: str = "", multiple: bool = False, **kwargs):
        """
        Args:
            options (list): List of tuples (label, value) or strings.
            value (str, optional): Initial value.
            label (str, optional): Select label.
            multiple (bool, optional): Multiple selection flag.
        """
        self._esm = ObservableInputWidget.createSelect(options, value, label, multiple)
        super().__init__(**kwargs)
        if value:
            self.value = value


class CheckboxInput(ObservableInputWidget):
    """Checkboxes widget using Observable Inputs."""
    
    def __init__(self, options: list, value: list = None, label: str = "", **kwargs):
        """
        Args:
            options (list): List of tuples (label, value) or strings.
            value (list, optional): Initial selected values.
            label (str, optional): Group label.
        """
        self._esm = ObservableInputWidget.createCheckbox(options, value, label)
        super().__init__(**kwargs)
        if value:
            self.value = value


class RangeInput(ObservableInputWidget):
    """Slider/range widget using Observable Inputs."""
    
    def __init__(self, min_val: float = 0, max_val: float = 100, step: float = 1, 
                 value: float = None, label: str = "", **kwargs):
        """
        Args:
            min_val (float, optional): Minimum value.
            max_val (float, optional): Maximum value.
            step (float, optional): Increment step.
            value (float, optional): Initial value.
            label (str, optional): Slider label.
        """
        self._esm = ObservableInputWidget.createRange(min_val, max_val, step, value, label)
        super().__init__(**kwargs)
        if value is not None:
            self.value = value

# This works like this because "Swatches" is not a generic input in Observable Inputs,
class SwatchesInput(anywidget.AnyWidget):
    """
    D3 Color Palettes selection widget.
    Displays all available palettes and allows selecting one.
    The value is the complete list of colors from the selected palette.
    
    Available palettes:
    - Observable10, Category10, Accent, Dark2, Paired
    - Pastel1, Pastel2, Set1, Set2, Set3, Tableau10
    """
    _esm = pathlib.Path(__file__).parent / "static" / "widgets" / "swatches.js"
    _css = pathlib.Path(__file__).parent / "static" / "widgets" / "swatches.css"
    # Color palette list
    value = traitlets.List(allow_none=True).tag(sync=True)

    # We store the NAME to know which one to highlight in the UI
    palette_name = traitlets.Unicode(allow_none=True).tag(sync=True)
    
    def on_change(self, callback):
        """Listens for changes in the selected palette (value or palette_name).
        
        Args:
            callback: Function that receives the change object with keys 'name', 'old', 'new'.
        
        Example:
            def on_palette_change(change):
                print(f"New palette: {swatch.palette_name}")
                print(f"Colors: {swatch.value}")
            
            swatch.on_change(on_palette_change)
        """
        self.observe(callback, names=["value", "palette_name"])
    
    def on_value_change(self, callback):
        """Listens for changes only in the color list (value).
        
        Args:
            callback: Function that receives the change object.
        """
        self.observe(callback, names=["value"])
    
    def on_palette_change(self, callback):
        """Listens for changes only in the palette name (palette_name).
        
        Args:
            callback: Function that receives the change object.
        """
        self.observe(callback, names=["palette_name"])


class RangeDoubleInput(anywidget.AnyWidget):
    """
    Double slider widget for selecting a range of values.
    Allows selecting a minimum and maximum value within a defined range.
    
    Attributes:
        value (list): List with two values [selected_min, selected_max].
        min (float): Range minimum value.
        max (float): Range maximum value.
        step (float): Slider increment step.
        label (str): Widget label.
        width (int): Slider width in pixels.
    
    Example:
        slider = RangeDoubleInput(min=0, max=100, value=[20, 80], label="Range")
        display(slider)
        print(slider.value)  # [20, 80]
    """
    _esm = pathlib.Path(__file__).parent / "static" / "widgets" / "range_double.js"
    _css = pathlib.Path(__file__).parent / "static" / "widgets" / "range_double.css"
    
    # Current value: [selected_min, selected_max]
    fromValue = traitlets.Float(0).tag(sync=True)
    toValue = traitlets.Float(100).tag(sync=True)
    
    # Range configuration
    min = traitlets.Float(0).tag(sync=True)
    max = traitlets.Float(100).tag(sync=True)
    step = traitlets.Float(1).tag(sync=True)
    
    # Label and width
    label = traitlets.Unicode("").tag(sync=True)
    
    def __init__(self, min: float = 0, max: float = 100, step: float = 1,
                 fromValue: float = None, toValue: float = None, label: str = "", width: int = 240, **kwargs):
        """
        Args:
            min (float, optional): Range minimum value. Defaults to 0.
            max (float, optional): Range maximum value. Defaults to 100.
            step (float, optional): Increment step. Defaults to 1.
            fromValue (float, optional): Initial minimum selected value.
            toValue (float, optional): Initial maximum selected value.
            label (str, optional): Slider label.
            width (int, optional): Width in pixels. Defaults to 240.
        """
        super().__init__(**kwargs)
        self.min = min
        self.max = max
        self.step = step
        self.label = label
        # Default value if not provided
        self.fromValue = fromValue if fromValue is not None else min
        self.toValue = toValue if toValue is not None else max
    
    @traitlets.validate('fromValue')
    def _validate_from_value(self, proposal):
        """Validates that fromValue is within bounds [min, max]."""
        value = proposal['value']
        return max(self.min, min(self.max, value))
    
    @traitlets.validate('toValue')
    def _validate_to_value(self, proposal):
        """Validates that toValue is within bounds [min, max]."""
        value = proposal['value']
        return max(self.min, min(self.max, value))
    def on_drag(self, callback):
        self.observe(callback, names=["fromValue", "toValue"])