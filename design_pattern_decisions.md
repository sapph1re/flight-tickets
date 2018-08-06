## Design patterns decisions

### Fail early and fail loud

Most of the contract functions perform crucial `require()` checks in the beginning, reverting if anything is wrong with the input data. Reason messages are also provided, though they're not widely supported yet.

### Restricting access

Modifiers `onlyOwner`, `onlyAirlineOwner` and `onlyTicketOwner` implement access restriction, making sure that only those are able to change the relevant data who are supposed to be. This behavior is covered by the tests.

### Mortal

`FlightTickets` contract can be destroyed by executing on of its function: `.destroy()` or `.destroyAndSend(recipient)`. This behavior is covered by the tests.

The contract is not supposed to store any ether, but in case it happens to (as there are ways to forcefully fund a contract with ether), the ether can be redeemed when destroying the contract.

### Pull over Push payments

Not used here, because there is no such thing as a fund withdrawal in the workflow of this application. The funds are directly forwarded from the buyer of a ticket to the airline owner, in the same transaction, and it burns about the same amount of gas every time.

The only reason a buying transaction could fail due to gas issues is if an airline owner address is a contract address. While airline data is set up and controlled by the admin, it's the admin's responsibility to only set airline owner to external addresses and not contracts. Otherwise such an airline won't be able to sell tickets at all.

### Circuit Breaker

Implemented by `.pause()` and `.unpause()` functions of the `FlightTickets` contract. Only the contract owner can call them. When the contract is paused, no one can add/edit/remove airlines/tickets nor buy any tickets. Once unpaused, it operates normally again. This behavior is covered by the tests.
