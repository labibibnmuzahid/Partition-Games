// --- CORE GAME LOGIC ---

// Front page functionality

class Board {
    constructor(rows) { this.rows = [...rows]; }
    isEmpty() { return this.rows.length === 0; }
    height() { return this.rows.length; }
    width() { return this.rows.length ? Math.max(...this.rows) : 0; }
    removeTopRow() { this.rows.shift(); }
    removeLeftColumn() { this.rows = this.rows.map(r => r - 1).filter(r => r > 0); }
    squares() {
        const coords = [];
        for (let r = 0; r < this.rows.length; r++) { for (let c = 0; c < this.rows[r]; c++) coords.push({ r, c }); }
        return coords;
    }
    asTuple() { return JSON.stringify(this.rows); }
}
const grundyMemo = new Map();
function grundy(position) {
    if (position === '[]') return 0;
    if (grundyMemo.has(position)) return grundyMemo.get(position);
    const posArray = JSON.parse(position);
    const child1 = JSON.stringify(posArray.slice(1));
    const child2 = JSON.stringify(posArray.map(r => r - 1).filter(r => r > 0));
    const childValues = new Set([grundy(child1), grundy(child2)]);
    let g = 0;
    while (childValues.has(g)) { g++; }
    grundyMemo.set(position, g);
    return g;
}
function perfectMove(position) {
    if (position === '[]') throw new Error("No legal move");
    const posArray = JSON.parse(position);
    const childRow = JSON.stringify(posArray.slice(1));
    const childCol = JSON.stringify(posArray.map(r => r - 1).filter(r => r > 0));
    if (grundy(position) !== 0) {
        if (grundy(childRow) === 0) return "row";
        if (grundy(childCol) === 0) return "col";
    }
    return posArray.length > 0 ? "row" : "col";
}

function staircase(n) {
  let parts = []; 
  let t = n; 
  
  while (t >= 1) 
  {
    parts.push(t);
    t = t - 1; 
  }
  
  return parts; // Sort descending like other games
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
    constructor(board, aiPlayer) {
        this.board = board;
        this.currentIndex = 0;
        this.aiIndex = aiPlayer ? Game.PLAYERS.indexOf(aiPlayer) : null;
    }
    get currentPlayer() { return Game.PLAYERS[this.currentIndex]; }
    isAiTurn() { return this.aiIndex === this.currentIndex; }
    switchPlayer() { this.currentIndex = 1 - this.currentIndex; }
    makeMove(moveKind) {
        if (moveKind === "row") this.board.removeTopRow();
        else if (moveKind === "col") this.board.removeLeftColumn();
        const finished = this.board.isEmpty();
        if (!finished) this.switchPlayer();
        return finished;
    }
}

// --- RANDOM PARTITION UTILITIES ---
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
    
    return parts.sort((a, b) => b - a); // Sort descending like other games
}

// --- SOUND MANAGER ---
const SoundManager = {
    sounds: {},
    init() {
        // Sound effects disabled
    },
    play(soundName) {
        // Sound effects disabled
    }
};

// --- GUI CONTROLLER ---
class ProLCTRGui {
    constructor() {
        this.CELL = 40;
        this.MARGIN = 20;
        this.ANIMATION_MS = 500;
        this.AI_THINK_MS = 800;
        this.game = null;
        this.hoveredMove = null;
        this.isAnimating = false;
        this.aiDifficulty = 'Medium';
        this.gameHistory = [];
        
        this.getDOMElements();
        this.bindEventListeners();
        this.initTheme();
        SoundManager.init();
        this.showSetupModal(); // Ensure modal is shown on load
    }

    getDOMElements() {
        this.gameCard = document.getElementById('game-card');
        this.statusLabel = document.getElementById('status-label');
        this.boardArea = document.getElementById('board-area');
        this.aiThinkingIndicator = document.getElementById('ai-thinking-indicator');
        this.newGameBtn = document.getElementById('new-game-btn');
        this.themeToggle = document.getElementById('theme-toggle');
        this.themeSelect = document.getElementById('theme-select'); // Add theme select
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
            this.downloadBtnModal.addEventListener('click', () => { 
                SoundManager.play('click'); 
                this.downloadGame(); 
            });
        }
        if (this.themeSelect) {
            this.themeSelect.addEventListener('change', () => this.applyTileTheme());
        }
        // Add board interaction event listeners
        this.boardArea.addEventListener('mousemove', (event) => this.handleMouseMove(event));
        this.boardArea.addEventListener('mouseleave', () => this.handleMouseLeave());
        this.boardArea.addEventListener('click', () => this.handleMouseClick());
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
            this.aiDifficulty = this.difficultySlider.value; // Changed to slider value
            // Set tile theme
            this.applyTileTheme();
            // Hide modal fully
            this.setupModal.classList.remove('visible');
            this.setupModal.style.opacity = '0';
            this.setupModal.style.visibility = 'hidden';

