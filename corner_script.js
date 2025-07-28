// Corner Game Implementation
// Similar structure to CRIM/LCTR/IRT but with Corner-specific move logic

// Global variables
let currentPartition = [];
let gameHistory = [];
let currentPlayer = 1;
let gameMode = 'human';
let aiDifficulty = 'medium';
let gameOver = false;
let isReplay = false;

// Theme management
let currentTheme = 'default';
const themes = {
    default: {
        primary: '#2E86AB',
        secondary: '#A23B72',
        background: '#F18F01',
        text: '#C73E1D'
    },
    dark: {
        primary: '#4A90E2',
        secondary: '#9B59B6',
        background: '#2C3E50',
        text: '#ECF0F1'
    },
    forest: {
        primary: '#27AE60',
        secondary: '#E67E22',
        background: '#F39C12',
        text: '#2C3E50'
    },
    ocean: {
        primary: '#3498DB',
        secondary: '#1ABC9C',
        background: '#BDC3C7',
        text: '#2C3E50'
    }
};

// Initialize the game
function initializeGame() {
    setupEventListeners();
    loadTheme();
    updateDisplay();
}

// Event listeners setup
function setupEventListeners() {
    // Partition input
    document.getElementById('partition-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            setPartition();
        }
    });
    
    // Control buttons
    document.getElementById('set-partition').addEventListener('click', setPartition);
    document.getElementById('reset-game').addEventListener('click', resetGame);
    document.getElementById('undo-move').addEventListener('click', undoMove);
    document.getElementById('download-game').addEventListener('click', downloadGame);
    
    // Game mode and difficulty
    document.getElementById('game-mode').addEventListener('change', function() {
        gameMode = this.value;
        if (gameMode === 'ai' && currentPlayer === 2 && !gameOver) {
            setTimeout(makeAIMove, 500);
        }
    });
    
    document.getElementById('ai-difficulty').addEventListener('change', function() {
        aiDifficulty = this.value;
    });
    
    // Theme selector
    document.getElementById('theme-select').addEventListener('change', function() {
        currentTheme = this.value;
        applyTheme();
        saveTheme();
    });
    
    // Modal controls
    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('modal-overlay').addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });
    
    // Rules modal
    document.getElementById('show-rules').addEventListener('click', showRules);
}

// Partition utilities
function parsePartition(input) {
    if (!input.trim()) return [];
    
    const parts = input.split(/[,\s]+/).filter(p => p.length > 0);
    const partition = [];
    
    for (const part of parts) {
        const num = parseInt(part);
        if (isNaN(num) || num <= 0) {
            throw new Error(`Invalid partition element: ${part}`);
        }
        partition.push(num);
    }
    
    return partition.sort((a, b) => b - a); // Sort in descending order
}

function formatPartition(partition) {
    return partition.join(', ');
}

function isValidPartition(partition) {
    return Array.isArray(partition) && 
           partition.length > 0 && 
           partition.every(n => Number.isInteger(n) && n > 0);
}

// Set partition from input
function setPartition() {
    const input = document.getElementById('partition-input').value;
    
    try {
        const partition = parsePartition(input);
        if (!isValidPartition(partition)) {
            throw new Error('Invalid partition format');
        }
        
        currentPartition = [...partition];
        gameHistory = [{ partition: [...currentPartition], player: currentPlayer }];
        currentPlayer = 1;
        gameOver = false;
        isReplay = false;
        
        updateDisplay();
        
        if (gameMode === 'ai' && currentPlayer === 2) {
            setTimeout(makeAIMove, 500);
        }
        
    } catch (error) {
        showMessage(`Error: ${error.message}`, 'error');
    }
}

// Game logic - Corner-specific moves
function getValidMoves(partition) {
    if (!partition || partition.length === 0) return [];
    
    const moves = [];
    
    // Count frequency of each row length
    const lengthCounts = {};
    partition.forEach(length => {
        lengthCounts[length] = (lengthCounts[length] || 0) + 1;
    });
    
    // Group consecutive rows of same length
    const groups = [];
    let currentGroup = [0];
    
    for (let i = 1; i < partition.length; i++) {
        if (partition[i] === partition[i-1]) {
            currentGroup.push(i);
        } else {
            groups.push([...currentGroup]);
            currentGroup = [i];
        }
    }
    groups.push(currentGroup);
    
    // For each group, only the last row loses a cell
    for (const group of groups) {
        const lastIndex = group[group.length - 1];
        const rowLength = partition[lastIndex];
        if (rowLength > 0) {
            moves.push(lastIndex);
        }
    }
    
    return moves.sort((a, b) => a - b);
}

