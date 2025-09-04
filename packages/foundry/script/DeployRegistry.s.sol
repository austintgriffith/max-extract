// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import "../contracts/Chapter1Registry.sol";
import "../contracts/MaxExtract.sol";
import "../contracts/Credits.sol";
import "../contracts/Universe.sol";

/**
 * @notice Deploy script for Chapter 1 Registry Contract
 * @dev Deploys a Registry contract with specified owner address
 * 
 * Usage:
 * yarn deploy --file DeployRegistry.s.sol  # local anvil chain
 * yarn deploy --file DeployRegistry.s.sol --network optimism # live network
 */
contract DeployRegistry is ScaffoldETHDeploy {
    
    // The specified owner address for the Registry contract
    address constant REGISTRY_OWNER = 0x05937Df8ca0636505d92Fd769d303A3D461587ed;
    
    /**
     * @dev Deploy the Registry contract with the specified owner
     * Uses the already deployed MaxExtract and Credits contracts
     */
    function run() external ScaffoldEthDeployerRunner {
        console.log("Deployer address:", deployer);
        
        // Deploy the core contracts first if not already deployed
        Universe universe = new Universe(deployer);
        Credits credits = new Credits(deployer);
        MaxExtract maxExtract = new MaxExtract(address(universe));
        
        // Setup entropy for development
        setupUniverseEntropyDev(universe);
        
        console.log("Core contracts deployed:");
        console.log("Universe:", address(universe));
        console.log("Credits:", address(credits));
        console.log("MaxExtract:", address(maxExtract));
        
        // Deploy the Chapter1Registry contract with the deployed contract addresses
        deployRegistry(address(maxExtract), address(credits));
    }
    
    /**
     * @dev Deploy Registry with specific contract addresses
     * This can be called externally or internally
     */
    function deployRegistry(address maxExtractAddress, address creditsAddress) public {
        console.log("Deploying Registry contract...");
        console.log("MaxExtract address:", maxExtractAddress);
        console.log("Credits address:", creditsAddress);
        console.log("Registry owner:", REGISTRY_OWNER);
        
        // Deploy the Chapter1Registry contract
        Chapter1Registry registry = new Chapter1Registry(
            maxExtractAddress,
            creditsAddress,
            REGISTRY_OWNER
        );
        
        console.log("Registry deployed at:", address(registry));
        console.log("Registry owner set to:", REGISTRY_OWNER);
        
        // Verify the deployment
        verifyRegistryDeployment(registry, maxExtractAddress, creditsAddress);
    }
    
    /**
     * DEVELOPMENT ONLY: Automatically sets entropy using direct method
     * For production, use the manual commit-reveal process instead
     */
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
        universe.setEntropyDirect(entropy);
    }
    
    /**
     * Verify the Registry contract was deployed correctly
     */
    function verifyRegistryDeployment(
        Chapter1Registry registry, 
        address expectedMaxExtract, 
        address expectedCredits
    ) internal view {
        // Verify contract addresses are set correctly
        require(address(registry.maxExtract()) == expectedMaxExtract, "MaxExtract address mismatch");
        require(address(registry.credits()) == expectedCredits, "Credits address mismatch");
        require(registry.owner() == REGISTRY_OWNER, "Owner address mismatch");
        
        // Verify initial state
        require(!registry.hasBroadcast(), "Should not be broadcast yet");
        require(registry.sectorId() == 0, "Sector ID should be 0 initially");
        require(registry.getTreasuryBalance() == 0, "Treasury should be empty initially");
        
        console.log("Registry deployment verification passed!");
        console.log("  MaxExtract:", address(registry.maxExtract()));
        console.log("  Credits:", address(registry.credits()));
        console.log("  Owner:", registry.owner());
        console.log("  Has Broadcast:", registry.hasBroadcast());
        console.log("  Treasury Balance:", registry.getTreasuryBalance());
    }
}
