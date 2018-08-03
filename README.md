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

## Testing

The tests cover:
* ownership of the contract and authorization of access
* add/edit/remove operations for airlines and for tickets
* verification of the data stored
* input data validation
* searching for tickets
* buying tickets

To run the tests:
```
truffle test
```

## Author

* **Roman Vinogradov** - [sapph1re](https://github.com/sapph1re)
