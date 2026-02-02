import pathlib
import pandas as pd

import anywidget
import traitlets


class Button(anywidget.AnyWidget):
    _esm = pathlib.Path(__file__).parent / "static" / "widgets" / "button.js"
    _css = pathlib.Path(__file__).parent / "static" / "widgets" / "button.css"
    description = traitlets.Unicode("").tag(sync=True)
    disabled = traitlets.Bool(False).tag(sync=True)

    _clicked = traitlets.Bool(False).tag(sync=True)

    def on_click(self, callback):
        self.observe(callback, names=["_clicked"])

class Checkbox(anywidget.AnyWidget):
    _esm = pathlib.Path(__file__).parent / "static" / "widgets" / "checkbox.js"
    _css = pathlib.Path(__file__).parent / "static" / "widgets" / "checkbox.css"

    description = traitlets.Unicode("").tag(sync=True)
    disabled = traitlets.Bool(False).tag(sync=True)
    checked = traitlets.Bool(False).tag(sync=True)

    def on_check(self, callback):
        self.observe(callback, names=["checked"])


# class Dropdown(anywidget.AnyWidget):
#     """Selector desplegable con opciones y datos tabulares opcionales.

#     Attributes:
#         dataRecords (List): Registros de datos en formato dict (sincronizados).
#         variable (Unicode): Nombre de la variable asociada (opcional).
#         description (Unicode): Etiqueta del selector.
#         options (List): Lista de opciones disponibles.
#         value (Unicode): Valor seleccionado.
#         disabled (Bool): Estado de deshabilitado.
#     """
#     _esm = pathlib.Path(__file__).parent / "static" / "dropdown.js"
#     _css = pathlib.Path(__file__).parent / "static" / "dropdown.css"

#     dataRecords = traitlets.List([]).tag(sync=True)
#     variable = traitlets.Unicode("").tag(sync=True)
#     description = traitlets.Unicode("").tag(sync=True)
#     options = traitlets.List().tag(sync=True)
#     value = traitlets.Unicode("").tag(sync=True)
#     disabled = traitlets.Bool(False).tag(sync=True)
#     _clicked = traitlets.Bool(False).tag(sync=True)

#     def __init__(self, data=pd.DataFrame(), **kwargs):
#         """Inicializa el Dropdown con un DataFrame opcional.

#         Args:
#             data (pd.DataFrame, optional): Datos para inicializar `dataRecords`.
#             **kwargs: Argumentos adicionales propagados a BaseWidget.
#         """
#         self.data = data
#         super().__init__(**kwargs)

#     @property
#     def data(self):
#         """Devuelve los datos como DataFrame.

#         Returns:
#             pd.DataFrame: DataFrame construido desde `dataRecords`.
#         """
#         return pd.DataFrame.from_records(self.dataRecords)

#     @data.setter
#     def data(self, val):
#         """Establece los datos desde un DataFrame.

#         Args:
#             val (pd.DataFrame): DataFrame a convertir a registros dict.
#         """
#         self.dataRecords = val.to_dict(orient="records")

#     def on_select(self, callback):
#         """Registra un callback para cambios en `value`.

#         Args:
#             callback (Callable): Función que recibe el cambio del trait `value`.
#         """
#         self.observe(callback, names=["value"])


class RangeSlider(anywidget.AnyWidget):
    """Selector de rango numérico con límites y paso configurables.

    Attributes:
        dataRecords (List): Registros de datos (opcional).
        variable (Unicode): Variable asociada (opcional).
        step (Float): Incremento del slider.
        description (Unicode): Etiqueta del control.
        fromValue (Float): Valor inicial del rango.
        toValue (Float): Valor final del rango.
        minValue (Float): Límite inferior permitido.
        maxValue (Float): Límite superior permitido.
    """
    _esm = pathlib.Path(__file__).parent / "static" / "widgets" /"rangeslider.js"
    _css = pathlib.Path(__file__).parent / "static" / "widgets" /"rangeslider.css"

    dataRecords = traitlets.List([]).tag(sync=True)
    variable = traitlets.Unicode("").tag(sync=True)
    step = traitlets.Float().tag(sync=True)
    description = traitlets.Unicode("").tag(sync=True)
    fromValue = traitlets.Float().tag(sync=True)
    toValue = traitlets.Float().tag(sync=True)
    minValue = traitlets.Float().tag(sync=True)
    maxValue = traitlets.Float().tag(sync=True)

    def __init__(self, data=pd.DataFrame(), **kwargs):
        """Inicializa el RangeSlider con un DataFrame opcional.

        Args:
            data (pd.DataFrame, optional): Datos para inicializar `dataRecords`.
            **kwargs: Argumentos adicionales propagados a BaseWidget.
        """
        self.data = data
        super().__init__(**kwargs)
        if "minValue" not in kwargs and not data.empty:
            self.minValue = float(data[self.variable].min())
        if "maxValue" not in kwargs and not data.empty:
            self.maxValue = float(data[self.variable].max())
        if "fromValue" not in kwargs:
            self.fromValue = self.minValue
        if "toValue" not in kwargs:
            self.toValue = self.maxValue


    @property
    def data(self):
        """Devuelve los datos como DataFrame.

        Returns:
            pd.DataFrame: DataFrame construido desde `dataRecords`.
        """
        return pd.DataFrame.from_records(self.dataRecords)

    @data.setter
    def data(self, val):
        """Establece los datos desde un DataFrame.

        Args:
            val (pd.DataFrame): DataFrame a convertir a registros dict.
        """
        self.dataRecords = val.to_dict(orient="records")

    def on_drag(self, callback):
        """Registra un callback para cambios en `fromValue` y `toValue`.

        Args:
            callback (Callable): Función que recibe cambios del rango.
        """
        self.observe(callback, names=["fromValue", "toValue"])