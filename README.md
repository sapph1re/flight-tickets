# Flight Tickets

Ethereum-based decentralized application that allows airlines to sell flight tickets to customers via smart contracts and manages payments between the parties in cryptocurrency.

## Prerequisites

* npm
* truffle
* ganache-cli
* browser with MetaMask

## How to run it

1. Clone the repository
```
git clone https://github.com/sapph1re/flight-tickets.git
```

2. Install dependencies:

```
npm install
```

3. Run Ganache:

```
ganache-cli
```

3. Compile the contracts:

```
truffle compile
```

4. Deploy the contracts

```
truffle migrate
```

5. This step is optional. Populate the contract with sample data. Do it if you want to have some data to play with. Otherwise you can add all airlines and tickets by yourself.

```
npm run populate
```

If you want to change the sample data, it's configured in `sample-data.json`.

6. Run the frontend

```
npm run start
```

7. Play around. Try searching & buying tickets.

Sample data provides flights between the following cities: Dubai, Bangkok, Hong Kong, Tokyo, Singapore, Jakarta, Denpasar. All of them are connected with each other more or less, so you can try to find a flight from any of these cities to any other of them. Try turning "only direct flights" switch on and off.

Make sure to set your flight date anywhere between 04/12/2018 and 07/12/2018, as tickets are provided for these four days.

Results may be sorted either by total price or by total duration.

Try buying tickets that you find. Press "Book", enter passenger's name and surname, press "Buy Now" and confirm the transaction with MetaMask. Then you can go to "My Purchases" and see the tickets you've just bought.

With an airline owner's account, you can go to "My Airline" and see the tickets that have been sold to customers. You can see those ones you just bought, but make sure you log in with the proper airline. Also check your ETH balance, you'll have the revenue from selling the tickets.

The first ganache address is the owner of the contract and the admin of the dapp. If you login in to MetaMask with it, you will see the admin panel in the menu. The first address also owns one airline. Two more airlines are owned by the second ganache's address and one airline by the third address. When you're logged in to MetaMask with an address that owns an airline, you will see your airline panel in the menu.

Feel free to play around with airlines and their owners in the admin panel, as well as with the tickets of your airlines in the airline panel. You may add more tickets to new destinations and then try finding and buying them in the "Search Tickets" tab.

Every airline has a logo, which is stored in IPFS. Sample data has logos uploaded from the `sample-images` directory. One of them is missing, Hainan Airlines, so that you can try setting it yourself, you'll find the logo itself in the directory.

You can also pause/unpause the contract when logged in as admin. In the Admin Panel you have a button "Pause Contract", which stops the contract and it will refuse to perform any state-changing operations described above until you unpause it.

## Testing

The tests cover:
* ownership of the contract and authorization of access
* add/edit/remove operations for airlines and for tickets
* verification of the data stored
* input data validation
* searching for tickets
* buying tickets
* emergency stop
* upgradability

To run the tests:
```
truffle test
```

## Design patterns and best practices applied

### Fail early and fail loud

Most of the contract functions perform crucial `require()` checks in the beginning, reverting if anything is wrong with the input data. Reason messages are also provided, though they're not widely supported yet.

### Restricting access

Modifiers `onlyOwner`, `onlyAirlineOwner` and `onlyTicketOwner` implement access restriction, making sure that only those are able to change the relevant data who are supposed to be. This behavior is covered by the tests.

### Mortal

`FlightTickets` contract can be destroyed by executing on of its function: `.destroy()` or `.destroyAndSend(recipient)`. This behavior is covered by the tests.

The contract is not supposed to store any ether, but in case it happens to (as there are ways to forcefully fund a contract with ether), the ether can be redeemed when destroying the contract.

### Pull over Push payments

Not used here, because there is no such thing as a fund withdrawal in the workflow of this application. The funds are directly forwarded from the buyer of a ticket to the airline owner, in the same transaction, and it burns about the same amount of gas every time.

The only reason a buying transaction could fail due to gas issues is if an airline owner address is a contract address. While airline data is set up and controlled by the admin, it's the admin's responsibility to only set airline owner to external addresses and not contracts. Otherwise such an airline won't be able to sell tickets at all.

### Circuit Breaker

Implemented by `.pause()` and `.unpause()` functions of the `FlightTickets` contract. Only the contract owner can call them. When the contract is paused, no one can add/edit/remove airlines/tickets nor buy any tickets. Once unpaused, it operates normally again. This behavior is covered by the tests.

## Author

* **Roman Vinogradov** - [sapph1re](https://github.com/sapph1re)
