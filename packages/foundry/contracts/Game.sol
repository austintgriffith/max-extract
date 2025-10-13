//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./Universe.sol";

/**
 * Game Contract - Manages game sessions and player participation
 * Controls visible chapters, game state, and player buy-ins
 * @author Max Extract Protocol
 */
contract Game {
    // Reference to the Universe contract
    Universe public immutable universe;
    
    // Game states
    enum GameState {
        Open,    // 0 - Players can buy in
        Active   // 1 - Game is active, no more buy-ins allowed
    }
    
    // Game state variables
    GameState public state;
    uint8[] public visibleChapters;
    address[] public players;
    address[] public pilots;
    uint256 public buyInPrice;
    
    // Player scores mapping
    mapping(address => uint256) public scores;
    
    // Pilot death tracking
    mapping(address => bool) public deadPilots;
    
    // Events
    event ChaptersUpdated(uint8[] newVisibleChapters);
    event GameStateChanged(GameState newState);
    event PlayerBoughtIn(address indexed player, uint256 amount);
    event BuyInPriceUpdated(uint256 newPrice);
    event PotPaidOut(address[] recipients, uint256[] percentages, uint256 totalAmount);
    event PilotAdded(address indexed pilot);
    event PilotsAdded(address[] pilots);
    event TipGiven(address indexed pilot, address indexed player, uint256 amount);
    event PilotDied(address indexed pilot, address indexed killer, address indexed playerPenalized, uint256 scorePenalty, uint256 ethForwarded);
    
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
    
    constructor(address _universe, uint256 _buyInPrice) {
        universe = Universe(_universe);
        state = GameState.Open;
        buyInPrice = _buyInPrice;
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
     * Set the buy-in price for the game
     * Only callable by the God address
     * @param _newPrice The new buy-in price in wei
     */
    function setBuyInPrice(uint256 _newPrice) external onlyGod {
        buyInPrice = _newPrice;
        emit BuyInPriceUpdated(_newPrice);
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
        if (msg.value < buyInPrice) revert InsufficientPayment();
        
        // Check if player has already joined
        for (uint256 i = 0; i < players.length; i++) {
            if (players[i] == msg.sender) revert PlayerAlreadyJoined();
        }
        
        players.push(msg.sender);
        emit PlayerBoughtIn(msg.sender, msg.value);
        
        // Refund excess payment
        if (msg.value > buyInPrice) {
            payable(msg.sender).transfer(msg.value - buyInPrice);
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
        return (state, players.length, buyInPrice);
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
}
