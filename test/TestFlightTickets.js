const FlightTickets = artifacts.require("FlightTickets");

// Function to verify that a contract call has failed (reverted) during execution
async function hasReverted(contractCall) {
  try {
    await contractCall;
    return false;
  } catch (e) {
    return /revert/.test(e.message);
  }
}

// Convenience function, to use human-readable dates in the code and still send
// unix timestamps to the contract
function toUTCTimestamp(datestr) {
  return Date.parse(datestr + '+00:00') / 1000;
}

// Sample airline logo that we'll use in the tests
const aLogoHash = 'QmZ9Nbn5Bfcf28p5Mn9Aobw2hvkW4ANxJJDBZdh5kUyQPm';

contract('FlightTickets', accounts => {
  let flightTickets;

  // Deploy the contract
  before(async () => {
    flightTickets = await FlightTickets.new();
  });

  // Check that contract ownership is set properly
  it('sets the owner', async () => {
    assert.equal(await flightTickets.owner.call(), accounts[0]);
  });

  // Check that only the owner can add an airline
  it('does not allow to add an airline from a non-owner', async () => {
    assert.ok(await hasReverted(
      flightTickets.addAirline('Test Airline', accounts[2], aLogoHash, { from: accounts[1] })
    ));
  });

  // Check that an airline is added when the owner is doing it
  it('adds an airline from the owner', async () => {
    await flightTickets.addAirline('Test Airline', accounts[2], aLogoHash, { from: accounts[0] });
    assert.equal(await flightTickets.getAirlinesCount.call(), 1);
  });

  // Check that the airline name is now taken
  it('confirms that the airline exists', async () => {
    let exists = await flightTickets.airlineExists.call('Test Airline');
    assert.ok(exists);
  });

  // Check that it's not possible to add an airline with a non-unique name
  it('does not allow to add an airline when the name is taken', async () => {
    assert.ok(await hasReverted(
      flightTickets.addAirline('Test Airline', accounts[2], aLogoHash, { from: accounts[0] })
    ));
  });

  // Check that all airline details are saved correctly
  it('stores the airline data', async () => {
    let [aId, aName, aOwner, aLogo] = await flightTickets.airlines.call(0);
    aName = web3.toUtf8(aName);
    assert.equal(aId, 1);
    assert.equal(aName, 'Test Airline');
    assert.equal(aOwner, accounts[2]);
    assert.equal(aLogo, aLogoHash);
  });

  // Check that an airline can be edited and new details are saved correctly
  it('edits an airline', async () => {
    let aNewLogoHash = 'QmP8AdSRBQeMNwt6kyufDDssrA6RxrPB74LEoJgMpYTa6S';
    await flightTickets.editAirline(1, 'New Airline Name', accounts[3], aNewLogoHash, { from: accounts[0] });
    let [aId, aName, aOwner, aLogo] = await flightTickets.airlines.call(0);
    aName = web3.toUtf8(aName);
    assert.equal(aId, 1);
    assert.equal(aName, 'New Airline Name');
    assert.equal(aOwner, accounts[3]);
    assert.equal(aLogo, aNewLogoHash);
  });

  // Check that name uniqueness validation works with editing as well
  it('does not allow to edit an airline when the new name is taken', async () => {
    await flightTickets.addAirline('Second Airline', accounts[4], aLogoHash, { from: accounts[0] });
    assert.ok(await hasReverted(
      flightTickets.editAirline(1, 'Second Airline', accounts[3], aLogoHash, { from: accounts[0] })
    ));
  });

  // Check that airline is removed correctly and its name is then freed
  it('removes an airline', async () => {
    let count = await flightTickets.getAirlinesCount.call();
    await flightTickets.removeAirline(1, { from: accounts[0] });
    let newCount = await flightTickets.getAirlinesCount.call();
    assert.equal(newCount, count - 1);
    let exists = await flightTickets.airlineExists('New Airline Name');
    assert.ok(!exists);
  });

  // Existing airline by now: {aId: 2, aName: 'Second Airline', aOwner: accounts[4]}
  // We will use it for the ticket-related tests below

  // Set up some sample ticket data to reuse in the tests below
  const AID = 2;
  const AOWNER = accounts[4];
  const TPRICE = web3.toWei(100, 'finney');
  const TFROM = 'Hong Kong';
  const TTO = 'Denpasar';
  const TQUANTITY = 150;
  const TDEPARTURE = 1536573600;
  const TARRIVAL = 1536589800;

  // Check that airline ownership is validated correctly when adding adding tickets
  it('does not allow to add a ticket from a non-owner of the airline', async () => {
    assert.ok(await hasReverted(
      flightTickets.addTicket(AID, TFROM, TTO, TPRICE, TQUANTITY, TDEPARTURE, TARRIVAL, { from: accounts[0] })
    ));
  });

  // Check that it adds some tickets successfully if the airline owner is doing it
  it('adds tickets from the owner of the airline', async () => {
    await flightTickets.addTicket(AID, TFROM, TTO, TPRICE, TQUANTITY, TDEPARTURE, TARRIVAL, { from: AOWNER });
    // add some more
    await flightTickets.addTicket(AID, 'Denpasar', 'Tokyo', web3.toWei(300, 'finney'), 50, 1536589800, 1536607800, { from: AOWNER });
    await flightTickets.addTicket(AID, 'Zhengzhou', 'Singapore', web3.toWei(50, 'finney'), 200, 1536589800, 1536607800, { from: AOWNER });
    assert.equal(await flightTickets.getTicketsCount.call(AID), 3);
  });

  // ID of an existing ticket that we're going to reuse below
  const TID = 1;

  // Check that all ticket data is saved correctly
  it('stores the ticket data', async () => {
    let [tId, aId, tFrom, tTo, tPrice, tQuantity, tDeparture, tArrival] = await flightTickets.tickets.call(0);
    tFrom = web3.toUtf8(tFrom);
    tTo = web3.toUtf8(tTo);
    assert.equal(tId, TID);
    assert.equal(aId, AID);
    assert.equal(tFrom, TFROM);
    assert.equal(tTo, TTO);
    assert.equal(tPrice, TPRICE);
    assert.equal(tQuantity, TQUANTITY);
    assert.equal(tDeparture, TDEPARTURE);
    assert.equal(tArrival, TARRIVAL);
  });

  // Check that a ticket can be edited and the ticket data is updated correctly
  it('edits a ticket', async () => {
    let newPrice = TPRICE * 2;
    let newQuantity = TQUANTITY - 50;
    await flightTickets.editTicket(TID, newPrice, newQuantity, { from: AOWNER });
    let [, , , , tPrice, tQuantity, ,] = await flightTickets.tickets.call(0);
    assert.equal(tPrice, newPrice);
    assert.equal(tQuantity, newQuantity);
  });

  // Check that a ticket is removed correctly
  it('removes a ticket', async () => {
    let count = await flightTickets.getTicketsCount.call(AID);
    await flightTickets.removeTicket(TID, { from: AOWNER });
    let newCount = await flightTickets.getTicketsCount.call(AID);
    assert.equal(newCount, count - 1);
  });

  // Check that direct a flight is found correctly by "from", "to" and "when"
  it('finds a direct flight', async () => {
    await flightTickets.addTicket(
      AID, 'Bangkok', 'Dubai', web3.toWei(150, 'finney'), 50,
      toUTCTimestamp('2018-12-10 10:00'), toUTCTimestamp('2018-12-10 15:00'),
      { from: AOWNER }
    );
    await flightTickets.addTicket(
      AID, 'Dubai', 'London', web3.toWei(100, 'finney'), 50,
      toUTCTimestamp('2018-12-10 17:00'), toUTCTimestamp('2018-12-10 23:00'),
      { from: AOWNER }
    );
    await flightTickets.addTicket(
      AID, 'London', 'New York', web3.toWei(200, 'finney'), 50,
      toUTCTimestamp('2018-12-11 07:00'), toUTCTimestamp('2018-12-11 15:00'),
      { from: AOWNER }
    );
    let when = Date.parse('2018-12-10') / 1000;
    tickets = await flightTickets.findDirectFlights.call('Dubai', 'London', when);
    let _tId = Number(tickets[0]);
    assert.ok(_tId > 0);
    let [, , tFrom, tTo, , , ,] = await flightTickets.getTicketById.call(_tId);
    tFrom = web3.toUtf8(tFrom);
    tTo = web3.toUtf8(tTo);
    assert.equal(tFrom, 'Dubai');
    assert.equal(tTo, 'London');
  });

  // Check that a two-tickets flight is found correctly, sequencing the tickets above
  it('finds a one-stop flight', async () => {
    let when = Date.parse('2018-12-10') / 1000;
    flights = await flightTickets.findOneStopFlights.call('Bangkok', 'London', when);
    let [_tId1, _tId2] = flights[0];
    _tId1 = Number(_tId1);
    _tId2 = Number(_tId2);
    assert.ok(_tId1 > 0 && _tId2 > 0);
    let [, , tFrom1, tTo1, , , ,] = await flightTickets.getTicketById.call(_tId1);
    let [, , tFrom2, tTo2, , , ,] = await flightTickets.getTicketById.call(_tId2);
    tFrom1 = web3.toUtf8(tFrom1);
    tTo1 = web3.toUtf8(tTo1);
    tFrom2 = web3.toUtf8(tFrom2);
    tTo2 = web3.toUtf8(tTo2);
    assert.equal(tFrom1, 'Bangkok');
    assert.equal(tTo2, 'London');
    assert.equal(tTo1, tFrom2);
  });

  // Check that a direct flight is bought correctly, the airline receives the payment
  // and the buyer receives the change
  it('books a direct flight', async () => {
    let [tId, aId, , , tPrice, tQuantity, ,] = await flightTickets.tickets.call(0);
    let [, , aOwner,] = await flightTickets.getAirlineById.call(aId);
    let aBalance = await web3.eth.getBalance(aOwner);
    // sending 1 eth more than needed to test that the change is returned
    let amount = Number(tPrice) + Number(web3.toWei(1, 'ether'));
    await flightTickets.bookFlight([tId, 0], 'Roman', 'Vinogradov', { from: accounts[0], value: amount });
    let aNewBalance = await web3.eth.getBalance(aOwner);
    assert.equal(aNewBalance - aBalance, tPrice);
    let [, , , , , tNewQuantity, ,] = await flightTickets.tickets.call(0);
    assert.equal(tNewQuantity, tQuantity - 1);
  });

  // Check that a two-tickets flight is bought correctly and both airlines receive their payments
  it('books a one-stop flight', async () => {
    await flightTickets.addAirline('Third Airline', accounts[5], aLogoHash, { from: accounts[0] });
    aIdNew = await flightTickets.aIdLast.call();
    await flightTickets.addTicket(
      aIdNew, 'Bangkok', 'Dubai', web3.toWei(250, 'finney'), 30,
      toUTCTimestamp('2018-12-10 10:00'), toUTCTimestamp('2018-12-10 15:00'),
      { from: accounts[5] }
    );
    tIdNew = await flightTickets.tIdLast.call();
    let [tId1, aId1, , , tPrice1, tQuantity1, ,] = await flightTickets.tickets.call(0);
    let [tId2, aId2, , , tPrice2, tQuantity2, ,] = await flightTickets.getTicketById(tIdNew);
    let [, , aOwner1,] = await flightTickets.getAirlineById.call(aId1);
    let [, , aOwner2,] = await flightTickets.getAirlineById.call(aId2);
    let aBalance1 = await web3.eth.getBalance(aOwner1);
    let aBalance2 = await web3.eth.getBalance(aOwner2);
    // sending 1 eth more than needed to test that the change is returned
    let total = Number(tPrice1) + Number(tPrice2) + Number(web3.toWei(1, 'ether'));
    await flightTickets.bookFlight([tId1, tId2], 'Roman', 'Vinogradov', { from: accounts[0], value: total });
    let aNewBalance1 = await web3.eth.getBalance(aOwner1);
    let aNewBalance2 = await web3.eth.getBalance(aOwner2);
    assert.equal(aNewBalance1 - aBalance1, tPrice1);
    assert.equal(aNewBalance2 - aBalance2, tPrice2);
    let [, , , , , tNewQuantity1, ,] = await flightTickets.getTicketById(tId1);
    let [, , , , , tNewQuantity2, ,] = await flightTickets.getTicketById(tId2);
    assert.equal(tNewQuantity1, tQuantity1 - 1);
    assert.equal(tNewQuantity2, tQuantity2 - 1);
  });

  // Check that emergency stop works
  it('pauses the contract', async () => {
    await flightTickets.pause();
    assert.ok(await hasReverted(
      flightTickets.addAirline('New Test Airline', accounts[2], aLogoHash, { from: accounts[0] })
    ));
  });

  // Check that the stopped contract can be reenabled again
  it('unpauses the contract', async () => {
    await flightTickets.unpause();
    await flightTickets.addAirline('New Test Airline', accounts[2], aLogoHash, { from: accounts[0] });
    assert.ok(await flightTickets.airlineExists('New Test Airline'));
  });

  // Check that the contract can be destroyed
  it('kills the contract', async () => {
    await flightTickets.destroy();
    try {
      await flightTickets.owner.call();
    } catch (e) {
      return;
    }
    assert.fail();
  });

});