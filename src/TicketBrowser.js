import React from 'react';
import SearchTicketForm from "./SearchTicketForm";
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';


function Ticket(props) {
  const { ticket, web3 } = props;

  return (
    <Grid container spacing={8}>
      <Grid item xs={2}>{ticket.tFrom}</Grid>
      <Grid item xs={1}> -> </Grid>
      <Grid item xs={2}>{ticket.tTo}</Grid>
      <Grid item xs={3}>
        by {ticket.airline.aName} <br />
        for {web3.fromWei(ticket.tPrice, 'ether')} ETH
      </Grid>
    </Grid >
  );
}


function Layover(props) {
  const { ticket1, ticket2 } = props;

  let layover = (ticket2.tDeparture - ticket1.tArrival) / 3600;
  return (
    <div>
      Layover in {ticket1.tTo} for {layover} h
    </div>
  );
}


function Flight(props) {
  const { flight, web3 } = props;

  return (
    <Grid container spacing={16}>
      <Grid item xs={2}>
        {flight.stops === 0 ? 'Direct flight' : 'Stops: ' + flight.stops}
      </Grid>
      <Grid item xs={2}>
        Duration: 0
      </Grid>
      <Grid item xs={6}>
        {flight.tickets.map((ticket, j) => (
          <div key={`srt-${j}`}>
            {j > 0 ? (
              <Layover ticket1={flight.tickets[j - 1]} ticket2={ticket} />
            ) : ''}
            <Ticket ticket={ticket} web3={web3} />
          </div>
        ))}
      </Grid>
      <Grid item xs={2}>
        Total: {flight.priceTotal} ETH
      </Grid>
    </Grid>
  );
}


/** Display results of a search */
function SearchTicketResults(props) {
  const { resultsReady, flights, web3 } = props;

  if (resultsReady) {
    if (flights.length === 0) {
      return (
        <div>
          <h2>Results</h2>
          <div>Sorry, no tickets found :(</div>
        </div>
      );
    } else {
      return (
        <div>
          <h2>Results</h2>
          <div>
            {flights.map((flight, i) => (
              <Paper key={`sr-${i}`} style={{ padding: 15, margin: 15 }}>
                <Flight flight={flight} web3={web3} />
              </Paper>
            ))}
          </div>
        </div>
      );
    }
  } else {
    return '';
  }
}


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
      // Flights found, each flight may consist of one or two tickets
      // Direct flights consist of only one ticket
      // One-stop flights consist of two tickets
      flights: [],
      resultsReady: false
    }
  }

  /**
   * Takes ticket data as returned from the contract and builds a nice object from it
   * @param {Array} data - array of ticket data, the order of items is important
   * @return {Promise} - resolves into a nice object with ticket and airline data
   */
  processTicketData = (data) => {
    let aId = Number(data[1]);
    return this.props.contract.getAirlineById.call(aId).then(result => {
      let airline = {
        aId: Number(result[0]),
        aName: this.props.web3.toUtf8(result[1]),
        aOwner: result[2]
      }
      return {
        tId: Number(data[0]),
        tFrom: this.props.web3.toUtf8(data[2]),
        tTo: this.props.web3.toUtf8(data[3]),
        tPrice: parseInt(data[4].toString(), 10),
        tQuantity: Number(data[5]),
        tDeparture: Number(data[6]),
        tArrival: Number(data[7]),
        airline: airline,
      }
    });
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

  /**
   * Search the tickets via the contract and display the result
   * @param search the search form data
   * @param onProcessed callback for when the processing is done and results are displayed
   */
  searchSubmit = (search, onProcessed) => {
    // Clear existing results first
    this.setState({
      flights: [],
      resultsReady: false
    }, () => {
      // Find only direct flights
      if (search.sOnlyDirect) {
        this.props.contract.findDirectFlights.call(
          this.props.web3.toHex(search.sFrom),
          this.props.web3.toHex(search.sTo)
        ).then(results => {
          for (let i = 0; i < results.length; i++) {
            let tId = Number(results[i]);
            if (tId === 0) {
              // end of results
              break;
            }
            this.props.contract.getTicketById.call(tId).then(result => {
              return this.processTicketData(result);
            }).then(ticket => {
              // display the result
              this.setState(state => ({
                flights: [...state.flights, {
                  stops: 0,
                  priceTotal: this.props.web3.fromWei(ticket.tPrice, 'ether'),
                  tickets: [ticket]
                }]
              }));
            });
          }
          onProcessed();
          return this.setState({
            resultsReady: true
          });
        });
      // Find direct and one-stop flights
      } else {
        this.props.contract.findOneStopFlights.call(
          this.props.web3.toHex(search.sFrom),
          this.props.web3.toHex(search.sTo)
        ).then(results => {
          for (let i = 0; i < results.length; i++) {
            let tId1 = Number(results[i][0]);
            let tId2 = Number(results[i][1]);
            if (tId1 === 0) {
              // end of results
              break;
            }
            this.props.contract.getTicketById.call(tId1).then(result => {
              return this.processTicketData(result);
            }).then(ticket1 => {
              if (tId2 === 0) {
                // this is a direct flight, display it on the page
                this.setState(state => ({
                  flights: [...state.flights, {
                    stops: 0,
                    priceTotal: this.props.web3.fromWei(ticket1.tPrice, 'ether'),
                    tickets: [ticket1]
                  }]
                }));
              } else {
                // this is a one-stop flight, get the second ticket...
                this.props.contract.getTicketById.call(tId2).then(result => {
                  return this.processTicketData(result);
                }).then(ticket2 => {
                  let totalPrice = ticket1.tPrice + ticket2.tPrice;
                  // ...and display it on the page
                  this.setState(state => ({
                    flights: [...state.flights, {
                      stops: 1,
                      priceTotal: this.props.web3.fromWei(totalPrice, 'ether'),
                      tickets: [ticket1, ticket2]
                    }]
                  }));
                });
              }
            });
          }
          onProcessed();
          return this.setState({
            resultsReady: true
          });
        }).catch(error => {
          console.log(error);
        });
      }
    });
  }

  render() {
    return (
      <div>
        <h1>Where do you want to go?</h1>

        <Grid container spacing={24}>
          <Grid item xs={12}>
            <SearchTicketForm
              onValidate={this.searchValidate}
              onSubmit={this.searchSubmit}
            />
          </Grid>
          <Grid item xs={12}>
            <SearchTicketResults
              resultsReady={this.state.resultsReady}
              flights={this.state.flights}
              web3={this.props.web3}
            />
          </Grid>
        </Grid>
      </div>
    );
  }
}

export default TicketBrowser;