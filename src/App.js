import React from 'react';
import getWeb3 from './utils/getWeb3';
import FlightTicketsContract from '../build/contracts/FlightTickets.json';
import FlightTicketsRegistryContract from '../build/contracts/FlightTicketsRegistry.json';
import AdminPanel from './AdminPanel';
import MyAirline from './MyAirline';
import TicketBrowser from './TicketBrowser';
import MyPurchases from './MyPurchases';
import Paper from '@material-ui/core/Paper';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import SearchIcon from '@material-ui/icons/Search';
import FlightIcon from '@material-ui/icons/Flight';
import StorageIcon from '@material-ui/icons/Storage';
import BuildIcon from '@material-ui/icons/Build';

import './css/oswald.css'
import './App.css'


class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      // to save instances of web3, of the smart contract and the current account
      web3: null,
      contract: null,
      account: null,
      // the list of airlines
      airlines: [],
      // whether the user is the admin or not
      userIsAdmin: false,
      // list of airlines owned by the user
      userOwnsAirlines: [],
      // list of flights that user has purchased
      userPurchasedTickets: [],
      // the interface tab that is currently open
      activeTab: 0
    };
  }

  componentDidMount() {
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
    const flightTicketsRegistry = contract(FlightTicketsRegistryContract);
    flightTickets.setProvider(this.state.web3.currentProvider);
    flightTicketsRegistry.setProvider(this.state.web3.currentProvider);

    // Get accounts.
    this.state.web3.eth.getAccounts((error, accounts) => {
      if (error) {
        console.log('Failed to get accounts. Error: ', error);
        return;
      }
      // Get registry contract
      flightTicketsRegistry.deployed()
        .then(instance => instance.backendContract.call())
        // Get our main contract from the address stored in the registry
        .then(backendAddress => flightTickets.at(backendAddress))
        .then(instance => {
          // Save the instance of the contract and the account
          return this.setState({
            contract: instance,
            account: accounts[0]
          });
        }).then(() => {
          // Detect when account changes
          setInterval(() => {
            this.state.web3.eth.getAccounts((error, accounts) => {
              if (accounts[0] !== this.state.account) {
                // Update account in the state, update the user rights, flush my purchases
                this.setState({
                  account: accounts[0],
                  userPurchasedTickets: []
                }, () => {
                  this.setUserRights();
                  this.initMyPurchases();
                });
              }
            });
          }, 500);
          // Load the list of airlines from the contract
          return this.loadAirlines();
        }).then(result => {
          // Set the user rights depending on their account
          return this.setUserRights();
        }).then(result => {
          // Update the list every time when an airline is added/updated/removed
          let updateAirlinesCallback = (error, result) => {
            if (error) {
              console.log(error);
              return;
            }
            // Update the list of airlines and update the rights of the user
            this.loadAirlines().then(this.setUserRights);
          }
          this.state.contract.LogAirlineAdded().watch(updateAirlinesCallback);
          this.state.contract.LogAirlineUpdated().watch(updateAirlinesCallback);
          this.state.contract.LogAirlineRemoved().watch(updateAirlinesCallback);
          // Update the user rights when the contract changes its owner (very rare case, but still)
          this.state.contract.OwnershipTransferred().watch(this.setUserRights);
          // Fill and update My Purchases
          this.initMyPurchases();
          // Call other callbacks that might be waiting for the contract to get ready
          if (typeof this.onContractReady === 'function') {
            this.onContractReady();
          }
        }).catch(error => {
          console.log(error);
        });
    });
  }

  initMyPurchases() {
    if (this.myPurchasesFilter) {
      this.myPurchasesFilter.stopWatching();
    }
    this.myPurchasesFilter = this.state.contract.LogTicketPurchased(
      { customer: this.state.account },
      { fromBlock: 0, toBlock: 'latest' }
    ).watch(this.updateTicketsPurchased);
  }

  setOnContractReady = (callback) => {
    this.onContractReady = () => {
      callback(this.state.web3, this.state.contract);
    }
    if (this.state.web3 !== null && this.state.contract !== null) {
      this.onContractReady();
    }
  };

  /** Figure out the rights of the user and save it to the state */
  setUserRights = () => {
    // Get the owner of the contract
    return this.state.contract.owner.call().then(owner => {
      // Contract owner is admin
      return this.setState({ userIsAdmin: (this.state.account === owner) });
    }).then(() => {
      // If user is an airline owner, find which airlines he owns
      let ownedAirlines = this.state.airlines.filter((airline, i) => (this.state.account === airline.aOwner), this);
      return this.setState({ userOwnsAirlines: ownedAirlines });
    });
  };

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
      airlines.sort((a, b) => (parseInt(a.aId, 10) < parseInt(b.aId, 10) ? -1 : 1));
      return this.setState({ airlines: airlines });
    }).catch(error => {
      console.log(error);
    });
  };

  setAirlines = (airlines) => {
    return this.setState({ airlines: airlines });
  };

  /**
   * Loads ticket and airline data from the contract and builds a nice object from it
   * @param {Number} tId - ticket ID
   * @return {Promise} - resolves into a nice object with ticket and airline data
   */
  getTicketData = (tId) => {
    return this.state.contract.getTicketById.call(tId).then(data => {
      let aId = Number(data[1]);
      return this.state.contract.getAirlineById.call(aId).then(result => {
        let airline = {
          aId: Number(result[0]),
          aName: this.state.web3.toUtf8(result[1]),
          aOwner: result[2]
        }
        return {
          tId: Number(data[0]),
          tFrom: this.state.web3.toUtf8(data[2]),
          tTo: this.state.web3.toUtf8(data[3]),
          tPrice: parseInt(data[4].toString(), 10),
          tQuantity: Number(data[5]),
          tDeparture: Number(data[6]),
          tArrival: Number(data[7]),
          airline: airline,
        }
      });
    });
  };

  updateTicketsPurchased = (error, result) => {
    if (error) {
      console.log(error);
      return;
    }
    let purchaseId = Number(result.args.purchaseId);
    // Check for duplicates
    if (this.state.userPurchasedTickets.findIndex(x => x.purchaseId === purchaseId) > -1)
      return;
    // Add the ticket to my purchases in the loading state first
    let newPurchase = {
      isLoading: true,
      purchaseId: purchaseId,
      passenger: {
        firstName: result.args.passengerFirstName,
        lastName: result.args.passengerLastName
      }
    }
    this.setState(state => ({
      userPurchasedTickets: [...state.userPurchasedTickets, newPurchase]
    }));
    return this.getTicketData(result.args.tId).then(ticket => {
      // Update the ticket with actual data and quit the loading state
      this.setState(state => ({
        userPurchasedTickets: state.userPurchasedTickets.map(purchased => {
          if (purchased.purchaseId === newPurchase.purchaseId) {
            ticket.purchaseId = newPurchase.purchaseId;
            ticket.passenger = newPurchase.passenger;
            ticket.isLoading = false;
            return ticket;
          }
          return purchased;
        })
      }));
    });
  };

  onPurchaseComplete = (txResult) => {
    txResult.logs.forEach(log => {
      if (log.event !== 'LogTicketPurchased')
        return;
      if (log.args.customer !== this.state.account)
        return;
      this.updateTicketsPurchased(null, log);
    });
  };

  switchTab = (event, value) => {
    this.setState({ activeTab: value });
  };

  render() {
    if (!this.state.web3) {
      return (
        <div className="App" style={{ textAlign: 'center', marginTop: 100 }}>
          Waiting for web3...
        </div>);
    }
    // Make sure the user does not accidentially spend real ETH here
    // Remove this block in production
    if (this.state.web3.version.network === '1') {
      return (
        <div className="App" style={{ textAlign: 'center', marginTop: 100 }}>
          You are connected to Ethereum mainnet! You should switch to a testnet.
        </div>
      );
    }
    return (
      <div className="App">
        <Paper square>
          <Tabs
            value={this.state.activeTab}
            onChange={this.switchTab}
            fullWidth
            centered
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab icon={<SearchIcon />} label="Search Tickets" value={0} />
            <Tab icon={<StorageIcon />} label="My Purchases" value={1} />
            {this.state.userOwnsAirlines.length > 0 && (
              <Tab icon={<FlightIcon />} label="My Airline" value={2} />
            )}
            {this.state.userIsAdmin && (
              <Tab icon={<BuildIcon />} label="Admin Panel" value={3} />
            )}
          </Tabs>
        </Paper>

        <div className="current-account">
          Account: {this.state.account}
        </div>

        <main className="container">

          {this.state.activeTab === 0 && (
            <TicketBrowser
              web3={this.state.web3}
              contract={this.state.contract}
              account={this.state.account}
              navigateToMyPurchases={() => { this.switchTab(null, 1); }}
              getTicketData={this.getTicketData}
              onBookingComplete={this.onPurchaseComplete}
            />
          )}
          {this.state.activeTab === 1 && (
            <MyPurchases
              web3={this.state.web3}
              contract={this.state.contract}
              account={this.state.account}
              myTickets={this.state.userPurchasedTickets}
            />
          )}
          {this.state.activeTab === 2 && this.state.userOwnsAirlines.length > 0 && (
            <MyAirline
              airlines={this.state.userOwnsAirlines}
              setOnContractReady={this.setOnContractReady}
              account={this.state.account}
              getTicketData={this.getTicketData}
            />
          )}
          {this.state.activeTab === 3 && this.state.userIsAdmin && (
            <AdminPanel
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
