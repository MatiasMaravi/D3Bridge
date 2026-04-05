import pandas as pd
import numpy as np

class ShapProcessor:
    """
    A utility class to process SHAP (SHapley Additive exPlanations) explanation objects 
    into formats compatible with web-based visualization libraries.
    """

    @staticmethod
    def process_single(val):
        """
        Processes a single SHAP observation into a list of records and a base value.

        Args:
            val: A SHAP Explanation object containing a single observation 
                 (e.g., shap_values[0]).

        Returns:
            tuple: A tuple containing:
                - list: A list of dictionaries (records), where each dict contains 
                  'data', 'feature_names', and 'values' for the observation.
                - float: The base value (expected value) for the prediction.
        """
        df = pd.DataFrame()
        df.insert(0, "values", val.values)
        df.insert(0, "feature_names", val.feature_names)
        df.insert(0, "data", val.data)
        
        base_val = val.base_values[0] if isinstance(val.base_values, (list, np.ndarray)) else val.base_values
        return df.to_dict(orient="records"), base_val

    @staticmethod
    def process_multi(val):
        """
        Processes multiple SHAP observations by transposing matrices into 
        feature-oriented records.

        Args:
            val: A SHAP Explanation object containing multiple observations.

        Returns:
            tuple: A tuple containing:
                - list: A list of dictionaries, where each dict maps a feature name 
                  to its corresponding array of values and data points across observations.
                - float: The base value (expected value) for the model.
        """
        # Transpose arrays to group by feature rather than by observation
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