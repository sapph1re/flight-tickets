import React from 'react';
import TicketForm from "./TicketForm";
import EditableTable from "./EditableTable";
import SoldTickets from './SoldTickets';
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';

/**
 * A list of airline's tickets with a form to add a new ticket and edit/remove functionality
 * @param airlines - list of airlines owned by the user
 * @param setOnContractReady - function to set a callback to be called when web3 and the contract are ready
 * @param account - address of the user
 * @param getTicketData - function to load detailed information about a ticket by its ID
 */
class MyAirline extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      web3: null,
      contract: null,
      // the index of the row that's being edited right now, -1 means none are edited
      editTicketIdx: -1,
      // errors to display during the edit mode
      editTicketErrors: {},
      // saved version of an airline before editing, to restore the values on cancel
      ticketBeforeEditing: null,
      // current airline whose tickets are being managed
      airlineIdx: 0,
      // list of tickets the current airline has
      tickets: [],
      // list of tickets sold already
      soldTickets: []
    };
  }

  componentDidMount() {
    this.props.setOnContractReady((web3, contract) => {
      this.setState({
        web3: web3,
        contract: contract
      }, () => {
        // Load the list of tickets from the contract
        this.loadTickets().then(result => {
          // Update the list every time when a ticket is added/updated/removed
          let updateTicketsCallback = (error, result) => {
            if (error) {
              console.log(error);
              return;
            }
            // Update the list of tickets
            this.loadTickets();
          }
          this.state.contract.LogTicketAdded().watch(updateTicketsCallback);
          this.state.contract.LogTicketUpdated().watch(updateTicketsCallback);
          this.state.contract.LogTicketRemoved().watch(updateTicketsCallback);
          // Fill and update Sold Tickets
          this.state.contract.LogTicketPurchased(
            { aId: this.props.airlines[this.state.airlineIdx].aId },
            { fromBlock: 0, toBlock: 'latest' }
          ).watch(this.updateTicketsSold);
        }).catch(error => {
          console.log(error);
        });
      });
    });
  }

  /** Get the list of tickets from the contract and save it to the state */
  loadTickets = () => {
    // First we get the total number of tickets that the airline has
    const aId = this.props.airlines[this.state.airlineIdx].aId;
    return this.state.contract.getTicketsCount.call(aId).then(ticketsCount => {
      // Then we iterate over the array of tickets to load each of them
      let promises = [];
      for (let i = 0; i < ticketsCount; i++) {
        promises.push(
          this.state.contract.getTicketByAirline.call(aId, i)
        );
      }
      return Promise.all(promises);
    }).then(results => {
      // Now as we have all our tickets loaded, we save them to the state
      let tickets = [];
      results.forEach(row => {
        tickets.push({
          tId: row[0].toString(),
          aId: row[1].toString(),
          tFrom: this.state.web3.toUtf8(row[2]),
          tTo: this.state.web3.toUtf8(row[3]),
          tPrice: this.state.web3.fromWei(row[4], 'ether').toFixed(),
          tQuantity: row[5].toString(),
          tDeparture: row[6].toString(),
          tArrival: row[7].toString(),
          inProgress: false
        });
      });
      tickets.sort((a, b) => (parseInt(a.tId, 10) < parseInt(b.tId, 10) ? -1 : 1));
      return this.setState({ tickets: tickets });
    }).catch(error => {
      console.log(error);
    });
  }

  /** When user chooses one of the airlines he owns */
  selectAirline = (e) => {
    this.setState({ airlineIdx: e.target.value }, this.loadTickets);
  }

  /**
   * Validate the input before a ticket is added.
   * @param {object} ticket - object containing ticket data: { tFrom, tTo, tPrice, tQuantity, tDeparture, tArrival }
   * @return {object} - object of errors, empty object means no errors
   */
  ticketValidateSubmit = (ticket) => {
    let errors = {};
    if (ticket.tFrom.length === 0) {
      errors.tFromError = 'City is required';
    }
    if (ticket.tTo.length === 0) {
      errors.tToError = 'City is required';
    }
    if (isNaN(ticket.tPrice) || ticket.tPrice < 0) {
      errors.tPriceError = 'Price must be a non-negative number';
    }
    if (isNaN(ticket.tQuantity) || ticket.tQuantity < 1) {
      errors.tQuantityError = 'Quantity must be positive number';
    }
    let now = Math.floor(new Date().getTime() / 1000);
    if (isNaN(ticket.tDeparture)) {
      errors.tDepartureError = 'Departure time is incorrect';
    } else if (ticket.tDeparture < now) {
      errors.tDepartureError = 'Departure time is in the past';
    } else if (isNaN(ticket.tArrival)) {
      errors.tArrivalError = 'Arrival time is incorrect';
    } else if (ticket.tArrival < ticket.tDeparture) {
      errors.tArrivalError = 'Arrival time is before departure';
    }
    return errors;
  }

  /**
   * Validate the input before a ticket is changed.
   * @param {object} ticket - object containing ticket data: { tPrice, tQuantity }
   * @return {object} - object of errors, empty object means no errors
   */
  ticketValidateEdit = (ticket) => {
    let errors = {};
    if (ticket.tPrice < 0) {
      errors.tPriceError = 'Price must not be negative';
    }
    if (ticket.tQuantity < 0) {
      errors.tQuantityError = 'Quantity must not be negative';
    }
    return errors;
  }

  /** Add a new ticket to the contract and update the state to display the change */
  ticketSubmit = (ticket) => {
    const aId = this.props.airlines[this.state.airlineIdx].aId;
    // Add the ticket to the contract
    const priceWei = this.state.web3.toWei(ticket.tPrice, 'ether');
    this.state.contract.addTicket(
      aId,
      this.state.web3.toHex(ticket.tFrom),
      this.state.web3.toHex(ticket.tTo),
      priceWei,
      ticket.tQuantity,
      ticket.tDeparture,
      ticket.tArrival,
      { from: this.props.account }
    ).then(() => {
      // Add the new ticket to the list, but grayed out (inProgress: true)
      // It will update to normal automatically when the transaction completes
      this.setState(state => ({
        tickets: [...state.tickets, {
          tId: null,
          tFrom: ticket.tFrom,
          tTo: ticket.tTo,
          tPrice: ticket.tPrice,
          tQuantity: ticket.tQuantity,
          tDeparture: ticket.tDeparture,
          tArrival: ticket.tArrival,
          inProgress: true
        }]
      }));
    }).catch(error => {
      console.log(error);
    });
  }

  /** Remove a ticket from the contract and update the state to display the change */
  ticketRemove = (i) => {
    // Remove the ticket from the contract
    this.state.contract.removeTicket(
      this.state.tickets[i].tId,
      // Gas limit is explicitly set here because MetaMask underestimates the gas usage
      // when some storage is freed in the transaction. Actual gas usage is lower than the
      // required limit, because a part of the gas is refunded at the end of the transaction
      { from: this.props.account, gas: 80000 }
    ).then(() => {
      // Gray out the ticket in our table
      // It will disappear completely automatically when the transaction completes
      this.setState(state => ({
        tickets: state.tickets.map((ticket, j) => {
          if (j === i) {
            ticket.inProgress = true;
          }
          return ticket;
        })
      }));
    }).catch(error => {
      console.log(error);
    });
  }

  /**
   * Enable edit mode
   * @param {number} i - index of the row to be edited
   */
  startEditing = (i) => {
    if (this.state.editTicketIdx === -1) {
      this.setState(state => ({
        editTicketIdx: i,
        ticketBeforeEditing: state.tickets[i]
      }));
    }
  }

  /** Finish editing, save the changes to the contract and update the table */
  finishEditing = () => {
    let ticketEdited = this.state.tickets[this.state.editTicketIdx];
    ticketEdited.tPrice = parseFloat(ticketEdited.tPrice);
    ticketEdited.tQuantity = parseInt(ticketEdited.tQuantity, 10);
    // Clear the old errors first
    this.setState({
      editTicketErrors: {}
    });
    // If nothing changed, just turn off the edit mode, no need to submit anything
    if (ticketEdited === this.state.ticketBeforeEditing) {
      return this.setState({
        editTicketIdx: -1,
        ticketBeforeEditing: null
      });
    }
    // Validate the new values
    let errors = this.ticketValidateEdit(ticketEdited);
    // If anything is wrong with the input, display the errors and remain in the edit mode
    if (Object.keys(errors).length > 0) {
      return this.setState({
        editTicketErrors: errors
      });
      // If everything is fine, update the ticket in the contract
    } else {
      const priceWei = this.state.web3.toWei(ticketEdited.tPrice, 'ether');
      this.state.contract.editTicket(
        this.state.ticketBeforeEditing.tId,
        priceWei,
        ticketEdited.tQuantity,
        { from: this.props.account }
      ).then(() => {
        // Turn off the edit mode and gray out the ticket in the table until the transaction completes
        this.setState(state => ({
          tickets: state.tickets.map((ticket, j) => {
            if (j === state.editTicketIdx) {
              ticket.inProgress = true;
            }
            return ticket;
          }),
          editTicketIdx: -1,
          ticketBeforeEditing: null
        }));
      }).catch(error => {
        console.log(error);
      });
    }
    return errors;
  }

  /** Quit the edit mode and revert the changes */
  cancelEditing = () => {
    this.setState(state => ({
      tickets: state.tickets.map((ticket, j) => j === state.editTicketIdx ? state.ticketBeforeEditing : ticket),
      editTicketIdx: -1,
      editTicketErrors: {},
      ticketBeforeEditing: null
    }));
  }

  /** Handle changes in the inputs when in the edit mode */
  onInputChanged = (e, name, i) => {
    const { value } = e.target;
    this.setState(state => ({
      tickets: state.tickets.map((ticket, j) => j === i ? { ...ticket, [name]: value } : ticket)
    }));
  }

  updateTicketsSold = (error, result) => {
    if (error) {
      console.log(error);
      return;
    }
    let purchaseId = Number(result.args.purchaseId);
    // Add the ticket to sold tickets in the loading state first
    let newTicketSold = {
      isLoading: true,
      purchaseId: purchaseId,
      tId: Number(result.args.tId),
      buyer: result.args.customer,
      passenger: {
        firstName: result.args.passengerFirstName,
        lastName: result.args.passengerLastName
      }
    }
    this.setState(state => ({
      soldTickets: [...state.soldTickets, newTicketSold]
    }));
    return this.props.getTicketData(result.args.tId).then(ticket => {
      // Update the ticket with actual data and quit the loading state
      this.setState(state => ({
        soldTickets: state.soldTickets.map(sold => {
          if (sold.purchaseId === newTicketSold.purchaseId) {
            ticket.purchaseId = newTicketSold.purchaseId;
            ticket.passenger = newTicketSold.passenger;
            ticket.buyer = newTicketSold.buyer;
            ticket.isLoading = false;
            return ticket;
          }
          return sold;
        })
      }));
    });
  };

  render() {
    return (
      <div>
        <FormControl>
          <InputLabel htmlFor="airline-select">Airline</InputLabel>
          <Select
            value={this.state.airlineIdx}
            onChange={this.selectAirline}
            inputProps={{ id: 'airline-select' }}
          >
            {this.props.airlines.map((airline, i) => (
              <MenuItem value={i} key={'asi-' + i}>{airline.aName}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <h2>Sold Tickets</h2>

        <SoldTickets
          web3={this.state.web3}
          contract={this.state.contract}
          account={this.props.account}
          soldTickets={this.state.soldTickets}
        />

        <h2>Manage Tickets</h2>

        <Grid container spacing={24}>
          <Grid item xs={4}>
            <Paper style={{ padding: 10 }}>
              <TicketForm
                onValidate={this.ticketValidateSubmit}
                onSubmit={this.ticketSubmit} />
            </Paper>
          </Grid>
          <Grid item xs={12}>
            <EditableTable
              handleChange={this.onInputChanged}
              handleRemove={this.ticketRemove}
              startEditing={this.startEditing}
              finishEditing={this.finishEditing}
              cancelEditing={this.cancelEditing}
              editIdx={this.state.editTicketIdx}
              data={this.state.tickets}
              dataErrors={this.state.editTicketErrors}
              dataStructure={[
                {
                  name: 'ID',
                  prop: 'tId',
                  editable: false,
                  type: 'text'
                },
                {
                  name: 'From',
                  prop: 'tFrom',
                  editable: false,
                  errorProp: 'tFromError',
                  type: 'text'
                },
                {
                  name: 'To',
                  prop: 'tTo',
                  editable: false,
                  errorProp: 'tToError',
                  type: 'text'
                },
                {
                  name: 'Price, ETH',
                  prop: 'tPrice',
                  editable: true,
                  errorProp: 'tPriceError',
                  type: 'text'
                },
                {
                  name: 'Quantity',
                  prop: 'tQuantity',
                  editable: true,
                  errorProp: 'tQuantityError',
                  type: 'text'
                },
                {
                  name: 'Departure',
                  prop: 'tDeparture',
                  editable: false,
                  errorProp: 'tDepartureError',
                  type: 'datetime'
                },
                {
                  name: 'Arrival',
                  prop: 'tArrival',
                  editable: false,
                  errorProp: 'tArrivalError',
                  type: 'datetime'
                }
              ]} />
          </Grid>
        </Grid>
      </div>
    );
  }
}

export default MyAirline;