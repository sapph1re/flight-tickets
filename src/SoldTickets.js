import React from 'react';
import Ticket from './Ticket';
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
import CircularProgress from '@material-ui/core/CircularProgress';

/**
 * Displays a list of tickets sold by an airline.
 * @param web3 - instance of web3
 * @param contract - instance of the smart contract
 * @param account - address of the user
 * @param soldTickets - list of tickets sold
 */
class SoldTickets extends React.Component {

  formatETH = price => {
    return this.props.web3.fromWei(price, 'ether') + ' ETH';
  }

  render() {
    let tickets = this.props.soldTickets;
    tickets.sort((a, b) => (b.purchaseId - a.purchaseId));

    if (tickets.length === 0) {
      return (
        <div>
          Your airline has not sold any tickets yet
        </div>
      );
    } else {
      return (
        <div className="sold-tickets-container">
          {tickets.map((ticket, i) => (
            <Paper key={`mp-${i}`} className="sold-ticket-paper">
              <Grid container spacing={16}>
                <Grid item xs={1}>
                  <div className="purchase-id">{ticket.purchaseId}</div>
                </Grid>
                <Grid item xs={2}>
                  <div className="ticket-id">Ticket ID {ticket.tId}</div>
                </Grid>
                <Grid item xs={6}>
                  {ticket.isLoading ? (
                    <div className="ticket-loading">
                      <CircularProgress size={20} />
                    </div>
                  ) : (
                      <div className="ticket">
                        <Ticket
                          ticket={ticket}
                          formatETH={this.formatETH}
                        />
                      </div>
                    )}
                </Grid>
                {ticket.passenger ? (
                  <Grid item xs={3}>
                    <div className="ticket-passenger-details">
                      <div>Passenger Details</div>
                      <div>First name: <span className="passenger-details-value">{ticket.passenger.firstName}</span></div>
                      <div>Last name: <span className="passenger-details-value">{ticket.passenger.lastName}</span></div>
                      <div className="ticket-buyer">Buyer: {ticket.buyer}</div>
                    </div>
                  </Grid>
                ) : null}
              </Grid>
            </Paper>
          ))}
        </div>
      );
    }
  }

}

export default SoldTickets;
