const Web3 = require('web3');
const contract = require('truffle-contract');
const contractData = require('../build/contracts/FlightTickets.json');
const sampleData = require('../sample-data.json');

const ethRPC = "http://localhost:8545";
const aLogoDefault = 'QmZ9Nbn5Bfcf28p5Mn9Aobw2hvkW4ANxJJDBZdh5kUyQPm';

// var web3 = new Web3(new Web3.providers.HttpProvider(ethRPC));
const PrivateKeyProvider = require("truffle-privatekey-provider");
const privateKey = "5B672042AF34CF75C490CD1582D5538F60460E242D4230414368C6202DB15AC9";
const provider =  new PrivateKeyProvider(privateKey, "https://rinkeby.infura.io/yldrXSAA7dkvKUHIvcZP");
var web3 = new Web3(provider);

const FlightTickets = contract(contractData);
FlightTickets.setProvider(web3.currentProvider);

web3.eth.getAccounts((error, accounts) => {
  if (error) {
    console.error('Failed to get accounts. ', error);
    return;
  }
  FlightTickets.deployed().then(async instance => {
    // we're all set, let's stuff the contract with some sample data now
    await populate(instance, accounts);
  }).catch(error => {
    console.error(error);
  });
});

async function populate(flightTickets, accounts) {
  try {
    // check if we have the owner's account
    if (await flightTickets.owner.call() !== accounts[0]) {
      return console.log('Deploy the contract from the first account provided by ', ethRPC);
    }
    for (let i = 0; i < sampleData.data.length; i++) {
      let row = sampleData.data[i];
      // admin will own the first airline, the second account owns second and third airlines,
      // the rest are owned by the third account
      // let aOwner = i <= 2 ? (i === 0 ? accounts[0] : accounts[1]) : accounts[2];
      let aOwner = accounts[0]
      console.log('Adding airline: ' + row.airline.aName + ' owned by ' + aOwner + '...');
      await flightTickets.addAirline(
        row.airline.aName,
        aOwner,
        row.airline.aLogo ? row.airline.aLogo : aLogoDefault,
        { from: accounts[0], gas: 300000 }
      );
      let aId = Number(await flightTickets.aIdLast.call());
      for (let j = 0; j < row.tickets.length; j++) {
        let ticket = row.tickets[j];
        console.log(
          'Adding ticket: '+ticket.tDeparture+' ' + ticket.tFrom + ' -> ' + ticket.tTo + ', '
          + ticket.tPrice + ' ETH, ' + ticket.tQuantity + ' seats...'
        );
        let departure = Date.parse(ticket.tDeparture+'+00:00')/1000;
        let arrival = Date.parse(ticket.tArrival+'+00:00')/1000;
        await flightTickets.addTicket(
          aId, ticket.tFrom, ticket.tTo,
          web3.toWei(ticket.tPrice, 'ether'), ticket.tQuantity,
          departure, arrival,
          { from: aOwner, gas: 500000 }
        );
      }
      let count = await flightTickets.getTicketsCount.call(aId);
      console.log(row.airline.aName + ' now has ' + count + ' tickets.');
    }
  } catch (e) {
    if (/revert/.test(e.message)) {
      console.error('Transaction reverted. Contract data not empty?');
    } else {
      console.error('Failed to populate the contract with data. ', e.message);
    }
  }
}