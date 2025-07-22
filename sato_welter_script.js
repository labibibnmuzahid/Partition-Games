// --- CORE GAME LOGIC ---

class Fragment {
    constructor(grid) {
        this.grid = grid; // 2D array where 1 = filled square, 0 = empty
        this.x = 0; // Position for rendering
        this.y = 0;
    }
    
    static fromRowSizes(rowSizes) {
        const width = rowSizes.length > 0 ? Math.max(...rowSizes) : 0;
        const grid = rowSizes.map(len => Array.from({ length: width }, (_, i) => i < len ? 1 : 0));
        return new Fragment(grid);
    }
    
    get rows() { return this.grid.length; }
    get cols() { return this.grid.length > 0 ? this.grid[0].length : 0; }
    
    isEmpty() {
        return this.grid.length === 0 || !this.grid.some(row => row.some(cell => cell === 1));
    }
    
    squares() {
        const coords = [];
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c] === 1) {
                    coords.push({ r, c });
                }
            }
        }
        return coords;
    }
    
    // Remove hook at position (r, c): all squares (r, c'), c' >= c, and (r', c), r' >= r
    removeHook(r, c) {
        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols && this.grid[r][c] === 1) {
            // Remove the hook: all squares to the right in row r and all squares below in column c
            for (let row = r; row < this.rows; row++) {
                if (row === r) {
                    // Remove all squares to the right in row r (including the selected square)
                    for (let col = c; col < this.cols; col++) {
                        this.grid[row][col] = 0;
                    }
                } else {
                    // Remove the square in column c (if it exists)
                    if (c < this.cols) {
                        this.grid[row][c] = 0;
                    }
                }
            }
            
            // After removal, merge/compact the remaining squares
            this.mergeSquares();
        }
    }
    
    // Merge and compact remaining squares like in CRIM
    mergeSquares() {
        // Convert the grid back to row lengths, filtering out empty rows
        const rowLengths = [];
        for (let r = 0; r < this.rows; r++) {
            let length = 0;
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c] === 1) {
                    length++;
                }
            }
            if (length > 0) {
                rowLengths.push(length);
            }
        }
        
        // Sort in descending order to maintain Young diagram property
        rowLengths.sort((a, b) => b - a);
        
        // Rebuild the grid from the merged row lengths
        if (rowLengths.length === 0) {
            this.grid = [];
            return;
        }
        
        const maxWidth = Math.max(...rowLengths);
        this.grid = rowLengths.map(len => 
            Array.from({ length: maxWidth }, (_, i) => i < len ? 1 : 0)
        );
    }
    

    
    hasMoves() {
        return this.squares().length > 0;
    }
}

class GameState {
    constructor(rowSizes) {
        this.board = Fragment.fromRowSizes(rowSizes);
        this.currentPlayer = 0; // 0 = Player A, 1 = Player B
    }
    
    get player() {
        return this.currentPlayer === 0 ? 'A' : 'B';
    }
    
    hasMoves() {
        return this.board.hasMoves();
    }
    
    performMove(r, c) {
        this.board.removeHook(r, c);
        this.currentPlayer = 1 - this.currentPlayer;
    }
    
    getAllSquares() {
        return this.board.squares();
    }
    
    getBoard() {
        return this.board;
    }
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPartition(n) {
    let parts = [];
    let remaining = n;
    let maxPart = n;
    while (remaining > 0) {
        let part = randomInt(1, Math.min(remaining, maxPart));
        parts.push(part);
        remaining -= part;
        maxPart = part;
    }
    return parts.sort((a, b) => b - a);
}

function staircase(n) {
    let parts = [];
    let t = n;
    while (t >= 1) {
        parts.push(t);
        t = t - 1;
    }
    return parts;
}

function square(n) {
    let parts = [];
    let t = n;
    while (t >= 1) {
        parts.push(n);
        t = t - 1;
    }
    return parts;
}

function hook(n) {
    let parts = [];
    let t = n;
    parts.push(t);
    while (t >= 2) {
        parts.push(1);
        t = t - 1;
    }
    return parts;
}

class Game {
    static PLAYERS = ["A", "B"];
    constructor(rowSizes, aiPlayer) {
        this.gameState = new GameState(rowSizes);
        this.aiIndex = aiPlayer ? Game.PLAYERS.indexOf(aiPlayer) : null;
    }
    
