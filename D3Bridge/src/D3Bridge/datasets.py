import pandas as pd
from pathlib import Path
from typing import List, Dict, Any, Optional, Iterator, Union

class Dataframe:
    def __init__(self, data: pd.DataFrame = None, name: str = ""):
        # Safe initialization
        self._data = data if data is not None else pd.DataFrame()
        self._name = name


    # --- Properties (Safe Getters & Setters) ---
    @property
    def data(self) -> List[Dict[str, Any]]:
        return self._data.to_dict(orient="records")
    
    @data.setter
    def data(self, value: pd.DataFrame):
        if not isinstance(value, pd.DataFrame):
            raise ValueError("data must be a pandas DataFrame")
        self._data = value
        # Automatically update columns when data changes
        if not self._data.empty:
            self.columns = list(self._data.columns)

    @property
    def columns(self) -> List[str]:
        # Always reads the current truth of the dataframe
        return self._data.columns.tolist() if self._data is not None else []
    
    @columns.setter
    def columns(self, value: List[str]):
        if not isinstance(value, list):
            raise ValueError("columns must be a list of strings")
        # This actually renames the columns in the DataFrame
        if len(value) != len(self._data.columns):
             raise ValueError("List length does not match the number of columns")
        self._data.columns = value

    @property
    def name(self) -> str:
        return self._name
    
    @name.setter
    def name(self, value: str):
        if not isinstance(value, str):
            raise ValueError("name must be a string")
        self._name = value
    # --- Methods to simulate List behavior (Observable Style) ---
    # --- Unified method to simulate List behavior ---
    def __getitem__(self, item: Union[int, str]):
        """
        Handles dual access:
        - If int: Returns the row (iloc)
        - If str: Returns the column as a list
        """
        # Case 1: Access by numeric index (Row)
        if isinstance(item, int):
            return self._data.iloc[item].to_dict()
        
        # Case 2: Access by column name (List of values)
        elif isinstance(item, str):
            if item not in self._data.columns:
                raise KeyError(f"Column '{item}' does not exist in the Dataframe.")
            return self._data[item].tolist()
        
        # Case 3: Error for other types
        else:
            raise TypeError(f"Index must be int (row) or str (column), not {type(item)}")

    def __iter__(self) -> Iterator[Dict[str, Any]]:
        """Allows iterating like: for row in df: ..."""
        return iter(self._data.to_dict(orient="records"))

    def __len__(self) -> int:
        """Allows using len(df)"""
        return len(self._data)

    def head(self, n: int = 5) -> pd.DataFrame:
        return self._data.head(n)

    def _repr_html_(self):
        return self._data.head().to_html(index=False)
    
    def __repr__(self) -> str:
        return f"<Dataframe name='{self.name}' rows={len(self)} columns={self.columns}>"
    
    #--- Other useful methods ---
    # Min of a column
    def min(self, column: str) -> Any:
        if column not in self._data.columns:
            raise ValueError(f"Column '{column}' does not exist in the Dataframe.")
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
            raise ValueError(f"Column '{column}' does not exist in the Dataframe.")
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
    """Loads an internal dataset (local file or URL) by name."""
    if name not in _DATASETS:
        options = ", ".join(_DATASETS.keys())
        raise ValueError(f"Dataset '{name}' not found. Available: {options}")

    source = _DATASETS[name]
    
    # --- HYBRID LOGIC (URL vs LOCAL) ---
    if source.startswith(("http://", "https://")):
        # If it's a URL, pass the string as is
        file_path = source
    else:
        # If it's local, construct the absolute path
        file_path = _BASE_PATH / source
    
    df = read_dataset(file_path)
    df.name = name
    return df

def get_geo_dataset(name: str) -> Dict[str, Any]:
    """Loads an internal geographic dataset (local file or URL) by name."""
    if name not in _GEO_DATASETS:
        options = ", ".join(_GEO_DATASETS.keys())
        raise ValueError(f"Geographic dataset '{name}' not found. Available: {options}")
    source = _GEO_DATASETS[name]
        # --- HYBRID LOGIC (URL vs LOCAL) ---
    if source.startswith(("http://", "https://")):
        # If it's a URL, pass the string as is
        file_path = source
    else:
        # If it's local, construct the absolute path
        file_path = _BASE_PATH / source
    geojson_data = read_geojson(file_path)
    return geojson_data

def read_dataset(file_path: str | Path, sep: Optional[str] = None) -> 'Dataframe':
    """Reads a local file OR a URL and returns a Dataframe object."""
    
    # Convert to string to check if it's a URL
    path_str = str(file_path)
    is_url = path_str.startswith(("http://", "https://"))
    
    # Path object for utilities (extract extension or name), 
    # even if it doesn't exist on local disk.
    # Note: Path(url).stem works well to extract the file name from the URL
    path_obj = Path(file_path) if not is_url else Path(path_str.split("?")[0]) 

    # 1. Existence validation (ONLY IF LOCAL)
    if not is_url and not path_obj.exists():
        raise FileNotFoundError(f"The file does not exist: {path_obj}")

    # 2. Automatic separator inference
    if sep is None:
        # Works for both local path and URL (e.g., archivo.tsv)
        sep = "\t" if path_obj.suffix == ".tsv" else ","

    try:
        # 3. Reading with Pandas (Pandas handles URLs natively)
        # storage_options={'User-Agent': ...} sometimes helps with github/gists blocks, 
        # but it usually works directly for raw gists.
        pd_df = pd.read_csv(path_str, sep=sep)
        
        return Dataframe(data=pd_df, name=path_obj.stem)
        
    except Exception as e:
        msg = "download the URL" if is_url else "read the file"
        raise RuntimeError(f"Error trying to {msg}: {e}")

def read_geojson(file_path: str | Path) -> Dict[str, Any]:
    """Reads a local GeoJSON file or a URL and returns its content as a dictionary."""
    # Convert to string to check if it's a URL
    path_str = str(file_path)
    is_url = path_str.startswith(("http://", "https://"))
    
    # Path object for utilities (extract extension or name), 
    # even if it doesn't exist on local disk.
    path_obj = Path(file_path) if not is_url else Path(path_str.split("?")[0]) 

    # Existence validation (ONLY IF LOCAL)
    if not is_url and not path_obj.exists():
        raise FileNotFoundError(f"The file does not exist: {path_obj}")

    try:
        # Pandas doesn't have a direct method for GeoJSON, so we use standard json
        import json
        if is_url:
            import requests
            response = requests.get(path_str)
            response.raise_for_status()  # Verify that the request was successful
            geojson_data = response.json()
        else:
            with open(path_obj, 'r', encoding='utf-8') as f:
                geojson_data = json.load(f)
        
        return geojson_data
            
    except Exception as e:
        msg = "download the URL" if is_url else "read the file"
        raise RuntimeError(f"Error trying to {msg}: {e}")
def list_available() -> List[str]:
    """Returns a list of the names of the available datasets."""
    return list(_DATASETS.keys()) + list(_GEO_DATASETS.keys())

def to_Dataframe(df: pd.DataFrame, name: str = "") -> 'Dataframe':
    return Dataframe(data=df, name=name)