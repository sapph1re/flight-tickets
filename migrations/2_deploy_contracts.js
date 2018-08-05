var SafeMath = artifacts.require('SafeMath');
var FlightTickets = artifacts.require("FlightTickets");
var FlightTicketsRegistry = artifacts.require("FlightTicketsRegistry");

module.exports = function (deployer) {
  deployer.deploy(SafeMath);
  deployer.link(SafeMath, FlightTickets);
  deployer.deploy(FlightTickets)
    .then(() => FlightTickets.deployed())
    .then(flightTickets => deployer.deploy(FlightTicketsRegistry, flightTickets.address));
};
