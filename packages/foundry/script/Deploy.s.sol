//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import { DeployYourContract } from "./DeployYourContract.s.sol";
import { DeployRegistry } from "./DeployRegistry.s.sol";

/**
 * @notice Main deployment script for all Max Extract Protocol contracts
 * @dev Run this when you want to deploy multiple contracts at once
 *
 * Example: yarn deploy # runs this script(without`--file` flag)
 */
contract DeployScript is ScaffoldETHDeploy {
    function run() external {
        // Deploy all Max Extract Protocol contracts in the correct order
        // The DeployRegistry script now handles all contracts to avoid hardcoding addresses
        
        DeployRegistry deployRegistry = new DeployRegistry();
        deployRegistry.run();

        // Deploy additional contracts as needed
        // DeployMyContract myContract = new DeployMyContract();
        // myContract.run();
    }
}
