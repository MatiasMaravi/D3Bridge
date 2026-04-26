import anywidget
import urllib3
from traitlets import Unicode

class CustomWidget(anywidget.AnyWidget):
    """Widget to create custom views from local files or URLs.

    This class facilitates the construction of frontend widgets from
    external JavaScript files that define a `plot(...)` function. It allows
    passing parameters from the model (traitlets) and managing additional
    imports like d3 and other libraries.

    Attributes:
        elementId (Unicode): Optional identifier of the DOM element where
            the widget will be rendered. If not defined, the container `el` is used.
    """
    elementId = Unicode().tag(sync=True)

    @staticmethod
    def readFromWeb(url: str) -> str:
        """Reads content from a URL and returns it as a string.

        Args:
            url (str): URL of the resource to read (e.g. a JS file).

        Returns:
            str: Content of the resource as UTF-8 text.

        Raises:
            urllib3.exceptions.HTTPError: If a network error occurs when requesting the resource.
        """
        http = urllib3.PoolManager(cert_reqs="CERT_NONE")
        response = http.request("GET", url)
        text = response.data.decode("utf-8")
        return text

    @staticmethod
    def readFromLocalFile(path: str) -> str:
        """Reads a local file and returns its content as a string.

        Args:
            path (str): Local path of the file to read.

        Returns:
            str: Concatenated content of the file as text.

        Raises:
            OSError: If the file does not exist or cannot be read.
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
        """Creates the widget from a local JS file.

        The file must define a `plot(...)` function that will be invoked with
        the parameters listed in `paramList`.

        Args:
            paramList (list): Variable names (traitlets) that the JS will read from the model.
            filePath (str): Local path of the JS file with the `plot(...)` function.
            height (int, optional): Container height in px if the DOM cannot be measured. Defaults to 400.
            d3_version (str, optional): Version of d3 to import (e.g. "7", "7.9.0", "v7"). Defaults to "7".
            extra_imports (list, optional): List of additional `import` statements for the JS.

        Returns:
            str: Source code of the JS module that will be used by the frontend.
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
        """Creates the widget from a JS file available at a URL.

        Args:
            paramList (list): Variable names (traitlets) that the JS will read from the model.
            jsUrl (str): URL of the JS file with the `plot(...)` function.
            height (int, optional): Container height in px if the DOM cannot be measured. Defaults to 400.
            d3_version (str, optional): Version of d3 to import. Defaults to "7".
            extra_imports (list, optional): List of additional `import` statements for the JS.

        Returns:
            str: Source code of the JS module that will be used by the frontend.
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
        """Builds the widget's JS module from a source and a reader.

        This method composes an ES module that:
        - Imports d3 and additional libraries.
        - Gets values from the model (traitlets) and passes them to `plot(...)`.
        - Manages re-rendering when parameters change.
        - Waits for the DOM element to have a size before rendering.

        Args:
            paramList (list): Variable names (traitlets) that will be injected into `plot(...)`.
            string (str): Local path or URL of the JS file containing `plot(...)`.
            fileReader (Callable[[str], str]): Function to read content from `string`.
            height (int, optional): Default height if the container cannot be measured. Defaults to 400.
            d3_version (str, optional): Version of d3 to import. Defaults to "7".
            extra_imports (list, optional): Additional `import` statements (full lines).

        Returns:
            str: Source code of the generated JS module.

        Side Effects:
            Writes the generated module to the local file "teste.js" for debugging.
        """
        if extra_imports is None:
            extra_imports = []
        cleaned_imports = [ln.strip() for ln in extra_imports if ln and ln.strip()]
        d3_import = f'import * as d3 from "https://esm.sh/d3@{d3_version}";'
        extra_imports_block = "\n".join(cleaned_imports)
        
        # Generate code to get variables
        modelVars = ""
        modelChanges = ""
        paramsString = ", ".join(paramList)
        for var in paramList:
            modelVars += f'\t\t\t\t\tconst {var} = model.get("{var}");\n'

        for var in paramList:
            modelChanges += f'\t\t\t\t\tmodel.on("change:{var}", replot);\n'

        fileStr = fileReader(string)
        
        # Optimized JS template with ResizeObserver
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

    // Configure container styles with FIXED height for Jupyter cell
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
        // Fixed height, we do not depend on content
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

        // Register model changes
{modelChanges}

        // Initial render
{modelVars}
        plot({paramsString});
    }}

    // Use ResizeObserver only to detect WIDTH changes
    resizeObserver = new ResizeObserver((entries) => {{
        for (const entry of entries) {{
            const newWidth = entry.contentRect.width;
            
            if (newWidth > 0) {{
                if (!initialized) {{
                    initializeWidget();
                }} else if (Math.abs(newWidth - lastWidth) > 5) {{
                    // Only re-render if width changed significantly
                    lastWidth = newWidth;
                    
                    // Debounce to avoid multiple renders
                    if (resizeTimeout) clearTimeout(resizeTimeout);
                    resizeTimeout = setTimeout(() => {{
                        replot();
                    }}, 150);
                }}
            }}
        }}
    }});

    // Observe container element
    resizeObserver.observe(el);

    // Fallback: try to initialize if element already has size
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