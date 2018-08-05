# Events issued by the contract
BackendChanged: event({newBackend: address})

# Owner of the contract
owner: public(address)
# Current main contract address
backendContract: public(address)
# Old contract addresses, for reference
previousBackends: public(address[100])
# Counter for the list above, as the list itself is fix-sized
previousBackendsCount: public(uint256)

# Owner of the contract is set to the one who deploys it
# Initial main contract address must be passed when deploying
@public
def __init__(currentBackend: address):
    self.owner = msg.sender
    self.backendContract = currentBackend

# Change the main contract address to a new one
@public
def changeBackend(newBackend: address):
    # Only the owner can do this
    assert msg.sender == self.owner
    # Make sure the address has actually changed
    if newBackend != self.backendContract:
        # Save the current contract address to the list of old addresses
        self.previousBackends[self.previousBackendsCount] = self.backendContract
        self.previousBackendsCount += 1
        # And set the new one as the current contract
        self.backendContract = newBackend
        # Emit the event
        log.BackendChanged(newBackend)
