import pathlib
import random
import string

import anywidget
import traitlets
import ipywidgets

def anywidget_to_json(widget):
    """Convierte un widget de ipywidgets a un formato JSON compatible con AnyWidget.

    Args:
        widget (ipywidgets.Widget): El widget a convertir.

    Returns:
        dict: Un diccionario JSON con la información del widget.
    """
    return {
        "model_id": widget.model_id,
        "type": type(widget).__name__,
        "state": widget.get_state(),
    }


class MatrixLayout(anywidget.AnyWidget):
    _esm = pathlib.Path(__file__).parent / "static" / "layouts" / "matrix_layout.js"
    _css = pathlib.Path(__file__).parent / "static" / "layouts" / "matrix_layout.css"

    matrix = traitlets.List().tag(sync=True)
    grid_areas = traitlets.List().tag(sync=True)
    grid_template_areas = traitlets.Unicode().tag(sync=True)
    style = traitlets.Unicode().tag(sync=True)
    
    children = traitlets.List(trait=traitlets.Instance(ipywidgets.DOMWidget)).tag(
        sync=True, 
        **ipywidgets.widget_serialization
    )
    
    widget_areas = traitlets.Dict().tag(sync=True)

    def __init__(self, matrix, **kwargs):
        """Inicializa el layout a partir de una matriz de rectángulos.

        Valida la matriz, genera identificadores para cada área y construye
        la cadena `grid-template-areas`.

        Args:
            matrix (List[List[int]]): Matriz de enteros, donde cada entero
                representa un área rectangular contigua.
            **kwargs: Argumentos adicionales propagados a BaseWidget.

        Raises:
            ValueError: Si la matriz no es válida (no lista de listas, tamaños
                inconsistentes, enteros no positivos, no secuenciales o áreas
                no rectangulares).
        """
        self._dom_ready = False
        self._check_matrix_format(matrix)
        self.matrix = matrix
        self.positions_hashs = {}
        self.grid_areas = []
        for num in self.all_numbers:
            random_string = "area_" + "".join(random.choice(string.ascii_letters) for _ in range(10))
            self.positions_hashs[num] = random_string
            self.grid_areas.append(random_string)

        self.grid_template_areas = ""
        for row in matrix:
            self.grid_template_areas += '\n"'
            for num in row:
                self.grid_template_areas += self.positions_hashs[num] + " "
            self.grid_template_areas += '"'

        super().__init__(**kwargs)
        self.on_msg(self._handle_frontend_msg)

    def _handle_frontend_msg(self, widget, content, buffers):
        """
        Maneja mensajes del frontend (JS) de forma genérica (Reverse Bridge).
        Escalable: No requiere hardcodear nombres de eventos.
        """
        msg_type = content.get('type')
        model_id = content.get('model_id')

        # Buscamos el hijo una sola vez
        child = next((c for c in self.children if c.model_id == model_id), None)
        if not child:
            return

        # CASO 1: Sincronización de Datos (Propiedades/Traits)
        # Funciona para 'checked', 'value', 'disabled', etc. sin hardcodear.
        if msg_type == 'child_update':
            trait = content.get('trait')
            value = content.get('value')
            
            # Verificamos que el hijo tenga esa propiedad antes de asignarla
            if trait and hasattr(child, trait):
                setattr(child, trait, value)

        # CASO 2: Ejecución de Acciones/Eventos (Métodos)
        # Funciona para 'click', 'reset', 'submit', o cualquier método que definas.
        elif msg_type == 'child_action':
            action = content.get('action')  # El nombre del método, ej: "click"
            args = content.get('args', [])  # Argumentos opcionales
            
            # --- Lógica Dinámica ---
            
            # 1. Buscamos si el hijo tiene un método público con ese nombre (ej: child.click())
            if hasattr(child, action) and callable(getattr(child, action)):
                method = getattr(child, action)
                try:
                    method(*args)
                except Exception as e:
                    pass # Opcional: print(f"Error ejecutando acción {action}: {e}")

            # 2. Soporte Legacy/Custom (Tu caso específico de _clicked)
            # Si no hay método 'click', pero la acción es click, revisamos propiedades booleanas
            elif action == 'click' and hasattr(child, '_clicked'):
                child._clicked = not child._clicked

    def not_list_of_lists(self):
        """Lanza un error por formato de matriz inválido."""
        raise ValueError("Matrix format must be a list of lists of integers")

    def not_rects(self):
        """Lanza un error cuando las áreas no forman rectángulos contiguos."""
        raise ValueError("Matrix must contain only unduplicate rectangles.")

    def _check_all_integers_positive(self, matrix):
        """Verifica que todos los elementos sean enteros positivos y únicos.

        Args:
            matrix (List[List[int]]): Matriz a validar.

        Returns:
            List[int]: Lista de enteros únicos encontrados.

        Raises:
            ValueError: Si hay elementos no enteros o negativos.
        """
        all_numbers = []
        for row in matrix:
            for item in row:
                if type(item) is not int:
                    self.not_list_of_lists()
                if item < 0:
                    raise ValueError("All integers must be positives")
                if item not in all_numbers:
                    all_numbers.append(item)
        return all_numbers
    
    def _check_matrix_format(self, matrix):
        """Valida el formato general de la matriz.

        Comprueba:
        - Que sea una lista de listas.
        - Que todas las filas tengan el mismo tamaño.
        - Que los números sean positivos y estén en secuencia continua.
        - Que las áreas formen rectángulos contiguos.

        Args:
            matrix (List[List[int]]): Matriz de layout.

        Raises:
            ValueError: Si cualquiera de las validaciones falla.
        """
        if any(type(row) is not list for row in matrix):
            self.not_list_of_lists()
        self.all_numbers = self._check_all_integers_positive(matrix)

        first_row_len = len(matrix[0])
        if any(len(row) != first_row_len for row in matrix):
            raise ValueError("All rows must have the same size")

        self.all_numbers.sort()
        for i in range(1, len(self.all_numbers)):
            if self.all_numbers[i] - self.all_numbers[i - 1] != 1:
                raise ValueError("All numbers must be in sequence.")

        self._check_if_has_only_rects(matrix)

    def _check_if_has_only_rects(self, matrix):
        """Verifica que cada número forme un rectángulo contiguo.

        Args:
            matrix (List[List[int]]): Matriz de layout.
        """
        all_positions = {}

        for i in range(len(matrix)):
            row = matrix[i]
            for j in range(len(row)):
                item = row[j]
                position = (i, j)
                if item not in all_positions:
                    all_positions[item] = []
                all_positions[item].append(position)

        for num, num_positions in all_positions.items():
            self._validate_rectangle(num_positions)

    def _validate_rectangle(self, num_positions):
        """Valida contigüidad por filas y forma rectangular de un área.

        Args:
            num_positions (List[Tuple[int, int]]): Posiciones ocupadas por el número.
        """
        rows = {}
        num_positions.sort()
        for position in num_positions:
            if position[0] not in rows:
                rows[position[0]] = []
            rows[position[0]].append(position[1])
        self._check_row_contiguity(rows)
        self._check_rectangle_shape(rows)

    def _check_row_contiguity(self, rows):
        """Comprueba que las columnas de la primera fila sean contiguas.

        Args:
            rows (dict[int, List[int]]): Mapa fila->columnas ocupadas.

        Raises:
            ValueError: Si hay saltos entre columnas.
        """
        first_row = list(rows.keys())[0]
        for i in range(1, len(rows[first_row])):
            if rows[first_row][i] - rows[first_row][i - 1] != 1:
                self.not_rects()

    def _check_rectangle_shape(self, rows):
        """Comprueba que las filas sean contiguas y compartan el mismo rango de columnas.

        Args:
            rows (dict[int, List[int]]): Mapa fila->columnas ocupadas.

        Raises:
            ValueError: Si no forma un rectángulo perfecto.
        """
        rows_keys = list(rows.keys())
        first_row = rows_keys[0]
        for i in range(1, len(rows_keys)):
            if rows_keys[i] - rows_keys[i - 1] != 1:
                self.not_rects()
            if len(rows[rows_keys[i]]) != len(rows[first_row]):
                self.not_rects()
            if rows[rows_keys[i]][0] != rows[first_row][0]:
                self.not_rects()
            if rows[rows_keys[i]][-1] != rows[first_row][-1]:
                self.not_rects()

    def add(self, widget, position: int):
        """Añade un widget a una posición del layout y lo muestra.

        Args:
            widget: Widget hijo a insertar en el área.
            position (int): Número de área en la matriz.

        Raises:
            ValueError: Si `position` no existe en la matriz.
        """
        if position not in self.positions_hashs:
            available = sorted(self.positions_hashs.keys())
            raise ValueError(
                f"Position {position} is not valid. "
                f"Available positions in matrix: {available}"
            )
        
        area_name = self.positions_hashs[position]
        
        # 1. Actualizar mapeo de widget ID -> Grid Area
        # Actualizamos primero el área para que el frontend tenga la referencia correcta
        current_map = dict(self.widget_areas)
        current_map[widget.model_id] = area_name
        self.widget_areas = current_map
        
        # 2. Gestión de hijos y observadores (Evitando duplicados)
        if widget not in self.children:
            # Agregar el observador "Puente" solo si es la primera vez que se añade
            # Esto sincroniza cambios de Python (ej. otras celdas) hacia este MatrixLayout JS
            widget.observe(self._on_child_change, type='change')
            
            # Actualizar lista de hijos
            new_children = list(self.children)
            new_children.append(widget)
            self.children = new_children

    def _on_child_change(self, change):
        """Puente: Cuando un hijo cambia en Python, avisar al JS del MatrixLayout"""
        # Filtramos cambios internos de ipywidgets que no nos interesan
        if change['name'] in ['_property_lock', 'layout', 'style']:
            return

        # Enviamos mensaje custom al frontend (MatrixLayout JS)
        self.send({
            "type": "child_change",
            "model_id": change['owner'].model_id,
            "trait": change['name'],
            "value": change['new']
        })
        
        # COLAB FIX: Forzar la propagación del estado a otras vistas (celdas independientes).
        # En entornos como Colab, a veces la actualización iniciada desde una vista manual 
        # ingresa a Python pero no se difunde automáticamente a otras vistas estándar.
        # send_state fuerza el envío del mensaje de actualización 'update' a todos los frontends.
        if hasattr(change['owner'], 'send_state'):
            change['owner'].send_state(key=change['name'])


