import React from 'react';
import SearchTicketForm from "./SearchTicketForm";
import BookFlightDialog from './BookFlightDialog';
import FlightSummary from './FlightSummary';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import RadioGroup from '@material-ui/core/RadioGroup';
import Radio from '@material-ui/core/Radio';


/** Display results of a search */
function SearchTicketResults(props) {
  const { resultsReady, flights, formatETH, sorting, onChangeSorting, onClickBook } = props;

  if (resultsReady) {
    if (flights.length === 0) {
      return (
        <div>
          <h2>Results</h2>
          <div>Sorry, no flights found. Try searching non-direct flights!</div>
        </div>
      );
    } else {
      switch (sorting) {
        case 'shortest':
          flights.sort((a, b) => {
            let durA = a.tickets[a.tickets.length - 1].tArrival - a.tickets[0].tDeparture;
            let durB = b.tickets[b.tickets.length - 1].tArrival - b.tickets[0].tDeparture;
            return durA > durB;
          });
          break;
        case 'cheapest':
        default:
          flights.sort((a, b) => (a.priceTotal > b.priceTotal));
      }
      return (
        <div>
          <h2>Results</h2>
          <RadioGroup
            value={sorting}
            onChange={onChangeSorting}
          >
            <FormControlLabel value="cheapest" control={<Radio color="primary" />} label="Cheapest first" />
            <FormControlLabel value="shortest" control={<Radio color="primary" />} label="Shortest first" />
          </RadioGroup>
          <div>
            {flights.map((flight, i) => (
              <Paper key={`sr-${i}`} style={{ padding: 15, margin: 15 }}>
                <FlightSummary
                  flight={flight}
                  formatETH={formatETH}
                  onClickBook={() => { onClickBook(flight); }}
                />
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
      resultsReady: false,
      sorting: 'cheapest',
      isBookDialogOpen: false,
      flightChosen: null
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
    if (isNaN(search.sWhen)) {
      errors.sWhenError = 'Choose a date';
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
          this.props.web3.toHex(search.sTo),
          search.sWhen
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
                  priceTotal: ticket.tPrice,
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
          this.props.web3.toHex(search.sTo),
          search.sWhen
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
                    priceTotal: ticket1.tPrice,
                    tickets: [ticket1]
                  }]
                }));
              } else {
                // this is a one-stop flight, get the second ticket...
                this.props.contract.getTicketById.call(tId2).then(result => {
                  return this.processTicketData(result);
                }).then(ticket2 => {
                  // ...and display it on the page
                  this.setState(state => ({
                    flights: [...state.flights, {
                      stops: 1,
                      priceTotal: ticket1.tPrice + ticket2.tPrice,
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

  formatETH = price => {
    return this.props.web3.fromWei(price, 'ether') + ' ETH';
  }

  onChangeSorting = e => {
    this.setState({ sorting: e.target.value });
  }

  onClickBook = (flight) => {
    this.setState({
      flightChosen: flight,
      isBookDialogOpen: true
    });
  }

  closeBookDialog = () => {
    this.setState({
      isBookDialogOpen: false
    });
  }

  submitBooking = (data, callback) => {
    let tId1 = data.flight.tickets[0].tId;
    let tId2 = data.flight.tickets.length > 1 ? data.flight.tickets[1].tId : 0;
    this.props.contract.bookFlight(
      [tId1, tId2],
      data.firstName,
      data.lastName,
      { from: this.props.account, value: data.flight.priceTotal }
    ).then(() => {
      callback();
      this.setState({
        isBookDialogOpen: false
      });
      // TODO: display result!
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
              formatETH={this.formatETH}
              sorting={this.state.sorting}
              onChangeSorting={this.onChangeSorting}
              onClickBook={this.onClickBook}
            />
          </Grid>
        </Grid>
        <BookFlightDialog
          isOpen={this.state.isBookDialogOpen}
          flight={this.state.flightChosen}
          onClose={this.closeBookDialog}
          onSubmit={this.submitBooking}
          formatETH={this.formatETH}
        />
      </div>
    );
  }
}

export default TicketBrowser;