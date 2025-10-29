//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./Universe.sol";
import "./Game.sol";

/**
 * Auditor Contract - Manages contract audit requests for Max Extract game chapters
 * Players request audits by submitting contract addresses and paying 2 points
 * An authorized auditor script verifies source code and marks contracts as audited
 * @author Max Extract Protocol
 */
contract Auditor {
    // Audit status enum
    enum AuditStatus {
        Pending,
        Audited,
        Failed
    }
    
    // Audit request struct
    struct AuditRequest {
        address contractAddress;
        address requester;
        uint8 chapterNumber;
        string blockExplorerUrl;
        uint256 timestamp;
        AuditStatus status;
        string failureReason;
    }
    
    // State variables
    AuditRequest[] public auditRequests;
    mapping(address => uint8) public isAudited; // Returns chapter number (0 = not audited)
    mapping(address => uint256[]) public auditsByAddress;
    address public auditorAddress;
    Game public gameContract;
    Universe public immutable universe;
    
    // Events
    event AuditRequested(
        uint256 indexed requestId,
        address indexed contractAddress,
        address indexed requester,
        uint8 chapterNumber,
        string blockExplorerUrl
    );
    event AuditCompleted(uint256 indexed requestId, address indexed contractAddress);
    event AuditFailed(uint256 indexed requestId, address indexed contractAddress, string reason);
    event AuditAlreadyCompleted(address indexed contractAddress, address indexed requester);
    event AuditorAddressSet(address indexed newAuditor);
    event GameContractSet(address indexed newGame);
    
    // Errors
    error OnlyGod();
    error OnlyAuditor();
    error InvalidRequest();
    error InvalidStatus();
    
    modifier onlyGod() {
        if (msg.sender != universe.GOD()) revert OnlyGod();
        _;
    }
    
    modifier onlyAuditor() {
        if (msg.sender != auditorAddress) revert OnlyAuditor();
        _;
    }
    
    constructor(address _universe, address _game, address _auditor) {
        universe = Universe(_universe);
        gameContract = Game(_game);
        auditorAddress = _auditor;
    }
    
    /**
     * Request an audit for a contract
     * Costs 2 points which are deducted from the player's score
     * @param _contract The contract address to audit
     * @param _chapter The chapter number this audit is for
     * @param _url Optional block explorer URL (empty string for default arbiscan pattern)
     */
    function requestAudit(
        address _contract,
        uint8 _chapter,
        string calldata _url
    ) external {
        require(_contract != address(0), "Invalid contract address");
        require(address(gameContract) != address(0), "Game contract not set");
        
        // Deduct 2 points from the player's score
        gameContract.deductPoints(msg.sender, 2);
        
        // Check if contract is already audited for this specific chapter
        if (isAudited[_contract] == _chapter) {
            emit AuditAlreadyCompleted(_contract, msg.sender);
            return; // Exit early - contract already successfully audited for this chapter
        }
        
        // Build block explorer URL (use provided or default to arbiscan)
        string memory explorerUrl = bytes(_url).length > 0 
            ? _url 
            : string(abi.encodePacked("https://arbiscan.io/address/", toAsciiString(_contract), "#code"));
        
        // Create audit request
        AuditRequest memory request = AuditRequest({
            contractAddress: _contract,
            requester: msg.sender,
            chapterNumber: _chapter,
            blockExplorerUrl: explorerUrl,
            timestamp: block.timestamp,
            status: AuditStatus.Pending,
            failureReason: ""
        });
        
        uint256 requestId = auditRequests.length;
        auditRequests.push(request);
        
        // Track audit request by requester address
        auditsByAddress[msg.sender].push(requestId);
        
        emit AuditRequested(requestId, _contract, msg.sender, _chapter, explorerUrl);
    }
    
    /**
     * Mark an audit request as successfully audited
     * Only callable by the authorized auditor address
     * @param _requestId The ID of the audit request
     */
    function markAudited(uint256 _requestId) external onlyAuditor {
        if (_requestId >= auditRequests.length) revert InvalidRequest();
        
        AuditRequest storage request = auditRequests[_requestId];
        if (request.status != AuditStatus.Pending) revert InvalidStatus();
        
        request.status = AuditStatus.Audited;
        isAudited[request.contractAddress] = request.chapterNumber; // Store chapter number
        
        emit AuditCompleted(_requestId, request.contractAddress);
    }
    
    /**
     * Mark an audit request as failed
     * Only callable by the authorized auditor address
     * @param _requestId The ID of the audit request
     * @param _reason The reason for failure
     */
    function markFailed(uint256 _requestId, string calldata _reason) external onlyAuditor {
        if (_requestId >= auditRequests.length) revert InvalidRequest();
        
        AuditRequest storage request = auditRequests[_requestId];
        if (request.status != AuditStatus.Pending) revert InvalidStatus();
        
        request.status = AuditStatus.Failed;
        request.failureReason = _reason;
        
        emit AuditFailed(_requestId, request.contractAddress, _reason);
    }
    
    /**
     * Get the total number of audit requests
     * @return The count of audit requests
     */
    function getAuditRequestCount() external view returns (uint256) {
        return auditRequests.length;
    }
    
    /**
     * Get a specific audit request by index
     * @param _index The index of the audit request
     * @return The audit request data
     */
    function getAuditRequest(uint256 _index) external view returns (AuditRequest memory) {
        require(_index < auditRequests.length, "Invalid index");
        return auditRequests[_index];
    }
    
    /**
     * Get all pending audit request IDs
     * @return Array of pending request IDs
     */
    function getPendingAudits() external view returns (uint256[] memory) {
        // First, count pending audits
        uint256 pendingCount = 0;
        for (uint256 i = 0; i < auditRequests.length; i++) {
            if (auditRequests[i].status == AuditStatus.Pending) {
                pendingCount++;
            }
        }
        
        // Create array and populate with pending request IDs
        uint256[] memory pendingIds = new uint256[](pendingCount);
        uint256 currentIndex = 0;
        for (uint256 i = 0; i < auditRequests.length; i++) {
            if (auditRequests[i].status == AuditStatus.Pending) {
                pendingIds[currentIndex] = i;
                currentIndex++;
            }
        }
        
        return pendingIds;
    }
    
    /**
     * Get all audit request IDs for a specific address
     * @param _address The address to query
     * @return Array of audit request IDs for this address
     */
    function getAuditsByAddress(address _address) external view returns (uint256[] memory) {
        return auditsByAddress[_address];
    }
    
    /**
     * Get the result of the last audit requested by an address
     * @param _address The address to query
     * @return The most recent audit request, or a default struct if no audits exist
     */
    function lastAuditResult(address _address) external view returns (AuditRequest memory) {
        uint256[] memory requestIds = auditsByAddress[_address];
        require(requestIds.length > 0, "No audit requests found for this address");
        
        // Get the last request ID (most recent)
        uint256 lastRequestId = requestIds[requestIds.length - 1];
        return auditRequests[lastRequestId];
    }
    
    /**
     * Set the authorized auditor address
     * Only callable by God
     * @param _auditor The new auditor address
     */
    function setAuditorAddress(address _auditor) external onlyGod {
        require(_auditor != address(0), "Invalid auditor address");
        auditorAddress = _auditor;
        emit AuditorAddressSet(_auditor);
    }
    
    /**
     * Set the game contract address
     * Only callable by God
     * @param _game The game contract address
     */
    function setGameContract(address _game) external onlyGod {
        require(_game != address(0), "Invalid game address");
        gameContract = Game(_game);
        emit GameContractSet(_game);
    }
    
    /**
     * Convert address to ASCII string (for building URLs)
     * @param _addr The address to convert
     * @return The ASCII string representation
     */
    function toAsciiString(address _addr) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory data = abi.encodePacked(_addr);
        bytes memory str = new bytes(2 + data.length * 2);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < data.length; i++) {
            str[2 + i * 2] = alphabet[uint8(data[i] >> 4)];
            str[3 + i * 2] = alphabet[uint8(data[i] & 0x0f)];
        }
        return string(str);
    }
}

