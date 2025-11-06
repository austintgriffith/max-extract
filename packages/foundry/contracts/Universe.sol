//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

// Useful for debugging. Remove when deploying to a live network.
import "forge-std/console.sol";

/**
 * Universe Contract - Manages the game world state
 * Handles asteroid lifecycle, ship tracking, mining actions, and verification
 * Uses commit-reveal scheme for secure entropy generation
 * @author Max Extract Protocol
 */
contract Universe {
    // The god address - only this address can set the universe entropy
    address public constant GOD = 0x0647603E7711D9686BdB9fDB1fe0b04162b73dD7;
    //address public constant GOD = 0x43D9B634006B4fCe2523a710990a397AC3d18D7a;
    //address public immutable GOD;

     /**
     * DEV FUNCTION COMMENT OUT to set entropy directly (bypasses commit-reveal)
     * Only available to GOD for easier testing/development
     */
     /*
    function setEntropyDirect(bytes32 _entropy) external onlyGod entropyNotSet {
        entropy = _entropy;
        entropySet = true;
        
        emit EntropyRevealed(_entropy, bytes32(0), 0);
    }*/

    
    // The universe entropy - immutable once set via commit-reveal
    bytes32 public entropy;
    bool public entropySet;
    
    // Commit-reveal state
    bytes32 public commitmentHash;
    uint256 public commitBlock;
    bool public commitmentMade;
    
    // Rolling commit-reveal state for ongoing entropy generation
    bytes32 public rollingEntropy;
    bytes32 public lastCommit;
    uint256 public roundNumber;
    
    // Events
    event CommitmentMade(bytes32 indexed commitmentHash, uint256 indexed blockNumber);
    event EntropyRevealed(bytes32 indexed entropy, bytes32 reveal, uint256 commitBlockHash);
    event RollingCommitReveal(uint256 indexed roundNumber, bytes32 indexed newCommit, bytes32 reveal, bytes32 newRollingEntropy);
    
    // Errors
    error OnlyGod();
    error EntropyAlreadySet();
    error NoCommitmentMade();
    error BlockhashUnavailable();
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

    constructor() {
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
        
        // Get the commit block hash for additional entropy
        bytes32 commitBlockHash = blockhash(commitBlock);
        if (commitBlockHash == 0) revert BlockhashUnavailable();
        
        // Verify the reveal matches the commitment
        bytes32 expectedCommitment = keccak256(abi.encodePacked(randomNumber));
        if (expectedCommitment != commitmentHash) revert InvalidReveal();
        
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
     * Rolling commit-reveal function for ongoing entropy generation
     * Commits to next round while revealing current round in same transaction
     * @param nextCommit Commitment hash for the next round (keccak256(randomNumber))
     * @param revealNumber The random number being revealed for current round (0x0 for round 0)
     */
    function rollingCommitReveal(bytes32 nextCommit, uint256 revealNumber) external onlyGod {
        // For round 0, allow reveal to be 0 and initialize rolling entropy
        if (roundNumber == 0) {
            // For the first round, we accept any reveal (including 0) and initialize rolling entropy
            // Use a combination of reveal and block hash for initial entropy
            bytes32 currentBlockHash = blockhash(block.number - 1);
            rollingEntropy = keccak256(abi.encodePacked(revealNumber, currentBlockHash));
            lastCommit = nextCommit;
            roundNumber = 1;
            
            emit RollingCommitReveal(0, nextCommit, bytes32(revealNumber), rollingEntropy);
            return;
        }
        
        // For subsequent rounds, verify the reveal matches the last commit
        bytes32 expectedCommit = keccak256(abi.encodePacked(revealNumber));
        if (expectedCommit != lastCommit) revert InvalidReveal();
        
        // Get the block hash from when the last commit was made
        // Note: We use the current block hash as the source of additional entropy
        bytes32 blockHash = blockhash(block.number - 1);
        
        // Generate new rolling entropy by combining reveal with block hash
        rollingEntropy = keccak256(abi.encodePacked(revealNumber, blockHash, rollingEntropy));
        
        // Store the new commit for next round
        lastCommit = nextCommit;
        roundNumber++;
        
        emit RollingCommitReveal(roundNumber - 1, nextCommit, bytes32(revealNumber), rollingEntropy);
    }

    /**
     * Get the current rolling entropy and round information
     * @return _rollingEntropy Current rolling entropy
     * @return _roundNumber Current round number
     * @return _lastCommit Last commitment hash
     */
    function getRollingState() external view returns (
        bytes32 _rollingEntropy,
        uint256 _roundNumber,
        bytes32 _lastCommit
    ) {
        return (rollingEntropy, roundNumber, lastCommit);
    }

    /**
     * Get the main commitment hash for display purposes
     * @return The current commitment hash
     */
    function getCommitmentHash() external view returns (bytes32) {
        return commitmentHash;
    }
}
