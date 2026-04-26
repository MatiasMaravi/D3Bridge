import pandas as pd
import numpy as np
from typing import List, Dict, Any, Tuple

class ShapProcessor:
    """
    Utility class to process SHAP explanation objects.
    """

    @staticmethod
    def process_single(val: Any) -> Tuple[List[Dict[str, Any]], float]:
        """
        Processes a single SHAP observation.
        
        Returns:
            A tuple containing a list of records and the base value.
        """
        df = pd.DataFrame()
        df.insert(0, "values", val.values)
        df.insert(0, "feature_names", val.feature_names)
        df.insert(0, "data", val.data)
        
        base_val = val.base_values[0] if isinstance(val.base_values, (list, np.ndarray)) else val.base_values
        # .to_dict(orient="records") devuelve List[Dict]
        return df.to_dict(orient="records"), float(base_val)

    @staticmethod
    def process_multi(val: Any) -> Tuple[List[Dict[str, Any]], float]:
        """
        Processes multiple SHAP observations.
        """
        valuesArray = np.transpose(val.values).tolist()
        dataArray = np.transpose(val.data).tolist()
        
        records: List[Dict[str, Any]] = []
        for i in range(len(val.feature_names)):
            records.append({
                "feature_names": val.feature_names[i],
                "values": valuesArray[i],
                "data": dataArray[i],
            })
            
        base_val = val.base_values[0] if isinstance(val.base_values, (list, np.ndarray)) else val.base_values
        return records, float(base_val)