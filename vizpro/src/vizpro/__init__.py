import importlib.metadata


try:
    __version__ = importlib.metadata.version("vizpro")
except importlib.metadata.PackageNotFoundError:
    __version__ = "unknown"
    
from .widgets import *  