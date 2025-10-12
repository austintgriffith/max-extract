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
    
    // Events
    event ChaptersUpdated(uint8[] newVisibleChapters);
    event GameStateChanged(GameState newState);
    event PlayerBoughtIn(address indexed player, uint256 amount);
    event BuyInPriceUpdated(uint256 newPrice);
    event PotPaidOut(address[] recipients, uint256[] percentages, uint256 totalAmount);
    event PilotAdded(address indexed pilot);
    event PilotsAdded(address[] pilots);
    event TipGiven(address indexed pilot, address indexed player, uint256 amount);
    
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
     * Add multiple pilot addresses in batch
     * Only callable by the God address
     * @param _pilots Array of addresses to add as pilots
     */
    function addPilots(address[] calldata _pilots) external onlyGod {
        for (uint256 i = 0; i < _pilots.length; i++) {
            // Check if pilot is already added
            if (!isPilot(_pilots[i])) {
                pilots.push(_pilots[i]);
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
     * Check if a specific address is a pilot
     * @param _pilot Address to check
     * @return True if the address is a pilot
     */
    function isPilot(address _pilot) public view returns (bool) {
        for (uint256 i = 0; i < pilots.length; i++) {
            if (pilots[i] == _pilot) {
                return true;
            }
        }
        return false;
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
