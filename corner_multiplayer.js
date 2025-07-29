// === MULTIPLAYER CORNER GAME ===
// WebSocket-based multiplayer implementation

class CornerMultiplayerGame {
    constructor() {
        this.ws = null;
        this.serverUrl = this.getServerUrl();
        this.playerName = '';
        this.roomId = null;
        this.playerNumber = null;
        this.currentPlayer = 1;
        this.gameState = 'disconnected'; // disconnected, connected, lobby, room, playing
        this.currentPartition = [];
        this.players = {};
        this.moveHistory = [];
        
        this.initializeElements();
        this.setupEventListeners();
        this.connectToServer();
    }

    getServerUrl() {
        // Try to connect to local server first, fallback to localhost
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname || 'localhost';
        const port = window.location.port || '8080';
        return `${protocol}//${host}:${port}`;
    }

    initializeElements() {
        // Connection elements
        this.connectionStatus = document.getElementById('connection-status');
        this.playerNameInput = document.getElementById('player-name');
        this.playerNameSection = document.getElementById('player-name-section');
        
        // Lobby elements
        this.lobbySection = document.getElementById('lobby-section');
        this.roomIdInput = document.getElementById('room-id-input');
        this.joinRoomBtn = document.getElementById('join-room-btn');
        this.createRoomBtn = document.getElementById('create-room-btn');
        this.refreshRoomsBtn = document.getElementById('refresh-rooms-btn');
        this.roomsList = document.getElementById('rooms-list');
        
        // Room elements
        this.roomSection = document.getElementById('room-section');
        this.currentRoomIdSpan = document.getElementById('current-room-id');
        this.player1Card = document.getElementById('player1-card');
        this.player2Card = document.getElementById('player2-card');
        this.player1Name = document.getElementById('player1-name');
        this.player2Name = document.getElementById('player2-name');
        this.leaveRoomBtn = document.getElementById('leave-room-btn');
        
        // Game setup elements
        this.gameSetupSection = document.getElementById('game-setup-section');
        this.setupRowsInput = document.getElementById('setup-rows-input');
        this.setupPartitionType = document.getElementById('setup-partition-type');
        this.setupPartitionNumber = document.getElementById('setup-partition-number');
        this.setupGenerateBtn = document.getElementById('setup-generate-btn');
        this.startGameBtn = document.getElementById('start-multiplayer-game-btn');
        
        // Game elements
        this.gameCard = document.getElementById('game-card');
        this.statusLabel = document.getElementById('status-label');
        this.boardArea = document.getElementById('board-area');
        
        // Theme elements
        this.themeSelect = document.getElementById('theme-select');
        this.themeToggle = document.getElementById('theme-toggle');
        this.helpBtn = document.getElementById('help-btn');
        this.helpPopover = document.getElementById('help-popover');
    }

