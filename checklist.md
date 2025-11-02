# checklist

## localhost

`yarn chain`

`yarn start`

scaffold config -> foundry

open brave and get that burner address to use as god

packages/foundry:

    Universe.sol has 0x43D9B634006B4fCe2523a710990a397AC3d18D7a as god

    decide BUY_IN_PRICE and gameEndTime in Game.sol

`yarn deploy`

packages/nextjs:

    env for localhost

    scaffold config file pointed to local

    edit types files to set constants (packages/scripts/types.ts)

in max-extract-player repo , run the frontend with canary
(should be user 0x8aa8474993bB889206Fd5Fda2cE48979AE027b10)

    `yarn start` and open from chrome canary

    but also open http://localhost:3000

        FAUCET + BUY IN

packages/scripts:

    env for localhost (paste got pk in if it changed)

        in particular you need TIP_GAS_AMOUNT in there and 0.0000001 for arb
            but 0.0001 for localhost

    fund GOD at faucet

`yarn maxextract`

    for the auditor, maybe open safari to localhost:3000 and use that burner for auditor

    import Auditor pk from scripts env into punkwallet on chrome incognito:

        fund Auditor at faucet

`yarn auditor`

    maybe use safari as your public dashboard:  http://localhost:3000/dashboard

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
TIP_GAS_AMOUNT=0.0000001 # amount of eth for gas when tipping?!
CHARACTER_ETH=0.000001 # amount of eth to fund new characters with
REQUIRED_GOD_ETH=0.002

deploy the contracts to arbitrum

`yarn deploy --network arbitrum`

`yarn verify --network arbitrum`

scaffold config -> arbitrum

commit code and push to git

watch vercel.com to make sure deployment is going

ssh to maxextract and git pull

(triple check the LOAD_CONTRACTS_FROM on the maxextract server is the site you playing on)

introduce `extract.fi` and bring up the dashboard on a public screen

PLAYERS BUY IN!! (player names show up on the dashboard)

out on the maxextract server: `yarn maxextract` and `yarn auditor`

show and explain the pirates flying through space

fire up an incognito brave browser and import GOD PK for /god dashboard

(you can open and close buy ins if you need to let someone in but the game is already running and the entropy is rolling)

(explain entropy and rolling entropy and point to it in white paper?)

[ open chapter 1 ]
