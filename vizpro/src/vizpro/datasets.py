import pandas as pd
from pathlib import Path
from typing import List, Dict, Any, Optional, Iterator, Union

class Dataframe:
    def __init__(self, data: pd.DataFrame = None, name: str = ""):
        # Inicialización segura
        self._data = data if data is not None else pd.DataFrame()
        self._name = name


    # --- Propiedades (Getters & Setters Seguros) ---
    @property
    def data(self) -> List[Dict[str, Any]]:
        return self._data.to_dict(orient="records")
    
    @data.setter
    def data(self, value: pd.DataFrame):
        if not isinstance(value, pd.DataFrame):
            raise ValueError("data debe ser un DataFrame de pandas")
        self._data = value
        # Actualizar columnas automáticamente al cambiar los datos
        if not self._data.empty:
            self.columns = list(self._data.columns)

    @property
    def columns(self) -> List[str]:
        # Lee siempre la verdad actual del dataframe
        return self._data.columns.tolist() if self._data is not None else []
    
    @columns.setter
    def columns(self, value: List[str]):
        if not isinstance(value, list):
            raise ValueError("columns debe ser una lista de strings")
        # Esto realmente renombra las columnas en el DataFrame
        if len(value) != len(self._data.columns):
             raise ValueError("La longitud de la lista no coincide con el número de columnas")
        self._data.columns = value

    @property
    def name(self) -> str:
        return self._name
    
    @name.setter
    def name(self, value: str):
        if not isinstance(value, str):
            raise ValueError("name debe ser una cadena de texto")
        self._name = value
    # --- Métodos para simular comportamiento de Lista (Observable Style) ---
    # --- Método unificado para simular comportamiento de Lista ---
    def __getitem__(self, item: Union[int, str]):
        """
        Maneja acceso dual:
        - Si es int: Devuelve la fila (iloc)
        - Si es str: Devuelve la columna como lista
        """
        # Caso 1: Acceso por índice numérico (Fila)
        if isinstance(item, int):
            return self._data.iloc[item].to_dict()
        
        # Caso 2: Acceso por nombre de columna (Lista de valores)
        elif isinstance(item, str):
            if item not in self._data.columns:
                raise KeyError(f"La columna '{item}' no existe en el Dataframe.")
            return self._data[item].tolist()
        
        # Caso 3: Error para otros tipos
        else:
            raise TypeError(f"El índice debe ser int (fila) o str (columna), no {type(item)}")

    def __iter__(self) -> Iterator[Dict[str, Any]]:
        """Permite iterar como: for row in df: ..."""
        return iter(self._data.to_dict(orient="records"))

    def __len__(self) -> int:
        """Permite usar len(df)"""
        return len(self._data)

    def head(self, n: int = 5) -> pd.DataFrame:
        return self._data.head(n)

    def _repr_html_(self):
        return self._data.head().to_html(index=False)
    
    def __repr__(self) -> str:
        return f"<Dataframe name='{self.name}' rows={len(self)} columns={self.columns}>"
    
    #--- Otros métodos útiles ---
    # Min of a column
    def min(self, column: str) -> Any:
        if column not in self._data.columns:
            raise ValueError(f"La columna '{column}' no existe en el Dataframe.")
        value = self._data[column].min()
        if pd.isna(value):
            return None
        elif isinstance(value, (pd.Timestamp, pd.Timedelta)):
            return value.isoformat()
        else:
            return value.item()
    # Max of a column
    def max(self, column: str) -> Any:
        if column not in self._data.columns:
            raise ValueError(f"La columna '{column}' no existe en el Dataframe.")
        value = self._data[column].max()
        if pd.isna(value):
            return None
        elif isinstance(value, (pd.Timestamp, pd.Timedelta)):
            return value.isoformat()
        else:
            return value.item()
    
    

_DATASETS = {
        "alphabet": "alphabet.csv",
        "sales": "sales.csv",
        "state-population-2010-2019": "state-population-2010-2019.tsv",
        "affairs": "affairs.csv",
        "iris": "iris.csv",
        "gas": "gas.csv"
    }
_GEO_DATASETS = {
    "Brazil":"brazil_geo.json",
    "USA": "states-albers-10m.json",
    "sample": "sample.json"
}
_BASE_PATH = Path(__file__).resolve().parent.parent.parent / "datasets"
def get_dataset(name: str) -> 'Dataframe': # Type hint string forward reference
    """Carga un dataset interno (archivo local o URL) por su nombre."""
    if name not in _DATASETS:
        options = ", ".join(_DATASETS.keys())
        raise ValueError(f"Dataset '{name}' no encontrado. Disponibles: {options}")

    source = _DATASETS[name]
    
    # --- LÓGICA HÍBRIDA (URL vs LOCAL) ---
    if source.startswith(("http://", "https://")):
        # Si es URL, pasamos la cadena tal cual
        file_path = source
    else:
        # Si es local, construimos la ruta absoluta
        file_path = _BASE_PATH / source
    
    df = read_dataset(file_path)
    df.name = name
    return df

def get_geo_dataset(name: str) -> Dict[str, Any]:
    """Carga un dataset geográfico interno (archivo local o URL) por su nombre."""
    if name not in _GEO_DATASETS:
        options = ", ".join(_GEO_DATASETS.keys())
        raise ValueError(f"Dataset geográfico '{name}' no encontrado. Disponibles: {options}")
    source = _GEO_DATASETS[name]
        # --- LÓGICA HÍBRIDA (URL vs LOCAL) ---
    if source.startswith(("http://", "https://")):
        # Si es URL, pasamos la cadena tal cual
        file_path = source
    else:
        # Si es local, construimos la ruta absoluta
        file_path = _BASE_PATH / source
    geojson_data = read_geojson(file_path)
    return geojson_data

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
        
        return Dataframe(data=pd_df, name=path_obj.stem)
        
    except Exception as e:
        msg = "descargar la URL" if is_url else "leer el archivo"
        raise RuntimeError(f"Error al {msg}: {e}")

def read_geojson(file_path: str | Path) -> Dict[str, Any]:
    """Lee un archivo GeoJSON local o una URL y devuelve su contenido como diccionario."""
    # Convertimos a string para verificar si es URL
    path_str = str(file_path)
    is_url = path_str.startswith(("http://", "https://"))
    
    # Objeto Path para utilidades (extraer extensión o nombre), 
    # aunque no exista en disco local.
    path_obj = Path(file_path) if not is_url else Path(path_str.split("?")[0]) 

    # Validación de existencia (SOLO SI ES LOCAL)
    if not is_url and not path_obj.exists():
        raise FileNotFoundError(f"El archivo no existe: {path_obj}")

    try:
        # Pandas no tiene un método directo para GeoJSON, así que usamos json estándar
        import json
        if is_url:
            import requests
            response = requests.get(path_str)
            response.raise_for_status()  # Verificar que la solicitud fue exitosa
            geojson_data = response.json()
        else:
            with open(path_obj, 'r', encoding='utf-8') as f:
                geojson_data = json.load(f)
        
        return geojson_data
            
    except Exception as e:
        msg = "descargar la URL" if is_url else "leer el archivo"
        raise RuntimeError(f"Error al {msg}: {e}")
def list_available() -> List[str]:
    """Devuelve una lista de los nombres de los datasets disponibles."""
    return list(_DATASETS.keys()) + list(_GEO_DATASETS.keys())

def to_Dataframe(df: pd.DataFrame, name: str = "") -> 'Dataframe':
    return Dataframe(data=df, name=name)