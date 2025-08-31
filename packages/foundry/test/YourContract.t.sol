// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../contracts/Universe.sol";
import "../contracts/Credits.sol";
import "../contracts/MaxExtract.sol";

contract MaxExtractTest is Test {
    Universe public universe;
    Credits public credits;
    MaxExtract public maxExtract;
    address public testOwner;
    address public testUser;

    function setUp() public {
        testOwner = vm.addr(1);
        testUser = vm.addr(2);
        universe = new Universe(testOwner);
        credits = new Credits(testOwner);
        maxExtract = new MaxExtract(address(universe));
    }

    function testContractsDeployment() public view {
        require(universe.GOD() == testOwner, "Universe GOD not set correctly");
        require(credits.owner() == testOwner, "Credits owner not set correctly");
        require(address(maxExtract.universe()) != address(0), "MaxExtract universe not set correctly");
    }

    function testMaxExtractRules() public view {
        // Test the three eternal rules
        (string memory rule1, string memory rule2, string memory rule3) = maxExtract.getRules();
        assertEq(rule1, "Pirates who signed on would not attack each other");
        assertEq(rule2, "Asteroids could be claimed fairly, not stolen by force");
        assertEq(rule3, "Every pirate's reputation would be recorded, traceable, unforgeable");
    }

    function testMaxExtractConstants() public view {
        // Test the individual rule constants
        assertEq(maxExtract.RULE_ONE(), "Pirates who signed on would not attack each other");
        assertEq(maxExtract.RULE_TWO(), "Asteroids could be claimed fairly, not stolen by force");
        assertEq(maxExtract.RULE_THREE(), "Every pirate's reputation would be recorded, traceable, unforgeable");
    }

    function testSectorQueries() public view {
        // Test initial state
        assertEq(maxExtract.getActiveSectorCount(), 0);
        assertEq(maxExtract.getActiveSectors().length, 0);
        assertEq(maxExtract.getSectorRegistry(1), address(0));
        assertFalse(maxExtract.isSectorClaimed(1));
    }

    function testBroadcastRequirements() public {
        uint256 sectorId = 1;
        address mockRegistry = address(this); // Use test contract as mock registry
        string memory message = "Test sector broadcast";

        // In Foundry tests, tx.origin == msg.sender, so this test would pass
        // But let's test that calling from a contract (MockRegistry) works
        // This demonstrates the proper usage pattern
        MockRegistry mock = new MockRegistry(payable(address(maxExtract)));
        
        // This should succeed because it's called from a contract (tx.origin != msg.sender)
        mock.callBroadcast(mockRegistry);
        
        // Verify it worked
        assertTrue(maxExtract.isSectorClaimed(sectorId));
    }

    function testBroadcastSectorZeroReserved() public {
        uint256 sectorId = 0; // Reserved for Max
        address mockRegistry = address(this);
        string memory message = "Test sector broadcast";

        // Create a mock registry contract to call broadcast from
        MockRegistry mock = new MockRegistry(payable(address(maxExtract)));
        
        vm.expectRevert("Sector 0 is reserved for Max Extract");
        mock.callBroadcast(mockRegistry);
    }

    function testBroadcastInvalidRegistry() public {
        uint256 sectorId = 1;
        string memory message = "Test sector broadcast";

        MockRegistry mock = new MockRegistry(payable(address(maxExtract)));
        
        // Test zero address
        vm.expectRevert("Registry cannot be zero address");
        mock.callBroadcast(address(0));
        
        // Test EOA (non-contract)
        vm.expectRevert("Registry must be a contract");
        mock.callBroadcast(testUser);
    }

    function testSuccessfulBroadcast() public {
        uint256 sectorId = 2; // Use different sector to avoid conflict with other tests
        address mockRegistry = address(this);
        string memory message = "Pirates of Sector 2 - Fair mining only!";

        MockRegistry mock = new MockRegistry(payable(address(maxExtract)));
        
        // Call broadcast from contract (should succeed)
        mock.callBroadcast(mockRegistry);
        
        // Verify sector was registered
        assertEq(maxExtract.getSectorRegistry(sectorId), mockRegistry);
        assertTrue(maxExtract.isSectorClaimed(sectorId));
        assertEq(maxExtract.getActiveSectorCount(), 1); // This test runs in isolation
        
        uint256[] memory activeSectors = maxExtract.getActiveSectors();
        assertEq(activeSectors.length, 1);
        assertEq(activeSectors[0], sectorId); // Should be the sector we just registered
    }

    function testBroadcastAlreadyClaimed() public {
        uint256 sectorId = 3; // Use sector 3 to avoid conflicts
        address mockRegistry1 = address(this);
        address mockRegistry2 = address(credits);
        string memory message = "Test sector broadcast";

        MockRegistry mock = new MockRegistry(payable(address(maxExtract)));
        
        // First broadcast should succeed
        mock.callBroadcast(mockRegistry1);
        
        // Second broadcast to same sector should fail
        vm.expectRevert("Sector already claimed");
        mock.callBroadcast(mockRegistry2);
    }

    // Event for testing
    event SectorBroadcast(
        uint256 indexed sectorId, 
        address indexed registry, 
        address indexed broadcaster,
        string message
    );

    function testCreditsERC20Properties() public view {
        // Test ERC-20 basic properties
        assertEq(credits.name(), "Extract Credits");
        assertEq(credits.symbol(), "CREDITS");
        assertEq(credits.decimals(), 18);
        assertEq(credits.totalSupply(), 100_000_000 * 10**18);
        assertEq(credits.balanceOf(testOwner), 100_000_000 * 10**18);
    }

    function testCreditsInitialSupply() public view {
        // Owner should have the initial supply
        uint256 expectedSupply = 100_000_000 * 10**18;
        assertEq(credits.balanceOf(testOwner), expectedSupply);
        assertEq(credits.totalSupply(), expectedSupply);
    }

    function testCreditsMinting() public {
        uint256 mintAmount = 1000 * 10**18;
        uint256 initialSupply = credits.totalSupply();
        uint256 initialBalance = credits.balanceOf(testUser);
        
        // Only owner can mint
        vm.prank(testOwner);
        credits.mint(testUser, mintAmount);
        
        // Check balances and supply updated
        assertEq(credits.balanceOf(testUser), initialBalance + mintAmount);
        assertEq(credits.totalSupply(), initialSupply + mintAmount);
    }

    function testCreditsMintingOnlyOwner() public {
        uint256 mintAmount = 1000 * 10**18;
        
        // Non-owner should not be able to mint
        vm.prank(testUser);
        vm.expectRevert();
        credits.mint(testUser, mintAmount);
    }

    function testCreditsTransfer() public {
        uint256 transferAmount = 1000 * 10**18;
        
        // Transfer from owner to testUser
        vm.prank(testOwner);
        credits.transfer(testUser, transferAmount);
        
        assertEq(credits.balanceOf(testUser), transferAmount);
        assertEq(credits.balanceOf(testOwner), credits.INITIAL_SUPPLY() - transferAmount);
    }

    function testCreditsBurn() public {
        uint256 burnAmount = 1000 * 10**18;
        uint256 initialSupply = credits.totalSupply();
        uint256 initialOwnerBalance = credits.balanceOf(testOwner);
        
        // Burn tokens from owner
        vm.prank(testOwner);
        credits.burn(burnAmount);
        
        assertEq(credits.balanceOf(testOwner), initialOwnerBalance - burnAmount);
        assertEq(credits.totalSupply(), initialSupply - burnAmount);
    }

    function testCreditsApproveAndBurnFrom() public {
        uint256 burnAmount = 1000 * 10**18;
        uint256 initialSupply = credits.totalSupply();
        uint256 initialOwnerBalance = credits.balanceOf(testOwner);
        
        // Owner approves testUser to burn tokens
        vm.prank(testOwner);
        credits.approve(testUser, burnAmount);
        
        // testUser burns tokens from owner
        vm.prank(testUser);
        credits.burnFrom(testOwner, burnAmount);
        
        assertEq(credits.balanceOf(testOwner), initialOwnerBalance - burnAmount);
        assertEq(credits.totalSupply(), initialSupply - burnAmount);
        assertEq(credits.allowance(testOwner, testUser), 0); // Allowance should be spent
    }
}

// Mock Registry Contract for testing broadcast functionality
contract MockRegistry {
    MaxExtract public maxExtract;
    
    constructor(address payable _maxExtract) {
        maxExtract = MaxExtract(_maxExtract);
    }
    
    function callBroadcast(address registry) external returns (uint256) {
        return maxExtract.broadcast(registry);
    }
}
