import type { RenderProps } from "@anywidget/types";
import "./layouts.css";

interface MatrixCreatorModel {
    rows: string;
    columns: string;
    matrix: number[][];
}

class MatrixCreator {
    private el: HTMLElement;
    private model: any;
    private currentGroup: number = 1;
    private isDragging: boolean = false;
    private startCell: HTMLElement | null = null;
    private readonly groupColors: string[] = ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#ffff33', '#a65628', '#f781bf', '#999999'];
    private cleanupFn: (() => void) | null = null;

    constructor(el: HTMLElement, model: any) {
        this.el = el;
        this.model = model;
        this.setupGlobalEventListeners();
    }

    private setupGlobalEventListeners(): void {
        const handler = () => {
            this.isDragging = false;
            this.startCell = null;
        };
        document.addEventListener('mouseup', handler);
        this.cleanupFn = () => document.removeEventListener('mouseup', handler);
    }

    public dispose(): void {
        if (this.cleanupFn) {
            this.cleanupFn();
        }
        this.el.innerHTML = "";
    }

    private create_node(): HTMLElement {
        const node = document.createElement("div");
        node.classList.add("vp-matrix-creator-container");
        return node;
    }

    private createMatrixGrid(matrix: number[][]): HTMLElement {
        const matrixGrid = document.createElement("div");
        matrixGrid.className = "vp-matrix-grid";

        for (const [rowIndex, row] of matrix.entries()) {
            const matrixRow = document.createElement("div");
            matrixRow.className = "vp-matrix-row";

            for (const [colIndex] of row.entries()) {
                const matrixCell = document.createElement("div");
                matrixCell.className = "vp-matrix-cell";
                matrixCell.dataset.row = rowIndex.toString();
                matrixCell.dataset.col = colIndex.toString();
                matrixCell.dataset.group = "0";

                matrixCell.addEventListener('mousedown', (e) => this.handleMouseDown(e, matrixCell));
                matrixCell.addEventListener('mouseenter', (e) => this.handleMouseEnter(e, matrixCell));
                matrixCell.addEventListener('mouseup', (e) => this.handleMouseUp(e, matrixCell));

                matrixRow.appendChild(matrixCell);
            }
            matrixGrid.appendChild(matrixRow);
        }
        return matrixGrid;
    }

    private createControlPanel(containerElement: HTMLElement): HTMLElement {
        const controlPanel = document.createElement("div");
        controlPanel.className = "vp-control-panel";

        const groupInfo = document.createElement("div");
        groupInfo.className = "vp-group-info";

        const groupLabel = document.createElement("span");
        groupLabel.textContent = "Current group:";
        groupLabel.className = "vp-group-label";

        const currentGroupDisplay = document.createElement("span");
        currentGroupDisplay.id = "current-group-display";
        currentGroupDisplay.textContent = this.currentGroup.toString();
        currentGroupDisplay.className = "vp-current-group-display";
        currentGroupDisplay.style.backgroundColor = this.groupColors[this.currentGroup - 1];

        groupInfo.appendChild(groupLabel);
        groupInfo.appendChild(currentGroupDisplay);

        const buttonsContainer = document.createElement("div");
        buttonsContainer.className = "vp-buttons-container";

        const nextGroupBtn = this.createButton("➡️ Next Container", () => {
            this.nextGroup();
            this.updateGroupDisplay(currentGroupDisplay);
        });

        const resetGroupsBtn = this.createButton("🔄 Reset Containers", () => {
            this.resetGroups(containerElement);
            this.updateGroupDisplay(currentGroupDisplay);
        });

        const getMatrixBtn = this.createButton("📊 Save Matrix", () => {
            this.showMatrix(containerElement);
        });

        buttonsContainer.appendChild(nextGroupBtn);
        buttonsContainer.appendChild(resetGroupsBtn);
        buttonsContainer.appendChild(getMatrixBtn);

        controlPanel.appendChild(groupInfo);
        controlPanel.appendChild(buttonsContainer);

        return controlPanel;
    }

