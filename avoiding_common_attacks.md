## Security

### User rights

Execution of contract functions is only available to those who have rights for it. The rights a user may have:
* search & buy tickets: anyone
* add/edit/remove tickets of an airline: only the owner of that airline
* add/edit/remove airlines, pause/unpause/destroy the contract: only the admin (the owner of the contract)

These access restrictions are implemented in modifiers `onlyOwner`, `onlyAirlineOwner` and `onlyTicketOwner`.

### Overflow protection

`SafeMath` library is used to perform arithmetic operations that are otherwise vulnerable to overflowing or underflowing. The library implements checking if the operation has overflown/underflown and throws if it has, so such a transaction will not go through.

### Re-entrancy protection

Only `.transfer()` is used to send ether, which does not provide enough gas to execute any code.

All ether transfers are performed in the end of the functions, after all important state changes are made.

When user buys a ticket, the payment is forwarded to the airline owner address, which is set by admin. Thus airline owner addresses are considered trusted to be external addresses and not contract addresses. Otherwise the worst case is that the transaction will revert and the purchase will not be made.

The only completely untrusted address to receive money from the contract is the ticket buyer himself, whenever he sends an excessive amount of ether. In this case he will get the change back, in the end of the buying operation. Again, with `.transfer()` being used, the worst thing a malicious user can do with the provided gas is only to revert, thus failing the whole transaction and not changing anything in the contract state at all.

### Contract balance

The contract is not supposed to store any ether, because it only forwards the payments from a buyer to the airline. The contract does not rely nor count its own balance. The fallback function always reverts. If any ether is forcibly sent to the contract, the ether can be then redeemed by destroying the contract.

### Timestamp dependence

Block timestamp is only used in `addTicket()` to validate that the flight departure time is in the future. Tickets are not supposed to be added 30 seconds or less before the flight departure anyways, so the potential 30-second drift does not matter here.
