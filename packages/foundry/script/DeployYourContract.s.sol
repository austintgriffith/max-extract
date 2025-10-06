// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import "../contracts/Universe.sol";
import "../contracts/Credits.sol";
import "../contracts/MaxExtract.sol";
import "../contracts/Game.sol";

/**
 * @notice Deploy script for Max Extract Protocol contracts
 * @dev Inherits ScaffoldETHDeploy which:
 *      - Includes forge-std/Script.sol for deployment
 *      - Includes ScaffoldEthDeployerRunner modifier
 *      - Provides `deployer` variable
 * Example:
 * yarn deploy --file DeployYourContract.s.sol  # local anvil chain
 * yarn deploy --file DeployYourContract.s.sol --network optimism # live network (requires keystore)
 */
contract DeployYourContract is ScaffoldETHDeploy {
    // Game configuration
    uint256 public constant GAME_BUYIN_PRICE = 0.001 ether;
    /**
     * @dev Deployer setup based on `ETH_KEYSTORE_ACCOUNT` in `.env`:
     *      - "scaffold-eth-default": Uses Anvil's account #9 (0xa0Ee7A142d267C1f36714E4a8F75612F20a79720), no password prompt
     *      - "scaffold-eth-custom": requires password used while creating keystore
     *
     * Note: Must use ScaffoldEthDeployerRunner modifier to:
     *      - Setup correct `deployer` account and fund it
     *      - Export contract addresses & ABIs to `nextjs` packages
     */
    function run() external ScaffoldEthDeployerRunner {

        console.log("Deployer:", deployer);
        // Deploy the core contracts of the Max Extract Protocol
        Universe universe = new Universe();
        Credits credits = new Credits(universe.GOD());
        
        // Deploy Game contract with configured buy-in price
        Game game = new Game(address(universe), GAME_BUYIN_PRICE);
        
        // Deploy MaxExtract with both Universe and Game contract addresses
        MaxExtract maxExtract = new MaxExtract(address(universe), address(game));
        
        // Log deployed contract addresses for verification
        console.log("Universe deployed at:", address(universe));
        console.log("Credits deployed at:", address(credits));
        console.log("MaxExtract deployed at:", address(maxExtract));
        console.log("Game deployed at:", address(game));
        
        // DEVELOPMENT MODE: Auto-setup entropy
        // For production, comment out the line below and manually run commit-reveal
        //setupUniverseEntropyDev(universe);
    }
    
    /**
     * DEVELOPMENT ONLY: Automatically sets entropy using direct method
     * For production, use the manual commit-reveal process instead
     */
     /*
    function setupUniverseEntropyDev(Universe universe) internal {
        // Generate entropy directly for development ease
        bytes32 entropy = keccak256(abi.encodePacked(
            block.timestamp,
            block.difficulty,
            msg.sender,
            address(this),
            "max-extract-universe-entropy"
        ));
        
        // Set entropy directly (development function)
        //universe.setEntropyDirect(entropy);
    }*/
    
    /**
     * PRODUCTION: Manual commit-reveal process
     * Uncomment and use this instead of setupUniverseEntropyDev() for production
     * 
     * Steps for production deployment:
     * 1. Deploy contracts (comment out setupUniverseEntropyDev call above)
     * 2. Manually call universe.commit(keccak256(abi.encodePacked(yourRandomNumber)))
     * 3. Wait for next block
     * 4. Manually call universe.reveal(yourRandomNumber)
     */
    /*
    function setupUniverseEntropyProd(Universe universe, uint256 randomNumber) internal {
        // Step 1: Commit to the random number
        bytes32 commitment = keccak256(abi.encodePacked(randomNumber));
        universe.commit(commitment);
        
        // Step 2: This would need to be called in a separate transaction/block
        // universe.reveal(randomNumber); // Call this manually after block advancement
    }
    */
}