    get currentPlayer() { return this.gameState.player; }
    isAiTurn() { return this.aiIndex !== null && Game.PLAYERS.indexOf(this.gameState.player) === this.aiIndex; }
    
    makeMove(r, c) {
        this.gameState.performMove(r, c);
        return !this.gameState.hasMoves();
    }
    
    getAllSquares() {
        return this.gameState.getAllSquares();
    }
    
    getBoard() {
        return this.gameState.getBoard();
    }
    
    isEmpty() {
        return !this.gameState.hasMoves();
    }
}

const SoundManager = {
    sounds: {},
    init() {},
    play(soundName) {}
};

class SatoWelterGui {
    constructor() {
        this.CELL = 40;
        this.MARGIN = 20;
        this.GAP = 30;
        this.ANIMATION_MS = 500;
        this.AI_THINK_MS = 800;
        this.game = null;
        this.hoveredMove = null;
        this.isAnimating = false;
        this.aiDifficulty = 'Medium';
        this.idCounter = 0;
        this.idToAddress = new Map();
        this.gameHistory = []; // Store previous game states for undo
        this.getDOMElements();
        this.bindEventListeners();
        this.initTheme();
        SoundManager.init();
    }
    getDOMElements() {
        this.gameCard = document.getElementById('game-card');
        this.statusLabel = document.getElementById('status-label');
        this.boardArea = document.getElementById('board-area');
        this.aiThinkingIndicator = document.getElementById('ai-thinking-indicator');
        this.newGameBtn = document.getElementById('new-game-btn');
        this.undoBtn = document.getElementById('undo-btn');
        this.downloadBtn = document.getElementById('download-btn');
        this.themeToggle = document.getElementById('theme-toggle');
        this.themeSelect = document.getElementById('theme-select');
        this.setupModal = document.getElementById('setup-modal-backdrop');
        this.gameOverModal = document.getElementById('game-over-modal-backdrop');
        this.rowsInput = document.getElementById('rows-input');
        this.partitionTypeSelect = document.getElementById('partition-type-select');
        this.partitionNumberInput = document.getElementById('partition-number-input');
        this.generatePartitionBtn = document.getElementById('generate-partition-btn');
        this.aiSelect = document.getElementById('ai-select');
        this.difficultySlider = document.getElementById('difficulty-slider');
        this.difficultyLabel = document.getElementById('difficulty-label');
        this.startGameBtn = document.getElementById('start-game-btn');
        this.playAgainBtn = document.getElementById('play-again-btn');
        this.gameOverMessage = document.getElementById('game-over-message');
        this.helpBtn = document.getElementById('help-btn');
        this.helpBtnModal = document.getElementById('help-btn-modal');
        this.helpPopover = document.getElementById('help-popover');
        this.downloadBtnModal = document.getElementById('download-btn-modal');
    }
    bindEventListeners() {
        this.startGameBtn.addEventListener('click', () => this.processSetup());
        this.newGameBtn.addEventListener('click', () => { SoundManager.play('click'); this.showSetupModal(); });
        this.undoBtn.addEventListener('click', () => { SoundManager.play('click'); this.undoMove(); });
        this.downloadBtn.addEventListener('click', () => { SoundManager.play('click'); this.downloadGame(); });
        this.playAgainBtn.addEventListener('click', () => { SoundManager.play('click'); this.showSetupModal(); });
        this.themeToggle.addEventListener('change', () => { SoundManager.play('click'); this.toggleTheme(); });
        this.difficultySlider.addEventListener('input', () => this.updateDifficultyLabel());
        this.helpBtn.addEventListener('mouseenter', () => this.showHelp());
        this.helpBtn.addEventListener('mouseleave', () => this.hideHelp());
        if (this.helpBtnModal) {
            this.helpBtnModal.addEventListener('mouseenter', () => this.showHelp());
            this.helpBtnModal.addEventListener('mouseleave', () => this.hideHelp());
        }
        if (this.generatePartitionBtn) {
            this.generatePartitionBtn.addEventListener('click', () => this.generatePartition());
        }
        if (this.downloadBtnModal) {
            this.downloadBtnModal.addEventListener('click', () => { SoundManager.play('click'); this.downloadGame(); });
        }
        if (this.themeSelect) {
            this.themeSelect.addEventListener('change', () => this.applyTileTheme());
        }
        this.boardArea.addEventListener('mousemove', (event) => this.handleMouseMove(event));
        this.boardArea.addEventListener('mouseleave', () => this.handleMouseLeave());
        this.boardArea.addEventListener('click', (event) => this.handleMouseClick(event));
    }
    applyTileTheme() {
        if (this.themeSelect && this.gameCard) {
            this.gameCard.setAttribute('data-tile-theme', this.themeSelect.value);
        }
    }
    processSetup() {
        try {
            SoundManager.play('click');
            const nums = this.rowsInput.value.trim().split(/\s+/).map(Number);
            if (nums.length === 0 || nums.some(n => isNaN(n) || n <= 0)) throw new Error("Invalid input");
            const aiSide = this.aiSelect.value === "None" ? null : this.aiSelect.value;
            this.aiDifficulty = this.difficultySlider.value;
            this.applyTileTheme();
            this.setupModal.classList.remove('visible');
            this.setupModal.style.opacity = '0';
            this.setupModal.style.visibility = 'hidden';
            this.startGame(nums, aiSide);
        } catch (e) {
            alert("Invalid input. Please enter positive integers only.");
        }
    }
    startGame(rows, aiSide) {
        this.game = new Game(rows, aiSide);
        this.hoveredMove = null;
        this.isAnimating = false;
        this.clearGameHistory();
        this.redrawBoard();
        this.updateStatus();
        this.updateUndoButton();
        this.updateDownloadButton();
        if (this.game.isAiTurn()) { this.aiTurn(); }
    }
    aiTurn() {
        if (!this.game || !this.game.isAiTurn() || this.isAnimating) return;
        this.aiThinkingIndicator.classList.add('thinking');
        setTimeout(() => {
            this.aiThinkingIndicator.classList.remove('thinking');
            
            // Get all legal moves (all squares)
            const legalMoves = this.game.getAllSquares();
            
            if (legalMoves.length === 0) return;
            
            // For now, AI just makes random moves (could implement more sophisticated logic later)
            const move = legalMoves[Math.floor(Math.random() * legalMoves.length)];
            this.executeWithAnimation(move.r, move.c);
        }, this.AI_THINK_MS);
    }
    handleMouseMove(event) {
        if (!this.game || this.game.isAiTurn() || this.isAnimating) return;
        const rect = this.boardArea.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        let hovered = null;
        
        // Find which square is hovered
        const board = this.game.getBoard();
        board.squares().forEach(({ r, c }) => {
            const left = this.MARGIN + c * this.CELL;
            const top = this.MARGIN + r * this.CELL;
            if (mouseX >= left && mouseX < left + this.CELL && mouseY >= top && mouseY < top + this.CELL) {
                hovered = { r, c };
            }
        });
        
        if (hovered && (!this.hoveredMove || 
            hovered.r !== this.hoveredMove.r || 
            hovered.c !== this.hoveredMove.c)) {
            SoundManager.play('hover');
        }
        
        this.hoveredMove = hovered;
        this.gameCard.querySelectorAll('.tile').forEach(t => t.classList.remove('highlighted'));
        
        if (this.hoveredMove) {
            // Highlight the hook: all squares to the right in row, and all below in column, including (r, c)
            board.squares().forEach(({ r, c }) => {
                if ((r === this.hoveredMove.r && c >= this.hoveredMove.c) || 
                    (c === this.hoveredMove.c && r >= this.hoveredMove.r)) {
                    document.getElementById(`tile-${r}-${c}`)?.classList.add('highlighted');
                }
            });
        }
        this.boardArea.classList.toggle('clickable', !!this.hoveredMove);
    }
    handleMouseLeave() {
        this.hoveredMove = null;
        this.gameCard.querySelectorAll('.tile').forEach(t => t.classList.remove('highlighted'));
        this.boardArea.classList.remove('clickable');
    }
    handleMouseClick(event) {
        if (!this.game || this.isAnimating || this.game.isAiTurn() || !this.hoveredMove) return;
        this.executeWithAnimation(this.hoveredMove.r, this.hoveredMove.c);
    }
    
