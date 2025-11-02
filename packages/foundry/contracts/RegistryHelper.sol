//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

/**
 * RegistryHelper Library - Shared utility functions for registry module lookups
 * Reduces code duplication in Game contract
 * @author Max Extract Protocol
 */
library RegistryHelper {
    /**
     * Get a module address from a registry contract
     * @param registryAddress The registry contract address
     * @param moduleName The name of the module to look up (e.g., "credential", "fuel")
     * @return moduleAddress The address of the module, or address(0) if not found
     */
    function getModule(
        address registryAddress,
        string memory moduleName
    ) internal view returns (address moduleAddress) {
        (bool success, bytes memory data) = registryAddress.staticcall(
            abi.encodeWithSignature("modules(string)", moduleName)
        );
        
        if (!success || data.length < 32) {
            return address(0);
        }
        
        moduleAddress = abi.decode(data, (address));
    }
}

