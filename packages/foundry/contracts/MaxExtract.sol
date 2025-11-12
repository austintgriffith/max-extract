//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

/*
'##::::'##::::'###::::'##::::'##::::'########:'##::::'##:'########:'########:::::'###:::::'######::'########:
 ###::'###:::'## ##:::. ##::'##::::: ##.....::. ##::'##::... ##..:: ##.... ##:::'## ##:::'##... ##:... ##..::
 ####'####::'##:. ##:::. ##'##:::::: ##::::::::. ##'##:::::: ##:::: ##:::: ##::'##:. ##:: ##:::..::::: ##::::
 ## ### ##:'##:::. ##:::. ###::::::: ######:::::. ###::::::: ##:::: ########::'##:::. ##: ##:::::::::: ##::::
 ##. #: ##: #########::: ## ##:::::: ##...:::::: ## ##:::::: ##:::: ##.. ##::: #########: ##:::::::::: ##::::
 ##:.:: ##: ##.... ##:: ##:. ##::::: ##:::::::: ##:. ##::::: ##:::: ##::. ##:: ##.... ##: ##::: ##:::: ##::::
 ##:::: ##: ##:::: ##: ##:::. ##:::: ########: ##:::. ##:::: ##:::: ##:::. ##: ##:::: ##:. ######::::: ##::::
..:::::..::..:::::..::..:::::..:::::........::..:::::..:::::..:::::..:::::..::..:::::..:::......::::::..:::::
                                                                                    */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Interface for the Universe contract to access entropy
interface IUniverse {
    function getEntropy() external view returns (bytes32);
    function isEntropySet() external view returns (bool);
    function GOD() external view returns (address);
}

// Interface for the Game contract to check player status and chapters
interface IGame {
    function isPlayer(address player) external view returns (bool);
    function isPilot(address pilot) external view returns (bool);
    function getVisibleChapters() external view returns (uint8[] memory);
    function state() external view returns (uint8); // 0 = Open, 1 = Active
    function getPlayers() external view returns (address[] memory);
    function getPlayerScore(address player) external view returns (uint256);
}

// Interface for the Auditor contract to check if contracts are audited
interface IAuditor {
    function isAudited(address contractAddress) external view returns (uint8);
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
    string public constant RULE_TWO = "Each sector governs its own rules and regulations";
    string public constant RULE_THREE = "Your reputation will be recorded, traceable, and unforgeable";

    // Universe contract for entropy access
    IUniverse public immutable universe;
    
    // Game contract for player and chapter validation
    IGame public immutable game;
    
    // Auditor contract for checking if about contracts are audited
    IAuditor public immutable auditor;
    
    // Credits ERC20 token contract for staking
    IERC20 public immutable creditsContract;
    
