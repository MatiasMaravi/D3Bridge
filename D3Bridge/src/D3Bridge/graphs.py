import anywidget
import numpy as np
import pandas as pd
import pathlib
import traitlets
import shap
from ._shap_processor import ShapProcessor

class BarPlot(anywidget.AnyWidget):
    _esm = pathlib.Path(__file__).parent / "static" / "graphs" / "barplot.js"
    _css = pathlib.Path(__file__).parent / "static" / "graphs" / "barplot.css"
    
    x = traitlets.Unicode("").tag(sync=True)
    y = traitlets.Unicode("").tag(sync=True)
    hue = traitlets.Unicode("").tag(sync=True)
    direction = traitlets.Unicode("vertical").tag(sync=True)
    palette = traitlets.List([]).tag(sync=True)
    data = traitlets.List([]).tag(sync=True)

    def __init__(self, data, x, y, hue="", direction="vertical", palette=[], **kwargs):
        super().__init__(**kwargs)
        self.data = data
        self.x = x
        self.y = y
        self.hue = hue
        self.direction = direction
        self.palette = palette
    

class BeeswarmPlot(anywidget.AnyWidget):
    _esm = pathlib.Path(__file__).parent / "static" / "graphs" / "beeswarm.js"
    _css = pathlib.Path(__file__).parent / "static" / "graphs" / "beeswarm.css"
    
    data = traitlets.List([]).tag(sync=True)
    base_value = traitlets.Float(0.0).tag(sync=True)
    selected_values_records = traitlets.List([]).tag(sync=True)

    def __init__(self, explanation, **kwargs):
        self.explanation = explanation
        super().__init__(**kwargs)
        
    @property
    def explanation(self):
        return self._explanation
    
    #shap._explanation.Explanation
    @explanation.setter
    def explanation(self, val ):
        self._explanation = val
        records, base_val = ShapProcessor.process_multi(val)

        self.base_value = base_val
        self.data = records
    
    @property
    def selected_values(self):
        if not self.selected_values_records:
            return None
        df = pd.DataFrame.from_records(self.selected_values_records)
        exp = shap.Explanation(
            values=np.transpose(np.stack(df['values'].values)),
            data = np.transpose(np.stack(df['data'].values)),
            feature_names=np.transpose(np.stack(df['feature_names'].values)),
            base_values=np.full(len(df['values'][0]), df['base_values'][0])
        )
        return exp

    def on_selected_values(self, callback):
        self.observe(callback, names="selected_values_records")

class DecisionPlot(anywidget.AnyWidget):
    _esm = pathlib.Path(__file__).parent / "static" / "graphs" / "decision.js"
    _css = pathlib.Path(__file__).parent / "static" / "graphs" / "decision.css"
    
    data = traitlets.List([]).tag(sync=True)
    base_value = traitlets.Float(0.0).tag(sync=True)
    selected_values_records = traitlets.List([]).tag(sync=True)

    def __init__(self, explanation, **kwargs):
        self.explanation = explanation
        super().__init__(**kwargs)
        
    @property
    def explanation(self):
        return self._explanation
    
    #shap._explanation.Explanation
    @explanation.setter
    def explanation(self, val ):
        self._explanation = val
        records, base_val = ShapProcessor.process_multi(val)

        self.base_value = base_val
        self.data = records

    @property
    def selected_values(self):
        if not self.selected_values_records:
            return None
        df = pd.DataFrame.from_records(self.selected_values_records)
        exp = shap.Explanation(
            values=np.transpose(np.stack(df['values'].values)),
            data = np.transpose(np.stack(df['data'].values)),
            feature_names=np.transpose(np.stack(df['feature_names'].values)),
            base_values=np.full(len(df['values'][0]), df['base_values'][0])
        )
        return exp
    
    def on_selected_values(self, callback):
        self.observe(callback, names="selected_values_records")

class HistogramPlot(anywidget.AnyWidget):
    _esm = pathlib.Path(__file__).parent / "static" / "graphs" / "histogramplot.js"
    _css = pathlib.Path(__file__).parent / "static" / "graphs" / "histogramplot.css"
    
    x = traitlets.Unicode("").tag(sync=True)
    data = traitlets.List([]).tag(sync=True)
    color = traitlets.Unicode("steelblue").tag(sync=True)

    def __init__(self, x, data, color="steelblue", **kwargs):
        super().__init__(**kwargs)
        self.x = x
        self.data = data
        self.color = color

class LinearPlot(anywidget.AnyWidget):
    _esm = pathlib.Path(__file__).parent / "static" / "graphs" / "linearplot.js"
    _css = pathlib.Path(__file__).parent / "static" / "graphs" / "linearplot.css"
    
    x = traitlets.Unicode("").tag(sync=True)
    y = traitlets.Unicode("").tag(sync=True)
    hue = traitlets.Unicode("").tag(sync=True)
    palette = traitlets.List([]).tag(sync=True)
    data = traitlets.List([]).tag(sync=True)
    selected_values_records = traitlets.List([]).tag(sync=True)
   
    def __init__(self, x, y, data, hue="", palette=None, **kwargs):
        super().__init__(**kwargs)
        self.x = x
        self.y = y
        self.data = data
        self.hue = hue
        self.palette = palette if palette is not None else []

    @property
    def selected_values(self):
        if not self.selected_values_records:
            return None
        return pd.DataFrame.from_records(self.selected_values_records)

    def on_selected_values(self, callback):
        self.observe(callback, names="selected_values_records")

