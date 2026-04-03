import anywidget
import urllib3
from traitlets import Unicode

class CustomWidget(anywidget.AnyWidget):
    """Widget para crear vistas personalizadas desde archivos locales o URLs.

    Esta clase facilita la construcción de widgets en el frontend a partir de
    archivos JavaScript externos que definen una función `plot(...)`. Permite
    pasar parámetros desde el modelo (traitlets) y gestionar importaciones
    adicionales como d3 y otras librerías.

    Attributes:
        elementId (Unicode): Identificador opcional del elemento DOM donde se
            renderizará el widget. Si no se define, se usa el contenedor `el`.
    """
    elementId = Unicode().tag(sync=True)

    @staticmethod
    def readFromWeb(url: str) -> str:
        """Lee contenido de una URL y lo devuelve como texto.

        Args:
            url (str): URL del recurso a leer (ej. un archivo JS).

        Returns:
            str: Contenido del recurso en texto UTF-8.

        Raises:
            urllib3.exceptions.HTTPError: Si ocurre un error de red al solicitar el recurso.
        """
        http = urllib3.PoolManager(cert_reqs="CERT_NONE")
        response = http.request("GET", url)
        text = response.data.decode("utf-8")
        return text

    @staticmethod
    def readFromLocalFile(path: str) -> str:
        """Lee un archivo local y devuelve su contenido como texto.

        Args:
            path (str): Ruta local del archivo a leer.

        Returns:
            str: Contenido del archivo concatenado en texto.

        Raises:
            OSError: Si el archivo no existe o no puede leerse.
        """
        text = ""
        with open(path, "r", encoding="utf-8") as file:
            lines = file.readlines()
            text = "".join(lines)
        return text

    @staticmethod
    def createWidgetFromLocalFile(paramList: list, 
                                  filePath: str, 
                                  height:int=400, 
                                  d3_version: str = "7", 
                                  extra_imports: list = None):
        """Crea el widget a partir de un archivo JS local.

        El archivo debe definir una función `plot(...)` que será invocada con
        los parámetros listados en `paramList`.

        Args:
            paramList (list): Nombres de variables (traitlets) que el JS leerá del modelo.
            filePath (str): Ruta local del archivo JS con la función `plot(...)`.
            height (int, optional): Alto del contenedor en px si no se puede medir el DOM. Por defecto 400.
            d3_version (str, optional): Versión de d3 a importar (ej. "7", "7.9.0", "v7"). Por defecto "7".
            extra_imports (list, optional): Lista de sentencias `import` adicionales para el JS.

        Returns:
            str: Código fuente del módulo JS que será usado por el frontend.
        """
        if extra_imports is None:
            extra_imports = []
        return CustomWidget._createWidget(
            paramList, 
            filePath, 
            CustomWidget.readFromLocalFile,
            height=height,
            d3_version=d3_version,
            extra_imports=extra_imports
        )

    @staticmethod
    def createWidgetFromUrl(paramList: list, 
                            jsUrl: str, 
                            height:int=400, 
                            d3_version: str = "7", 
                            extra_imports: list = None):
        """Crea el widget a partir de un archivo JS disponible en una URL.

        Args:
            paramList (list): Nombres de variables (traitlets) que el JS leerá del modelo.
            jsUrl (str): URL del archivo JS con la función `plot(...)`.
            height (int, optional): Alto del contenedor en px si no se puede medir el DOM. Por defecto 400.
            d3_version (str, optional): Versión de d3 a importar. Por defecto "7".
            extra_imports (list, optional): Lista de sentencias `import` adicionales para el JS.

        Returns:
            str: Código fuente del módulo JS que será usado por el frontend.
        """
        if extra_imports is None:
            extra_imports = []
        return CustomWidget._createWidget(paramList=paramList, 
                                          string=jsUrl, 
                                          fileReader=CustomWidget.readFromWeb,
                                          height=height,
                                          d3_version=d3_version,
                                          extra_imports=extra_imports)

    @staticmethod
    def _createWidget(paramList: list, string: str, fileReader, height:int=400, d3_version: str = "7", extra_imports: list = None):
        """Construye el módulo JS del widget a partir de un origen y un lector.

        Este método compone un módulo ES que:
        - Importa d3 y librerías adicionales.
        - Obtiene valores del modelo (traitlets) y los pasa a `plot(...)`.
        - Gestiona re-renderizado al cambiar los parámetros.
        - Espera a que el elemento DOM tenga tamaño antes de renderizar.

        Args:
            paramList (list): Nombres de variables (traitlets) que se inyectarán a `plot(...)`.
            string (str): Ruta local o URL del archivo JS que contiene `plot(...)`.
            fileReader (Callable[[str], str]): Función para leer contenido desde `string`.
            height (int, optional): Alto por defecto si no se puede medir el contenedor. Por defecto 400.
            d3_version (str, optional): Versión de d3 a importar. Por defecto "7".
            extra_imports (list, optional): Sentencias `import` adicionales (líneas completas).

        Returns:
            str: Código fuente del módulo JS generado.

        Side Effects:
            Escribe el módulo generado en el archivo local "teste.js" para depuración.
        """
        if extra_imports is None:
            extra_imports = []
        cleaned_imports = [ln.strip() for ln in extra_imports if ln and ln.strip()]
        d3_import = f'import * as d3 from "https://esm.sh/d3@{d3_version}";'
        extra_imports_block = "\n".join(cleaned_imports)
        
        # Generar código para obtener variables
        modelVars = ""
        modelChanges = ""
        paramsString = ", ".join(paramList)
        for var in paramList:
            modelVars += f'\t\t\t\t\tconst {var} = model.get("{var}");\n'

        for var in paramList:
            modelChanges += f'\t\t\t\t\tmodel.on("change:{var}", replot);\n'

        fileStr = fileReader(string)
        
        # Plantilla JS optimizada con ResizeObserver
        jsStr = """
{d3_import}
{extra_imports_block}

function render({{ model, el }}) {{
    let element;
    let width;
    let height = {height};
    let resizeObserver;
    let initialized = false;
    let lastWidth = 0;
    let resizeTimeout = null;

    // Configurar estilos del contenedor con altura FIJA para celda Jupyter
    el.style.width = "100%";
    el.style.height = "{height}px";
    el.style.overflow = "hidden";
    el.style.position = "relative";

    function getElement() {{
        const elementId = model.get("elementId");
        return elementId ? document.getElementById(elementId) : el;
    }}

    function updateSizes() {{
        element = getElement();
        if (!element) return false;
        
        width = element.clientWidth || element.offsetWidth;
        // Altura fija, no dependemos del contenido
        height = {height};
        
        return width > 0;
    }}

    function replot() {{
        if (!element || !updateSizes()) return;
        element.innerHTML = "";

{modelVars}

        plot({paramsString});
    }}

    function initializeWidget() {{
        if (initialized) return;
        
        element = getElement();
        if (!element || !updateSizes()) return;

        initialized = true;
        lastWidth = width;

        // Registrar cambios en el modelo
{modelChanges}

        // Renderizar inicialmente
{modelVars}
        plot({paramsString});
    }}

    // Usar ResizeObserver solo para detectar cambios de ANCHO
    resizeObserver = new ResizeObserver((entries) => {{
        for (const entry of entries) {{
            const newWidth = entry.contentRect.width;
            
            if (newWidth > 0) {{
                if (!initialized) {{
                    initializeWidget();
                }} else if (Math.abs(newWidth - lastWidth) > 5) {{
                    // Solo re-renderizar si el ancho cambió significativamente
                    lastWidth = newWidth;
                    
                    // Debounce para evitar múltiples renders
                    if (resizeTimeout) clearTimeout(resizeTimeout);
                    resizeTimeout = setTimeout(() => {{
                        replot();
                    }}, 150);
                }}
            }}
        }}
    }});

    // Observar el elemento contenedor
    resizeObserver.observe(el);

    // Fallback: intentar inicializar si el elemento ya tiene tamaño
    requestAnimationFrame(() => {{
        if (!initialized && updateSizes()) {{
            initializeWidget();
        }}
    }});

    {fileStr}
}}

export default {{ render }};
        """.format(
            d3_import=d3_import,
            extra_imports_block=extra_imports_block,
            fileStr=fileStr,
            height=height,
            modelVars=modelVars,
            paramsString=paramsString,
            modelChanges=modelChanges,
        )

        with open("teste.js", "w", encoding="utf-8") as f:
            f.write(jsStr)

        return jsStr