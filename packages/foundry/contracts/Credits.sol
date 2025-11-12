//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

/*
'##::::'##::::'###::::'##::::'##::::'########:'##::::'##:'########:'########:::::'###:::::'######::'########:
 ###::'###:::'## ##:::. ##::'##::::: ##.....::. ##::'##::... ##..:: ##.... ##:::'## ##:::'##... ##:... ##..::
 ####'####::'##:. ##:::. ##'##:::::: ##::::::::. ##'##:::::: ##:::: ##:::: ##::'##:. ##:: ##:::..::::: ##::::
 ## ### ##:'##:::. ##:::. ###::::::: ######:::::. ###::::::: ##:::: ########::'##:::. ##: ##:::::::::: ##::::
 ##. #: ##: #########::: ## ##:::::: ##...:::::: ## ##:::::: ##:::: ##.. ##::: #########: ##:::::::::: ##::::
 ##:.:: ##: ##.... ##:: ##:. ##::::: ##:::::::: ##:. ##::::: ##:::: ##::. ##:: ##.... ##: ##::: ##:::: ##::::
 ##:::: ##: ##:::: ##: ##:::. ##:::: ########: ##:::. ##:::: ##:::: ##:::. ##: ##:::: ##:. ######::::: ##::::
..:::::..::..:::::..::..:::::..:::::........::..:::::..:::::..:::::..:::::..::..:::::..:::......::::::..:::::
........................................................
..####...#####...######..#####...######..######...####..
.##..##..##..##..##......##..##....##......##....##.....
.##......#####...####....##..##....##......##.....####..
.##..##..##..##..##......##..##....##......##........##.
..####...##..##..######..#####...######....##.....####..
........................................................
                                                                                    */



// Use OpenZeppelin for battle-tested ERC-20 implementation
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * Credits Contract - The universal currency of the Extract Protocol
 * Used for staking, tribute, trading, and all economic activities
 * @author Max Extract Protocol
 */
contract Credits is ERC20, Ownable {
    // Initial supply of credits (100 million tokens with 18 decimals)
    uint256 public constant INITIAL_SUPPLY = 100_000_000 * 10**18;
    
    // Events
    event CreditsInitialized(address indexed owner, uint256 initialSupply);
    event CreditsBatchMinted(uint256 recipientCount, uint256 totalAmount);

    // Constructor
    constructor(address _owner) ERC20("Extract Credits", "CREDITS") Ownable(_owner) {
        // Mint initial supply to the owner
        _mint(_owner, INITIAL_SUPPLY);
        
        emit CreditsInitialized(_owner, INITIAL_SUPPLY);
    }

    /**
     * Mint new credits - only owner can mint (for game rewards, etc.)
     * @param to Address to mint credits to
     * @param amount Amount of credits to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * Batch mint credits to multiple addresses - only owner can mint
     * @param recipients Array of addresses to mint credits to
     * @param amounts Array of amounts to mint (must match recipients length)
     */
    function batchMint(address[] calldata recipients, uint256[] calldata amounts) external onlyOwner {
        require(recipients.length == amounts.length, "Credits: arrays length mismatch");
        require(recipients.length > 0, "Credits: empty arrays");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amounts[i]);
        }
    }

    /**
     * Burn credits from caller's balance
     * @param amount Amount of credits to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    /**
     * Burn credits from a specific address (requires allowance)
     * @param from Address to burn credits from
     * @param amount Amount of credits to burn
     */
    function burnFrom(address from, uint256 amount) external {
        _spendAllowance(from, msg.sender, amount);
        _burn(from, amount);
    }

    /**
     * Function that allows the contract to receive ETH
     */
    receive() external payable { }
}
