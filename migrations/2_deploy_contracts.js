var SafeMath = artifacts.require('../installed_contracts/zeppelin/contracts/math/SafeMath.sol');
var FlightTickets = artifacts.require("./FlightTickets.sol");

module.exports = function(deployer) {
  deployer.deploy(SafeMath);
  deployer.link(SafeMath, FlightTickets);
  deployer.deploy(FlightTickets);
};
