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

## Testing

The tests cover:
* ownership of the contract and authorization of access
* add/edit/remove operations for the data
* verification of the data stored
* input data validation

To run the tests:
```
truffle test
```

## Author

* **Roman Vinogradov** - [sapph1re](https://github.com/sapph1re)