    // Track each pilot's staked balance to prevent collusion/exploits
    mapping(address => uint256) public stakedBalance;
    
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
        address registry, 
        address indexed player
    );
    
    event RegistryUpdated(
        uint256 indexed sectorId,
        address oldRegistry,
        address newRegistry,
        address indexed player
    );
    
    event PilotStaked(address indexed pilot, uint256 indexed sectorId, uint256 amount);
    event PilotUnstaked(address indexed pilot, uint256 indexed sectorId, uint256 amount);
    event PilotSlashed(address indexed killer, uint256 indexed sectorId, uint256 amount);

    // Constructor - Max's final act
    constructor(address _universe, address _game, address _auditor, address _credits) {
        // The Extract Protocol is now live - Max's legacy etched into the blockchain
        universe = IUniverse(_universe);
        game = IGame(_game);
        auditor = IAuditor(_auditor);
        creditsContract = IERC20(_credits);
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
     * @return sectorId The generated sector ID that was claimed
     */
    function broadcast() external returns (uint256 sectorId) {
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
        
        // msg.sender must be a valid contract address (already validated by tx.origin != msg.sender check)
        require(msg.sender != address(0), "Registry cannot be zero address");
        require(msg.sender.code.length > 0, "Registry must be a contract");
        
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
        sectors[sectorId] = msg.sender;
        
        // Track active sectors
        activeSectors.push(sectorId);
        
        // Mark that this player has broadcast a sector
        playerHasBroadcast[tx.origin] = true;
        
        // Store the player-to-sector mapping
        playerToSector[tx.origin] = sectorId;
        
        // Store the sector-to-owner mapping for efficient lookups
        sectorToOwner[sectorId] = tx.origin;
        
        emit SectorBroadcast(sectorId, msg.sender, tx.origin);
    }

    /**
     * Update the registry contract for an existing sector
     * 
     * Requirements:
     * 1. Must be called from a contract (tx.origin != msg.sender)
     * 2. Player must have a sector (playerToSector[tx.origin] != 0)
     * 3. msg.sender must be a valid contract address
     * 4. msg.sender must be different from the current registry address
     * 
     * @return sectorId The sector ID that was updated
     */
    function updateRegistry() external returns (uint256 sectorId) {
        // Contract-only access: must be called from a contract, not directly from EOA
        require(tx.origin != msg.sender, "Cannot update registry directly from EOA - use your Registry Contract");
        
        // Get the player's sector ID
        sectorId = playerToSector[tx.origin];
        require(sectorId != 0, "Player does not have a sector");
        
        // msg.sender must be a valid contract address (already validated by tx.origin != msg.sender check)
        require(msg.sender != address(0), "New registry cannot be zero address");
        require(msg.sender.code.length > 0, "New registry must be a contract");
        
        // Get the current registry for this sector
        address currentRegistry = sectors[sectorId];
        
        // Ensure the new registry is different from the current one
        require(msg.sender != currentRegistry, "Cannot update registry to the same contract - you are already using this registry address");
        
        // Update the sector registry
        sectors[sectorId] = msg.sender;
        
        emit RegistryUpdated(sectorId, currentRegistry, msg.sender, tx.origin);
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
     * Get all active sectors with their owners, registry addresses, about contract info, and scores
     * @return sectorIds Array of all active sector IDs
     * @return owners Array of owner addresses corresponding to each sector
     * @return registries Array of registry contract addresses corresponding to each sector
     * @return names Array of player names from about contracts (empty string if not available)
     * @return socials Array of player social links from about contracts (empty string if not available)
     * @return scores Array of player scores from the game contract
     */
    function getPlayerData() external view returns (
        uint256[] memory sectorIds, 
        address[] memory owners, 
        address[] memory registries,
        string[] memory names,
        string[] memory socials,
        uint256[] memory scores
    ) {
        uint256 sectorCount = activeSectors.length;
        sectorIds = new uint256[](sectorCount);
        owners = new address[](sectorCount);
        registries = new address[](sectorCount);
        names = new string[](sectorCount);
        socials = new string[](sectorCount);
        scores = new uint256[](sectorCount);
        
        for (uint256 i = 0; i < sectorCount; i++) {
            uint256 sectorId = activeSectors[i];
            address owner = sectorToOwner[sectorId];
            
            sectorIds[i] = sectorId;
            owners[i] = owner;
            registries[i] = sectors[sectorId];
            
            // Get player score from game contract
            scores[i] = game.getPlayerScore(owner);
            
            // Try to get name and social from about contract
            (string memory playerName, string memory playerSocial) = getAboutInfo(sectors[sectorId]);
            names[i] = playerName;
            socials[i] = playerSocial;
        }
        
        return (sectorIds, owners, registries, names, socials, scores);
    }
    
    /**
     * Get all information for a specific sector in one call
     * @param sectorId The sector ID to get information for
     * @return owner The owner address of the sector
     * @return registry The registry contract address for the sector
     * @return score The player's score from the game contract
     * @return name The sector name from about contract (empty string or "(pending audit)" if not available)
     * @return social The social link from about contract (empty string if not available)
     */
    function getSectorInfo(uint256 sectorId) external view returns (
        address owner,
        address registry,
        uint256 score,
        string memory name,
        string memory social
    ) {
        owner = sectorToOwner[sectorId];
        registry = sectors[sectorId];
        score = game.getPlayerScore(owner);
        (name, social) = getAboutInfo(registry);
        return (owner, registry, score, name, social);
    }

    /**
     * Get name and social from a registry's about module
     * @param registryAddress The registry contract address
     * @return name The player name (empty string if not available)
     * @return social The player social link (empty string if not available)
     */
    function getAboutInfo(address registryAddress) public view returns (string memory name, string memory social) {
        // Default to empty strings
        name = "";
        social = "";
        
        if (registryAddress == address(0)) {
            return (name, social);
        }
        
        // Try to call modules("about") on the registry contract
        (bool success, bytes memory data) = registryAddress.staticcall(
            abi.encodeWithSignature("modules(string)", "about")
        );
        
        if (success && data.length >= 32) {
            address aboutAddress = abi.decode(data, (address));
            
            // Check if about address is set (not zero address)
            if (aboutAddress != address(0)) {
                // Check if the about contract is audited for chapter 2
                uint8 auditedChapter = auditor.isAudited(aboutAddress);
                
                // If not audited for chapter 2, return pending audit message
                if (auditedChapter != 2) {
                    return ("(pending audit)", "");
                }
                
                // About contract is audited, proceed to read name and social
                // Try to read name from about contract
                (bool nameSuccess, bytes memory nameData) = aboutAddress.staticcall(
                    abi.encodeWithSignature("name()")
                );
                if (nameSuccess && nameData.length > 0) {
                    name = abi.decode(nameData, (string));
                }
                
                // Try to read social from about contract
                (bool socialSuccess, bytes memory socialData) = aboutAddress.staticcall(
                    abi.encodeWithSignature("social()")
                );
                if (socialSuccess && socialData.length > 0) {
                    social = abi.decode(socialData, (string));
                }
            }
        }
        
        return (name, social);
    }
    
    /**
     * Stake 10k credits to enter a sector with an audited stake module
     * Pilots must call this before entering sectors that require staking
     * @param sectorId The sector ID to stake into
     */
    function stake(uint256 sectorId) external {
        // Verify caller is a pilot (through Game contract check)
        require(game.isPilot(msg.sender), "Not a pilot");
        
        // Get registry for sector
        address registry = sectors[sectorId];
        require(registry != address(0), "Sector not found");
        
        // Get stake module from registry
        (bool success, bytes memory data) = registry.staticcall(
            abi.encodeWithSignature("modules(string)", "stake")
        );
        require(success && data.length >= 32, "Failed to get stake module");
        address stakeContract = abi.decode(data, (address));
        require(stakeContract != address(0), "No stake module");
        
        // Verify stake contract is audited for chapter 4
        require(auditor.isAudited(stakeContract) == 4, "Not audited for chapter 4");
        
        // Transfer 10k credits from pilot to MaxExtract
        uint256 stakeAmount = 10_000 * 10**18;
        require(creditsContract.transferFrom(msg.sender, address(this), stakeAmount), "Transfer failed");
        
        // Increment pilot's staked balance
        stakedBalance[msg.sender] += stakeAmount;
        
        // Call activate on stake contract (tx.origin pattern)
        (bool activateSuccess, ) = stakeContract.call(abi.encodeWithSignature("activate()"));
        require(activateSuccess, "Activate failed");
        
        emit PilotStaked(msg.sender, sectorId, stakeAmount);
    }
    
    /**
     * Unstake and get 10k credits back when leaving a sector
     * @param sectorId The sector ID to unstake from
     */
    function unstake(uint256 sectorId) external {
        // Check pilot has staked balance
        uint256 unstakeAmount = 10_000 * 10**18;
        require(stakedBalance[msg.sender] >= unstakeAmount, "Insufficient staked balance");
        
        // Get registry for sector
        address registry = sectors[sectorId];
        require(registry != address(0), "Sector not found");
        
        // Get stake module from registry
        (bool success, bytes memory data) = registry.staticcall(
            abi.encodeWithSignature("modules(string)", "stake")
        );
        require(success && data.length >= 32, "Failed to get stake module");
        address stakeContract = abi.decode(data, (address));
        require(stakeContract != address(0), "No stake module");
        require(auditor.isAudited(stakeContract) == 4, "Not audited for chapter 4");
        
        // Decrement pilot's staked balance BEFORE transfer
        stakedBalance[msg.sender] -= unstakeAmount;
        
        // Transfer credits back to pilot
        require(creditsContract.transfer(msg.sender, unstakeAmount), "Transfer failed");
        
        // Call deactivate on stake contract
        (bool deactivateSuccess, ) = stakeContract.call(abi.encodeWithSignature("deactivate()"));
        require(deactivateSuccess, "Deactivate failed");
        
        emit PilotUnstaked(msg.sender, sectorId, unstakeAmount);
    }
    
    /**
     * Slash a killer's entire staked balance
     * Only callable by audited stake contracts when a pilot kills another pilot
     * Burns the slashed credits permanently from circulation
     * @param killer The pilot address whose stake should be slashed
     * @param sectorId The sector ID where the killing occurred
     */
    function slash(address killer, uint256 sectorId) external {
        // Get registry for sector
        address registry = sectors[sectorId];
        require(registry != address(0), "Invalid sector");
        
        // Verify msg.sender is the audited stake module for this sector
        (bool success, bytes memory data) = registry.staticcall(
            abi.encodeWithSignature("modules(string)", "stake")
        );
        require(success && data.length >= 32, "Failed to get stake module");
        address stakeContract = abi.decode(data, (address));
        require(stakeContract == msg.sender, "Not stake contract");
        require(auditor.isAudited(stakeContract) == 4, "Not audited for chapter 4");
        
        // Get killer's staked balance
        uint256 slashAmount = stakedBalance[killer];
        require(slashAmount > 0, "No staked balance to slash");
        
        // Verify MaxExtract has enough credits to burn
        uint256 contractBalance = creditsContract.balanceOf(address(this));
        require(contractBalance >= slashAmount, "Insufficient credits in contract");
        
        // Set killer's balance to 0 BEFORE burning (checks-effects-interactions pattern)
        stakedBalance[killer] = 0;
        
        // Actually burn the slashed credits by sending to dead address
        // This permanently removes them from circulation
        require(
            creditsContract.transfer(0x000000000000000000000000000000000000dEaD, slashAmount),
            "Burn transfer failed"
        );
        
        emit PilotSlashed(killer, sectorId, slashAmount);
    }
    
    /**
     * Check if a sector has staking enabled (audited stake module)
     * @param sectorId The sector ID to check
     * @return True if the sector has an audited stake module
     */
    function canStake(uint256 sectorId) external view returns (bool) {
        address registry = sectors[sectorId];
        if (registry == address(0)) return false;
        
        (bool success, bytes memory data) = registry.staticcall(
            abi.encodeWithSignature("modules(string)", "stake")
        );
        if (!success || data.length < 32) return false;
        
        address stakeContract = abi.decode(data, (address));
        if (stakeContract == address(0)) return false;
        
        return auditor.isAudited(stakeContract) == 4;
    }
    
    /**
     * Get a pilot's current staked balance
     * @param pilot The pilot address to check
     * @return The amount of credits currently staked by this pilot
     */
    function getStakedBalance(address pilot) external view returns (uint256) {
        return stakedBalance[pilot];
    }
    
}