    private createButton(text: string, onClick: () => void): HTMLElement {
        const button = document.createElement("button");
        button.textContent = text;
        button.className = "vp-matrix-button";
        button.addEventListener('click', onClick);
        return button;
    }

    private handleMouseDown(e: MouseEvent, cell: HTMLElement): void {
        e.preventDefault();
        this.isDragging = true;
        this.startCell = cell;
        this.clearTemporarySelection();
        cell.classList.add('selecting');
        cell.style.background = 'rgba(102, 126, 234, 0.3)';
    }

    private handleMouseEnter(_e: MouseEvent, cell: HTMLElement): void {
        if (!this.isDragging || !this.startCell) return;
        this.clearTemporarySelection();

        const startRow = parseInt(this.startCell.dataset.row!);
        const startCol = parseInt(this.startCell.dataset.col!);
        const endRow = parseInt(cell.dataset.row!);
        const endCol = parseInt(cell.dataset.col!);

        const minRow = Math.min(startRow, endRow);
        const maxRow = Math.max(startRow, endRow);
        const minCol = Math.min(startCol, endCol);
        const maxCol = Math.max(startCol, endCol);

        const allCells = cell.closest('.vp-matrix-grid')?.querySelectorAll('.vp-matrix-cell');
        if (allCells) {
            for (const c of Array.from(allCells)) {
                const cellElement = c as HTMLElement;
                const cellRow = parseInt(cellElement.dataset.row!);
                const cellCol = parseInt(cellElement.dataset.col!);

                if (cellRow >= minRow && cellRow <= maxRow && cellCol >= minCol && cellCol <= maxCol) {
                    cellElement.classList.add('selecting');
                    cellElement.style.background = 'rgba(102, 126, 234, 0.3)';
                }
            }
        }
    }

    private handleMouseUp(_e: MouseEvent, cell: HTMLElement): void {
        if (!this.isDragging || !this.startCell) return;

        const startRow = parseInt(this.startCell.dataset.row!);
        const startCol = parseInt(this.startCell.dataset.col!);
        const endRow = parseInt(cell.dataset.row!);
        const endCol = parseInt(cell.dataset.col!);

        const minRow = Math.min(startRow, endRow);
        const maxRow = Math.max(startRow, endRow);
        const minCol = Math.min(startCol, endCol);
        const maxCol = Math.max(startCol, endCol);

        const allCells = cell.closest('.vp-matrix-grid')?.querySelectorAll('.vp-matrix-cell');

        if (allCells) {
            for (const c of Array.from(allCells)) {
                const cellElement = c as HTMLElement;
                const cellRow = parseInt(cellElement.dataset.row!);
                const cellCol = parseInt(cellElement.dataset.col!);

                if (cellRow >= minRow && cellRow <= maxRow && cellCol >= minCol && cellCol <= maxCol) {
                    cellElement.dataset.group = this.currentGroup.toString();
                    cellElement.style.backgroundColor = this.groupColors[this.currentGroup - 1];
                    cellElement.style.color = '#fff';
                    cellElement.style.fontWeight = 'bold';
                    cellElement.classList.remove('selecting');
                }
            }
        }
        this.isDragging = false;
        this.startCell = null;
    }

    private clearTemporarySelection(): void {
        const selectingCells = this.el.querySelectorAll('.vp-matrix-cell.selecting');
        for (const cell of Array.from(selectingCells)) {
            const cellElement = cell as HTMLElement;
            cellElement.classList.remove('selecting');
            const group = cellElement.dataset.group;
            if (group === '0') {
                cellElement.style.background = '#fff';
            }
        }
    }

    private nextGroup(): void {
        if (!this.hasGroupCells(this.currentGroup)) return;
        this.currentGroup++;
        if (this.currentGroup > 9) this.currentGroup = 1;
    }