function makeMove(rowIndex) {
    if (gameOver || isReplay) return false;
    
    const validMoves = getValidMoves(currentPartition);
    if (!validMoves.includes(rowIndex)) {
        showMessage('Invalid move!', 'error');
        return false;
    }
    
    // Save current state to history
    gameHistory.push({ 
        partition: [...currentPartition], 
        player: currentPlayer,
        move: rowIndex
    });
    
    // Make the move
    currentPartition[rowIndex]--;
    
    // Remove empty rows
    currentPartition = currentPartition.filter(n => n > 0);
    
    // Check for game end
    if (currentPartition.length === 0) {
        gameOver = true;
        showMessage(`Player ${currentPlayer} wins!`, 'success');
        // Save final empty state
        gameHistory.push({ 
            partition: [], 
            player: currentPlayer,
            winner: currentPlayer
        });
    } else {
        currentPlayer = currentPlayer === 1 ? 2 : 1;
        
        if (gameMode === 'ai' && currentPlayer === 2 && !gameOver) {
            setTimeout(makeAIMove, 500);
        }
    }
    
    updateDisplay();
    return true;
}

// AI implementation
function makeAIMove() {
    if (gameOver || currentPlayer !== 2 || gameMode !== 'ai') return;
    
    let move;
    
    switch (aiDifficulty) {
        case 'easy':
            move = getRandomMove();
            break;
        case 'medium':
            move = getMediumMove();
            break;
        case 'hard':
            move = getOptimalMove();
            break;
        default:
            move = getRandomMove();
    }
    
    if (move !== null) {
        makeMove(move);
    }
}

function getRandomMove() {
    const validMoves = getValidMoves(currentPartition);
    if (validMoves.length === 0) return null;
    return validMoves[Math.floor(Math.random() * validMoves.length)];
}

function getMediumMove() {
    const validMoves = getValidMoves(currentPartition);
    if (validMoves.length === 0) return null;
    
    // Try to make a strategic move 70% of the time, random 30%
    if (Math.random() < 0.7) {
        const strategicMove = getOptimalMove();
        if (strategicMove !== null) return strategicMove;
    }
    
    return getRandomMove();
}

function getOptimalMove() {
    const validMoves = getValidMoves(currentPartition);
    if (validMoves.length === 0) return null;
    
    // For optimal play, we need to calculate Grundy numbers
    // For simplicity, we'll use a heuristic approach
    
    let bestMove = null;
    let bestScore = -Infinity;
    
    for (const move of validMoves) {
        const testPartition = [...currentPartition];
        testPartition[move]--;
        const filteredPartition = testPartition.filter(n => n > 0);
        
        const score = evaluatePosition(filteredPartition);
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }
    
    return bestMove !== null ? bestMove : getRandomMove();
}

function evaluatePosition(partition) {
    if (partition.length === 0) return 1000; // Winning position
    
    // Simple heuristic: prefer positions with fewer total cells
    const totalCells = partition.reduce((sum, n) => sum + n, 0);
    return -totalCells;
}

// Display and UI functions
function updateDisplay() {
    updateGameBoard();
    updateGameInfo();
    updateControls();
}