class GeoMapPlot(anywidget.AnyWidget):
    _esm = pathlib.Path(__file__).parent / "static" / "graphs" / "geomapplot.js"
    _css = pathlib.Path(__file__).parent / "static" / "graphs" / "geomapplot.css"
    
    geojson = traitlets.Dict({}).tag(sync=True)
    config = traitlets.Dict({}).tag(sync=True)
    selected_region = traitlets.Unicode("").tag(sync=True)

    def __init__(self, geojson, config=None, **kwargs):
        super().__init__(**kwargs)
        self.geojson = geojson
        self.config = config if config is not None else {}

    def on_selected_region(self, callback):
        """Register a callback to be called when a region is selected."""
        self.observe(callback, names="selected_region")

class ForcePlot(anywidget.AnyWidget):
    _esm = pathlib.Path(__file__).parent / "static" / "graphs" / "force.js"
    _css = pathlib.Path(__file__).parent / "static" / "graphs" / "force.css"
    
    data = traitlets.List([]).tag(sync=True)
    base_value = traitlets.Float(0.0).tag(sync=True)
    selected_values_records = traitlets.List([]).tag(sync=True)

    def __init__(self, explanation, **kwargs):
        self.explanation = explanation
        super().__init__(**kwargs)

    @property
    def explanation(self):
        return self._explanation
    
    @explanation.setter
    def explanation(self, val):
        self._explanation = val
        records, base_val = ShapProcessor.process_single(val)

        self.base_value = base_val
        self.data = records
    
    @property
    def selected_values(self):
        if not self.selected_values_records:
            return None
        return pd.DataFrame.from_records(self.selected_values_records)
    
class HeatmapPlot(anywidget.AnyWidget):
    _esm = pathlib.Path(__file__).parent / "static" / "graphs" / "heatmap.js"
    _css = pathlib.Path(__file__).parent / "static" / "graphs" / "heatmap.css"

    data = traitlets.List([]).tag(sync=True)
    x_name = traitlets.Unicode("").tag(sync=True)
    y_name = traitlets.Unicode("").tag(sync=True)
    x_values = traitlets.List([]).tag(sync=True)
    y_values = traitlets.List([]).tag(sync=True)
    
    def __init__(self, data, **kwargs):
        super().__init__(**kwargs)
        self.set_data(data)

    def set_data(self, val):
        self.x_name = val.columns.name or ""
        self.y_name = val.index.name or ""
        self.x_values = val.columns.tolist()
        self.y_values = val.index.tolist()

        data_reset = val.reset_index()
        self.data = data_reset.melt(
            id_vars=self.y_name, var_name=self.x_name, value_name="hueValue"
        ).to_dict(orient="records")

class RidgelinePlot(anywidget.AnyWidget):
    _esm = pathlib.Path(__file__).parent / "static" / "graphs" / "ridgelineplot.js"
    _css = pathlib.Path(__file__).parent / "static" / "graphs" / "ridgelineplot.css"
    
    x_axes = traitlets.List([]).tag(sync=True)
    data = traitlets.List([]).tag(sync=True)
    bins = traitlets.Int(20).tag(sync=True)

    def __init__(self, x_axes, data, bins=20, **kwargs):
        super().__init__(**kwargs)
        self.x_axes = x_axes
        self.data = data
        self.bins = bins

class ScatterPlot(anywidget.AnyWidget):
    _esm = pathlib.Path(__file__).parent / "static" / "graphs" / "scatterplot.js"
    _css = pathlib.Path(__file__).parent / "static" / "graphs" / "scatterplot.css"
    
    x = traitlets.Unicode("").tag(sync=True)
    y = traitlets.Unicode("").tag(sync=True)
    hue = traitlets.Unicode("").tag(sync=True)
    palette = traitlets.List([]).tag(sync=True)
    data = traitlets.List([]).tag(sync=True)
    selected_values_records = traitlets.List([]).tag(sync=True)


    def __init__(self, x, y, data, hue="", palette=None, **kwargs):
        super().__init__(**kwargs)
        self.x = x
        self.y = y
        self.data = data
        self.hue = hue
        self.palette = palette if palette is not None else []
    
    @property
    def selected_values(self):
        if not self.selected_values_records:
            return None
        return pd.DataFrame.from_records(self.selected_values_records)

    def on_selected_values(self, callback):
        self.observe(callback, names="selected_values_records")

class WaterfallPlot(anywidget.AnyWidget):
    _esm = pathlib.Path(__file__).parent / "static" / "graphs" / "waterfallplot.js"
    _css = pathlib.Path(__file__).parent / "static" / "graphs" / "waterfallplot.css"
    
    base_value = traitlets.Float(0.0).tag(sync=True)
    data = traitlets.List([]).tag(sync=True)
    selected_values_records = traitlets.List([]).tag(sync=True)


    def __init__(self, explanation, **kwargs):
        self.explanation = explanation
        super().__init__(**kwargs)

    @property
    def explanation(self):
        return self._explanation
    
    @explanation.setter
    def explanation(self, val):
        self._explanation = val
        records, base_val = ShapProcessor.process_single(val)

        self.base_value = base_val
        self.data = records
    @property
    def selected_values(self):
        if not self.selected_values_records:
            return None
        return pd.DataFrame.from_records(self.selected_values_records)