    private hasGroupCells(groupNumber: number): boolean {
        const cells = this.el.querySelectorAll('.vp-matrix-cell');
        for (const cell of Array.from(cells)) {
            const cellElement = cell as HTMLElement;
            const cellGroup = parseInt(cellElement.dataset.group || '0');
            if (cellGroup === groupNumber) return true;
        }
        return false;
    }

    private resetGroups(container: HTMLElement): void {
        this.currentGroup = 1;
        const cells = container.querySelectorAll('.vp-matrix-cell');
        for (const cell of Array.from(cells)) {
            const cellElement = cell as HTMLElement;
            cellElement.dataset.group = '0';
            cellElement.style.backgroundColor = '#fff';
            cellElement.style.color = '#333';
            cellElement.style.fontWeight = 'normal';
            cellElement.classList.remove('selecting');
        }
    }

    private updateGroupDisplay(displayElement: HTMLElement): void {
        displayElement.textContent = this.currentGroup.toString();
        displayElement.style.backgroundColor = this.groupColors[this.currentGroup - 1];
    }

    private showMatrix(container: HTMLElement): void {
        const matrix: number[][] = [];
        const rows = container.querySelectorAll('.vp-matrix-row');

        for (const row of Array.from(rows)) {
            const matrixRow: number[] = [];
            const cells = row.querySelectorAll('.vp-matrix-cell');
            for (const cell of Array.from(cells)) {
                const cellElement = cell as HTMLElement;
                const group = parseInt(cellElement.dataset.group || '0');
                matrixRow.push(group);
            }
            matrix.push(matrixRow);
        }

        if (!this.validateGroupsAreRectangular(matrix)) {
            this.showErrorMessage('The groups must be squares or rectangles. Please correct the groups.');
            return;
        }

        // Sincronizar con Python Model
        this.model.set("matrix", matrix);
        this.model.save_changes();

        this.showConfirmationMessage();
    }

    private validateGroupsAreRectangular(matrix: number[][]): boolean {
        const uniqueGroups = new Set<number>();
        for (const row of matrix) {
            for (const cell of row) {
                if (cell !== 0) uniqueGroups.add(cell);
            }
        }
        for (const group of uniqueGroups) {
            if (!this.isGroupRectangular(matrix, group)) return false;
        }
        return true;
    }

    private isGroupRectangular(matrix: number[][], groupNumber: number): boolean {
        const positions: Array<{ row: number; col: number }> = [];
        for (const [i, row] of matrix.entries()) {
            for (const [j, cell] of row.entries()) {
                if (cell === groupNumber) positions.push({ row: i, col: j });
            }
        }

        if (positions.length === 0) return true;

        const minRow = Math.min(...positions.map(p => p.row));
        const maxRow = Math.max(...positions.map(p => p.row));
        const minCol = Math.min(...positions.map(p => p.col));
        const maxCol = Math.max(...positions.map(p => p.col));

        const expectedArea = (maxRow - minRow + 1) * (maxCol - minCol + 1);

        if (positions.length !== expectedArea) return false;

        for (let i = minRow; i <= maxRow; i++) {
            for (let j = minCol; j <= maxCol; j++) {
                if (matrix[i][j] !== groupNumber) return false;
            }
        }
        return true;
    }

    private showConfirmationMessage(): void {
        const messageContainer = document.getElementById('matrix-message-container');
        if (!messageContainer) return;

        const message = document.createElement('div');
        message.className = 'vp-confirmation-message';
        
        const checkIcon = document.createElement('span');
        checkIcon.textContent = '✓';
        checkIcon.className = 'vp-check-icon';
        
        const messageText = document.createElement('span');
        messageText.textContent = 'Layout saved successfully';

        message.appendChild(checkIcon);
        message.appendChild(messageText);
        
        messageContainer.innerHTML = '';
        messageContainer.appendChild(message);

        setTimeout(() => message.classList.add('show'), 10);
        setTimeout(() => {
            message.classList.remove('show');
            setTimeout(() => {
                if (messageContainer.contains(message)) message.remove();
            }, 300);
        }, 3000);
    }

