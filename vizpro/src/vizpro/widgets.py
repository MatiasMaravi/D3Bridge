
import pathlib

import anywidget
import traitlets


class Button(anywidget.AnyWidget):
    _esm = pathlib.Path(__file__).parent / "static" / "button.js"
    _css = pathlib.Path(__file__).parent / "static" / "button.css"
    description = traitlets.Int(0).tag(sync=True)
    disabled = traitlets.Bool(False).tag(sync=True)

    _clicked = traitlets.Bool(False).tag(sync=True)

    def on_click(self, callback):

        self.observe(callback, names=["_clicked"])