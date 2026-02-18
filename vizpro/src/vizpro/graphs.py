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

class HistogramPlot(anywidget.AnyWidget):
    _esm = pathlib.Path(__file__).parent / "static" / "graphs" / "histogramplot.js"
    _css = pathlib.Path(__file__).parent / "static" / "graphs" / "histogramplot.css"
    
    x = traitlets.Unicode("").tag(sync=True)
    data = traitlets.List([]).tag(sync=True)
    color_ = traitlets.Unicode("").tag(sync=True)

    

    def __init__(self, x, data, color_, **kwargs):
        super().__init__(**kwargs)
        self.x = x
        self.data = data
        self.color_ = color_

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

class MapPlot(anywidget.AnyWidget):
    _esm = pathlib.Path(__file__).parent / "static" / "graphs" / "mapplot.js"
    _css = pathlib.Path(__file__).parent / "static" / "graphs" / "mapplot.css"
    
    data = traitlets.List([]).tag(sync=True)
    geo_data = traitlets.Dict({}).tag(sync=True)
    selected_values_records = traitlets.List([]).tag(sync=True)

    def __init__(self, data, geo_json_path=None, **kwargs):
        super().__init__(**kwargs)
        # Convertir DataFrame a lista de diccionarios si es necesario
        if isinstance(data, pd.DataFrame):
            self.data = data.to_dict('records')
        else:
            self.data = data
        
        # Cargar datos geográficos
        if geo_json_path is None:
            # Usar ruta por defecto para Brazil
            # __file__ es vizpro/src/vizpro/graphs.py
            # Necesitamos llegar a vizpro/datasets/brazil_geo.json
            geo_json_path = pathlib.Path(__file__).parent.parent.parent / "datasets" / "brazil_geo.json"
        
        try:
            import json
            with open(geo_json_path, 'r', encoding='utf-8') as f:
                self.geo_data = json.load(f)
                print(f"✓ Archivo GeoJSON cargado: {len(self.geo_data.get('features', []))} estados")
        except FileNotFoundError:
            print(f"✗ Advertencia: No se encontró el archivo GeoJSON en {geo_json_path}")
            self.geo_data = {}
        except Exception as e:
            print(f"✗ Error al cargar GeoJSON: {e}")
            self.geo_data = {}

    @property
    def selected_values(self):
        if not self.selected_values_records:
            return None
        return pd.DataFrame.from_records(self.selected_values_records)

    def on_selected_values(self, callback):
        self.observe(callback, names="selected_values_records")