    private showErrorMessage(errorText: string): void {
        const messageContainer = document.getElementById('matrix-message-container');
        if (!messageContainer) return;

        const message = document.createElement('div');
        message.className = 'vp-confirmation-message error-message';
        message.style.background = '#e74c3c';

        const errorIcon = document.createElement('span');
        errorIcon.textContent = '✗';
        errorIcon.className = 'vp-check-icon';

        const messageText = document.createElement('span');
        messageText.textContent = errorText;

        message.appendChild(errorIcon);
        message.appendChild(messageText);

        messageContainer.innerHTML = '';
        messageContainer.appendChild(message);

        setTimeout(() => message.classList.add('show'), 10);
        setTimeout(() => {
            message.classList.remove('show');
            setTimeout(() => {
                if (messageContainer.contains(message)) message.remove();
            }, 300);
        }, 4000);
    }

    private generateMatrix(rows: number, columns: number): number[][] {
        const matrix: number[][] = [];
        let value = 1;
        for (let i = 0; i < rows; i++) {
            const row: number[] = [];
            for (let j = 0; j < columns; j++) {
                row.push(value);
                value++;
            }
            matrix.push(row);
        }
        return matrix;
    }

    private isGroupMatrix(matrix: number[][]): boolean {
        // Detects if the matrix seems to contain groups (1-9) instead of a large sequential counter
        let max = 0;
        for(const row of matrix) {
            for(const val of row) {
                if(val > max) max = val;
            }
        }
        return max <= 9;
    }

    private restoreVisualGroups(matrix: number[][], grid: HTMLElement): void {
        const rows = grid.querySelectorAll('.vp-matrix-row');
        rows.forEach((row, rowIndex) => {
            const cells = row.querySelectorAll('.vp-matrix-cell');
            cells.forEach((cell, colIndex) => {
               const val = matrix[rowIndex][colIndex];
               if (val >= 1 && val <= 9) {
                   const cellElement = cell as HTMLElement;
                   cellElement.dataset.group = val.toString();
                   cellElement.style.backgroundColor = this.groupColors[val - 1];
                   cellElement.style.color = '#fff';
                   cellElement.style.fontWeight = 'bold';
               }
            });
        });
    }

    public render(): void {
        const rowsStr = this.model.get("rows");
        const columnsStr = this.model.get("columns");
        let matrix = this.model.get("matrix");
        
        const rowCount = rowsStr ? parseInt(rowsStr) : 3;
        const colCount = columnsStr ? parseInt(columnsStr) : 3;

        if (!matrix || matrix.length === 0 || (matrix.length === 1 && matrix[0].length === 0)) {
            matrix = this.generateMatrix(rowCount, colCount);
        }

        const node = this.create_node();
        const leftContainer = document.createElement("div");
        leftContainer.className = "vp-matrix-container";

        const matrixGrid = this.createMatrixGrid(matrix);
        // Try to restore visual state if it looks like a saved group matrix
        if (matrix && this.isGroupMatrix(matrix)) {
            this.restoreVisualGroups(matrix, matrixGrid);
        }

        const messageContainer = document.createElement("div");
        messageContainer.id = "matrix-message-container";
        messageContainer.className = "vp-message-container";

        leftContainer.appendChild(matrixGrid);
        leftContainer.appendChild(messageContainer);

        const controlPanel = this.createControlPanel(leftContainer);

        node.appendChild(leftContainer);
        node.appendChild(controlPanel);

        this.el.appendChild(node);
    }
}
function render({ model, el }: RenderProps<MatrixCreatorModel>) {
    const widget = new MatrixCreator(el, model);
    widget.render();
    return () => widget.dispose();
}

export default { render };