import React from 'react';
import SearchTicketForm from "./SearchTicketForm";
import Grid from '@material-ui/core/Grid';

/**
 * Ticket browser allows a customer to search & buy tickets.
 * @param web3 - instance of web3
 * @param contract - instance of the smart contract
 * @param account - address of the user
 */
class TicketBrowser extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      // Tickets found
      tickets: []
    }
  }

  /**
   * Validate the input before search is submitted
   * @param {object} search - object containing ticket data: { sFrom, sTo }
   * @return {object} - object of errors, empty object means no errors
   */
  searchValidate = (search) => {
    let errors = {};
    if (search.sFrom.length === 0) {
      errors.sFromError = 'Where are you travelling from?';
    }
    if (search.sTo.length === 0) {
      errors.sToError = 'Where are you travelling to?';
    }
    return errors;
  }

  /** Search the tickets via the contract and display the result */
  searchSubmit = (search) => {
    this.props.contract.findTickets.call(
      this.props.web3.toHex(search.sFrom),
      this.props.web3.toHex(search.sTo)
    ).then(results => {
      console.log(results);
      // Display the tickets found
      this.setState({
        tickets: []
      });
    }).catch(error => {
      console.log(error);
    });
  }

  render() {
    return (
      <div>
        <h1>Where do you want to go?</h1>

        <Grid container spacing={24}>
          <Grid item xs={6}>
            <SearchTicketForm
              onValidate={this.searchValidate}
              onSubmit={this.searchSubmit}
            />
          </Grid>
          <Grid item xs={12}>
          </Grid>
        </Grid>
      </div>
    );
  }
}

export default TicketBrowser;