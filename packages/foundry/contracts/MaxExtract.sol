//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

// Interface for the Universe contract to access entropy
interface IUniverse {
    function getEntropy() external view returns (bytes32);
    function isEntropySet() external view returns (bool);
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
    
    // Nonce for unique sector ID generation
    uint256 private nonce;
    
    // Sector registry: sectorId => Registry Contract Address
    // This is Max's ledger - the canonical record of all sectors
    mapping(uint256 => address) public sectors;
    
    // Track which sectors are active
    uint256[] public activeSectors;
    mapping(uint256 => bool) public sectorExists;
    
    // Events
    event SectorBroadcast(
        uint256 indexed sectorId, 
        address indexed registry, 
        address indexed broadcaster
    );

    // Constructor - Max's final act
    constructor(address _universe) {
        // The Extract Protocol is now live - Max's legacy etched into the blockchain
        universe = IUniverse(_universe);
    }

    /**
     * The broadcast function - how pirates register their sectors in Max's ledger
     * 
     * Note: tx.origin != msg.sender requirement means you can't call this directly
     * with an EOA. You must call it from another contract (your Registry Contract).
     * This prevents simple sybil attacks and ensures proper sector setup.
     * 
     * Sector ID is automatically generated using universe entropy, tx.origin, 
     * msg.sender, contract address, and a nonce for uniqueness.
     * 
     * @param registry The Registry Contract address for this sector
     * @return sectorId The generated sector ID that was claimed
     */
    function broadcast(address registry) external returns (uint256 sectorId) {
        // Max's anti-sybil mechanism: must be called from a contract, not directly from EOA
        require(tx.origin != msg.sender, "Cannot broadcast directly from EOA - use your Registry Contract");
        
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
        if (!sectorExists[sectorId]) {
            activeSectors.push(sectorId);
            sectorExists[sectorId] = true;
        }
        
        emit SectorBroadcast(sectorId, registry, tx.origin);
    }

    /**
     * Get the Registry Contract for a sector
     * @param sectorId The sector to query
     * @return The Registry Contract address, or address(0) if unclaimed
     */
    function getSectorRegistry(uint256 sectorId) external view returns (address) {
        return sectors[sectorId];
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
     * Check if a sector has been claimed
     * @param sectorId The sector to check
     * @return True if the sector has been claimed
     */
    function isSectorClaimed(uint256 sectorId) external view returns (bool) {
        return sectors[sectorId] != address(0);
    }

    /**
     * Get the three eternal rules of the Extract Protocol
     * @return The three rules as strings
     */
    function getRules() external pure returns (string memory, string memory, string memory) {
        return (RULE_ONE, RULE_TWO, RULE_THREE);
    }

    /**
     * Function that allows the contract to receive ETH
     * Pirates may send tribute to Max's memory
     */
    receive() external payable {
        // Tribute received for Max Extract
    }
}