function updateGameBoard() {
    const gameBoard = document.getElementById('game-board');
    gameBoard.innerHTML = '';
    
    if (currentPartition.length === 0) {
        gameBoard.innerHTML = '<div class="empty-board">Game Over</div>';
        return;
    }
    
    // Calculate maximum row length for consistent grid
    const maxLength = Math.max(...currentPartition);
    
    // Create grid container
    const gridContainer = document.createElement('div');
    gridContainer.className = 'partition-grid';
    gridContainer.style.gridTemplateColumns = `auto repeat(${maxLength}, 1fr)`;
    
    currentPartition.forEach((rowLength, rowIndex) => {
        // Row label
        const rowLabel = document.createElement('div');
        rowLabel.className = 'label-cell';
        rowLabel.textContent = rowIndex + 1;
        gridContainer.appendChild(rowLabel);
        
        // Row cells
        for (let col = 0; col < maxLength; col++) {
            const cell = document.createElement('div');
            cell.className = col < rowLength ? 'tile' : 'tile empty';
            
            if (col < rowLength) {
                // Check if this row can be moved
                const validMoves = getValidMoves(currentPartition);
                const canMove = validMoves.includes(rowIndex);
                
                if (canMove && col === rowLength - 1 && !gameOver && !isReplay) {
                    cell.classList.add('moveable');
                    cell.addEventListener('click', () => makeMove(rowIndex));
                }
                
                cell.textContent = col + 1;
            }
            
            gridContainer.appendChild(cell);
        }
    });
    
    gameBoard.appendChild(gridContainer);
}

function updateGameInfo() {
    const currentPlayerSpan = document.getElementById('current-player');
    const gameStatusDiv = document.getElementById('game-status');
    
    if (gameOver) {
        const winner = gameHistory[gameHistory.length - 1].winner;
        currentPlayerSpan.textContent = winner;
        gameStatusDiv.textContent = `Game Over - Player ${winner} Wins!`;
        gameStatusDiv.className = 'game-status winner';
    } else if (isReplay) {
        gameStatusDiv.textContent = 'Viewing Replay';
        gameStatusDiv.className = 'game-status replay';
    } else {
        currentPlayerSpan.textContent = currentPlayer;
        gameStatusDiv.textContent = gameMode === 'ai' && currentPlayer === 2 ? 
            'AI is thinking...' : `Player ${currentPlayer}'s turn`;
        gameStatusDiv.className = 'game-status';
    }
    
    // Update partition display
    document.getElementById('current-partition').textContent = 
        currentPartition.length > 0 ? formatPartition(currentPartition) : 'Empty';
}

function updateControls() {
    const undoButton = document.getElementById('undo-move');
    const downloadButton = document.getElementById('download-game');
    
    undoButton.disabled = gameHistory.length <= 1 || isReplay;
    downloadButton.disabled = gameHistory.length <= 1;
}

// Game controls
function resetGame() {
    currentPartition = [];
    gameHistory = [];
    currentPlayer = 1;
    gameOver = false;
    isReplay = false;
    
    document.getElementById('partition-input').value = '';
    updateDisplay();
}

function undoMove() {
    if (gameHistory.length <= 1 || isReplay) return;
    
    gameHistory.pop(); // Remove current state
    const previousState = gameHistory[gameHistory.length - 1];
    
    currentPartition = [...previousState.partition];
    currentPlayer = previousState.player;
    gameOver = false;
    
    updateDisplay();
}

// Download and replay functionality
function downloadGame() {
    if (gameHistory.length <= 1) return;
    
    const gameData = {
        game: 'Corner',
        history: gameHistory,
        finalPartition: currentPartition,
        winner: gameOver ? gameHistory[gameHistory.length - 1].winner : null
    };
    
    const htmlContent = generateReplayHTML(gameData);
    downloadHTML(htmlContent, 'corner_game_replay.html');
}

