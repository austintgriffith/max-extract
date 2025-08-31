// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import "../contracts/Chapter1Registry.sol";
import "../contracts/MaxExtract.sol";
import "../contracts/Credits.sol";

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
        // Get addresses of already deployed contracts from the deployments
        // Read from the deployment artifacts instead of hardcoding
        address maxExtractAddress = 0xa7328DEAa1B585a494f055Fc9Bd99ea56d52CD3d; // Updated from deployedContracts.ts
        address creditsAddress = 0xDcE79D5f359C7aB52e3d6B45be2D0D382696D323;     // Updated from deployedContracts.ts
        
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
