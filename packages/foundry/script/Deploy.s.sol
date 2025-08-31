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
        // Deploys all Max Extract Protocol contracts sequentially
        // Universe, Credits, and MaxExtract contracts

        DeployYourContract deployMaxExtractContracts = new DeployYourContract();
        deployMaxExtractContracts.run();

        // Deploy Chapter1Registry after core contracts
        DeployRegistry deployRegistry = new DeployRegistry();
        deployRegistry.run();

        // Deploy additional contracts as needed
        // DeployMyContract myContract = new DeployMyContract();
        // myContract.run();
    }
}