            this.startGame(nums, aiSide);
        } catch (e) {
            alert("Invalid input. Please enter positive integers only.");
        }
    }

    generateGeneralRandomBoard() {
        SoundManager.play('click');
        const n = randomInt(15, 40);
        const partition = randomPartition(n);
        this.rowsInput.value = partition.join(' ');
    }

    generateSpecificRandomBoard() {
        SoundManager.play('click');
        const n = parseInt(this.partitionNumberInput.value, 10);
        if (isNaN(n) || n <= 0 || n > 200) {
            alert("Please enter a positive number less than or equal to 200.");
            return;
        }
        const partition = randomPartition(n);
        this.rowsInput.value = partition.join(' ');
    }

    generateSpecificRandomBoardStairCase() {  
    SoundManager.play('click');  
  
    const n = parseInt(this.partitionNumberInput.value, 10); // <-- fixed  
    if (isNaN(n) || n <= 0 || n > 200) {  
        alert("Please enter a positive number less than or equal to 200.");  
        return;  
    }  
    const partition = staircase(n);          // [n, n-1, … , 1]  
    this.rowsInput.value = partition.join(' ');  
    }  

    startGame(rows, aiSide) {
        this.initialPartition = [...rows]; // Store the original partition for replay
        this.game = new Game(new Board(rows), aiSide);
        this.hoveredMove = null;
        this.isAnimating = false;
        this.redrawBoard();
        this.updateStatus();
        if (this.game.isAiTurn()) { this.aiTurn(); }
    }

    aiTurn() {
        if (!this.game || !this.game.isAiTurn() || this.isAnimating) return;
        
        this.aiThinkingIndicator.classList.add('thinking');
        
        setTimeout(() => {
            this.aiThinkingIndicator.classList.remove('thinking');
            let move;
            const rand = Math.random();
            const legalMoves = [];
            if (this.game.board.height() > 0) legalMoves.push('row');
            if (this.game.board.width() > 0) legalMoves.push('col');

            if ((this.aiDifficulty === 'Easy' && rand < 0.75) || (this.aiDifficulty === 'Medium' && rand < 0.30)) {
                move = legalMoves[Math.floor(Math.random() * legalMoves.length)];
            } else {
                move = perfectMove(this.game.board.asTuple());
            }
            this.executeWithAnimation(move);
        }, this.AI_THINK_MS);
    }
    
    handleMouseMove(event) {
        if (!this.game || this.game.isAiTurn() || this.isAnimating) return;
        const rect = this.boardArea.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        let detectedMove = null;
        
        // Calculate extra left margin for wide boards
        const extraLeftMargin = this.game.board.width() > 30 ? 20 : 0;
        
        // Special handling for top-left cell - edge-based hover
        const topLeftCellLeft = this.MARGIN + extraLeftMargin;
        const topLeftCellTop = this.MARGIN;
        const topLeftCellRight = this.MARGIN + extraLeftMargin + this.CELL;
        const topLeftCellBottom = this.MARGIN + this.CELL;
        
        if (this.game.board.height() > 0 && this.game.board.width() > 0 && 
            mouseX >= topLeftCellLeft && mouseX <= topLeftCellRight && 
            mouseY >= topLeftCellTop && mouseY <= topLeftCellBottom) {
            
            // Calculate distances to bottom and right edges
            const distToBottom = topLeftCellBottom - mouseY;
            const distToRight = topLeftCellRight - mouseX;
            
            // Determine which edge is closer
            if (distToBottom < distToRight) {
                detectedMove = 'col'; // Bottom edge → illuminate column
            } else {
                detectedMove = 'row'; // Right edge → illuminate row
            }
        }
        // Original logic for other areas
        else if (this.game.board.height() > 0 && mouseY >= this.MARGIN && mouseY <= this.MARGIN + this.CELL && mouseX >= this.MARGIN + extraLeftMargin && mouseX <= this.MARGIN + extraLeftMargin + this.game.board.rows[0] * this.CELL) {
            detectedMove = 'row';
        } else if (this.game.board.width() > 0 && mouseX >= this.MARGIN + extraLeftMargin && mouseX <= this.MARGIN + extraLeftMargin + this.CELL && mouseY >= this.MARGIN && mouseY <= this.MARGIN + this.game.board.height() * this.CELL) {
            detectedMove = 'col';
        }

        if (detectedMove !== this.hoveredMove) {
            if (detectedMove) SoundManager.play('hover');
            this.hoveredMove = detectedMove;
            this.gameCard.querySelectorAll('.tile.highlighted').forEach(t => t.classList.remove('highlighted'));
            if (this.hoveredMove === 'row') {
                for (let c = 0; c < this.game.board.rows[0]; c++) { document.getElementById(`tile-0-${c}`)?.classList.add('highlighted'); }
            } else if (this.hoveredMove === 'col') {
                for (let r = 0; r < this.game.board.height(); r++) { document.getElementById(`tile-${r}-0`)?.classList.add('highlighted'); }
            }
        }
        this.boardArea.classList.toggle('clickable', !!this.hoveredMove);
    }

    handleMouseLeave() {
        this.hoveredMove = null;
        this.gameCard.querySelectorAll('.tile.highlighted').forEach(t => t.classList.remove('highlighted'));
        this.boardArea.classList.remove('clickable');
    }

    executeWithAnimation(moveKind) {
        if (this.isAnimating) return;
        this.isAnimating = true;
        this.handleMouseLeave();
        SoundManager.play('remove');
        if (moveKind === 'row') {
            for (let c = 0; c < this.game.board.rows[0]; c++) { document.getElementById(`tile-0-${c}`)?.classList.add('removing'); }
            for (let r = 1; r < this.game.board.height(); r++) {
                for (let c = 0; c < this.game.board.rows[r]; c++) {
                    const tile = document.getElementById(`tile-${r}-${c}`);
                    if (tile) { tile.style.top = `${parseInt(tile.style.top) - this.CELL}px`; }
                }
            }
        } else { // 'col'
            for (let r = 0; r < this.game.board.height(); r++) { document.getElementById(`tile-${r}-0`)?.classList.add('removing'); }
        }
        setTimeout(() => this.finishMove(moveKind), this.ANIMATION_MS);
    }
    
    finishMove(moveKind) {
        this.saveGameState();
        const finished = this.game.makeMove(moveKind);
        this.isAnimating = false;
        if (finished) {
            SoundManager.play('win');
            this.gameOverMessage.textContent = `Player ${this.game.currentPlayer} wins!`;
            this.gameOverModal.classList.add('visible');
            this.redrawBoard();
            return;
        }
        this.redrawBoard();
        this.updateStatus();
        if (this.game.isAiTurn()) { this.aiTurn(); }
    }

    saveGameState() {
        if (!this.game) return;
        const boardCopy = {
            grid: this.game.board.rows.map(row => row)
        };
        const gameState = {
            board: boardCopy,
            currentIndex: this.game.currentIndex
        };
        this.gameHistory = this.gameHistory || [];
        this.gameHistory.push(gameState);
    }

    redrawBoard() {
        this.boardArea.querySelectorAll('.tile').forEach(tile => tile.remove());
        if (!this.game) return;
        
        // Add small left margin for very wide boards (CSS handles main off-screen prevention)
        const extraLeftMargin = this.game.board.width() > 30 ? 20 : 0;
        
        this.game.board.squares().forEach(({ r, c }) => {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.id = `tile-${r}-${c}`;
            tile.style.width = `${this.CELL}px`;
            tile.style.height = `${this.CELL}px`;
            tile.style.left = `${this.MARGIN + extraLeftMargin + c * this.CELL}px`;
            tile.style.top = `${this.MARGIN + r * this.CELL}px`;
            this.boardArea.appendChild(tile);
        });
        
        // Set board area size explicitly with extra left margin for wide boards
        const boardDataWidth = this.game.board.width() * this.CELL;
        const boardDataHeight = this.game.board.height() * this.CELL;
        
        let boardWidth = this.MARGIN * 2 + boardDataWidth + extraLeftMargin;
        let boardHeight = this.MARGIN * 2 + boardDataHeight;
        
        // Set minimum dimensions (like CRIM)
        const minDimension = 480;
        boardWidth = Math.max(boardWidth, minDimension);
        boardHeight = Math.max(boardHeight, minDimension);
        
        this.boardArea.style.width = `${boardWidth}px`;
        this.boardArea.style.height = `${boardHeight}px`;
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
    
    handleMouseClick() { if (this.hoveredMove) { this.requestMove(this.hoveredMove); } }
    requestMove(moveKind) { if (!this.isAnimating && !this.game.isAiTurn() && moveKind) { this.executeWithAnimation(moveKind); } }
    showHelp() { this.helpPopover.classList.add('visible'); }
    hideHelp() { this.helpPopover.classList.remove('visible'); }
    initTheme() { const savedTheme = localStorage.getItem('theme') || 'light'; document.documentElement.setAttribute('data-theme', savedTheme); this.themeToggle.checked = savedTheme === 'dark'; }
    toggleTheme() { const newTheme = this.themeToggle.checked ? 'dark' : 'light'; document.documentElement.setAttribute('data-theme', newTheme); localStorage.setItem('theme', newTheme); }
    showSetupModal() { this.gameOverModal.classList.remove('visible'); this.setupModal.classList.add('visible'); }
    updateDifficultyLabel() {
        const difficulty = this.difficultySlider.value;
        this.difficultyLabel.textContent = `AI Difficulty: ${difficulty}`;
    }
    generatePartition() {
        const partitionType = this.partitionTypeSelect.value;
        const n = parseInt(this.partitionNumberInput.value, 10);
        let partition;
        if (partitionType === 'random') {
            partition = randomPartition(n);
        } else if (partitionType === 'staircase') {
            partition = staircase(n);
        }
        
        else if (partitionType === 'square') {
            partition = square(n);
        }

        else if (partitionType === 'hook') {
            partition = hook(n);
        }
        this.rowsInput.value = partition.join(' ');
    }
    downloadGame() {
        if (!this.game) return;
        // Build the full move history (including current state)
        const allStates = (this.gameHistory || []).map(state => {
            let mask = state.board && state.board.grid ? state.board.grid : state.board;
            return { mask, currentIndex: state.currentIndex };
        });
        // Add the current state
        let currentMask = this.game.board.rows;
        allStates.push({ mask: currentMask, currentIndex: this.game.currentIndex, timestamp: Date.now() });
        // Generate HTML, pass initialPartition
        const htmlContent = this.generateGameReplayHTML_LCTR(allStates, this.initialPartition);
        // Download
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `LCTR-Game-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    generateGameReplayHTML_LCTR(gameStates, initialPartition) {
        const title = `LCTR Game Replay - ${new Date().toLocaleDateString()}`;
        return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title}</title>
<style>
 body{font-family:sans-serif;background:#fff;color:#111;margin:0;padding:20px;
       min-height:100vh;display:flex;flex-direction:column;align-items:center;}
 .container{background:#fff;border-radius:20px;padding:30px;max-width:800px;width:100%;
            box-shadow:0 4px 24px #0001;text-align:center;}
 h1{margin-top:0;color:#111;letter-spacing:1px;}
 .controls{margin:20px 0;display:flex;justify-content:center;align-items:center;
           gap:20px;flex-wrap:wrap;}
 button{padding:12px 20px;font-size:16px;border:none;border-radius:8px;
        background:#eee;color:#111;cursor:pointer;transition:all .2s;}
 button:hover{background:#ddd;transform:translateY(-2px);}
 button:disabled{opacity:.5;cursor:not-allowed;transform:none;}
 .state-info{font-size:18px;margin:10px 0;font-weight:bold;color:#111;}
 #game-canvas{border:2px solid #111;border-radius:12px;margin:20px auto;display:block;
             background:#fff;box-shadow:0 8px 25px #0001;}
 .instructions{margin-top:20px;font-size:14px;opacity:.7;line-height:1.6;}
 .error{color:#b00020;background:#f8d7da;padding:12px;border-radius:8px;margin:20px 0;font-size:1.1em;}
</style></head><body>
<div class="container">
 <h1>${title}</h1>
 <div class="state-info">State <span id="current-state">1</span> of
 <span id="total-states">${gameStates.length}</span></div>
 <div class="controls">
  <button id="first-btn" onclick="goToState(0)">⏮ First</button>
  <button id="prev-btn"  onclick="previousState()">◀ Previous</button>
  <button id="play-btn"  onclick="toggleAutoplay()">▶ Play</button>
  <button id="next-btn"  onclick="nextState()">Next ▶</button>
  <button id="last-btn"  onclick="goToState(gameStates.length-1)">Last ⏭</button>
 </div>
 <canvas id="game-canvas" width="400" height="400"></canvas>
 <div id="error-message" class="error" style="display:none"></div>
 <div class="instructions">
  <strong>Navigation:</strong> Use ←/→ keys or the buttons above.<br>
  <strong>Autoplay:</strong> Press Play to advance automatically.
 </div>
</div>
<script>
 const gameStates=${JSON.stringify(gameStates)};
 const initialPartition=${JSON.stringify(initialPartition)};
 let currentStateIndex=0,isPlaying=false,playInterval;
 const CELL_SIZE=40,MARGIN=20;
 const canvas=document.getElementById('game-canvas'),ctx=canvas.getContext('2d');
 const errorDiv=document.getElementById('error-message');
 function drawBoard(mask){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if(!Array.isArray(initialPartition)||!initialPartition.length){
    errorDiv.textContent='Game Ended.';errorDiv.style.display='block';return;
  }errorDiv.style.display='none';
  const boardHeight=initialPartition.length;
  const boardWidth=Math.max(...initialPartition, 0);
  const canvasWidth=MARGIN*2+boardWidth*CELL_SIZE;
  const canvasHeight=MARGIN*2+boardHeight*CELL_SIZE;
  canvas.width=canvasWidth;
  canvas.height=canvasHeight;
  ctx.clearRect(0,0,canvasWidth,canvasHeight);
  for(let r=0;r<boardHeight;r++){
    const rowLen = initialPartition[r];
    const maskLen = (mask && mask[r] !== undefined) ? (Array.isArray(mask[r]) ? mask[r].reduce((acc,v)=>acc+(v?1:0),0) : mask[r]) : 0;
    for(let c=0;c<rowLen;c++){
      const x=MARGIN+c*CELL_SIZE;
      const y=MARGIN+r*CELL_SIZE;
      ctx.fillStyle = c < maskLen ? '#111' : '#fff'; // black if present, white if removed
      ctx.fillRect(x,y,CELL_SIZE,CELL_SIZE);
    }
  }
  ctx.save();ctx.strokeStyle='#fff';ctx.lineWidth=1;
  for(let r=0;r<=boardHeight;r++){const y=MARGIN+r*CELL_SIZE;ctx.beginPath();ctx.moveTo(MARGIN,y);ctx.lineTo(MARGIN+boardWidth*CELL_SIZE,y);ctx.stroke();}
  for(let c=0;c<=boardWidth;c++){const x=MARGIN+c*CELL_SIZE;ctx.beginPath();ctx.moveTo(x,MARGIN);ctx.lineTo(x,MARGIN+boardHeight*CELL_SIZE);ctx.stroke();}
  ctx.restore();
 }
 function updateDisplay(){
  drawBoard(gameStates[currentStateIndex].mask);
  document.getElementById('current-state').textContent=currentStateIndex+1;
  document.getElementById('first-btn').disabled=currentStateIndex===0;
  document.getElementById('prev-btn').disabled =currentStateIndex===0;
  document.getElementById('next-btn').disabled =currentStateIndex===gameStates.length-1;
  document.getElementById('last-btn').disabled =currentStateIndex===gameStates.length-1;
 }
 function goToState(i){if(i>=0&&i<gameStates.length){currentStateIndex=i;updateDisplay();}}
 function nextState(){if(currentStateIndex<gameStates.length-1){currentStateIndex++;updateDisplay();}}
 function previousState(){if(currentStateIndex>0){currentStateIndex--;updateDisplay();}}
 function toggleAutoplay(){
  const btn=document.getElementById('play-btn');
  if(isPlaying){clearInterval(playInterval);isPlaying=false;btn.textContent='▶ Play';}
  else{isPlaying=true;btn.textContent='⏸ Pause';
    playInterval=setInterval(()=>{if(currentStateIndex<gameStates.length-1)nextState();else toggleAutoplay();},1000);}
 }
 document.addEventListener('keydown',e=>{
   if(e.key==='ArrowLeft'){e.preventDefault();previousState();}
   else if(e.key==='ArrowRight'){e.preventDefault();nextState();}
   else if(e.key===' '){e.preventDefault();toggleAutoplay();}
 });
 updateDisplay();
</script></body></html>`;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.lctrApp = new ProLCTRGui();
});