pragma solidity ^0.4.24;

contract FlightTickets {

  struct Airline {
    uint256 aId;
    bytes32 aName;
    address aOwner;
  }

  struct ArrayIndex {
    bool exists;
    uint256 index;
  }

  address private owner;
  Airline[] public airlines;
  uint256 private aIdLast;
  mapping(uint256 => ArrayIndex) private airlineIdIndex;
  mapping(bytes32 => bool) private airlineNameExists;

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

  function airlineExists(bytes32 _aName) public view returns (bool) {
    return airlineNameExists[_aName];
  }

  function getAirlinesCount() public view returns (uint256) {
    return airlines.length;
  }

  function addAirline(bytes32 _aName, address _aOwner) public onlyOwner {
    require(!airlineExists(_aName));
    uint256 _aId = aIdLast + 1;
    require(_aId > aIdLast);  // preventing the overflow
    aIdLast = _aId;
    uint256 _index = airlines.push(Airline(_aId, _aName, _aOwner)) - 1;
    airlineIdIndex[_aId].exists = true;
    airlineIdIndex[_aId].index = _index;
    airlineNameExists[_aName] = true;
    emit LogAirlineAdded(_aId, _aName, _aOwner);
  }

  function editAirline(uint256 _aId, bytes32 _newAName, address _newAOwner) public onlyOwner {
    require(airlineIdIndex[_aId].exists);
    uint256 _index = airlineIdIndex[_aId].index;
    if (_newAName != airlines[_index].aName) {  // if aName has changed
      require(!airlineExists(_newAName));
      airlineNameExists[airlines[_index].aName] = false;
      airlineNameExists[_newAName] = true;
      airlines[_index].aName = _newAName;
    }
    airlines[_index].aOwner = _newAOwner;
    emit LogAirlineUpdated(_aId, _newAName, _newAOwner);
  }

  function removeAirline(uint256 _aId) public onlyOwner {
    require(airlineIdIndex[_aId].exists);
    uint256 _index = airlineIdIndex[_aId].index;
    // removing the airline
    airlineIdIndex[_aId].exists = false;
    airlineNameExists[airlines[_index].aName] = false;
    if (airlines.length > 1) {
      // moving the last airline of the array in place of the removed one
      airlines[_index] = airlines[airlines.length-1];
      // updating its ID index to point to the new location
      airlineIdIndex[airlines[_index].aId].index = _index;
    }
    // removing the last airline of the array
    airlines.length--;
    emit LogAirlineRemoved(_aId);
  }

}