class MatrixCreator(anywidget.AnyWidget):
    _esm = pathlib.Path(__file__).parent / "static" / "layouts" / "matrix_creator.js"
    _css = pathlib.Path(__file__).parent / "static" / "layouts" / "matrix_creator.css"

    matrix = traitlets.List().tag(sync=True)
    grid_areas = traitlets.List().tag(sync=True) 
    grid_template_areas = traitlets.Unicode().tag(sync=True)
    rows = traitlets.Unicode().tag(sync=True)
    columns = traitlets.Unicode().tag(sync=True)

    def __init__(self, rows=3, columns=3, **kwargs):
        # Almacenar los valores de filas y columnas como strings para el frontend
        self.rows = str(rows)
        self.columns = str(columns)
        
        # Inicializar matriz vacía - el frontend la generará basándose en rows y columns
        self.matrix = []
        self.grid_areas = []
        self.grid_template_areas = ""
        
        super().__init__(**kwargs)

    def generate_new_matrix(self, rows=None, columns=None):
        if rows is None:
            rows = len(self.matrix)
        if columns is None:
            columns = len(self.matrix[0]) if self.matrix else 3
            
        new_matrix = []
        value = 1
        for _ in range(rows):
            row = []
            for _ in range(columns):
                row.append(value)
                value += 1
                new_matrix.append(row)
            
        self.matrix = new_matrix
        return self.matrix            
    
    @property
    def data(self):
        return self.matrix