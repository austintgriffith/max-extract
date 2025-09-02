# DEBUG Mode

The Max Extract game server includes a DEBUG mode that provides detailed logging and automatically shuts down after 2 minutes for testing purposes.

## How to Use DEBUG Mode

### Option 1: Using npm scripts (Recommended)

```bash
# Run with debug mode enabled
npm run debug

# Run with debug mode enabled and auto-restart on file changes
npm run debug:dev
```

### Option 2: Using environment variables

```bash
# Set DEBUG environment variable
DEBUG=true npm start

# Or export it first
export DEBUG=true
npm start
```

### Option 3: Direct tsx execution

```bash
DEBUG=true tsx index.ts
```

## What DEBUG Mode Does

### 🐛 Enhanced Logging

- **GameServer logs**: Contract loading, sector management, simulation ticks
- **Sector logs**: Ship/asteroid spawning, mining events, movement updates
- **Timestamped output**: All debug logs include precise timestamps
- **Structured data**: Important events include detailed data objects

### ⏰ Auto-Shutdown

- Server automatically shuts down after **30 seconds**
- Perfect for quick testing without manual intervention
- Prevents runaway processes during development

### 📊 Real-time Statistics

- Live counts of asteroids and ships per sector
- Performance metrics for each simulation tick
- Detailed breakdown of game events

## Example Debug Output

```
🐛 DEBUG MODE ENABLED
⏰ Server will automatically shut down after 30 seconds
📊 Extra debug information will be logged

🌌 Max Extract Protocol Game Server

🐛 [14:30:15] GameServer initialized in DEBUG mode
🐛 [14:30:15] Loading sectors from contract...
🐛 [14:30:15] Found 1 active sectors from contract
🐛 [14:30:15] Created new sector: 1
🎯 [14:30:15] Sector 1: Sector 1 initialized with seed: 123456
🐛 [14:30:15] Starting simulation loop
🐛 [14:30:16] Simulation tick starting...
🎯 [14:30:16] Sector 1: Spawning asteroid abc123 at (50, 0) size: 45
🎯 [14:30:17] Sector 1: Spawning ship def456 at (1000, 500) with 75% fuel
🐛 [14:30:17] Sector 1: 1 asteroids, 1 ships

⏰ DEBUG MODE: 30 seconds elapsed, shutting down...
```

## Debug Log Prefixes

- 🐛 **GameServer**: Main server operations
- 🎯 **Sector**: Individual sector activities
- ⏰ **Timeout**: Auto-shutdown messages
- 📊 **Stats**: Performance and statistics

## When to Use DEBUG Mode

- **Development**: Testing new features
- **Debugging**: Investigating issues
- **Performance**: Monitoring game balance
- **CI/CD**: Automated testing with timeout
- **Demos**: Short-lived demonstration runs

## Normal vs Debug Mode

| Feature     | Normal Mode       | Debug Mode          |
| ----------- | ----------------- | ------------------- |
| Logging     | Basic events only | Detailed everything |
| Runtime     | Indefinite        | 30 seconds max      |
| Performance | Optimized         | Verbose logging     |
| Use Case    | Production        | Development         |
