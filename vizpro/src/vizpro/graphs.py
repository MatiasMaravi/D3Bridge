import anywidget
import urllib3
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

    def __init__(self, x, y, hue, direction, palette, data, **kwargs):
        super().__init__(**kwargs)
        self.x = x
        self.y = y
        self.hue = hue
        self.direction = direction
        self.palette = palette
        self.data = data