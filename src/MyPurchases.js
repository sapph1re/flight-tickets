import React from 'react';
import Ticket from './Ticket';
import Paper from '@material-ui/core/Paper';

/**
 * Displays a list of user's purchased flights.
 * @param web3 - instance of web3
 * @param contract - instance of the smart contract
 * @param account - address of the user
 * @param myTickets - list of tickets purchased by the user
 */
class MyPurchases extends React.Component {

  formatETH = price => {
    return this.props.web3.fromWei(price, 'ether') + ' ETH';
  }

  render() {
    return (
      <div>
        <h1>My Purchases</h1>
        {this.props.myTickets.map((ticket, i) => (
          <Paper key={`mp-${i}`} className="my-purchase-paper">
            <Ticket
              ticket={ticket}
              formatETH={this.formatETH}
            />
          </Paper>
        ))}
      </div>
    );
  }

}

export default MyPurchases;