const FlightTickets = artifacts.require("FlightTickets");
const FlightTicketsRegistry = artifacts.require("FlightTicketsRegistry");

async function hasReverted(contractCall) {
  try {
    await contractCall;
    return false;
  } catch (e) {
    return /revert/.test(e.message);
  }
}

contract('FlightTicketsRegistry', accounts => {

  const owner = accounts[0];
  const nonOwner = accounts[1];

  let registry, flightTickets, flightTicketsNew;

  it('sets the owner', async () => {
    registry = await FlightTicketsRegistry.deployed();
    assert.equal(await registry.owner.call(), owner);
  });

  it('sets the backend contract address', async () => {
    flightTickets = await FlightTickets.deployed();
    assert.equal(await registry.backendContract.call(), flightTickets.address);
  });

  it('upgrades the registry to the new backend contract', async () => {
    flightTicketsNew = await FlightTickets.new();
    await registry.changeBackend(flightTicketsNew.address, { from: owner });
    assert.equal(await registry.backendContract.call(), flightTicketsNew.address);
  });

  it('saves the previous backend contract address', async () => {
    assert.equal(await registry.previousBackends.call(0), flightTickets.address);
  });

  it('does not allow a non-owner to upgrade the registry', async () => {
    let flightTicketsV3 = await FlightTickets.new();
    assert.ok(await hasReverted(
      registry.changeBackend(flightTicketsV3.address, { from: nonOwner })
    ));
  });

});
