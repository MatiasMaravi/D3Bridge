import pandas as pd
from pathlib import Path
from typing import List, Dict, Any, Optional

class Datasets:
    # 1. Registro centralizado: Nombre -> Nombre del archivo
    _DATASETS = {
        "alphabet": "alphabet.csv",
        "sales": "sales.csv",
        "state-population-2010-2019": "state-population-2010-2019.tsv"
    }
    
    # 2. Definimos la ruta base UNA vez. 
    # .resolve() ayuda a obtener la ruta absoluta y evitar errores con enlaces simbólicos
    _BASE_PATH = Path(__file__).resolve().parent.parent.parent / "datasets"

    @classmethod
    def get_dataset(cls, name: str) -> List[Dict[str, Any]]:
        """Carga un dataset interno por su nombre."""
        if name not in cls._DATASETS:
            # Mejora de UX: Mostrar las opciones válidas en el error
            options = ", ".join(cls._DATASETS.keys())
            raise ValueError(f"Dataset '{name}' no encontrado. Disponibles: {options}")

        filename = cls._DATASETS[name]
        file_path = cls._BASE_PATH / filename
        
        # Reutilizamos la lógica de lectura genérica
        return cls.read_dataset(file_path)

    @staticmethod
    def read_dataset(file_path: str | Path, sep: Optional[str] = None) -> List[Dict[str, Any]]:
        """Lee un archivo CSV/TSV externo y lo convierte a lista de registros."""
        path = Path(file_path)
        
        if not path.exists():
            raise FileNotFoundError(f"El archivo no existe: {path}")

        # 3. Inferencia automática del separador si no se especifica
        if sep is None:
            sep = "\t" if path.suffix == ".tsv" else ","

        try:
            df = pd.read_csv(path, sep=sep)
            # Convertimos a string las claves para asegurar compatibilidad JSON/D3
            return df.to_dict(orient="records")
        except Exception as e:
            raise RuntimeError(f"Error al leer el dataset: {e}")

    @classmethod
    def list_available(cls) -> List[str]:
        """Ayuda al usuario a saber qué datasets puede pedir."""
        return list(cls._DATASETS.keys())