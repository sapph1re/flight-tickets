pragma solidity ^0.4.24;

/**
 * @title Flight tickets marketplace for customers and airlines
 * @author Roman Vinogradov <dev.romanv@gmail.com>
 */
contract FlightTickets {

  // Airline has an auto-incremented ID, a unique name and an owner
  struct Airline {
    uint256 aId;
    bytes32 aName;
    address aOwner;
  }

  // Auxiliary entity to keep a reference to a particular entry in an array
  struct ArrayIndex {
    bool exists;
    uint256 index;
  }

  address private owner;  // The owner of this contract, i.e. the admin
  Airline[] public airlines;  // The list of airlines
  uint256 private aIdLast;  // Last airline ID generated, used for autoincrementing
  mapping(uint256 => ArrayIndex) private airlineIdIndex;  // Index to find Airline by its ID
  mapping(bytes32 => bool) private airlineNameExists;  // To keep track of which names are taken

  // These are triggered when a particular airline in the list is added, changed or deleted
  event LogAirlineAdded(uint256 indexed aId, bytes32 indexed aName, address aOwner);
  event LogAirlineUpdated(uint256 indexed aId, bytes32 newAName, address newAOwner);
  event LogAirlineRemoved(uint256 indexed aId);

  constructor() public {
    owner = msg.sender;
  }

  modifier onlyOwner() {
    require(msg.sender == owner);
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
   * @notice Add an airline to the list
   * @dev Use the emitted LogAirlineAdded event to get the new airline's generated ID
   * @param _aName Name of the airline, must be unique (transaction will fail otherwise)
   * @param _aOwner Address of the airline owner, can be any Ethereum address
   */
  function addAirline(bytes32 _aName, address _aOwner) public onlyOwner {
    require(!airlineExists(_aName));
    // generate new airline ID
    uint256 _aId = aIdLast + 1;
    require(_aId > aIdLast);  // prevent overflow
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
    require(airlineIdIndex[_aId].exists);
    // get index of the array element being changed
    uint256 _index = airlineIdIndex[_aId].index;
    // if the name has changed, check it's unique and save it
    if (_newAName != airlines[_index].aName) {
      require(!airlineExists(_newAName));
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
    require(airlineIdIndex[_aId].exists);
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

}
