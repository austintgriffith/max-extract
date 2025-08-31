//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

/**
 * Universe Contract - Manages the game world state
 * Handles asteroid lifecycle, ship tracking, mining actions, and verification
 * Uses commit-reveal scheme for secure entropy generation
 * @author Max Extract Protocol
 */
contract Universe {
    // The god address - only this address can set the universe entropy
    // address public constant GOD = 0x159d7e6AbEd4146520Bfc8849aA1AB4cAD3923f9;
    address public immutable GOD;
    
    // The universe entropy - immutable once set via commit-reveal
    bytes32 public entropy;
    bool public entropySet;
    
    // Commit-reveal state
    bytes32 public commitmentHash;
    uint256 public commitBlock;
    bool public commitmentMade;
    
    // Events
    event CommitmentMade(bytes32 indexed commitmentHash, uint256 indexed blockNumber);
    event EntropyRevealed(bytes32 indexed entropy, bytes32 reveal, uint256 commitBlockHash);
    
    // Errors
    error OnlyGod();
    error EntropyAlreadySet();
    error NoCommitmentMade();
    error RevealTooEarly();
    error InvalidReveal();
    error CommitmentAlreadyMade();

    modifier onlyGod() {
        if (msg.sender != GOD) revert OnlyGod();
        _;
    }

    modifier entropyNotSet() {
        if (entropySet) revert EntropyAlreadySet();
        _;
    }

    constructor(address _god) {
        // Universe awaits the god's entropy
        GOD = _god;
    }

    /**
     * Step 1: God commits to a secret random number
     * @param _commitmentHash keccak256(randomNumber) - commitment to secret random number
     */
    function commit(bytes32 _commitmentHash) external onlyGod entropyNotSet {
        if (commitmentMade) revert CommitmentAlreadyMade();
        
        commitmentHash = _commitmentHash;
        commitBlock = block.number;
        commitmentMade = true;
        
        emit CommitmentMade(_commitmentHash, block.number);
    }

    /**
     * Step 2: God reveals the random number to generate entropy
     * Must be called in a subsequent block to ensure commit block hash is available
     * @param randomNumber The secret random number that was committed to
     */
    function reveal(uint256 randomNumber) external onlyGod entropyNotSet {
        if (!commitmentMade) revert NoCommitmentMade();
        if (block.number <= commitBlock) revert RevealTooEarly();
        
        // Verify the reveal matches the commitment
        bytes32 expectedCommitment = keccak256(abi.encodePacked(randomNumber));
        if (expectedCommitment != commitmentHash) revert InvalidReveal();
        
        // Get the commit block hash for additional entropy
        bytes32 commitBlockHash = blockhash(commitBlock);
        
        // Generate final entropy by combining random number with commit block hash
        entropy = keccak256(abi.encodePacked(randomNumber, commitBlockHash));
        entropySet = true;
        
        emit EntropyRevealed(entropy, bytes32(randomNumber), uint256(commitBlockHash));
    }

    /**
     * Get the current universe entropy
     * @return The entropy bytes32, or 0x0 if not set yet
     */
    function getEntropy() external view returns (bytes32) {
        return entropy;
    }

    /**
     * Check if entropy has been set
     * @return True if entropy is available
     */
    function isEntropySet() external view returns (bool) {
        return entropySet;
    }

    /**
     * Get commit-reveal state for frontend
     * @return _commitmentMade Whether a commitment has been made
     * @return _commitBlock The block number of the commitment
     * @return _entropySet Whether entropy has been revealed
     */
    function getCommitRevealState() external view returns (
        bool _commitmentMade,
        uint256 _commitBlock,
        bool _entropySet
    ) {
        return (commitmentMade, commitBlock, entropySet);
    }

    /**
     * Development function to set entropy directly (bypasses commit-reveal)
     * Only available to GOD for easier testing/development
     */
    function setEntropyDirect(bytes32 _entropy) external onlyGod entropyNotSet {
        entropy = _entropy;
        entropySet = true;
        
        emit EntropyRevealed(_entropy, bytes32(0), 0);
    }
}
