import React, { Component } from 'react';
import FlightTicketsContract from '../build/contracts/FlightTickets.json';
import getWeb3 from './utils/getWeb3';
import AirlineForm from "./AirlineForm";
import EditableTable from "./EditableTable";
import Grid from '@material-ui/core/Grid'

import './css/oswald.css'
import './css/open-sans.css'
import './css/pure-min.css'
import './App.css'

class App extends Component {
  constructor(props) {
    super(props)

    this.state = {
      // to save instances of web3, of the smart contract and the current account
      web3: null,
      contract: null,
      account: null,
      // the list of airlines displayed in the table
      airlines: [],
      // the index of the row that's being edited right now, -1 means none are edited
      editAirlineIdx: -1,
      // errors to display during the edit mode
      editAirlineErrors: {},
      // saved version of an airline before editing, to restore the values on cancel
      airlineBeforeEditing: null
    }
  }

  componentWillMount() {
    // Get network provider and web3 instance.
    // See utils/getWeb3 for more info.

    getWeb3
      .then(results => {
        this.setState({
          web3: results.web3
        });
        // Instantiate contract once web3 is provided.
        this.instantiateContract();
      }).catch(() => {
        console.log('Error finding web3.')
      });
  }

  instantiateContract() {
    const contract = require('truffle-contract');
    const flightTickets = contract(FlightTicketsContract);
    flightTickets.setProvider(this.state.web3.currentProvider);

    // Get accounts.
    this.state.web3.eth.getAccounts((error, accounts) => {
      // Get our main contract
      flightTickets.deployed().then(instance => {
        // Save the instance of the contract and the account
        return this.setState({ contract: instance, account: accounts[0] });
      }).then(result => {
        // Load the list of airlines from the contract
        return this.loadAirlines();
      }).then(result => {
        // Update the list every time when an airline is added/updated/removed
        let updateAirlinesCallback = (error, result) => {
          if (error) {
            console.log(error);
            return;
          }
          this.loadAirlines();
        }
        this.state.contract.LogAirlineAdded().watch(updateAirlinesCallback);
        this.state.contract.LogAirlineUpdated().watch(updateAirlinesCallback);
        this.state.contract.LogAirlineRemoved().watch(updateAirlinesCallback);
      }).catch(error => {
        console.log(error);
      })
    })
  }

  /** Get the list of airlines from the contract and save it to the state */
  loadAirlines = () => {
    // First we get the total number of airlines
    return this.state.contract.getAirlinesCount.call().then(airlinesCount => {
      // Then we iterate over the array of airlines to load each of them
      let promises = [];
      for (let i = 0; i < airlinesCount; i++) {
        promises.push(
          this.state.contract.airlines.call(i)
        );
      }
      return Promise.all(promises);
    }).then(results => {
      // Now as we have all airlines loaded, we save them to the state
      let airlines = [];
      results.forEach(row => {
        airlines.push({
          aId: row[0].toString(),
          aName: this.state.web3.toUtf8(row[1]),
          aOwner: row[2],
          inProgress: false
        });
      });
      airlines.sort((a, b) => (a.aId < b.aId ? -1 : 1));
      return this.setState({ airlines: airlines });
    }).catch(error => {
      console.log(error);
    });
  }

  /**
   * Validate the input before an airline is added/changed.
   * This function is made asynchronous because it may execute a contract call,
   * and contract calls must not be executed synchronously.
   * @param {object} airline - object containing airline data: aName, aOwner
   * @return {Promise} - promise that will resolve to an object of errors; empty object means no errors
   */
  airlineValidate = (airline) => {
    let errors = {};
    if (airline.aName.length < 3) {
      errors.aNameError = 'Airline name needs to be at least 3 characters long';
    }
    if (airline.aName.length > 32) {
      errors.aNameError = 'Airline name must not exceed 32 characters';
    }
    if (!this.state.web3.isAddress(airline.aOwner)) {
      errors.aOwnerError = 'Airline owner must be a valid Ethereum address';
    }
    // If we're in edit mode and aName remained unchanged, skip the uniqueness check
    if (this.state.editAirlineIdx !== -1 && this.state.airlineBeforeEditing.aName === airline.aName) {
      // We should still return a promise here
      return new Promise((resolved, rejected) => {
        resolved(errors);
      });
    }
    // Check that airline name is unique
    return this.state.contract.airlineExists.call(this.state.web3.toHex(airline.aName)).then(exists => {
      if (exists) {
        errors.aNameError = 'This airline name already exists';
      }
      return errors;
    });
  }

