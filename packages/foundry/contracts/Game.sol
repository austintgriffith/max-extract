//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./Universe.sol";

// WETH interface for safe ETH transfers
interface IWETH {
    function deposit() external payable;
    function transfer(address to, uint256 value) external returns (bool);
    function balanceOf(address) external view returns (uint256);
}

// MaxExtract interface for credential verification
interface IMaxExtract {
    function getActiveSectors() external view returns (uint256[] memory);
    function sectors(uint256 sectorId) external view returns (address);
    function sectorToOwner(uint256 sectorId) external view returns (address);
    function playerToSector(address player) external view returns (uint256);
}

/**
 * Game Contract - Manages game sessions and player participation
 * Controls visible chapters, game state, and player buy-ins
 * @author Max Extract Protocol
 */
contract Game {
    // Game configuration - hardcoded values
    uint256 public constant BUY_IN_PRICE = 0.000001 ether;
    uint256 public immutable gameEndTime = block.timestamp + 900 minutes;
    
    // WETH contract address (Ethereum mainnet - update for other networks)
    address public constant WETH_ADDRESS = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;
    
    // Reference to the Universe contract
    Universe public immutable universe;
    
    // Reference to the MaxExtract contract for credential verification
    IMaxExtract public maxExtract;
    
    // Reference to the Auditor contract
    address public auditorContract;
    
    // Game states
    enum GameState {
        Open,    // 0 - Players can buy in
        Active,  // 1 - Game is active, no more buy-ins allowed
        Settled  // 2 - Game has been settled, winners determined
    }
    
    // Game state variables
    GameState public state;
    uint8[] public visibleChapters;
    address[] public players;
    address[] public pilots;
    
    // Game end and settlement variables
    address[] public gameWinners;          // Array of winner addresses after settlement
    uint256 public winningScore;           // The winning score after settlement
    
    // Player scores mapping
    mapping(address => uint256) public scores;
    
    // Pilot death tracking
    mapping(address => bool) public deadPilots;
    
    // Track which pilots have minted credentials from which players (one per pilot per player)
    mapping(address => mapping(address => bool)) public pilotPlayerCredentialMinted;
    
    // Events
    event ChaptersUpdated(uint8[] newVisibleChapters);
    event GameStateChanged(GameState newState);
    event PlayerBoughtIn(address indexed player, uint256 amount);
    event PotPaidOut(address[] recipients, uint256[] percentages, uint256 totalAmount);
    event PilotAdded(address indexed pilot);
    event PilotsAdded(address[] pilots);
    event TipGiven(address indexed pilot, address indexed player, uint256 amount);
    event PilotDied(address indexed pilot, address indexed killer, address indexed playerPenalized, uint256 scorePenalty, uint256 ethForwarded);
    event GameSettled(address[] winners, uint256 winningScore, uint256 totalPayout, uint256 payoutPerWinner);
    event CredentialMinted(address indexed pilot, address indexed player, address indexed credentialContract);
    event PointsDeducted(address indexed player, uint256 amount, uint256 newScore);
    
    // Errors
    error OnlyGod();
    error OnlyPilot();
    error GameNotOpen();
    error InsufficientPayment();
    error PlayerAlreadyJoined();
    error PilotAlreadyAdded();
    error InvalidArrayLengths();
    error InvalidPercentages();
    error PayoutFailed();
    error PilotAlreadyDead();
    error NotAPlayer();
    error GameNotEnded();
    error GameAlreadySettled();
    error NotACredential();
    error CredentialNotRegistered();
    error MaxExtractNotSet();
    error PilotAlreadyMintedFromPlayer();
    error OnlyAuditor();
    
    modifier onlyGod() {
        if (msg.sender != universe.GOD()) revert OnlyGod();
        _;
    }
    
    modifier onlyPilot() {
        if (!isPilot(msg.sender)) revert OnlyPilot();
        _;
    }
    
    modifier gameOpen() {
        if (state != GameState.Open) revert GameNotOpen();
        _;
    }
    
    constructor(address _universe) {
        universe = Universe(_universe);
        state = GameState.Open;
    }
    
    /**
     * Set which chapters are visible to players
     * Only callable by the God address
     * @param _chapters Array of chapter numbers to make visible
     */
    function showChapters(uint8[] calldata _chapters) external onlyGod {
        visibleChapters = _chapters;
        emit ChaptersUpdated(_chapters);
    }
    
    /**
     * Change the game state
     * Only callable by the God address
     * @param _newState The new game state
     */
    function setState(GameState _newState) external onlyGod {
        state = _newState;
        emit GameStateChanged(_newState);
    }
    
    
    /**
     * Add a pilot address
     * Only callable by the God address
     * @param _pilot Address to add as a pilot
     */
    function addPilot(address _pilot) external onlyGod {
        // Check if pilot is already added
        if (isPilot(_pilot)) revert PilotAlreadyAdded();
        
        pilots.push(_pilot);
        emit PilotAdded(_pilot);
    }
    
    /**
     * Add multiple pilot addresses in batch and fund them with ETH
     * Only callable by the God address
     * @param _pilots Array of addresses to add as pilots
     */
    function addPilots(address[] calldata _pilots) external payable onlyGod {
        require(_pilots.length > 0, "No pilots provided");
        
        uint256 newPilotsCount = 0;
        
        // First pass: count new pilots and add them
        for (uint256 i = 0; i < _pilots.length; i++) {
            // Check if pilot is already added
            if (!isPilot(_pilots[i]) && !deadPilots[_pilots[i]]) {
                pilots.push(_pilots[i]);
                newPilotsCount++;
            }
        }
        
        // If ETH was sent and we have new pilots, distribute it equally
        if (msg.value > 0 && newPilotsCount > 0) {
            uint256 ethPerPilot = msg.value / newPilotsCount;
            uint256 remainder = msg.value % newPilotsCount;
            
            // Second pass: fund the new pilots
            for (uint256 i = 0; i < _pilots.length; i++) {
                if (!deadPilots[_pilots[i]]) {
                    // Check if this pilot was just added (not already in the array before this call)
                    bool wasJustAdded = false;
                    uint256 pilotCount = 0;
                    for (uint256 j = 0; j < pilots.length; j++) {
                        if (pilots[j] == _pilots[i]) {
                            pilotCount++;
                            if (pilotCount == 1) {
                                wasJustAdded = true;
                                break;
                            }
                        }
                    }
                    
                    if (wasJustAdded && ethPerPilot > 0) {
                        uint256 amountToSend = ethPerPilot;
                        // Give remainder to the first pilot
                        if (remainder > 0) {
                            amountToSend += remainder;
                            remainder = 0;
                        }
                        
                        (bool success, ) = payable(_pilots[i]).call{value: amountToSend}("");
                        require(success, "ETH transfer failed");
                    }
                }
            }
        }
        
        emit PilotsAdded(_pilots);
    }
    
    /**
     * Buy into the game by paying the buy-in price
     * Only available when game state is Open
     * Players can only buy in once
     */
    function buyIn() external payable gameOpen {
        if (msg.value < BUY_IN_PRICE) revert InsufficientPayment();
        
        // Check if player has already joined
        for (uint256 i = 0; i < players.length; i++) {
            if (players[i] == msg.sender) revert PlayerAlreadyJoined();
        }
        
        players.push(msg.sender);
        emit PlayerBoughtIn(msg.sender, msg.value);
        
        // Refund excess payment
        if (msg.value > BUY_IN_PRICE) {
            payable(msg.sender).transfer(msg.value - BUY_IN_PRICE);
        }
    }
    
    /**
     * Get all visible chapters
     * @return Array of visible chapter numbers
     */
    function getVisibleChapters() external view returns (uint8[] memory) {
        return visibleChapters;
    }
    
    /**
     * Get all players who have bought in
     * @return Array of player addresses
     */
    function getPlayers() external view returns (address[] memory) {
        return players;
    }
    
    /**
     * Get the number of players who have bought in
     * @return Number of players
     */
    function getPlayerCount() external view returns (uint256) {
        return players.length;
    }
    
    /**
     * Check if a specific address is a player
     * @param _player Address to check
     * @return True if the address is a player
     */
    function isPlayer(address _player) external view returns (bool) {
        for (uint256 i = 0; i < players.length; i++) {
            if (players[i] == _player) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Check if a specific address is a pilot (and not dead)
     * @param _pilot Address to check
     * @return True if the address is a pilot and not dead
     */
    function isPilot(address _pilot) public view returns (bool) {
        if (deadPilots[_pilot]) {
            return false; // Dead pilots are no longer considered active pilots
        }
        
        for (uint256 i = 0; i < pilots.length; i++) {
            if (pilots[i] == _pilot) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Check if a pilot is dead
     * @param _pilot Address to check
     * @return True if the pilot is dead
     */
    function isPilotDead(address _pilot) external view returns (bool) {
        return deadPilots[_pilot];
    }
    
    /**
     * Get all pilots
     * @return Array of pilot addresses
     */
    function getPilots() external view returns (address[] memory) {
        return pilots;
    }
    
    /**
     * Get the number of pilots
     * @return Number of pilots
     */
    function getPilotCount() external view returns (uint256) {
        return pilots.length;
    }
    
    /**
     * Get all pilots with their ETH balances and death status
     * @return pilotAddresses Array of pilot addresses
     * @return ethBalances Array of ETH balances (in wei)
     * @return isDead Array of death status for each pilot
     */
    function getAllPilotsAndBalances() external view returns (
        address[] memory pilotAddresses,
        uint256[] memory ethBalances,
        bool[] memory isDead
    ) {
        uint256 pilotCount = pilots.length;
        
        pilotAddresses = new address[](pilotCount);
        ethBalances = new uint256[](pilotCount);
        isDead = new bool[](pilotCount);
        
        for (uint256 i = 0; i < pilotCount; i++) {
            address pilot = pilots[i];
            pilotAddresses[i] = pilot;
            ethBalances[i] = pilot.balance;
            isDead[i] = deadPilots[pilot];
        }
        
        return (pilotAddresses, ethBalances, isDead);
    }
    
    /**
     * Ensure a pilot has enough gas for transactions
     * Tops up pilot with minimum required ETH if balance is too low
     * Only callable by the God address
     * @param _pilot Address of the pilot to check and fund if needed
     * @param _minRequired Minimum ETH balance required (in wei)
     */
    function makeSurePilotHasEnoughGas(address _pilot, uint256 _minRequired) external payable onlyGod {
        require(isPilot(_pilot) || deadPilots[_pilot], "Not a pilot");
        
        uint256 currentBalance = _pilot.balance;
        
        if (currentBalance < _minRequired) {
            uint256 needed = _minRequired - currentBalance;
            require(msg.value >= needed, "Insufficient ETH sent");
            
            (bool success, ) = payable(_pilot).call{value: needed}("");
            require(success, "ETH transfer failed");
            
            // Refund excess ETH to GOD
            uint256 excess = msg.value - needed;
            if (excess > 0) {
                payable(universe.GOD()).transfer(excess);
            }
        } else {
            // Pilot already has enough, refund all ETH to GOD
            if (msg.value > 0) {
                payable(universe.GOD()).transfer(msg.value);
            }
        }
    }

    /**
     * Dead man's switch - called when a pilot is killed
     * Marks the pilot as dead, penalizes the player who owned the sector, and forwards ETH to GOD
     * Only callable by pilots (before they die)
     * @param _killer Address of the pilot who killed this pilot
     * @param _playerToPenalize Address of the player to penalize (sector owner)
     */
    function deadMansSwitch(address _killer, address _playerToPenalize) external payable onlyPilot {
        // Check if pilot is already dead
        if (deadPilots[msg.sender]) revert PilotAlreadyDead();
        
        // Check if the player to penalize is actually a player
        bool isValidPlayer = false;
        for (uint256 i = 0; i < players.length; i++) {
            if (players[i] == _playerToPenalize) {
                isValidPlayer = true;
                break;
            }
        }
        if (!isValidPlayer) revert NotAPlayer();
        
        // Mark pilot as dead
        deadPilots[msg.sender] = true;
        
        // Penalize the player's score (subtract 10, minimum 0)
        uint256 currentScore = scores[_playerToPenalize];
        uint256 penalty = currentScore >= 10 ? 10 : currentScore;
        scores[_playerToPenalize] = currentScore - penalty;
        
        // Forward all received ETH to GOD
        uint256 ethAmount = msg.value;
        if (ethAmount > 0) {
            payable(universe.GOD()).transfer(ethAmount);
        }
        
        emit PilotDied(msg.sender, _killer, _playerToPenalize, penalty, ethAmount);
    }
    
    /**
     * Tip a player with a score increase
     * Only callable by pilots
     * @param _player Address of the player to tip
     * @param _tipAmount Amount to add to the player's score
     */
    function tipPlayer(address _player, uint256 _tipAmount) external onlyPilot {
        scores[_player] += _tipAmount;
        emit TipGiven(msg.sender, _player, _tipAmount);
    }
    
    /**
     * Get a player's current score
     * @param _player Address of the player
     * @return The player's current score
     */
    function getPlayerScore(address _player) external view returns (uint256) {
        return scores[_player];
    }
    
    /**
     * Get the current game state information
     * @return _state Current game state
     * @return _playerCount Number of players
     * @return _buyInPrice Current buy-in price
     */
    function getGameInfo() external view returns (
        GameState _state,
        uint256 _playerCount,
        uint256 _buyInPrice
    ) {
        return (state, players.length, BUY_IN_PRICE);
    }
    
    /**
     * Pay out the pot to multiple recipients with specified percentages
     * Only callable by the God address
     * @param recipients Array of addresses to receive payouts
     * @param percentages Array of percentages (in basis points, e.g., 333 = 3.33%)
     */
    function payoutPot(address[] calldata recipients, uint256[] calldata percentages) external onlyGod {
        // Validate input arrays
        if (recipients.length == 0 || recipients.length != percentages.length) {
            revert InvalidArrayLengths();
        }
        
        // Validate percentages sum to 1000 (100.0%)
        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < percentages.length; i++) {
            totalPercentage += percentages[i];
        }
        if (totalPercentage != 1000) {
            revert InvalidPercentages();
        }
        
        uint256 totalBalance = address(this).balance;
        if (totalBalance == 0) return; // Nothing to pay out
        
        // Pay out to each recipient
        for (uint256 i = 0; i < recipients.length; i++) {
            if (recipients[i] == address(0)) continue; // Skip zero addresses
            
            uint256 amount = (totalBalance * percentages[i]) / 1000;
            if (amount > 0) {
                (bool success, ) = payable(recipients[i]).call{value: amount}("");
                if (!success) revert PayoutFailed();
            }
        }
        
        emit PotPaidOut(recipients, percentages, totalBalance);
    }

    /**
     * Withdraw remaining contract balance to God address
     * Only callable by the God address
     */
    function withdraw() external onlyGod {
        payable(universe.GOD()).transfer(address(this).balance);
    }
    
    /**
     * Get contract balance
     * @return Contract balance in wei
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * Settle the game by finding the highest scoring player(s) and paying out the pot
     * Can be called by anyone after the game end time has passed
     * Splits the pot equally among all players with the highest score
     */
    function settleGame() external {
        // Check if game has ended
        if (block.timestamp < gameEndTime) revert GameNotEnded();
        
        // Check if game has already been settled
        if (state == GameState.Settled) revert GameAlreadySettled();
        
        // If no players, nothing to settle
        if (players.length == 0) {
            state = GameState.Settled;
            return;
        }
        
        // Find the highest score
        uint256 highestScore = 0;
        for (uint256 i = 0; i < players.length; i++) {
            uint256 playerScore = scores[players[i]];
            if (playerScore > highestScore) {
                highestScore = playerScore;
            }
        }
        
        // Find all players with the highest score
        address[] memory winners = new address[](players.length);
        uint256 winnerCount = 0;
        
        for (uint256 i = 0; i < players.length; i++) {
            if (scores[players[i]] == highestScore) {
                winners[winnerCount] = players[i];
                winnerCount++;
            }
        }
        
        // Resize winners array to actual winner count
        gameWinners = new address[](winnerCount);
        for (uint256 i = 0; i < winnerCount; i++) {
            gameWinners[i] = winners[i];
        }
        
        // Set winning score and mark as settled
        winningScore = highestScore;
        state = GameState.Settled;
        
        // Calculate and distribute payout
        uint256 totalPayout = address(this).balance;
        uint256 payoutPerWinner = 0;
        
        if (totalPayout > 0 && winnerCount > 0) {
            payoutPerWinner = totalPayout / winnerCount;
            
            // Pay each winner
            for (uint256 i = 0; i < winnerCount; i++) {
                (bool success, ) = payable(gameWinners[i]).call{value: payoutPerWinner}("");
                if (!success) revert PayoutFailed();
            }
        }
        
        emit GameSettled(gameWinners, winningScore, totalPayout, payoutPerWinner);
    }
    
    /**
     * Get the game winners (only available after settlement)
     * @return Array of winner addresses
     */
    function getGameWinners() external view returns (address[] memory) {
        return gameWinners;
    }
    
    /**
     * Check if the game can be settled (time has passed and not already settled)
     * @return True if current time is past game end time and game is not settled
     */
    function canGameSettle() external view returns (bool) {
        return block.timestamp >= gameEndTime && state != GameState.Settled;
    }
    
    /**
     * Get time remaining until game ends
     * @return Seconds remaining (0 if game has ended)
     */
    function getTimeRemaining() external view returns (uint256) {
        if (block.timestamp >= gameEndTime) {
            return 0;
        }
        return gameEndTime - block.timestamp;
    }
    
    /**
     * Set the MaxExtract contract address
     * Only callable by the God address
     * @param _maxExtract Address of the MaxExtract contract
     */
    function setMaxExtract(address _maxExtract) external onlyGod {
        require(_maxExtract != address(0), "Invalid address");
        maxExtract = IMaxExtract(_maxExtract);
    }
    
    /**
     * Check if a pilot has access to a specific sector
     * Checks if the pilot owns a credential NFT from that sector's credential contract
     * @param _pilot The pilot address to check
     * @param _sectorId The sector ID to check access for
     * @return True if the pilot has a credential (balance > 0)
     */
    function canPilotAccessSector(address _pilot, uint256 _sectorId) external view returns (bool) {
        if (address(maxExtract) == address(0)) return false;
        
        // Get the registry for this sector
        address registryAddress = maxExtract.sectors(_sectorId);
        if (registryAddress == address(0)) return false;
        
        // Get the credential contract from the registry
        (bool success, bytes memory data) = registryAddress.staticcall(
            abi.encodeWithSignature("modules(string)", "credential")
        );
        
        if (!success || data.length < 32) return false;
        
        address credentialContract = abi.decode(data, (address));
        if (credentialContract == address(0)) return false;
        
        // Check the pilot's balance in the credential contract (ERC721 balanceOf)
        (bool balanceSuccess, bytes memory balanceData) = credentialContract.staticcall(
            abi.encodeWithSignature("balanceOf(address)", _pilot)
        );
        
        if (!balanceSuccess || balanceData.length < 32) return false;
        
        uint256 balance = abi.decode(balanceData, (uint256));
        return balance > 0;
    }
    
    /**
     * Called by a credential contract when a pilot mints a credential
     * Verifies the credential is registered in the specified player's registry
     * Awards 5 points to the player if verification succeeds
     * Only callable by credential contracts through pilot transactions
     * Each pilot can only mint one credential per player (prevents point farming)
     * @param _player The player address who owns the credential contract
     */
    function pilotMintSectorCredential(address _player) external {
        if (address(maxExtract) == address(0)) revert MaxExtractNotSet();
        
        // tx.origin must be a pilot
        if (!isPilot(tx.origin)) revert OnlyPilot();
        
        // Check if this pilot has already minted a credential from this player
        if (pilotPlayerCredentialMinted[tx.origin][_player]) revert PilotAlreadyMintedFromPlayer();
        
        // Get the player's sector ID - if non-zero, they're a valid player with a sector
        uint256 sectorId = maxExtract.playerToSector(_player);
        if (sectorId == 0) revert NotAPlayer(); // Player has no sector (not a valid player)
        
        // Get the registry address for this sector
        address registryAddress = maxExtract.sectors(sectorId);
        
        // Try to call modules("credential") on the registry to get the registered credential
        (bool success, bytes memory data) = registryAddress.staticcall(
            abi.encodeWithSignature("modules(string)", "credential")
        );
        
        if (!success || data.length < 32) revert CredentialNotRegistered();
        
        address registeredCredential = abi.decode(data, (address));
        
        // Verify that msg.sender (the credential contract) matches the registered credential
        if (registeredCredential != msg.sender) revert CredentialNotRegistered();
        
        // Mark that this pilot has minted from this player
        pilotPlayerCredentialMinted[tx.origin][_player] = true;
        
        // All checks passed - award 5 points to the player
        scores[_player] += 5;
        
        emit CredentialMinted(tx.origin, _player, msg.sender);
    }
    
    /**
     * Deduct points from a player's score
     * Only callable by the Auditor contract
     * Used when players request contract audits or other point-deducting actions
     * @param _player The player address to deduct points from
     * @param _amount The number of points to deduct
     */
    function deductPoints(address _player, uint256 _amount) external {
        if (msg.sender != auditorContract) revert OnlyAuditor();
        
        // Check if the player exists
        bool isValidPlayer = false;
        for (uint256 i = 0; i < players.length; i++) {
            if (players[i] == _player) {
                isValidPlayer = true;
                break;
            }
        }
        if (!isValidPlayer) revert NotAPlayer();
        
        // Deduct points (can go to 0 but not below)
        uint256 currentScore = scores[_player];
        uint256 deduction = currentScore >= _amount ? _amount : currentScore;
        scores[_player] = currentScore - deduction;
        
        emit PointsDeducted(_player, deduction, scores[_player]);
    }
    
    /**
     * Set the Auditor contract address
     * Only callable by the God address
     * @param _auditor Address of the Auditor contract
     */
    function setAuditorContract(address _auditor) external onlyGod {
        require(_auditor != address(0), "Invalid address");
        auditorContract = _auditor;
    }
}