function generateReplayHTML(gameData) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Corner Game Replay</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .replay-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .replay-header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #e0e0e0;
        }
        .replay-controls {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 10px;
            margin: 20px 0;
            padding: 15px;
            background-color: #f8f9fa;
            border-radius: 8px;
        }
        .replay-controls button {
            padding: 8px 16px;
            border: none;
            border-radius: 5px;
            background-color: #007bff;
            color: white;
            cursor: pointer;
            font-size: 14px;
        }
        .replay-controls button:hover {
            background-color: #0056b3;
        }
        .replay-controls button:disabled {
            background-color: #6c757d;
            cursor: not-allowed;
        }
        .step-info {
            text-align: center;
            margin: 10px 0;
            font-weight: bold;
        }
        .game-board {
            display: flex;
            justify-content: center;
            margin: 20px 0;
        }
        .partition-grid {
            display: grid;
            gap: 2px;
            margin: 10px;
        }
        .tile {
            width: 35px;
            height: 35px;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #007bff;
            color: white;
            border-radius: 4px;
            font-weight: bold;
            font-size: 12px;
        }
        .tile.empty {
            background-color: #e9ecef;
            color: #6c757d;
        }
        .label-cell {
            width: 35px;
            height: 35px;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #6c757d;
            color: white;
            border-radius: 4px;
            font-weight: bold;
            font-size: 12px;
        }
        .move-info {
            text-align: center;
            margin: 15px 0;
            padding: 10px;
            background-color: #e3f2fd;
            border-radius: 5px;
        }
        .winner-announcement {
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            color: #28a745;
            margin: 20px 0;
            padding: 15px;
            background-color: #d4edda;
            border-radius: 8px;
            border: 2px solid #c3e6cb;
        }
    </style>
</head>
<body>
    <div class="replay-container">
        <div class="replay-header">
            <h1>Corner Game Replay</h1>
            <p>Total moves: ${gameData.history.length - 1}</p>
            ${gameData.winner ? `<p>Winner: Player ${gameData.winner}</p>` : ''}
        </div>
        
        <div class="replay-controls">
            <button onclick="goToStep(0)">⏮ Start</button>
            <button onclick="previousStep()">⏪ Previous</button>
            <button onclick="nextStep()">⏩ Next</button>
            <button onclick="goToStep(gameHistory.length - 1)">⏭ End</button>
        </div>
        
        <div class="step-info">
            <span>Step: </span><span id="current-step">1</span>
            <span> / </span><span id="total-steps">${gameData.history.length}</span>
        </div>
        
        <div id="move-info" class="move-info"></div>
        <div id="game-board" class="game-board"></div>
        <div id="winner-announcement" class="winner-announcement" style="display: none;"></div>
    </div>

    <script>
        const gameHistory = ${JSON.stringify(gameData.history)};
        let currentStep = 0;

        function displayStep(step) {
            currentStep = Math.max(0, Math.min(step, gameHistory.length - 1));
            const state = gameHistory[currentStep];
            
            document.getElementById('current-step').textContent = currentStep + 1;
            
            displayBoard(state.partition);
            updateMoveInfo(state, currentStep);
            updateWinnerDisplay(state);
        }

        function displayBoard(partition) {
            const gameBoard = document.getElementById('game-board');
            gameBoard.innerHTML = '';
            
            if (partition.length === 0) {
                gameBoard.innerHTML = '<div style="text-align: center; font-size: 18px; color: #666;">Game Over - Empty Board</div>';
                return;
            }
            
            const maxLength = Math.max(...partition);
            const gridContainer = document.createElement('div');
            gridContainer.className = 'partition-grid';
            gridContainer.style.gridTemplateColumns = \`auto repeat(\${maxLength}, 1fr)\`;
            
            partition.forEach((rowLength, rowIndex) => {
                const rowLabel = document.createElement('div');
                rowLabel.className = 'label-cell';
                rowLabel.textContent = rowIndex + 1;
                gridContainer.appendChild(rowLabel);
                
                for (let col = 0; col < maxLength; col++) {
                    const cell = document.createElement('div');
                    cell.className = col < rowLength ? 'tile' : 'tile empty';
                    if (col < rowLength) {
                        cell.textContent = col + 1;
                    }
                    gridContainer.appendChild(cell);
                }
            });
            
            gameBoard.appendChild(gridContainer);
        }

        function updateMoveInfo(state, step) {
            const moveInfo = document.getElementById('move-info');
            
            if (step === 0) {
                moveInfo.textContent = \`Initial partition: [\${state.partition.join(', ')}] - Player \${state.player}'s turn\`;
            } else if (state.winner) {
                moveInfo.textContent = \`Final state - Player \${state.winner} wins!\`;
            } else {
                const prevState = gameHistory[step - 1];
                const moveRow = state.move !== undefined ? state.move + 1 : 'unknown';
                moveInfo.textContent = \`Player \${prevState.player} moved row \${moveRow}. Player \${state.player}'s turn.\`;
            }
        }

        function updateWinnerDisplay(state) {
            const winnerDiv = document.getElementById('winner-announcement');
            if (state.winner) {
                winnerDiv.textContent = \`🎉 Player \${state.winner} Wins! 🎉\`;
                winnerDiv.style.display = 'block';
            } else {
                winnerDiv.style.display = 'none';
            }
        }

        function nextStep() {
            if (currentStep < gameHistory.length - 1) {
                displayStep(currentStep + 1);
            }
        }

        function previousStep() {
            if (currentStep > 0) {
                displayStep(currentStep - 1);
            }
        }

        function goToStep(step) {
            displayStep(step);
        }

        // Initialize replay
        displayStep(0);
    </script>
</body>
</html>`;
}

