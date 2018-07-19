// var SimpleStorage = artifacts.require("./SimpleStorage.sol");
var FlightTickets = artifacts.require("./FlightTickets.sol");

module.exports = function(deployer) {
  // deployer.deploy(SimpleStorage);
  deployer.deploy(FlightTickets);
};
