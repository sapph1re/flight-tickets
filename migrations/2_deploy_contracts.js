var SafeMath = artifacts.require('../installed_contracts/zeppelin/contracts/math/SafeMath.sol');
var Ownable = artifacts.require('../installed_contracts/zeppelin/contracts/ownership/Ownable.sol');
var FlightTickets = artifacts.require("./FlightTickets.sol");

module.exports = function(deployer) {
  deployer.deploy(SafeMath);
  deployer.link(SafeMath, FlightTickets);
  deployer.deploy(Ownable);
  deployer.link(Ownable, FlightTickets);
  deployer.deploy(FlightTickets);
};
