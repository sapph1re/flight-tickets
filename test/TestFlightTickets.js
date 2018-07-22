const FlightTickets = artifacts.require("FlightTickets");

async function hasReverted(contractCall) {
  try {
    await contractCall;
    return false;
  } catch (e) {
    return /revert/.test(e.message);
  }
}

contract('FlightTickets', accounts => {
  let flightTickets;

  beforeEach(async () => {
    flightTickets = await FlightTickets.deployed();
  });

  it('sets owner', async () => {
    assert.equal(await flightTickets.owner.call(), accounts[0]);
  });

  it('does not allow to add an airline from non-owner', async () => {
    assert.ok(await hasReverted(
      flightTickets.addAirline('Test Airline', accounts[2], { from: accounts[1] })
    ));
  });

  it('adds an airline from owner', async () => {
    await flightTickets.addAirline('Test Airline', accounts[2], { from: accounts[0] });
    assert.equal(await flightTickets.getAirlinesCount.call(), 1);
  });

  it('confirms that airline exists', async () => {
    let exists = await flightTickets.airlineExists.call('Test Airline');
    assert.ok(exists);
  });

  it('does not allow to add an airline when the name is taken', async () => {
    assert.ok(await hasReverted(
      flightTickets.addAirline('Test Airline', accounts[2], { from: accounts[0] })
    ));
  });

  it('stores the airline data', async () => {
    let [aId, aName, aOwner] = await flightTickets.airlines.call(0);
    aName = web3.toUtf8(aName);
    assert.equal(aId, 1);
    assert.equal(aName, 'Test Airline');
    assert.equal(aOwner, accounts[2]);
  });

  it('edits an airline', async () => {
    await flightTickets.editAirline(1, 'New Airline Name', accounts[3]);
    let [aId, aName, aOwner] = await flightTickets.airlines.call(0);
    aName = web3.toUtf8(aName);
    assert.equal(aId, 1);
    assert.equal(aName, 'New Airline Name');
    assert.equal(aOwner, accounts[3]);
  });

  it('does not allow to edit an airline when the new name is taken', async () => {
    await flightTickets.addAirline('Second Airline', accounts[4], { from: accounts[0] });
    assert.ok(await hasReverted(
      flightTickets.editAirline(1, 'Second Airline', accounts[3])
    ));
  });

  it('removes an airline', async () => {
    let count = await flightTickets.getAirlinesCount.call();
    await flightTickets.removeAirline(1);
    let newCount = await flightTickets.getAirlinesCount.call();
    assert.equal(newCount, count-1);
    let exists = await flightTickets.airlineExists('New Airline Name');
    assert.ok(!exists);
  });

});