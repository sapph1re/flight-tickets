# Flight Tickets

Ethereum-based decentralized application that allows airlines to sell flight tickets to customers via smart contracts and manages payments between the parties in cryptocurrency.

## Table of content

- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [How to run it](#how-to-run-it)
- [Testing](#testing)
- [Security](#security)
- [Design patterns and best practices applied](#design-patterns-and-best-practices-applied)
- [Author](#author)

## Architecture

Admin can add/edit/remove airlines. Each airline has:
* Unique autoincremented ID
* Unique name
* Logo: an image uploaded to IPFS and its hash stored in the contract
* Owner: an Ethereum address

Airline owner can add/edit/remove tickets. Each ticket has:
* Unique autoincremented ID
* Airline ID: a reference to the airline that provides this ticket
* From City
* To City
* Price in wei: converted to ether in the UI
* Quantity: how many seats are available, quantity is reduced after each purchase
* Departure: UTC timestamp
* Arrival: UTC timestamp

All departures and arrivals are in UTC, to make the logic more straightforward. Unlike real flights where local time is used for every city.

Any user can search for flights from city A to another city B, on a given day. The system will find all matching tickets departing on that day:
* direct flights from A to B
* one-stop flights A to C, C to B

Day of arrival may differ, if the flights or the layover is long enough. Total flight durations and the layover time are calculated and displayed to the user.

Found flights can be sorted either by price or by total duration.

User can buy a flight that he found, which involves entering his passenger details (first name & last name) and sending a payment. The UI sends a precise payment amount to cover the ticket(s) being purchased, but if a user interacts with the contract directly and sends any excessive ether, the change will be returned to him. Sending insufficient ether will revert the transaction and nothing will happen. The payments are instantly forwarded to the owner of the airline per each ticket being purchased.

Purchase history is stored in the event logs.

Users can find the history of tickets they purchased in *My Purchases*.

Airline owners can find the history of tickets they sold in *My Airline* > *Sold Tickets*.

## Prerequisites

* npm
* truffle
* ganache-cli
* browser with MetaMask connected to ganache

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

## Security

[Read here](avoiding_common_attacks.md)


## Design patterns decisions

[Read here](design_pattern_decisions.md)

## Author

* **Roman Vinogradov** - [sapph1re](https://github.com/sapph1re)