function downloadHTML(content, filename) {
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Theme management
function loadTheme() {
    const savedTheme = localStorage.getItem('cornerGameTheme');
    if (savedTheme && themes[savedTheme]) {
        currentTheme = savedTheme;
        document.getElementById('theme-select').value = currentTheme;
    }
    applyTheme();
}

function saveTheme() {
    localStorage.setItem('cornerGameTheme', currentTheme);
}

function applyTheme() {
    const theme = themes[currentTheme];
    const root = document.documentElement;
    
    root.style.setProperty('--primary-color', theme.primary);
    root.style.setProperty('--secondary-color', theme.secondary);
    root.style.setProperty('--background-color', theme.background);
    root.style.setProperty('--text-color', theme.text);
}

// Modal functions
function showRules() {
    const modal = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    
    content.innerHTML = `
        <h2>Corner Game Rules</h2>
        <div class="rules-content">
            <p><strong>Objective:</strong> Be the player who makes the last move.</p>
            
            <h3>How to Play:</h3>
            <ol>
                <li>The game starts with a partition (rows of different lengths)</li>
                <li>On each turn, remove the last cell from certain rows according to the Corner rule</li>
                <li>The Corner rule: Remove the last cell of each row, EXCEPT when there are consecutive rows of the same length - in that case, only the last row in each consecutive block loses a cell</li>
                <li>Empty rows are automatically removed from the board</li>
                <li>The player who makes the last move (resulting in an empty board) wins</li>
            </ol>
            
            <h3>Example:</h3>
            <p>If you have rows of lengths [4, 3, 3, 2]:</p>
            <ul>
                <li>Row 1 (length 4): loses a cell → becomes length 3</li>
                <li>Row 2 (length 3): part of consecutive block with row 3, so no cell lost</li>
                <li>Row 3 (length 3): last in consecutive block, loses a cell → becomes length 2</li>
                <li>Row 4 (length 2): loses a cell → becomes length 1</li>
            </ul>
            <p>Result: [3, 3, 2, 1]</p>
            
            <h3>Tips:</h3>
            <ul>
                <li>Plan ahead - consider what moves your opponent will be forced to make</li>
                <li>Try to leave your opponent in a losing position</li>
                <li>Pay attention to when rows form consecutive groups of the same length</li>
            </ul>
        </div>
    `;
    
    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('modal-overlay').style.display = 'none';
}

function showMessage(message, type = 'info') {
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    // Style the message
    Object.assign(messageDiv.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '15px 20px',
        borderRadius: '5px',
        zIndex: '1000',
        fontSize: '14px',
        fontWeight: 'bold',
        minWidth: '200px',
        textAlign: 'center'
    });
    
    // Set colors based on type
    if (type === 'error') {
        messageDiv.style.backgroundColor = '#f8d7da';
        messageDiv.style.color = '#721c24';
        messageDiv.style.border = '1px solid #f5c6cb';
    } else if (type === 'success') {
        messageDiv.style.backgroundColor = '#d4edda';
        messageDiv.style.color = '#155724';
        messageDiv.style.border = '1px solid #c3e6cb';
    } else {
        messageDiv.style.backgroundColor = '#d1ecf1';
        messageDiv.style.color = '#0c5460';
        messageDiv.style.border = '1px solid #bee5eb';
    }
    
    document.body.appendChild(messageDiv);
    
    // Remove message after 3 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 3000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeGame);
