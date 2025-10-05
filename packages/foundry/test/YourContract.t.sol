// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../contracts/Universe.sol";
import "../contracts/Credits.sol";
import "../contracts/MaxExtract.sol";
import "../contracts/Game.sol";

contract MaxExtractTest is Test {
    Universe public universe;
    Credits public credits;
    MaxExtract public maxExtract;
    Game public game;
    address public testOwner;
    address public testUser;

    function setUp() public {
        testOwner = vm.addr(1);
        testUser = vm.addr(2);
        universe = new Universe(testOwner);
        credits = new Credits(testOwner);
        game = new Game(address(universe), 0.01 ether);
        maxExtract = new MaxExtract(address(universe), address(game));
        
        // Set up universe entropy for testing
        vm.prank(testOwner);
        universe.setEntropyDirect(keccak256("test-entropy"));
    }

    function testContractsDeployment() public view {
        require(universe.GOD() == testOwner, "Universe GOD not set correctly");
        require(credits.owner() == testOwner, "Credits owner not set correctly");
        require(address(maxExtract.universe()) != address(0), "MaxExtract universe not set correctly");
    }

    function testMaxExtractRules() public view {
        // Test the three eternal rules
        (string memory rule1, string memory rule2, string memory rule3) = maxExtract.getRules();
        assertEq(rule1, "You will not attack other pirates who have signed the oath");
        assertEq(rule2, "You will claim asteroids fairly, not steal them by force");
        assertEq(rule3, "Your reputation will be recorded, traceable, and unforgeable");
    }

    function testMaxExtractConstants() public view {
        // Test the individual rule constants
        assertEq(maxExtract.RULE_ONE(), "You will not attack other pirates who have signed the oath");
        assertEq(maxExtract.RULE_TWO(), "You will claim asteroids fairly, not steal them by force");
        assertEq(maxExtract.RULE_THREE(), "Your reputation will be recorded, traceable, and unforgeable");
    }

    function testSectorQueries() public view {
        // Test initial state
        assertEq(maxExtract.getActiveSectorCount(), 0);
        assertEq(maxExtract.getActiveSectors().length, 0);
        assertEq(maxExtract.getSectorRegistry(1), address(0));
        assertFalse(maxExtract.isSectorClaimed(1));
    }

    function testBroadcastRequirements() public {
        address mockRegistry = address(this); // Use test contract as mock registry
        MockRegistry mock = new MockRegistry(payable(address(maxExtract)));
        
        // Should fail because game requirements are not met
        vm.expectRevert("Game is in open mode - broadcasting not allowed");
        mock.callBroadcast(mockRegistry);
    }

    function testBroadcastInvalidRegistry() public {
        MockRegistry mock = new MockRegistry(payable(address(maxExtract)));
        
        // Test zero address - should fail before game checks
        vm.expectRevert("Registry cannot be zero address");
        mock.callBroadcast(address(0));
    }

    // Event for testing
    event SectorBroadcast(
        uint256 indexed sectorId, 
        address indexed registry, 
        address indexed broadcaster
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
