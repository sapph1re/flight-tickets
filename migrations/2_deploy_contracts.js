var SafeMath = artifacts.require('../installed_contracts/zeppelin/contracts/math/SafeMath.sol');
var FlightTickets = artifacts.require("./FlightTickets.sol");
var FlightTicketsRegistry = artifacts.require("./FlightTicketsRegistry.sol");

module.exports = function (deployer) {
  deployer.deploy(SafeMath);
  deployer.link(SafeMath, FlightTickets);
  deployer.deploy(FlightTickets)
    .then(() => FlightTickets.deployed())
    .then(flightTickets => deployer.deploy(FlightTicketsRegistry, flightTickets.address));
};
