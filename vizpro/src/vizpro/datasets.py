import pandas as pd
from pathlib import Path
from typing import List, Dict, Any, Optional, Iterator

class Dataframe:
    def __init__(self, data: List[Dict[str, Any]] = None, name: str = ""):
        # Inicialización segura
        self._data = data if data is not None else []
        self._name = name
        
        # Calcular columnas automáticamente si hay datos
        if self._data and len(self._data) > 0:
            self._columns = list(self._data[0].keys())
        else:
            self._columns = []

    # --- Propiedades (Getters & Setters Seguros) ---
    @property
    def data(self) -> List[Dict[str, Any]]:
        return self._data
    
    @data.setter
    def data(self, value: List[Dict[str, Any]]):
        if not isinstance(value, list):
            raise ValueError("data debe ser una lista de diccionarios")
        self._data = value
        # Actualizar columnas automáticamente al cambiar los datos
        if value:
            self.columns = list(value[0].keys())

    @property
    def columns(self) -> List[str]:
        return self._columns
    
    @columns.setter
    def columns(self, value: List[str]):
        if not isinstance(value, list):
            raise ValueError("columns debe ser una lista de strings")
        self._columns = value

    @property
    def name(self) -> str:
        return self._name
    
    @name.setter
    def name(self, value: str):
        if not isinstance(value, str):
            raise ValueError("name debe ser una cadena de texto")
        self._name = value
    # --- Métodos para simular comportamiento de Lista (Observable Style) ---
    def __getitem__(self, index):
        """Permite acceder como df[0]"""
        return self._data[index]

    def __iter__(self) -> Iterator[Dict[str, Any]]:
        """Permite iterar como: for row in df: ..."""
        return iter(self._data)

    def __len__(self) -> int:
        """Permite usar len(df)"""
        return len(self._data)

    def head(self, n: int = 5) -> List[Dict[str, Any]]:
        return self._data[:n]

    def to_pandas(self) -> pd.DataFrame:
        """Utilidad para volver a Pandas si es necesario"""
        return pd.DataFrame(self._data)

    # --- Representación en Jupyter (Magic) ---
    def _repr_html_(self):
        """Muestra una tabla HTML bonita en Jupyter Notebooks automáticamente"""
        title = f"<b>Dataframe: {self.name}</b> ({len(self)} rows, {len(self.columns)} columns)<br>"
        # Usamos pandas solo para renderizar el HTML de la muestra, es más eficiente
        return title + pd.DataFrame(self.head(5)).to_html(index=False)

    def __repr__(self) -> str:
        return f"<Dataframe name='{self.name}' rows={len(self)} columns={self.columns}>"
class Datasets:
    _DATASETS = {
        "alphabet": "alphabet.csv",
        "sales": "sales.csv",
        "state-population-2010-2019": "state-population-2010-2019.tsv",
        "affairs": "affairs.csv"
    }
    
    _BASE_PATH = Path(__file__).resolve().parent.parent.parent / "datasets"

    @classmethod
    def get_dataset(cls, name: str) -> 'Dataframe': # Type hint string forward reference
        """Carga un dataset interno (archivo local o URL) por su nombre."""
        if name not in cls._DATASETS:
            options = ", ".join(cls._DATASETS.keys())
            raise ValueError(f"Dataset '{name}' no encontrado. Disponibles: {options}")

        source = cls._DATASETS[name]
        
        # --- LÓGICA HÍBRIDA (URL vs LOCAL) ---
        if source.startswith(("http://", "https://")):
            # Si es URL, pasamos la cadena tal cual
            file_path = source
        else:
            # Si es local, construimos la ruta absoluta
            file_path = cls._BASE_PATH / source
        
        df = cls.read_dataset(file_path)
        df.name = name
        return df

    @staticmethod
    def read_dataset(file_path: str | Path, sep: Optional[str] = None) -> 'Dataframe':
        """Lee un archivo local O una URL y devuelve un objeto Dataframe."""
        
        # Convertimos a string para verificar si es URL
        path_str = str(file_path)
        is_url = path_str.startswith(("http://", "https://"))
        
        # Objeto Path para utilidades (extraer extensión o nombre), 
        # aunque no exista en disco local.
        # Nota: Path(url).stem funciona bien para extraer el nombre del archivo de la URL
        path_obj = Path(file_path) if not is_url else Path(path_str.split("?")[0]) 

        # 1. Validación de existencia (SOLO SI ES LOCAL)
        if not is_url and not path_obj.exists():
            raise FileNotFoundError(f"El archivo no existe: {path_obj}")

        # 2. Inferencia automática del separador
        if sep is None:
            # Funciona tanto para path local como para URL (ej: archivo.tsv)
            sep = "\t" if path_obj.suffix == ".tsv" else ","

        try:
            # 3. Lectura con Pandas (Pandas maneja URLs nativamente)
            # storage_options={'User-Agent': ...} a veces ayuda con bloqueos de github/gists, 
            # pero para raw gists suele funcionar directo.
            pd_df = pd.read_csv(path_str, sep=sep)
            
            records = pd_df.to_dict(orient="records")
            
            return Dataframe(data=records, name=path_obj.stem)
            
        except Exception as e:
            msg = "descargar la URL" if is_url else "leer el archivo"
            raise RuntimeError(f"Error al {msg}: {e}")

    @classmethod
    def list_available(cls) -> List[str]:
        return list(cls._DATASETS.keys())