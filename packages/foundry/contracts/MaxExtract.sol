//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

// Useful for debugging. Remove when deploying to a live network.
import "forge-std/console.sol";

// Interface for the Universe contract to access entropy
interface IUniverse {
    function getEntropy() external view returns (bytes32);
    function isEntropySet() external view returns (bool);
}

// Interface for the Game contract to check player status and chapters
interface IGame {
    function isPlayer(address player) external view returns (bool);
    function getVisibleChapters() external view returns (uint8[] memory);
    function state() external view returns (uint8); // 0 = Open, 1 = Active
}

/**
 * MaxExtract Contract - The canonical Extract Protocol
 * 
 * "Max Extract wasn't a captain or a warlord. Just another code monkey in the asteroid belt, 
 * known for keeping his head down and drill spinning. His final act was to etch a signal 
 * into the stars: the Extract Protocol."
 * 
 * The contract is simple but radical - Max's three commandments:
 * - You will not attack other pirates who have signed the oath.
 * - You will claim asteroids fairly, not steal them by force.
 * - Your reputation will be recorded, traceable, and unforgeable.
 * 
 * @author Max Extract Protocol
 */
contract MaxExtract {
    // The three core rules of the Extract Protocol - immutable and eternal
    // Max's direct commandments to all who take the oath
    string public constant RULE_ONE = "You will not attack other pirates who have signed the oath";
    string public constant RULE_TWO = "You will claim asteroids fairly, not steal them by force";
    string public constant RULE_THREE = "Your reputation will be recorded, traceable, and unforgeable";

    // Universe contract for entropy access
    IUniverse public immutable universe;
    
    // Game contract for player and chapter validation
    IGame public immutable game;
    
    // Nonce for unique sector ID generation
    uint256 private nonce;
    
    // Sector registry: sectorId => Registry Contract Address
    // This is Max's ledger - the canonical record of all sectors
    mapping(uint256 => address) public sectors;
    
    // Track which sectors are active
    uint256[] public activeSectors;
    
    // Track which players have already broadcast a sector (one player, one sector)
    mapping(address => bool) public playerHasBroadcast;
    
    // Events
    event SectorBroadcast(
        uint256 indexed sectorId, 
        address indexed registry, 
        address indexed broadcaster
    );

    // Constructor - Max's final act
    constructor(address _universe, address _game) {
        // The Extract Protocol is now live - Max's legacy etched into the blockchain
        universe = IUniverse(_universe);
        game = IGame(_game);
    }

    /**
     * The broadcast function - how pirates register their sectors in Max's ledger
     * 
     * Requirements:
     * 1. Chapter 1 must be visible in the game
     * 2. tx.origin must be a player who has bought into the game
     * 3. Player can only broadcast one sector (one player, one sector rule)
     * 4. Game must not be in open mode (must be active)
     * 5. Must be called from a contract (Registry Contract), not directly from EOA
     * 
     * Sector ID is automatically generated using universe entropy, tx.origin, 
     * msg.sender, contract address, and a nonce for uniqueness.
     * 
     * @param registry The Registry Contract address for this sector
     * @return sectorId The generated sector ID that was claimed
     */
    function broadcast(address registry) external returns (uint256 sectorId) {
        // Contract-only access: must be called from a contract, not directly from EOA
        require(tx.origin != msg.sender, "Cannot broadcast directly from EOA - use your Registry Contract");
        
        // Game must not be in open mode (0 = Open, 1 = Active)
        require(game.state() != 0, "Game is in open mode - broadcasting not allowed");
        
        // Player must have bought into the game
        require(game.isPlayer(tx.origin), "Player has not bought into the game");
        
        // Player can only broadcast one sector
        require(!playerHasBroadcast[tx.origin], "Player has already broadcast a sector");
        
        // Chapter 1 must be visible
        uint8[] memory visibleChapters = game.getVisibleChapters();
        bool chapter1Visible = false;
        for (uint256 i = 0; i < visibleChapters.length; i++) {
            if (visibleChapters[i] == 1) {
                chapter1Visible = true;
                break;
            }
        }
        require(chapter1Visible, "Chapter 1 is not visible");
        
        // Universe entropy must be set for sector generation
        require(universe.isEntropySet(), "Universe entropy not yet set");
        
        // Registry must be a valid contract address
        require(registry != address(0), "Registry cannot be zero address");
        require(registry.code.length > 0, "Registry must be a contract");
        
        // Generate unique sector ID using entropy, addresses, and nonce
        bytes32 universeEntropy = universe.getEntropy();
        sectorId = uint256(keccak256(abi.encodePacked(
            universeEntropy,
            tx.origin,
            msg.sender,
            address(this),
            nonce++
        )));
        
        // Register the sector in Max's ledger
        sectors[sectorId] = registry;
        
        // Track active sectors
        activeSectors.push(sectorId);
        
        // Mark that this player has broadcast a sector
        playerHasBroadcast[tx.origin] = true;
        
        emit SectorBroadcast(sectorId, registry, tx.origin);
    }


    /**
     * Get all active sector IDs
     * @return Array of all claimed sector IDs
     */
    function getActiveSectors() external view returns (uint256[] memory) {
        return activeSectors;
    }

    /**
     * Get the total number of active sectors
     * @return Number of sectors that have been claimed
     */
    function getActiveSectorCount() external view returns (uint256) {
        return activeSectors.length;
    }


    /**
     * Check if a player has already broadcast a sector
     * @param player The player address to check
     * @return True if the player has already broadcast a sector
     */
    function hasPlayerBroadcast(address player) external view returns (bool) {
        return playerHasBroadcast[player];
    }
    
}
