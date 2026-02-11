import anywidget
import numpy as np
import pathlib
import traitlets

class Barplot(anywidget.AnyWidget):
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
    

class BeesWarm(anywidget.AnyWidget):
    _esm = pathlib.Path(__file__).parent / "static" / "graphs" / "beeswarm.js"
    _css = pathlib.Path(__file__).parent / "static" / "graphs" / "beeswarm.css"
    
    data = traitlets.List([]).tag(sync=True)
    base_value = traitlets.Float(0.0).tag(sync=True)

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
        valuesArray = np.transpose(val.values).tolist()
        dataArray = np.transpose(val.data).tolist()
        records = []

        for i in range(len(val.feature_names)):
            records.append(
                {
                    "feature": val.feature_names[i],
                    "value": valuesArray[i],
                    "data": dataArray[i]
                }
            )

        self.base_value = val.base_values[0]
        self.data = records
        
