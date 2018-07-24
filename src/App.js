import React from 'react';
import getWeb3 from './utils/getWeb3';
import FlightTicketsContract from '../build/contracts/FlightTickets.json';
import AirlineList from './AirlineList';
import Paper from '@material-ui/core/Paper';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import SearchIcon from '@material-ui/icons/Search';
import FlightIcon from '@material-ui/icons/Flight';
import ListIcon from '@material-ui/icons/List';

import './css/oswald.css'
import './css/open-sans.css'
import './App.css'


class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      // to save instances of web3, of the smart contract and the current account
      web3: null,
      contract: null,
      account: null,
      activeTab: 0,
      // role of the user: customer/airline/admin
      role: 'customer',
      // the list of airlines
      airlines: []
    };
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
        // Detect when account changes
        setInterval(() => {
          this.state.web3.eth.getAccounts((error, accounts) => {
            if (accounts[0] !== this.state.account) {
              // Update account in the state and update the user role
              this.setState({ account: accounts[0] }, this.setRole);
            }
          });
        }, 500);
        // Load the list of airlines from the contract
        return this.loadAirlines();
      }).then(result => {
        // Set the user role depending on their account
        return this.setRole();
      }).then(result => {
        // Update the list every time when an airline is added/updated/removed
        let updateAirlinesCallback = (error, result) => {
          if (error) {
            console.log(error);
            return;
          }
          // Update the list of airlines and update the role of the user
          this.loadAirlines().then(this.setRole);
        }
        this.state.contract.LogAirlineAdded().watch(updateAirlinesCallback);
        this.state.contract.LogAirlineUpdated().watch(updateAirlinesCallback);
        this.state.contract.LogAirlineRemoved().watch(updateAirlinesCallback);
        // Update the user role when the contract changes its owner (very rare case, but still)
        this.state.contract.OwnershipTransferred().watch(this.setRole);
      }).catch(error => {
        console.log(error);
      });
    });
  }

  /** Figure out the role of the user and save it to the state */
  setRole = () => {
    // Get the owner of the contract
    return this.state.contract.owner.call().then(owner => {
      if (this.state.account === owner) {
        // Contract owner is admin
        return this.setState({ role: 'admin' });
      } else {
        if (this.state.airlines.find((airline, i) => (this.state.account === airline.aOwner), this)) {
          // Airline owner
          return this.setState({ role: 'airline' });
        } else {
          // Just a guest (a customer)
          return this.setState({ role: 'customer' });
        }
      }
    });
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

  setAirlines = (airlines) => {
    return this.setState({ airlines: airlines });
  }

  switchTab = (event, value) => {
    this.setState({ activeTab: value });
  };

  render() {
    return (
      <div className="App">
        <Paper>
          <Tabs
            value={this.state.activeTab}
            onChange={this.switchTab}
            fullWidth
            centered
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab icon={<SearchIcon />} label="Search Tickets" />
            <Tab icon={<ListIcon />} label="Airline: Manage Your Tickets" />
            <Tab icon={<FlightIcon />} label="Admin: Manage Airlines" />
          </Tabs>
        </Paper>

        <main className="container">

          {this.state.activeTab === 0 && (
            <div>Customer Interface</div>
          )}
          {this.state.activeTab === 1 && (
            <div>Airline Interface</div>
          )}
          {this.state.activeTab === 2 && (
            <AirlineList
              airlines={this.state.airlines}
              setAirlines={this.setAirlines}
              web3={this.state.web3}
              contract={this.state.contract}
              account={this.state.account}
            />
          )}
        </main>
      </div>
    );
  }
}

export default App;
