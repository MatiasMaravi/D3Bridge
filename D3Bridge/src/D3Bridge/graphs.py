import anywidget
import numpy as np
import pandas as pd
import pathlib
import traitlets

from ._shap_processor import ShapProcessor, shap

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
        self.hue = hue #Javascript maneja el nulo
        self.direction = direction
        self.palette = palette #Javascript maneja el nulo
    

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