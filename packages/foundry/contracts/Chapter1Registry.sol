//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

// Useful for debugging. Remove when deploying to a live network.
import "forge-std/console.sol";

// Use OpenZeppelin for access control and ERC20 interface
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Interface for MaxExtract contract
interface IMaxExtract {
    function broadcast(address registry) external returns (uint256 sectorId);
}

/**
 * Registry Contract - Chapter 1 of Max Extract Protocol
 * 
 * "Your first task is to deploy a Registry Contract and call broadcast() to announce it 
 * to the Extract Protocol. The Registry Contract also doubles as your treasury."
 * 
 * Core Features:
 * - Modules mapping (string → address) for managing subsystem contracts
 * - Broadcast function to register with MaxExtract Protocol
 * - Treasury functionality for receiving credits from guild activities
 * - Access control to prevent unauthorized changes
 * 
 * @author Max Extract Protocol - Chapter 1
 */
contract Chapter1Registry is Ownable {
    // The modules mapping - core of the Registry system
    // Maps module names to contract addresses (e.g., "stake" → StakingContract address)
    mapping(string => address) public modules;
    
    // MaxExtract Protocol contract for broadcasting
    IMaxExtract public immutable maxExtract;
    
    // Credits token for treasury operations
    IERC20 public immutable credits;
    
    // Sector ID assigned by MaxExtract when broadcasting
    uint256 public sectorId;
    
    // Events
    event SectorBroadcast(uint256 indexed sectorId, address indexed registry);
    event ModuleUpdated(string indexed moduleName, address indexed oldAddress, address indexed newAddress);
    event CreditsReceived(address indexed from, uint256 amount, string purpose);
    event CreditsWithdrawn(address indexed to, uint256 amount, string purpose);
    
    // Errors
    error AlreadyBroadcast();
    error NotBroadcast();
    error InvalidAddress();
    error InsufficientBalance();
    
    /**
     * Constructor - Initialize the Registry Contract
     * @param _maxExtract Address of the MaxExtract Protocol contract
     * @param _credits Address of the Credits token contract
     * @param _owner Address of the registry owner (the pirate captain)
     */
    constructor(
        address _maxExtract,
        address _credits,
        address _owner
    ) Ownable(_owner) {
        if (_maxExtract == address(0) || _credits == address(0)) revert InvalidAddress();
        
        maxExtract = IMaxExtract(_maxExtract);
        credits = IERC20(_credits);
        
        console.log("Registry deployed for owner:", _owner);
    }
    
    /**
     * Broadcast this Registry to Max's ledger
     * 
     * "Note the tx.origin != msg.sender requirement: you can't call it directly with an EOA. 
     * The Extract ledger maps your sector ID to your registry."
     * 
     * This function satisfies the anti-sybil mechanism by being called from this contract,
     * ensuring tx.origin (the user) != msg.sender (this contract).
     * 
     * @return _sectorId The sector ID assigned by MaxExtract
     */
    function broadcastSector() external onlyOwner returns (uint256 _sectorId) {
        if (sectorId != 0) revert AlreadyBroadcast();
        
        // Call MaxExtract.broadcast() - this satisfies tx.origin != msg.sender requirement
        _sectorId = maxExtract.broadcast(address(this));
        
        sectorId = _sectorId;
        
        console.log("Sector broadcast successful. Sector ID:", _sectorId);
        emit SectorBroadcast(_sectorId, address(this));
    }
    
    /**
     * Update a module address in the registry
     * 
     * "Add a function in your contract that calls broadcast(address) on Max's Extract Protocol. 
     * (Remember access control — only you should be able to register your own contract and 
     * update module records.)"
     * 
     * @param moduleName The name of the module (e.g., "stake", "reputation", "rights")
     * @param moduleAddress The contract address for this module
     */
    function updateModule(string calldata moduleName, address moduleAddress) external onlyOwner {
        address oldAddress = modules[moduleName];
        modules[moduleName] = moduleAddress;
        
        console.log("Module updated:", moduleName);
        console.log("  Old address:", oldAddress);
        console.log("  New address:", moduleAddress);
        
        emit ModuleUpdated(moduleName, oldAddress, moduleAddress);
    }
    
    /**
     * Get a module address by name
     * @param moduleName The name of the module to look up
     * @return The contract address for this module, or address(0) if not set
     */
    function getModule(string calldata moduleName) external view returns (address) {
        return modules[moduleName];
    }
    
    /**
     * Treasury Function: Receive credits from guild activities
     * 
     * "The Registry Contract also doubles as your treasury. Pirates will only stake and 
     * settle up if the contract code is verified and provably unruggable."
     * 
     * This function allows other guild contracts to deposit credits into the treasury.
     * 
     * @param amount Amount of credits to deposit
     * @param purpose Description of why credits are being deposited
     */
    function depositCredits(uint256 amount, string calldata purpose) external {
        if (amount == 0) revert InvalidAddress();
        
        // Transfer credits from sender to this treasury
        bool success = credits.transferFrom(msg.sender, address(this), amount);
        require(success, "Credits transfer failed");
        
        console.log("Credits deposited to treasury:", amount);
        console.log("Purpose:", purpose);
        
        emit CreditsReceived(msg.sender, amount, purpose);
    }
    
    /**
     * Treasury Function: Owner can withdraw credits for guild operations
     * @param to Address to send credits to
     * @param amount Amount of credits to withdraw
     * @param purpose Description of why credits are being withdrawn
     */
    function withdrawCredits(address to, uint256 amount, string calldata purpose) external onlyOwner {
        if (to == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAddress();
        
        uint256 balance = credits.balanceOf(address(this));
        if (balance < amount) revert InsufficientBalance();
        
        // Transfer credits from treasury to specified address
        bool success = credits.transfer(to, amount);
        require(success, "Credits transfer failed");
        
        console.log("Credits withdrawn from treasury:", amount);
        console.log("To:", to);
        console.log("Purpose:", purpose);
        
        emit CreditsWithdrawn(to, amount, purpose);
    }
    
    /**
     * Get the treasury balance
     * @return The amount of credits in the treasury
     */
    function getTreasuryBalance() external view returns (uint256) {
        return credits.balanceOf(address(this));
    }
    
    /**
     * Check if the sector has been broadcast
     * @return Whether the sector has been broadcast (sectorId != 0)
     */
    function hasBroadcast() external view returns (bool) {
        return sectorId != 0;
    }
    
    /**
     * Get registry information
     * @return _sectorId The sector ID (0 if not broadcast yet)
     * @return _hasBroadcast Whether the sector has been broadcast
     * @return _treasuryBalance Current treasury balance
     */
    function getRegistryInfo() external view returns (
        uint256 _sectorId,
        bool _hasBroadcast,
        uint256 _treasuryBalance
    ) {
        return (sectorId, sectorId != 0, credits.balanceOf(address(this)));
    }
    
    /**
     * Emergency function to receive ETH (though credits are the main currency)
     */
    receive() external payable {
        console.log("ETH received in registry:", msg.value);
    }
}
