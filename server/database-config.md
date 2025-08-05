# Database Configuration

To set up the database connection, create a `.env` file in the server directory with the following content:

```bash
# Database Configuration
DATABASE_URL=postgresql://neondb_owner:npg_jlpYFy7a8ube@ep-wandering-snow-ae8qkeig-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# JWT Secret for authentication
JWT_SECRET=your-super-secret-jwt-key-here

# Environment
NODE_ENV=development

# Server Port
PORT=3001
```

## Setup Steps:

1. **Create .env file:**
   ```bash
   cd server
   touch .env
   # Add the above content to the .env file
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Setup database schema:**
   ```bash
   node setup-database.js
   ```

4. **Start the server:**
   ```bash
   npm start
   ```

## API Endpoints:

- `POST /api/game-records` - Store a new game record
- `GET /api/game-records` - Get game records (with optional filtering)
- `GET /api/game-records/:id` - Get a specific game record
- `GET /api/game-records/stats/:gameType` - Get statistics for a game type

## Game Data Format:

The system stores game data in this format:
```javascript
{
  gameType: 'ANTI',           // Game type code
  partitionData: '4 3 2 1',  // Initial partition as space-separated string
  timestampPlayed: '2024-01-01T10:00:00Z',  // ISO timestamp when game was played
  movesSequence: 'R0C3 R1C1 R0C0',         // Space-separated moves
  gameOutcome: 'A'            // Winner: 'A' or 'B'
}
```

For Anticorners, moves are stored as `R{row}C{col}` format (e.g., `R2C3` for row 2, column 3).