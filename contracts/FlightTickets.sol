pragma solidity ^0.4.24;

import "../installed_contracts/zeppelin/contracts/math/SafeMath.sol";
import "../installed_contracts/zeppelin/contracts/ownership/Ownable.sol";

/**
 * @title Flight tickets marketplace for customers and airlines
 * @author Roman Vinogradov <dev.romanv@gmail.com>
 */
contract FlightTickets is Ownable {
  // Library that allows overflow-safe arithmetic operations
  // Used like this: a.add(b) or a.mul(b) where a & b are uint256
  using SafeMath for uint256;

  struct Airline {
    // Unique autoincremented ID
    uint256 aId;
    // Unique airline name
    bytes32 aName;
    // Ethereum address of the owner who will manage this airline
    address aOwner;
  }

  struct Ticket {
    // Unique autoincremented ID
    uint256 tId;
    // ID of the airline that provides this ticket
    uint256 aId;
    // From and To, cities connected by the flight
    bytes32 tFrom;
    bytes32 tTo;
    // Ticket price in wei
    uint256 tPrice;
    // Number of seats available at this price
    uint256 tQuantity;
    // Timestamps of planned departure and arrival, UTC
    uint256 tDeparture;
    uint256 tArrival;
  }

  // Auxiliary entity to keep a reference to a particular entry in an array
  struct ArrayIndex {
    bool exists;
    uint256 index;
  }

  // Storage of airlines
  Airline[] public airlines;  // The list of airlines
  uint256 public aIdLast;  // Last airline ID generated, used for autoincrementing
  mapping(uint256 => ArrayIndex) private airlineIdIndex;  // Index to find Airline by its ID
  mapping(bytes32 => bool) private airlineNameExists;  // To keep track of which airline names are taken

  // Storage of tickets
  Ticket[] public tickets;  // The list of tickets
  uint256 public tIdLast;  // Last ticket ID generated, used for autoincrementing
  mapping(uint256 => ArrayIndex) private ticketIdIndex;  // Index to find Ticket by its ID
  mapping(uint256 => uint256[]) private ticketsByAirline;  // To find list of Ticket IDs by their Airline ID
  // The following is a two-dimensional index to find a certain entry in an array ticketsByAirline[aId]
  mapping(uint256 => mapping(uint256 => ArrayIndex)) private ticketsByAirlineIndex;

  // When an airline in the list is added, changed or deleted
  event LogAirlineAdded(uint256 indexed aId, bytes32 indexed aName, address aOwner);
  event LogAirlineUpdated(uint256 indexed aId, bytes32 newAName, address newAOwner);
  event LogAirlineRemoved(uint256 indexed aId);
  // When a ticket is added, changed or deleted
  event LogTicketAdded(
    uint256 indexed tId, uint256 aId, bytes32 tFrom, bytes32 tTo, uint256 tPrice,
    uint256 tQuantity, uint256 tDeparture, uint256 tArrival
  );
  event LogTicketUpdated(uint256 indexed tId, uint256 newTPrice, uint256 newTQuantity);
  event LogTicketRemoved(uint256 indexed tId);

  /**
   * @dev Make sure the caller is the owner of the airline
   * @param _aId The airline ID
   */
  modifier onlyAirlineOwner(uint256 _aId) {
    require(airlineIdIndex[_aId].exists, "Airline does not exist");
    require(airlines[airlineIdIndex[_aId].index].aOwner == msg.sender, "Not the airline owner");
    _;
  }

  /**
   * @dev Make sure the caller is the owner of the ticket
   * @param _tId The ticket ID
   */
  modifier onlyTicketOwner(uint256 _tId) {
    // find the ticket
    require(ticketIdIndex[_tId].exists, "Ticket does not exist");
    Ticket memory ticket = tickets[ticketIdIndex[_tId].index];
    // find the airline
    require(airlineIdIndex[ticket.aId].exists, "Airline does not exist anymore");
    Airline memory airline = airlines[airlineIdIndex[ticket.aId].index];
    // make sure the caller is the owner of the airline the ticket belongs to
    require(airline.aOwner == msg.sender, "Not the ticket owner");
    _;
  }

  /**
   * @notice Check if the airline name is taken or not
   * @dev Useful for input validation both in the contract and in the frontend
   * @param _aName Name to check
   * @return true if name exists, false otherwise
   */
  function airlineExists(bytes32 _aName) public view returns (bool) {
    return airlineNameExists[_aName];
  }

  /**
   * @notice Get the number of airlines stored
   * @dev Use it in the frontend to iterate over airlines
   * @return The number of airlines
   */
  function getAirlinesCount() public view returns (uint256) {
    return airlines.length;
  }

  /**
   * @notice Get N-th ticket of a given airline
   * @param _aId ID of the airline
   * @param _index Index of the item to get (the N)
   * @return Ticket data
   */
  function getTicketByAirline(uint256 _aId, uint256 _index) public view returns (
    uint256 tId, uint256 aId, bytes32 tFrom, bytes32 tTo, uint256 tPrice,
    uint256 tQuantity, uint256 tDeparture, uint256 tArrival
  ) {
    uint256 _tId = ticketsByAirline[_aId][_index];
    Ticket memory ticket = tickets[ticketIdIndex[_tId].index];
    return (
      ticket.tId, ticket.aId, ticket.tFrom, ticket.tTo, ticket.tPrice,
      ticket.tQuantity, ticket.tDeparture, ticket.tArrival
    );
  }

  /**
   * @notice Add an airline to the list
   * @dev Use the emitted LogAirlineAdded event to get the new airline's generated ID
   * @param _aName Name of the airline, must be unique (transaction will fail otherwise)
   * @param _aOwner Address of the airline owner, can be any Ethereum address
   */
  function addAirline(bytes32 _aName, address _aOwner) public onlyOwner {
    require(!airlineExists(_aName), "Airline name is already taken");
    // generate new airline ID
    uint256 _aId = aIdLast.add(1);
    aIdLast = _aId;
    // add a new Airline record to airlines array and save its index in the array
    uint256 _index = airlines.push(Airline(_aId, _aName, _aOwner)) - 1;
    airlineIdIndex[_aId].exists = true;
    airlineIdIndex[_aId].index = _index;
    // occupy the name
    airlineNameExists[_aName] = true;
    emit LogAirlineAdded(_aId, _aName, _aOwner);
  }

  /**
   * @notice Change an existing airline
   * @param _aId ID of the airline that is being changed (ID itself does not change)
   * @param _newAName New name of the airline, must be unique or remain unchanged
   * @param _newAOwner New owner of the airline
   */
  function editAirline(uint256 _aId, bytes32 _newAName, address _newAOwner) public onlyOwner {
    require(airlineIdIndex[_aId].exists, "Airline does not exist");
    // get index of the array element being changed
    uint256 _index = airlineIdIndex[_aId].index;
    // if the name has changed, check it's unique and save it
    if (_newAName != airlines[_index].aName) {
      require(!airlineExists(_newAName), "New airline name is already taken");
      // free the old name, occupy the new one
      airlineNameExists[airlines[_index].aName] = false;
      airlineNameExists[_newAName] = true;
      airlines[_index].aName = _newAName;
    }
    // simply update the owner
    airlines[_index].aOwner = _newAOwner;
    emit LogAirlineUpdated(_aId, _newAName, _newAOwner);
  }

  /**
   * @notice Remove an airline from the list
   * @dev Removal operation changes the order of some items in airlines array, so don't rely
   * on the order of the array, sort it yourself when you need it.
   * @param _aId ID of the airline to remove
   */
  function removeAirline(uint256 _aId) public onlyOwner {
    require(airlineIdIndex[_aId].exists, "Airline does not exist");
    // get index of the array element being removed
    uint256 _index = airlineIdIndex[_aId].index;
    // remove the airline and free its name
    airlineIdIndex[_aId].exists = false;
    airlineNameExists[airlines[_index].aName] = false;
    if (airlines.length > 1) {
      // the following trick is used to minimize the execution cost: instead of deleting the item
      // and shifting every other item on the right of the deleted element (which would be expensive),
      // we move the last element of the array in place of the removed one and only update its index
      airlines[_index] = airlines[airlines.length-1];
      // update its ID index to point to the new location
      airlineIdIndex[airlines[_index].aId].index = _index;
    }
    // remove the last element of the array
    airlines.length--;
    emit LogAirlineRemoved(_aId);
  }

  /**
   * @notice Get the number of tickets from a given airline
   * @dev Use it in the frontend to iterate over tickets by airline
   * @param _aId ID of the airline
   * @return The number of tickets owned by the airline
   */
  function getTicketsCount(uint256 _aId) public view returns (uint256) {
    require(airlineIdIndex[_aId].exists, "Airline does not exist");
    return ticketsByAirline[_aId].length;
  }

  /**
   * @notice Add an ticket to the list
   * @dev Use the emitted LogTicketAdded event to get the new ticket's generated ID
   * @param _aId ID of the airline; the airline must be owned by the caller!
   * @param _tFrom City from which the flight departs
   * @param _tTo City to which the flight arrives
   * @param _tPrice Price for the ticket in wei
   * @param _tQuantity Number of seats available for this flight at this price
   * @param _tDeparture Timestamp of the planned departure, UTC
   * @param _tArrival Timestamp of the planned arrival, UTC
   */
  function addTicket(
    uint256 _aId, bytes32 _tFrom, bytes32 _tTo, uint256 _tPrice,
    uint256 _tQuantity, uint256 _tDeparture, uint256 _tArrival
  ) public onlyAirlineOwner(_aId) {
    // make sure departure & arrival times are valid
    require(_tQuantity > 0, "Quantity must be positive");
    // yes, we are using block time here, but we don't care about the 30-seconds
    // variability, besides it's just a validation and not a crucial part of logic
    require(_tDeparture > now, "Departure time is in the past");
    require(_tArrival > _tDeparture, "Arrival time is before departure");
    // generate new ticket ID
    uint256 _tId = tIdLast.add(1);
    tIdLast = _tId;
    // add a new Ticket record to tickets array and save its index in the array
    Ticket memory ticket = Ticket(
      _tId, _aId, _tFrom, _tTo, _tPrice, _tQuantity, _tDeparture, _tArrival
    );
    uint256 _index = tickets.push(ticket) - 1;
    ticketIdIndex[_tId].exists = true;
    ticketIdIndex[_tId].index = _index;
    // add the ticket ID to the list of this airline's tickets
    uint256 _index2 = ticketsByAirline[_aId].push(_tId) - 1;
    // and save the index of this entry too, to be able to manage it later
    ticketsByAirlineIndex[_aId][_tId].exists = true;
    ticketsByAirlineIndex[_aId][_tId].index = _index2;
    emit LogTicketAdded(
      _tId, _aId, _tFrom, _tTo, _tPrice, _tQuantity, _tDeparture, _tArrival
    );
  }

  /**
   * @notice Change an existing ticket
   * @param _tId ID of the ticket that is being changed (ID itself does not change)
   * @param _newTPrice New price of the ticket
   * @param _newTQuantity New number of seats available
   */
  function editTicket(uint256 _tId, uint256 _newTPrice, uint256 _newTQuantity) public onlyTicketOwner(_tId) {
    // update the ticket data
    uint256 _index = ticketIdIndex[_tId].index;
    tickets[_index].tPrice = _newTPrice;
    tickets[_index].tQuantity = _newTQuantity;
    emit LogTicketUpdated(_tId, _newTPrice, _newTQuantity);
  }

  /**
   * @notice Remove a ticket from the list
   * @dev Removal operation changes the order of some items in tickets array, so don't rely
   * on the order of the array, sort it yourself when you need it. It also changes the order
   * of some items in the ticketsByAirline[aId] array, same thing.
   *
   * PS: You'll likely break your brain trying to grasp what's going on here,
   * but I've done my best to make the code as understandable as possible.
   * Thanks to the ease of maintaining complex data structures in Solidity :D
   *
   * @param _tId ID of the ticket to remove
   */
  function removeTicket(uint256 _tId) public onlyTicketOwner(_tId) {
    // save the ticket's airline ID for the later use
    uint256 _aId = tickets[_index].aId;
    // remove the ticket
    ticketIdIndex[_tId].exists = false;
    if (tickets.length > 1) {
      // get index of the array element being removed
      uint256 _index = ticketIdIndex[_tId].index;
      // the same trick is used as in removeAirline():
      // move the last element of the array in place of the removed one
      tickets[_index] = tickets[tickets.length-1];
      // update the ID index
      ticketIdIndex[tickets[_index].tId].index = _index;
    }
    // remove ticket ID from the list of airline's tickets
    ticketsByAirlineIndex[_aId][_tId].exists = false;
    if (ticketsByAirline[_aId].length > 1) {
      // same trick but the indexes are more complex (two-dimensional actually)
      uint256 _index2 = ticketsByAirlineIndex[_aId][_tId].index;
      // move last element of ticketsByAirline[_aId] array in place of the removed one
      ticketsByAirline[_aId][_index2] = ticketsByAirline[_aId][ticketsByAirline[_aId].length-1];
      // and update the relevant index
      uint256 movedTicketId = ticketsByAirline[_aId][_index2];
      ticketsByAirlineIndex[_aId][movedTicketId].index = _index2;
    }
    // remove the last element
    ticketsByAirline[_aId].length--;
    // remove the last element of the array
    tickets.length--;
    emit LogTicketRemoved(_tId);
  }

}
