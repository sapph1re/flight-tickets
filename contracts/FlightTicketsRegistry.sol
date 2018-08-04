pragma solidity ^0.4.24;

import "../installed_contracts/zeppelin/contracts/ownership/Ownable.sol";

/**
 * @title Registry for FlightTickets contract to allow its upgradability
 * @author Roman Vinogradov <dev.romanv@gmail.com>
 */
contract FlightTicketsRegistry is Ownable {
  // Address of the current FlightTickets contract
  address public backendContract;
  // List of previous versions of FlightTickets contract
  address[] public previousBackends;

  event BackendChanged(address newBackend);

  constructor (address currentBackend) public {
    // Initialize to store the currently existing contract address
    backendContract = currentBackend;
  }

  /**
   * @notice Call it to upgrade to a new contract address
   */
  function changeBackend(address newBackend) public onlyOwner {
    if (newBackend != backendContract) {
      previousBackends.push(backendContract);
      backendContract = newBackend;
      emit BackendChanged(newBackend);
    }
  }
}