    executeWithAnimation(r, c) {
        if (this.isAnimating) return;
        this.isAnimating = true;
        this.handleMouseLeave();
        SoundManager.play('remove');
        
        // Save state before making the move
        this.saveGameState();
        
        // Animate: highlight the hook
        const board = this.game.getBoard();
        board.squares().forEach(({ r: fr, c: fc }) => {
            if ((fr === r && fc >= c) || (fc === c && fr >= r)) {
                document.getElementById(`tile-${fr}-${fc}`)?.classList.add('removing');
            }
        });
        
        setTimeout(() => this.finishMove(r, c), this.ANIMATION_MS);
    }
    
    finishMove(r, c) {
        const finished = this.game.makeMove(r, c);
        this.isAnimating = false;
        if (finished) {
            SoundManager.play('win');
            this.gameOverMessage.textContent = `Player ${this.game.currentPlayer} wins!`;
            this.gameOverModal.classList.add('visible');
            this.redrawBoard();
            this.updateUndoButton();
            this.updateDownloadButton();
            return;
        }
        this.redrawBoard();
        this.updateStatus();
        this.updateUndoButton();
        this.updateDownloadButton();
        if (this.game.isAiTurn()) { this.aiTurn(); }
    }
    redrawBoard() {
        this.boardArea.querySelectorAll('.tile').forEach(tile => tile.remove());
        
        if (!this.game) return;
        
        const board = this.game.getBoard();
        
        // Draw squares for the board
        board.squares().forEach(({ r, c }) => {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.id = `tile-${r}-${c}`;
            tile.style.width = `${this.CELL}px`;
            tile.style.height = `${this.CELL}px`;
            tile.style.left = `${this.MARGIN + c * this.CELL}px`;
            tile.style.top = `${this.MARGIN + r * this.CELL}px`;
            this.boardArea.appendChild(tile);
        });
        
        // Set board area size
        const boardWidth = board.cols * this.CELL;
        const boardHeight = board.rows * this.CELL;
        const minDimension = 480;
        
        this.boardArea.style.width = `${Math.max(this.MARGIN * 2 + boardWidth, minDimension)}px`;
        this.boardArea.style.height = `${Math.max(this.MARGIN * 2 + boardHeight, minDimension)}px`;
    }
    updateStatus() {
        if (!this.game) return;
        const kind = this.game.isAiTurn() ? "Computer" : "Human";
        const newText = `Player ${this.game.currentPlayer} (${kind}) to move`;
        if (this.statusLabel.textContent === newText) return;
        this.statusLabel.classList.add('exiting');
        setTimeout(() => {
            this.statusLabel.textContent = newText;
            this.statusLabel.classList.remove('exiting');
        }, 200);
    }
    showHelp() { this.helpPopover.classList.add('visible'); }
    hideHelp() { this.helpPopover.classList.remove('visible'); }
    initTheme() { const savedTheme = localStorage.getItem('theme') || 'light'; document.documentElement.setAttribute('data-theme', savedTheme); this.themeToggle.checked = savedTheme === 'dark'; }
    toggleTheme() { const newTheme = this.themeToggle.checked ? 'dark' : 'light'; document.documentElement.setAttribute('data-theme', newTheme); localStorage.setItem('theme', newTheme); }
    showSetupModal() { 
        this.gameOverModal.classList.remove('visible'); 
        this.setupModal.classList.add('visible');
        this.statusLabel.textContent = 'Waiting for start…';
        // Hide buttons when showing setup
        if (this.undoBtn) this.undoBtn.style.display = 'none';
        if (this.downloadBtn) this.downloadBtn.style.display = 'none';
    }
    updateDifficultyLabel() {
        const difficulty = this.difficultySlider.value;
        this.difficultyLabel.textContent = `AI Difficulty: ${difficulty}`;
    }
    generatePartition() {
        const partitionType = this.partitionTypeSelect.value;
        const n = parseInt(this.partitionNumberInput.value, 10);
        
        if (isNaN(n) || n <= 0 || n > 200) {
            alert("Please enter a positive number less than or equal to 200.");
            return;
        }
        
        let partition;
        if (partitionType === 'random') {
            partition = randomPartition(n);
        } else if (partitionType === 'staircase') {
            partition = staircase(n);
        } else if (partitionType === 'square') {
            partition = square(n);
        } else if (partitionType === 'hook') {
            partition = hook(n);
        }
        this.rowsInput.value = partition.join(' ');
    }
    
