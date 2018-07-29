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
    uint256 indexed tId,
    uint256 aId,
    bytes32 tFrom,
    bytes32 tTo,
    uint256 tPrice,
    uint256 tQuantity,
    uint256 tDeparture,
    uint256 tArrival
  );
  event LogTicketUpdated(uint256 indexed tId, uint256 newTPrice, uint256 newTQuantity);
  event LogTicketRemoved(uint256 indexed tId);
  // When a ticket is bought
  event LogTicketPurchased(
    uint256 indexed tId,
    address customer,
    string passengerFirstName,
    string passengerLastName
  );

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
    Ticket storage ticket = tickets[ticketIdIndex[_tId].index];
    // find the airline
    require(airlineIdIndex[ticket.aId].exists, "Airline does not exist anymore");
    Airline storage airline = airlines[airlineIdIndex[ticket.aId].index];
    // make sure the caller is the owner of the airline the ticket belongs to
    require(airline.aOwner == msg.sender, "Not the ticket owner");
    _;
  }

  /** We don't want to accept payments without booking a specific flight */
  function () public payable {
    revert();
  }

  /**
   * @notice Book a flight, which means buying the tickets this flight consists of.
   * A direct flight has only one ticket, a one-stop flight has two tickets.
   * Sufficient ETH must be provided with the transaction to cover the price of the tickets.
   * Redundant ETH will be returned back to the sender.
   * @param _tIds List of ticket IDs. If second item is zero, only one ticket will be bought.
   */
  function bookFlight(uint256[2] _tIds, string _firstName, string _lastName) public payable {
    // Find the first ticket, it is required
    require(ticketIdIndex[_tIds[0]].exists, "Ticket does not exist");
    Ticket storage ticket1 = tickets[ticketIdIndex[_tIds[0]].index];
    // Find the airline that owns it
    require(airlineIdIndex[ticket1.aId].exists, "Airline does not exist");
    Airline storage airline1 = airlines[airlineIdIndex[ticket1.aId].index];
    // Check the seats available
    require(ticket1.tQuantity > 0, "No seats available");
    // Check if there's enough ETH for the first ticket
    require(msg.value >= ticket1.tPrice, "Insufficient funds");
    uint256 ethLeft = msg.value - ticket1.tPrice;
    if (_tIds[1] != 0) {
      // Find the second ticket
      require(ticketIdIndex[_tIds[1]].exists, "Ticket does not exist");
      Ticket storage ticket2 = tickets[ticketIdIndex[_tIds[1]].index];
      // Check if there's enough ETH for the second ticket too
      require(ethLeft >= ticket2.tPrice, "Insufficient funds");
      ethLeft -= ticket2.tPrice;
      // Check the seats available
      require(ticket2.tQuantity > 0, "No seats available");
      // Find the second ticket's airline
      require(airlineIdIndex[ticket2.aId].exists, "Airline does not exist");
      Airline storage airline2 = airlines[airlineIdIndex[ticket2.aId].index];
      // Reduce the number of seats available
      ticket1.tQuantity--;
      ticket2.tQuantity--;
      // Save information about the purchase
      emit LogTicketPurchased(ticket1.tId, msg.sender, _firstName, _lastName);
      emit LogTicketPurchased(ticket2.tId, msg.sender, _firstName, _lastName);
      // Send the money to the airline owners
      airline1.aOwner.transfer(ticket1.tPrice);
      airline2.aOwner.transfer(ticket2.tPrice);
    } else {
      // There is only one ticket to buy
      // Reduce the number of seats available
      ticket1.tQuantity--;
      // Save information about the purchase
      emit LogTicketPurchased(ticket1.tId, msg.sender, _firstName, _lastName);
      // Send the money to the airline owners
      airline1.aOwner.transfer(ticket1.tPrice);
    }
    // Send back the change if there is anything left
    if (ethLeft > 0) {
      msg.sender.transfer(ethLeft);
    }
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
   * @notice Get a certain airline by its ID
   * @param _aId ID of the airline
   * @return Airline data
   */
  function getAirlineById(uint256 _aId) public view returns(
    uint256 aId,
    bytes32 aName,
    address aOwner
  ) {
    require(airlineIdIndex[_aId].exists, "Airline does not exist");
    Airline storage airline = airlines[airlineIdIndex[_aId].index];
    return (airline.aId, airline.aName, airline.aOwner);
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
   * @notice Get a certain ticket by its ID
   * @param _tId ID of the ticket
   * @return Ticket data
   */
  function getTicketById(uint256 _tId)
    public
    view
    returns(
      uint256 tId,
      uint256 aId,
      bytes32 tFrom,
      bytes32 tTo,
      uint256 tPrice,
      uint256 tQuantity,
      uint256 tDeparture,
      uint256 tArrival
    )
  {
    require(ticketIdIndex[_tId].exists, "Ticket does not exist");
    Ticket storage ticket = tickets[ticketIdIndex[_tId].index];
    return (
      ticket.tId,
      ticket.aId,
      ticket.tFrom,
      ticket.tTo,
      ticket.tPrice,
      ticket.tQuantity,
      ticket.tDeparture,
      ticket.tArrival
    );
  }

  /**
   * @notice Get N-th ticket of a given airline
   * @param _aId ID of the airline
   * @param _index Index of the item to get (the N)
   * @return Ticket data
   */
  function getTicketByAirline(uint256 _aId, uint256 _index)
    public
    view
    returns (
      uint256 tId,
      uint256 aId,
      bytes32 tFrom,
      bytes32 tTo,
      uint256 tPrice,
      uint256 tQuantity,
      uint256 tDeparture,
      uint256 tArrival
    )
  {
    uint256 _tId = ticketsByAirline[_aId][_index];
    return getTicketById(_tId);
  }

  /**
   * @notice Finds only direct flights between two cities
   * @param _from From where
   * @param _to To where
   * @param _when Timestamp of the beginning of the day. It will search flights departing
   * at any time from _when to _when+24h
   * @return Fixed-sized array of ticket IDs. Returns maximum of 20 tickets.
   * Zero value means no ticket. Check for zeroes when iterating over the result.
   * result.length does not represent the number of tickets found!
   */
  function findDirectFlights(bytes32 _from, bytes32 _to, uint256 _when)
    public
    view
    returns (uint256[20])
  {
    uint256[20] memory ticketsFound;
    uint256 i = 0;
    for (uint256 j = 0; j < tickets.length; j++) {
      Ticket storage t = tickets[j];
      if (
        t.tFrom == _from &&
        t.tTo == _to &&
        t.tDeparture >= _when &&
        t.tDeparture < _when + 24*60*60
      ) {
        ticketsFound[i++] = t.tId;
        // When the resulting array is full, stop searching
        if (i == ticketsFound.length) {
          break;
        }
      }
    }
    return ticketsFound;
  }

  /**
   * @notice Finds direct & indirect flights between two cities with one stop maximum
   * @param _from From where
   * @param _to To where
   * @param _when Timestamp of the beginning of the day. It will search flights departing
   * at any time from _when to _when+24h
   * @return Fixed-sized array of pairs of ticket IDs. Each pair is a 2-elements array.
   * If second ticket ID in a pair is zero, it is a direct flight (one ticket only).
   * Otherwise it is an indirect flight represented by the first ticket ID and second ticket ID.
   * Returns maximum of 20 flights. When both IDs in a pair are zero, it means no ticket.
   * Check for zeroes when iterating over the result. Result.length does not represent
   * the number of tickets found!
   */
  function findOneStopFlights(bytes32 _from, bytes32 _to, uint256 _when)
    public
    view
    returns (uint256[2][20])
  {
    uint256[2][20] memory ticketsFound;
    uint256 i = 0;
    // Max array length of 1024 is set assuming that we won't use this with more than some
    // thousands of tickets in the system, as for that we would need to heavily optimize the search
    Ticket[1024] memory ticketsFrom;
    uint256 j = 0;
    Ticket[1024] memory ticketsTo;
    uint256 k = 0;
    // Scan through all existing tickets, saving direct flights and saving a list of flights
    // that have either TO or FROM matching our search. They could be parts of an indirect flight.
    for (uint256 l = 0; l < tickets.length; l++) {
      Ticket storage t = tickets[l];
      if (t.tFrom == _from && t.tDeparture >= _when && t.tDeparture < _when + 24*60*60) {
        // FROM-matching flight found
        ticketsFrom[j++] = t;
        if (t.tTo == _to) {
          // Direct flight found
          ticketsFound[i++] = [t.tId, 0];
        }
      // It's fine if a connection flight is next day, thus the wider departure time condition
      } else if (t.tTo == _to && t.tDeparture >= _when && t.tDeparture < _when + 2*24*60*60) {
        // TO-matching flight found
        ticketsTo[k++] = t;
      }
    }
    // Scan through the saved FROM-matching flights and find where their TO matches with
    // the FROM of a TO-matching flight from the second array. It means a one-stop flight found.
    for (l = 0; l < ticketsFrom.length; l++) {
      // It is a fixed-size array, so tickets end when we see zero instead of a ticket ID
      if (ticketsFrom[l].tId == 0) {
        break;
      }
      // More iterators mom. Oh yes, spread that shit all over...
      for (uint256 m = 0; m < ticketsTo.length; m++) {
        if (ticketsTo[m].tId == 0) {
          break;
        }
        // Are these two flights connected? Also make sure the layover is no less than one hour
        if (
          ticketsTo[m].tFrom == ticketsFrom[l].tTo &&
          ticketsTo[m].tDeparture > ticketsFrom[l].tArrival + 60*60
        ) {
          // One-stop flight found
          ticketsFound[i++] = [ticketsFrom[l].tId, ticketsTo[m].tId];
        }
      }
    }
    return ticketsFound;
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
    uint256 _aId,
    bytes32 _tFrom,
    bytes32 _tTo,
    uint256 _tPrice,
    uint256 _tQuantity,
    uint256 _tDeparture,
    uint256 _tArrival
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
      _tId,
      _aId,
      _tFrom,
      _tTo,
      _tPrice,
      _tQuantity,
      _tDeparture,
      _tArrival
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
      _tId,
      _aId,
      _tFrom,
      _tTo,
      _tPrice,
      _tQuantity,
      _tDeparture,
      _tArrival
    );
  }

  /**
   * @notice Change an existing ticket
   * @param _tId ID of the ticket that is being changed (ID itself does not change)
   * @param _newTPrice New price of the ticket
   * @param _newTQuantity New number of seats available
   */
  function editTicket(uint256 _tId, uint256 _newTPrice, uint256 _newTQuantity)
    public
    onlyTicketOwner(_tId)
  {
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