    setupEventListeners() {
        // Connection
        this.playerNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && this.playerNameInput.value.trim()) {
                this.setPlayerName();
            }
        });

        // Lobby
        this.joinRoomBtn.addEventListener('click', () => this.joinRoom());
        this.createRoomBtn.addEventListener('click', () => this.showGameSetup());
        this.refreshRoomsBtn.addEventListener('click', () => this.refreshRooms());
        this.roomIdInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinRoom();
        });

        // Room
        this.leaveRoomBtn.addEventListener('click', () => this.leaveRoom());

        // Game setup
        this.setupGenerateBtn.addEventListener('click', () => this.generatePartition());
        this.startGameBtn.addEventListener('click', () => this.startGame());
        this.setupPartitionType.addEventListener('change', () => {
            const isCustom = this.setupPartitionType.value === 'custom';
            this.setupPartitionNumber.style.display = isCustom ? 'none' : 'inline-block';
            this.setupGenerateBtn.style.display = isCustom ? 'none' : 'inline-block';
        });

        // Theme
        this.themeSelect.addEventListener('change', () => this.applyTheme());
        this.themeToggle.addEventListener('change', () => this.toggleDarkMode());

        // Help
        this.helpBtn.addEventListener('click', () => this.toggleHelp());
        document.addEventListener('click', (e) => {
            if (this.helpPopover && 
                !this.helpBtn.contains(e.target) && 
                !this.helpPopover.contains(e.target)) {
                this.hideHelp();
            }
        });
    }

    // === CONNECTION MANAGEMENT ===

    connectToServer() {
        this.updateConnectionStatus('Connecting...', 'status-waiting');
        
        try {
            this.ws = new WebSocket(this.serverUrl);
            
            this.ws.onopen = () => {
                console.log('Connected to multiplayer server');
                this.updateConnectionStatus('Connected to server', 'status-connected');
                this.gameState = 'connected';
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleServerMessage(message);
                } catch (error) {
                    console.error('Error parsing server message:', error);
                }
            };

            this.ws.onclose = () => {
                console.log('Disconnected from server');
                this.updateConnectionStatus('Disconnected from server', 'status-disconnected');
                this.gameState = 'disconnected';
                
                // Try to reconnect after 3 seconds
                setTimeout(() => {
                    if (this.gameState === 'disconnected') {
                        this.connectToServer();
                    }
                }, 3000);
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.updateConnectionStatus('Connection error', 'status-disconnected');
            };

        } catch (error) {
            console.error('Failed to connect to server:', error);
            this.updateConnectionStatus('Failed to connect', 'status-disconnected');
        }
    }

    handleServerMessage(message) {
        console.log('Received message:', message.type);

        switch (message.type) {
            case 'CONNECTED':
                console.log('Server connection confirmed');
                break;
                
            case 'ROOM_CREATED':
                this.handleRoomCreated(message);
                break;
                
            case 'GAME_START':
                this.handleGameStart(message);
                break;
                
            case 'MOVE':
                this.handleMove(message);
                break;
                
            case 'PLAYER_LEFT':
                this.handlePlayerLeft(message);
                break;
                
            case 'ROOMS_LIST':
                this.handleRoomsList(message);
                break;
                
            case 'ERROR':
                this.showMessage(message.message, 'error');
                break;
                
            default:
                console.log('Unknown message type:', message.type);
        }
    }

    updateConnectionStatus(text, statusClass) {
        this.connectionStatus.textContent = text;
        this.connectionStatus.className = `connection-status ${statusClass}`;
    }

    // === LOBBY MANAGEMENT ===

    setPlayerName() {
        const name = this.playerNameInput.value.trim();
        if (!name) {
            this.showMessage('Please enter your name', 'error');
            return;
        }

        this.playerName = name;
        this.playerNameSection.style.display = 'none';
        this.lobbySection.style.display = 'block';
        this.gameState = 'lobby';
        this.refreshRooms();
    }

    refreshRooms() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'GET_ROOMS' }));
        }
    }

    handleRoomsList(message) {
        const roomsContainer = this.roomsList.querySelector('div') || this.roomsList;
        
        if (message.rooms.length === 0) {
            roomsContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted-color);">No public rooms available</div>';
        } else {
            roomsContainer.innerHTML = '';
            message.rooms.forEach(room => {
                const roomElement = document.createElement('div');
                roomElement.className = 'room-item';
                roomElement.innerHTML = `
                    <div>
                        <strong>${room.gameType}</strong> - ${room.hostName}<br>
                        <small>Room: ${room.id} (${room.playerCount}/${room.maxPlayers})</small>
                    </div>
                    <button onclick="multiplayerGame.joinSpecificRoom('${room.id}')" class="modal-btn" style="width: auto; padding: 4px 8px; font-size: 12px;">Join</button>
                `;
                roomsContainer.appendChild(roomElement);
            });
        }
        
        this.roomsList.style.display = 'block';
    }

    joinRoom() {
        const roomId = this.roomIdInput.value.trim().toUpperCase();
        if (!roomId) {
            this.showMessage('Please enter a room ID', 'error');
            return;
        }
        this.joinSpecificRoom(roomId);
    }

    joinSpecificRoom(roomId) {
        if (!this.playerName) {
            this.showMessage('Please set your name first', 'error');
            return;
        }

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'JOIN_ROOM',
                roomId: roomId,
                playerName: this.playerName
            }));
        }
    }

    showGameSetup() {
        this.lobbySection.style.display = 'none';
        this.gameSetupSection.style.display = 'block';
    }

    // === ROOM MANAGEMENT ===

    handleRoomCreated(message) {
        this.roomId = message.roomId;
        this.playerNumber = message.playerNumber;
        this.gameSetupSection.style.display = 'none';
        this.showRoom();
        
        this.showMessage(`Room ${this.roomId} created! Share this ID with your opponent.`, 'success');
    }

    handleGameStart(message) {
        this.roomId = message.roomId;
        this.playerNumber = message.yourPlayerNumber;
        this.currentPlayer = message.currentPlayer;
        this.currentPartition = [...message.initialPartition];
        this.players = {};
        
        message.players.forEach(player => {
            this.players[player.playerNumber] = player;
        });

        this.showRoom();
        this.updatePlayerCards();
        this.startGameplay();
        
        this.showMessage('Game started!', 'success');
    }

    showRoom() {
        this.lobbySection.style.display = 'none';
        this.gameSetupSection.style.display = 'none';
        this.roomSection.style.display = 'block';
        this.currentRoomIdSpan.textContent = this.roomId;
        this.gameState = 'room';
    }

    updatePlayerCards() {
        // Update player 1
        if (this.players[1]) {
            this.player1Name.textContent = this.players[1].name;
            this.player1Card.classList.toggle('you', this.playerNumber === 1);
        }

        // Update player 2
        if (this.players[2]) {
            this.player2Name.textContent = this.players[2].name;
            this.player2Card.classList.toggle('you', this.playerNumber === 2);
        } else {
            this.player2Name.textContent = 'Waiting...';
        }

        // Highlight current player
        this.player1Card.classList.toggle('active', this.currentPlayer === 1);
        this.player2Card.classList.toggle('active', this.currentPlayer === 2);
    }

    leaveRoom() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'LEAVE_ROOM' }));
        }
        this.returnToLobby();
    }

    handlePlayerLeft(message) {
        this.showMessage(message.message, 'warning');
        this.returnToLobby();
    }

    returnToLobby() {
        this.roomSection.style.display = 'none';
        this.gameCard.style.display = 'none';
        this.lobbySection.style.display = 'block';
        this.gameState = 'lobby';
        this.roomId = null;
        this.playerNumber = null;
        this.currentPartition = [];
        this.refreshRooms();
    }

    // === GAME SETUP ===

    generatePartition() {
        const type = this.setupPartitionType.value;
        const number = parseInt(this.setupPartitionNumber.value);

        if (!number || number <= 0) {
            this.showMessage('Please enter a valid number', 'error');
            return;
        }

        let partition = [];
        
        switch (type) {
            case 'random':
                partition = this.generateRandomPartition(number);
                break;
            case 'staircase':
                partition = this.generateStaircasePartition(number);
                break;
            case 'square':
                partition = this.generateSquarePartition(number);
                break;
            case 'hook':
                partition = this.generateHookPartition(number);
                break;
        }

        this.setupRowsInput.value = partition.join(' ');
    }

    generateRandomPartition(n) {
        const partition = [];
        let remaining = n;
        
        while (remaining > 0) {
            const part = Math.min(remaining, Math.floor(Math.random() * remaining) + 1);
            partition.push(part);
            remaining -= part;
        }
        
        return partition.sort((a, b) => b - a);
    }

    generateStaircasePartition(n) {
        const partition = [];
        let current = Math.floor(Math.sqrt(2 * n));
        
        while (current > 0 && partition.reduce((sum, val) => sum + val, 0) + current <= n) {
            partition.push(current);
            current--;
        }
        
        return partition;
    }

    generateSquarePartition(n) {
        const side = Math.floor(Math.sqrt(n));
        return new Array(side).fill(side);
    }

    generateHookPartition(n) {
        const arm = Math.floor(n / 2);
        const leg = n - arm;
        const partition = [arm];
        
        for (let i = 1; i < leg; i++) {
            partition.push(1);
        }
        
        return partition;
    }

    startGame() {
        const input = this.setupRowsInput.value.trim();
        if (!input) {
            this.showMessage('Please enter row lengths', 'error');
            return;
        }

        const partition = this.parsePartition(input);
        if (!partition || partition.length === 0) {
            this.showMessage('Invalid partition format', 'error');
            return;
        }

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'CREATE_ROOM',
                gameType: 'corner',
                initialPartition: partition,
                playerName: this.playerName,
                isPrivate: false
            }));
        }
    }

    parsePartition(input) {
        const parts = input.split(/[,\s]+/).filter(p => p.length > 0);
        const partition = [];
        
        for (const part of parts) {
            const num = parseInt(part);
            if (isNaN(num) || num <= 0) {
                return null;
            }
            partition.push(num);
        }
        
        return partition.sort((a, b) => b - a);
    }

    // === GAMEPLAY ===

    startGameplay() {
        this.roomSection.style.display = 'none';
        this.gameCard.style.display = 'block';
        this.gameState = 'playing';
        this.updateGameDisplay();
    }

    updateGameDisplay() {
        this.updateStatusLabel();
        this.updateBoard();
        this.updatePlayerCards();
    }

    updateStatusLabel() {
        if (this.currentPlayer === this.playerNumber) {
            this.statusLabel.textContent = "Your turn - Click to make a move";
            this.statusLabel.style.color = '#28a745';
        } else {
            this.statusLabel.textContent = `Waiting for ${this.players[this.currentPlayer]?.name || 'opponent'}...`;
            this.statusLabel.style.color = '#6c757d';
        }
    }

    updateBoard() {
        this.boardArea.innerHTML = '';
        
        if (this.currentPartition.length === 0) {
            this.boardArea.innerHTML = '<div style="text-align: center; font-size: 18px; color: #666;">Game Over</div>';
            return;
        }

        const maxLength = Math.max(...this.currentPartition);
        const gridContainer = document.createElement('div');
        gridContainer.className = 'partition-grid';
        gridContainer.style.display = 'grid';
        gridContainer.style.gridTemplateColumns = `auto repeat(${maxLength}, 1fr)`;
        gridContainer.style.gap = '4px';
        gridContainer.style.justifyContent = 'center';

        this.currentPartition.forEach((rowLength, rowIndex) => {
            // Row label
            const rowLabel = document.createElement('div');
            rowLabel.textContent = rowIndex + 1;
            rowLabel.style.cssText = `
                width: 35px; height: 35px; display: flex; align-items: center; 
                justify-content: center; background-color: #6c757d; color: white; 
                border-radius: 4px; font-weight: bold; font-size: 12px;
            `;
            gridContainer.appendChild(rowLabel);

            // Row cells
            for (let col = 0; col < maxLength; col++) {
                const cell = document.createElement('div');
                cell.style.cssText = `
                    width: 35px; height: 35px; display: flex; align-items: center; 
                    justify-content: center; border-radius: 4px; font-weight: bold; 
                    font-size: 12px; transition: all 0.2s ease;
                `;

                if (col < rowLength) {
                    cell.style.backgroundColor = 'var(--tile-bg, #007bff)';
                    cell.style.color = 'white';
                    cell.style.border = '2px solid var(--tile-border, #0056b3)';
                    cell.textContent = col + 1;

                    // Check if this is a valid move
                    if (this.isMyTurn() && this.isValidMove()) {
                        cell.style.cursor = 'pointer';
                        cell.style.boxShadow = '0 0 10px rgba(0, 123, 255, 0.5)';
                        
                        cell.addEventListener('click', () => this.makeMove());
                        cell.addEventListener('mouseenter', () => {
                            cell.style.transform = 'scale(1.1)';
                        });
                        cell.addEventListener('mouseleave', () => {
                            cell.style.transform = 'scale(1)';
                        });
                    }
                } else {
                    cell.style.backgroundColor = '#e9ecef';
                    cell.style.color = '#6c757d';
                    cell.style.border = '2px solid #dee2e6';
                    cell.style.opacity = '0.3';
                }

                gridContainer.appendChild(cell);
            }
        });

        this.boardArea.appendChild(gridContainer);
        this.applyTheme();
    }

    isMyTurn() {
        return this.currentPlayer === this.playerNumber;
    }

    isValidMove() {
        return this.currentPartition.length > 0;
    }

    makeMove() {
        if (!this.isMyTurn() || !this.isValidMove()) {
            return;
        }

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'MOVE',
                data: {
                    type: 'CORNER_MOVE'
                }
            }));
        }
    }

    handleMove(message) {
        const move = message.data;
        this.currentPlayer = message.currentPlayer;
        
        // Apply Corner move logic
        this.applyCornerMove();
        
        // Check for game end
        if (this.currentPartition.length === 0) {
            const winner = move.player;
            this.statusLabel.textContent = `Game Over! ${this.players[winner]?.name || `Player ${winner}`} wins!`;
            this.statusLabel.style.color = winner === this.playerNumber ? '#28a745' : '#dc3545';
            
            setTimeout(() => {
                this.returnToLobby();
            }, 3000);
        } else {
            this.updateGameDisplay();
        }
    }

    applyCornerMove() {
        // Group consecutive rows of same length
        const groups = this.groupConsecutiveRows(this.currentPartition);
        
        // Remove last cell from last row of each group
        groups.forEach(group => {
            const lastRowIndex = group[group.length - 1];
            if (this.currentPartition[lastRowIndex] > 0) {
                this.currentPartition[lastRowIndex]--;
            }
        });
        
        // Remove empty rows
        this.currentPartition = this.currentPartition.filter(r => r > 0);
    }

    groupConsecutiveRows(rows) {
        const groups = [];
        let currentGroup = [0];
        
        for (let i = 1; i < rows.length; i++) {
            if (rows[i] === rows[i-1]) {
                currentGroup.push(i);
            } else {
                groups.push(currentGroup);
                currentGroup = [i];
            }
        }
        groups.push(currentGroup);
        
        return groups;
    }

    // === THEME MANAGEMENT ===

    applyTheme() {
        const theme = this.themeSelect.value;
        document.body.setAttribute('data-tile-theme', theme);
    }

    toggleDarkMode() {
        if (this.themeToggle.checked) {
            document.body.setAttribute('data-theme', 'dark');
        } else {
            document.body.removeAttribute('data-theme');
        }
    }

    // === UI HELPERS ===

    toggleHelp() {
        if (this.helpPopover) {
            this.helpPopover.classList.toggle('visible');
        }
    }

    hideHelp() {
        if (this.helpPopover) {
            this.helpPopover.classList.remove('visible');
        }
    }

    showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed; top: 20px; right: 20px; padding: 15px 20px;
            border-radius: 5px; z-index: 1000; font-size: 14px; font-weight: bold;
            min-width: 200px; text-align: center;
        `;
        
        if (type === 'error') {
            messageDiv.style.backgroundColor = '#f8d7da';
            messageDiv.style.color = '#721c24';
            messageDiv.style.border = '1px solid #f5c6cb';
        } else if (type === 'success') {
            messageDiv.style.backgroundColor = '#d4edda';
            messageDiv.style.color = '#155724';
            messageDiv.style.border = '1px solid #c3e6cb';
        } else if (type === 'warning') {
            messageDiv.style.backgroundColor = '#fff3cd';
            messageDiv.style.color = '#856404';
            messageDiv.style.border = '1px solid #ffeeba';
        } else {
            messageDiv.style.backgroundColor = '#d1ecf1';
            messageDiv.style.color = '#0c5460';
            messageDiv.style.border = '1px solid #bee5eb';
        }
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 3000);
    }
}

// Initialize the multiplayer game when the page loads
let multiplayerGame;
document.addEventListener('DOMContentLoaded', () => {
    multiplayerGame = new CornerMultiplayerGame();
});

// Make it globally accessible for room joining from HTML
window.multiplayerGame = multiplayerGame; 