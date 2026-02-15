import pandas as pd
import numpy as np
import shap
class ShapProcessor:
    @staticmethod
    def process_single(val):
        """Retorna (dataRecords, baseValue) para single observations"""
        df = pd.DataFrame()
        df.insert(0, "values", val.values)
        df.insert(0, "feature_names", val.feature_names)
        df.insert(0, "data", val.data)
        base_val = val.base_values[0] if isinstance(val.base_values, (list, np.ndarray)) else val.base_values
        return df.to_dict(orient="records"), base_val

    @staticmethod
    def process_multi(val):
        """Retorna (dataRecords, baseValue) para multi observations"""
        valuesArray = np.transpose(val.values).tolist()
        dataArray = np.transpose(val.data).tolist()
        records = []
        for i in range(len(val.feature_names)):
            records.append({
                "feature_names": val.feature_names[i],
                "values": valuesArray[i],
                "data": dataArray[i],
            })
        base_val = val.base_values[0] if isinstance(val.base_values, (list, np.ndarray)) else val.base_values
        return records, base_val