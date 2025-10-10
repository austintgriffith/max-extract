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
    function getPlayers() external view returns (address[] memory);
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
    
    // Track player to sector ID mapping (one player, one sector)
    mapping(address => uint256) public playerToSector;
    
    // Track sector ID to owner mapping for efficient lookups
    mapping(uint256 => address) public sectorToOwner;
    
    // Events
    event SectorBroadcast(
        uint256 indexed sectorId, 
        address indexed registry, 
        address indexed broadcaster
    );
    
    event RegistryUpdated(
        uint256 indexed sectorId,
        address indexed oldRegistry,
        address indexed newRegistry,
        address player
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
        
        // Store the player-to-sector mapping
        playerToSector[tx.origin] = sectorId;
        
        // Store the sector-to-owner mapping for efficient lookups
        sectorToOwner[sectorId] = tx.origin;
        
        emit SectorBroadcast(sectorId, registry, tx.origin);
    }

    /**
     * Update the registry contract for an existing sector
     * 
     * Requirements:
     * 1. Must be called from a contract (tx.origin != msg.sender)
     * 2. Sector must already exist (sectors[sectorId] != address(0))
     * 3. Player must own the sector (playerToSector[tx.origin] == sectorId)
     * 4. Sector must belong to the player (sectorToOwner[sectorId] == tx.origin)
     * 5. New registry must be a valid contract address
     * 
     * @param newRegistry The new Registry Contract address for this sector
     * @param sectorId The sector ID to update
     */
    function updateRegistry(address newRegistry, uint256 sectorId) external {
        // Contract-only access: must be called from a contract, not directly from EOA
        require(tx.origin != msg.sender, "Cannot update registry directly from EOA - use your Registry Contract");
        
        // Sector must already exist
        require(sectors[sectorId] != address(0), "Sector does not exist");
        
        // Player must own this sector
        require(playerToSector[tx.origin] == sectorId, "Player does not own this sector");
        
        // Sector must belong to this player
        require(sectorToOwner[sectorId] == tx.origin, "Sector does not belong to this player");
        
        // New registry must be a valid contract address
        require(newRegistry != address(0), "New registry cannot be zero address");
        require(newRegistry.code.length > 0, "New registry must be a contract");
        
        // Tmep store the old registry for the event
        address oldRegistry = sectors[sectorId];
        
        // Update the sector registry
        sectors[sectorId] = newRegistry;
        
        emit RegistryUpdated(sectorId, oldRegistry, newRegistry, tx.origin);
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

    /**
     * Get the sector ID for a specific player
     * @param player The player address to check
     * @return sectorId The sector ID owned by the player (0 if no sector)
     */
    function getPlayerSector(address player) external view returns (uint256 sectorId) {
        return playerToSector[player];
    }

    /**
     * Get all active sectors with their owners
     * @return sectorIds Array of all active sector IDs
     * @return owners Array of owner addresses corresponding to each sector
     */
    function getSectorsWithOwners() external view returns (uint256[] memory sectorIds, address[] memory owners) {
        uint256 sectorCount = activeSectors.length;
        sectorIds = new uint256[](sectorCount);
        owners = new address[](sectorCount);
        
        for (uint256 i = 0; i < sectorCount; i++) {
            uint256 sectorId = activeSectors[i];
            sectorIds[i] = sectorId;
            owners[i] = sectorToOwner[sectorId];
        }
        
        return (sectorIds, owners);
    }
    
}
