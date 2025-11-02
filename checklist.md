# checklist

## localhost

packages/foundry:

    Universe.sol has 0x43D9B634006B4fCe2523a710990a397AC3d18D7a as god

    decide BUY_IN_PRICE and gameEndTime in Game.sol

`yarn deploy`

packages/nextjs:

    env for localhost

    scaffold config file pointed to local

    edit types files to set constants (packages/scripts/types.ts)

`yarn start`

in max-extract-player repo , run the frontend
(should be user 0x8aa8474993bB889206Fd5Fda2cE48979AE027b10)

    `yarn start` and open from chrome canary

    but also open http://localhost:3000

        FAUCET + BUY IN

packages/scripts:

    env for localhost

        in particular you need TIP_GAS_AMOUNT in there and 0.0000001 for arb
            but 0.0001 for localhost

    fund GOD at faucet

`yarn maxextract`

    import Auditor pk from scripts env into punkwallet on chrome incognito:

        fund Auditor at faucet

`yarn auditor`

    brave browser or any browser really:  http://localhost:3000/dashboard

    brave browser opens GOD page: make chapter 1 visible

in max-extract-player:

`yarn deploy`

    in canary open http://localhost:3001

    double check maxextract contract address is correct in player's contract

    broadcastSector

brave browser opens GOD page: make chapter 2 visible

repeat

brave browser opens GOD page: make chapter 3 visible

repeat

when you are finished with the game make sure you pay out to the winner if it didn't automatically

also run `yarn sweep` to claw back some eth from your pilots

## extract.fi

Universe.sol has 0x0647603E7711D9686BdB9fDB1fe0b04162b73dD7 (amelia) as god

Game.sol has the right buyin and timelimit

look over .env file for scripts out on maxextract ssh

deploy the contracts to arbitrum

`yarn deploy --network arbitrum`

`yarn verify --network arbitrum`

scaffold config -> arbitrum

commit code and push to git

ssh to maxextract and git pull

(triple check the LOAD_CONTRACTS_FROM on the maxextract server is the site you playing on)

PLAYERS BUY IN!!

`yarn maxextract` and `yarn auditor` out on the server
