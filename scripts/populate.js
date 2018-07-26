const Web3 = require('web3');
const contract = require('truffle-contract');
const contractData = require('../build/contracts/FlightTickets.json');
const sampleData = require('../sample-data.json');

ETHRPC = "http://localhost:8545";

var web3 = new Web3(new Web3.providers.HttpProvider(ETHRPC));
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
      return console.log('Deploy the contract from the first account provided by ', ETHRPC);
    }
    for (let i = 0; i < sampleData.data.length; i++) {
      let row = sampleData.data[i];
      // admin will own the first airline, the second account owns second and third airlines,
      // the rest are owned by the third account
      let aOwner = i <= 2 ? (i === 0 ? accounts[0] : accounts[1]) : accounts[2];
      console.log('Adding airline: ' + row.airline.aName + ' owned by ' + aOwner + '...');
      await flightTickets.addAirline(
        row.airline.aName, aOwner,
        { from: accounts[0], gas: 200000 }
      );
      let aId = Number(await flightTickets.aIdLast.call());
      for (let j = 0; j < row.tickets.length; j++) {
        let ticket = row.tickets[j];
        console.log(
          'Adding ticket: ' + ticket.tFrom + ' - ' + ticket.tTo + ', '
          + ticket.tPrice + ' ETH, ' + ticket.tQuantity + ' seats...'
        );
        await flightTickets.addTicket(
          aId, ticket.tFrom, ticket.tTo,
          web3.toWei(ticket.tPrice, 'ether'), ticket.tQuantity,
          ticket.tDeparture, ticket.tArrival,
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