    saveGameState() {
        if (!this.game) return;
        
        // Deep copy the current board state
        const boardCopy = {
            grid: this.game.getBoard().grid.map(row => [...row])
        };
        
        const gameState = {
            board: boardCopy,
            currentPlayer: this.game.currentPlayer
        };
        
        this.gameHistory.push(gameState);
        this.updateUndoButton();
        this.updateDownloadButton();
    }

    undoMove() {
        if (!this.game || this.gameHistory.length === 0 || this.isAnimating || this.game.isAiTurn()) {
            return;
        }

        SoundManager.play('click');
        
        // Restore the previous game state
        const previousState = this.gameHistory.pop();
        
        // Reconstruct the board
        this.game.getBoard().grid = previousState.board.grid.map(row => [...row]);
        this.game.gameState.currentPlayer = previousState.currentPlayer === 'A' ? 0 : 1;
        
        // Redraw the board and update UI
        this.redrawBoard();
        this.updateStatus();
        this.updateUndoButton();
        this.updateDownloadButton();
    }

    updateUndoButton() {
        if (!this.undoBtn) return;
        
        const canUndo = this.game && this.gameHistory.length > 0 && !this.isAnimating && !this.game.isAiTurn();
        
        if (this.game && this.gameHistory.length >= 0) {
            this.undoBtn.style.display = 'flex';
            this.undoBtn.disabled = !canUndo;
        } else {
            this.undoBtn.style.display = 'none';
        }
    }

    updateDownloadButton() {
        if (!this.downloadBtn) return;
        
        // Show download button if there's game history or current game state
        const hasGameData = this.game && (this.gameHistory.length > 0 || this.game.getBoard());
        
        if (hasGameData) {
            this.downloadBtn.style.display = 'flex';
            this.downloadBtn.disabled = false;
        } else {
            this.downloadBtn.style.display = 'none';
        }
    }

    clearGameHistory() {
        this.gameHistory = [];
        this.updateUndoButton();
        this.updateDownloadButton();
    }
    
    downloadGame() {
        if (!this.game) return;
        
        const gameData = {
            currentBoard: this.game.getBoard().grid,
            gameHistory: this.gameHistory,
            currentPlayer: this.game.currentPlayer,
            aiPlayer: this.game.aiIndex !== null ? Game.PLAYERS[this.game.aiIndex] : null
        };
        
        const gameState = JSON.stringify(gameData, null, 2);
        const blob = new Blob([gameState], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sato_welter_game.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

window.onload = () => {
    const app = new SatoWelterGui();
    app.showSetupModal();
}; 