  /** Add a new airline to the contract and update the state to display the change */
  airlineSubmit = (airline) => {
    // Add the airline to the contract
    this.state.contract.addAirline(
      this.state.web3.toHex(airline.aName),
      airline.aOwner,
      { from: this.state.account }
    ).then(() => {
      // Add the new airline to the list, but grayed out (inProgress: true)
      // It will update to normal automatically when the transaction completes
      this.setState({
        airlines: [...this.state.airlines, {
          aId: null,
          aName: airline.aName,
          aOwner: airline.aOwner,
          inProgress: true
        }]
      });
    }).catch(error => {
      console.log(error);
    });
  }

  /** Remove an airline from the contract and update the state to display the change */
  airlineRemove = (i) => {
    const airline = this.state.airlines[i];
    // Remove the airline from the contract
    this.state.contract.removeAirline(
      airline.aId,
      { from: this.state.account, gas: 80000 }
    ).then(() => {
      // Gray out the airline in our table
      // It will disappear completely automatically when the transaction completes
      this.setState(state => ({
        airlines: state.airlines.map((airline, j) => {
          if (j === i) {
            airline.inProgress = true;
          }
          return airline;
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
    if (this.state.editAirlineIdx === -1) {
      this.setState(state => ({
        editAirlineIdx: i,
        airlineBeforeEditing: state.airlines[i]
      }));
    }
  }

  /** Finish editing, save the changes to the contract and update the table */
  finishEditing = () => {
    let airlineEdited = this.state.airlines[this.state.editAirlineIdx];
    // Clear the old errors first
    this.setState({
      editAirlineErrors: {}
    });
    // If nothing changed, just turn off the edit mode, no need to submit anything
    if (airlineEdited === this.state.airlineBeforeEditing) {
      return this.setState({
        editAirlineIdx: -1,
        airlineBeforeEditing: null
      });
    }
    // Validate the new values
    return this.airlineValidate(airlineEdited).then(errors => {
      // If anything is wrong with the input, display the errors and remain in the edit mode
      if (Object.keys(errors).length > 0) {
        return this.setState({
          editAirlineErrors: errors
        });
        // If everything is fine, update the airline in the contract
      } else {
        this.state.contract.editAirline(
          this.state.airlineBeforeEditing.aId,
          this.state.web3.toHex(airlineEdited.aName),
          airlineEdited.aOwner,
          { from: this.state.account }
        ).then(() => {
          // Turn off the edit mode and gray out the airline in the table until the transaction completes
          this.setState(state => ({
            airlines: state.airlines.map((airline, j) => {
              if (j === state.editAirlineIdx) {
                airline.inProgress = true;
              }
              return airline;
            }),
            editAirlineIdx: -1,
            airlineBeforeEditing: null
          }));
        }).catch(error => {
          console.log(error);
        });
      }
    });
  }

  /** Quit the edit mode and revert the changes */
  cancelEditing = () => {
    this.setState(state => ({
      airlines: state.airlines.map((airline, j) => {
        return j === state.editAirlineIdx ? state.airlineBeforeEditing : airline
      }),
      editAirlineIdx: -1,
      editAirlineErrors: {},
      airlineBeforeEditing: null
    }))
  }

  /** Handle changes in the inputs when in the edit mode */
  handleChange = (e, name, i) => {
    const { value } = e.target;
    this.setState(state => ({
      airlines: state.airlines.map((airline, j) => j === i ? { ...airline, [name]: value } : airline)
    }));
  }

  render() {
    return (
      <div className="App">
        <nav className="navbar pure-menu pure-menu-horizontal">
          <a href="#" className="pure-menu-heading pure-menu-link">Admin</a>
        </nav>

        <main className="container">
          <div className="pure-g">
            <div className="pure-u-1-1">
              <h1>Airlines</h1>
            </div>
          </div>

          <Grid container spacing={24}>
            <Grid item xs={12}>
              <AirlineForm
                onValidate={this.airlineValidate}
                onSubmit={this.airlineSubmit} />
            </Grid>
            <Grid item xs={12}>
              <EditableTable
                handleChange={this.handleChange}
                handleRemove={this.airlineRemove}
                startEditing={this.startEditing}
                finishEditing={this.finishEditing}
                cancelEditing={this.cancelEditing}
                editIdx={this.state.editAirlineIdx}
                data={this.state.airlines}
                dataErrors={this.state.editAirlineErrors}
                dataStructure={[
                  {
                    name: 'ID',
                    prop: 'aId',
                    editable: false,
                  },
                  {
                    name: 'Airline Name',
                    prop: 'aName',
                    editable: true,
                    errorProp: 'aNameError'
                  },
                  {
                    name: 'Owner Address',
                    prop: 'aOwner',
                    editable: true,
                    errorProp: 'aOwnerError'
                  }
                ]} />
            </Grid>
          </Grid>
        </main>
      </div>
    );
  }
}

export default App
