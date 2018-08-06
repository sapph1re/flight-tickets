const FlightTickets = artifacts.require("FlightTickets");
const FlightTicketsRegistry = artifacts.require("FlightTicketsRegistry");

// Function to verify that a contract call has failed (reverted) during execution
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

  // Deploy the contracts
  before(async () => {
    flightTickets = await FlightTickets.new();
    registry = await FlightTicketsRegistry.new(flightTickets.address);
  });

  // Check that contract ownership is set properly
  it('sets the owner', async () => {
    assert.equal(await registry.owner.call(), owner);
  });

  // Check that the main contract address is set correctly
  it('sets the backend contract address', async () => {
    assert.equal(await registry.backendContract.call(), flightTickets.address);
  });

  // Upgrade to new version: create a new main contract and change it
  // in the registry (that's the main purpose of the registry)
  it('upgrades the registry to the new backend contract', async () => {
    flightTicketsNew = await FlightTickets.new();
    await registry.changeBackend(flightTicketsNew.address, { from: owner });
    assert.equal(await registry.backendContract.call(), flightTicketsNew.address);
  });

  // Check that the previous main contract address is saved for reference
  it('saves the previous backend contract address', async () => {
    assert.equal(await registry.previousBackends.call(0), flightTickets.address);
  });

  // Check that only the owner can do such an upgrade
  it('does not allow a non-owner to upgrade the registry', async () => {
    let flightTicketsV3 = await FlightTickets.new();
    assert.ok(await hasReverted(
      registry.changeBackend(flightTicketsV3.address, { from: nonOwner })
    ));
  });

});
