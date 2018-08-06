import React from 'react';
import AirlineForm from "./AirlineForm";
import EditableTable from "./EditableTable";
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import grey from '@material-ui/core/colors/grey';
import Card from '@material-ui/core/Card';
import CardActions from '@material-ui/core/CardActions';
import CardMedia from '@material-ui/core/CardMedia';

const defaultLogoHash = 'QmZ9Nbn5Bfcf28p5Mn9Aobw2hvkW4ANxJJDBZdh5kUyQPm';
const ipfsGatewayPrefix = 'https://ipfs.io/ipfs/';

/**
 * A list of airlines with a form to add a new airline and edit/remove functionality
 * @param airlines - list of airlines
 * @param setAirlines - function to update airlines
 * @param web3 - instance of web3
 * @param contract - instance of the smart contract
 * @param account - address of the user
 * @param ipfs - IPFS interface
 */
class AdminPanel extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      // the index of the row that's being edited right now, -1 means none are edited
      editAirlineIdx: -1,
      // errors to display during the edit mode
      editAirlineErrors: {},
      // saved version of an airline before editing, to restore the values on cancel
      airlineBeforeEditing: null,
      editAirlineLogoFile: '',
      isEditUploading: false,
      isContractPaused: false,
      isPausing: false,
      isUnpausing: false
    };

    this.editAirlineLogoInput = React.createRef();

    // Check contract Paused state and listen for updates on that
    this.props.contract.paused.call().then(paused => {
      this.setState({ isContractPaused: paused });
    });
    this.props.contract.Pause().watch(() => {
      this.setState({ isContractPaused: true, isPausing: false });
    });
    this.props.contract.Unpause().watch(() => {
      this.setState({ isContractPaused: false, isUnpausing: false });
    });
  }

  /**
   * Validate the input before an airline is added/changed.
   * This function is made asynchronous because it may execute a contract call,
   * and contract calls must not be executed synchronously.
   * @param {object} airline - object containing airline data: aName, aOwner
   * @return {Promise} - promise that will resolve to an object of errors; empty object means no errors
   */
  airlineValidate(airline) {
    let errors = {};
    if (airline.aName.length < 3) {
      errors.aNameError = 'Airline name needs to be at least 3 characters long';
    }
    if (airline.aName.length > 32) {
      errors.aNameError = 'Airline name must not exceed 32 characters';
    }
    if (!this.props.web3.isAddress(airline.aOwner)) {
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
    return this.props.contract.airlineExists.call(this.props.web3.toHex(airline.aName)).then(exists => {
      if (exists) {
        errors.aNameError = 'This airline name already exists';
      }
      return errors;
    });
  }

  /** Add a new airline to the contract and update the state to display the change */
  airlineSubmit(airline) {
    // Add the airline to the contract
    this.props.contract.addAirline(
      this.props.web3.toHex(airline.aName),
      airline.aOwner,
      airline.aLogo,
      { from: this.props.account }
    ).then(() => {
      // Add the new airline to the list, but grayed out (inProgress: true)
      // It will update to normal automatically when the transaction completes
      this.props.setAirlines(
        [...this.props.airlines, {
          aId: null,
          aName: airline.aName,
          aOwner: airline.aOwner,
          inProgress: true
        }]
      );
    }).catch(error => {
      console.log(error);
    });
  }

  /** Remove an airline from the contract and update the state to display the change */
  airlineRemove(i) {
    const airline = this.props.airlines[i];
    // Remove the airline from the contract
    this.props.contract.removeAirline(
      airline.aId,
      // Gas limit is explicitly set here because MetaMask underestimates the gas usage
      // when some storage is freed in the transaction. Actual gas usage is lower than the
      // required limit, because a part of the gas is refunded at the end of the transaction
      { from: this.props.account, gas: 120000 }
    ).then(() => {
      // Gray out the airline in our table
      // It will disappear completely automatically when the transaction completes
      this.props.setAirlines(
        this.props.airlines.map((airline, j) => {
          if (j === i) {
            airline.inProgress = true;
          }
          return airline;
        })
      );
    }).catch(error => {
      console.log(error);
    });
  }

  /**
   * Enable edit mode
   * @param {number} i - index of the row to be edited
   */
  startEditing(i) {
    if (this.state.editAirlineIdx === -1) {
      this.setState(state => ({
        editAirlineIdx: i,
        airlineBeforeEditing: this.props.airlines[i]
      }));
    }
  }

  /** Finish editing, save the changes to the contract and update the table */
  finishEditing() {
    if (this.state.isEditUploading)
      return;
    let airlineEdited = this.props.airlines[this.state.editAirlineIdx];
    // Clear the old errors first
    this.setState({
      editAirlineErrors: {}
    });
    // If nothing changed, just turn off the edit mode, no need to submit anything
    if (airlineEdited === this.state.airlineBeforeEditing) {
      return this.setState({
        editAirlineIdx: -1,
        editAirlineLogoFile: '',
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
        this.props.contract.editAirline(
          this.state.airlineBeforeEditing.aId,
          this.props.web3.toHex(airlineEdited.aName),
          airlineEdited.aOwner,
          airlineEdited.aLogo,
          { from: this.props.account }
        ).then(() => {
          // Turn off the edit mode and gray out the airline in the table until the transaction completes
          this.props.setAirlines(
            this.props.airlines.map((airline, j) => {
              if (j === this.state.editAirlineIdx) {
                airline.inProgress = true;
              }
              return airline;
            })
          );
          this.setState({
            editAirlineIdx: -1,
            editAirlineLogoFile: '',
            airlineBeforeEditing: null
          });
        }).catch(error => {
          console.log(error);
        });
      }
    });
  }

  /** Quit the edit mode and revert the changes */
  cancelEditing() {
    this.props.setAirlines(
      this.props.airlines.map((airline, j) => {
        return j === this.state.editAirlineIdx ? this.state.airlineBeforeEditing : airline
      })
    );
    this.setState({
      editAirlineIdx: -1,
      editAirlineErrors: {},
      airlineBeforeEditing: null
    });
  }

  /** Handle changes in the inputs when in the edit mode */
  onInputChanged(e, name, i) {
    const { value } = e.target;
    this.props.setAirlines(
      this.props.airlines.map((airline, j) => j === i ? { ...airline, [name]: value } : airline)
    );
  }

  pauseContract() {
    this.setState({ isPausing: true });
    this.props.contract.pause({ from: this.props.account }).catch(() => {
      this.setState({ isPausing: false });
    });
  }

  unpauseContract() {
    this.setState({ isUnpausing: true });
    this.props.contract.unpause({ from: this.props.account }).catch(() => {
      this.setState({ isUnpausing: false });
    });
  }

  editCaptureFile(e) {
    e.stopPropagation();
    e.preventDefault();
    this.setState({ isEditUploading: true });
    let file = e.target.files[0];
    let reader = new window.FileReader();
    reader.readAsArrayBuffer(file);
    reader.onloadend = async () => {
      // File is converted to a buffer to prepare for uploading to IPFS
      let buffer = await Buffer.from(reader.result);
      // Upload the file to IPFS and save the hash
      this.props.ipfs.add(buffer).then(result => {
        let fileHash = result[0].hash;
        console.log('Logo uploaded: ', fileHash);
        this.setState({ isEditUploading: false });
        this.props.setAirlines(
          this.props.airlines.map((airline, j) => (
            j === this.state.editAirlineIdx ? { ...airline, aLogo: fileHash } : airline
          ))
        );
      }).catch(err => {
        console.log('Failed to upload the logo to IPFS: ', err);
      })
    };
  };

  editRemoveLogo() {
    this.setState({ isEditUploading: false });
    this.props.setAirlines(
      this.props.airlines.map((airline, j) => (
        j === this.state.editAirlineIdx ? { ...airline, aLogo: defaultLogoHash } : airline
      ))
    );
  }

  renderEditLogo(value) {
    return (
      <div>
        <input
          className="airline-logo-input"
          ref={this.editAirlineLogoInput}
          type="file"
          value={this.state.editAirlineLogoFile}
          onChange={this.editCaptureFile}
        />
        <Card className="airline-logo-card">
          {this.state.isEditUploading ? (
            <CircularProgress size={50} style={{ color: grey[200] }} className="airline-logo-loader" />
          ) : null}
          <CardMedia
            className="airline-logo-form-image"
            image={ipfsGatewayPrefix + value}
            title="Airline Logo"
          />
          <CardActions className="airline-logo-actions">
            <Button
              size="small"
              color="primary"
              onClick={() => this.editAirlineLogoInput.current.click()}
              className="airline-logo-button"
            >
              Upload Logo
            </Button>
            <Button
              size="small"
              color="primary"
              className="airline-logo-button"
              onClick={this.editRemoveLogo}
            >
              Remove Logo
            </Button>
          </CardActions>
        </Card>
      </div>
    );
  }

  render() {
    return (
      <div>
        {this.state.isContractPaused ? (
          <Button onClick={this.unpauseContract} color="secondary" variant="contained">
            {this.state.isUnpausing ? (
              <CircularProgress size={20} style={{ color: grey[200] }} />
            ) : 'Unpause Contract'}
          </Button>
        ) : (
            <Button onClick={this.pauseContract} color="secondary" variant="contained">
              {this.state.isPausing ? (
                <CircularProgress size={20} style={{ color: grey[200] }} />
              ) : 'Pause Contract'}
            </Button>
          )}

        <h1>Airlines</h1>
        <Grid container spacing={24}>
          <Grid item xs={12}>
            <AirlineForm
              onValidate={this.airlineValidate}
              onSubmit={this.airlineSubmit}
              ipfs={this.props.ipfs}
            />
          </Grid>
          <Grid item xs={12}>
            <EditableTable
              handleChange={this.onInputChanged}
              handleRemove={this.airlineRemove}
              startEditing={this.startEditing}
              finishEditing={this.finishEditing}
              cancelEditing={this.cancelEditing}
              editIdx={this.state.editAirlineIdx}
              data={this.props.airlines}
              dataErrors={this.state.editAirlineErrors}
              dataStructure={[
                {
                  name: 'ID',
                  prop: 'aId',
                  editable: false,
                  type: 'text'
                },
                {
                  name: 'Logo',
                  prop: 'aLogo',
                  editable: true,
                  type: 'custom',
                  renderField: (value) => (
                    <img src={ipfsGatewayPrefix + value} className="airline-logo" alt="logo" />
                  ),
                  renderEditField: this.renderEditLogo
                },
                {
                  name: 'Airline Name',
                  prop: 'aName',
                  editable: true,
                  errorProp: 'aNameError',
                  type: 'text'
                },
                {
                  name: 'Owner Address',
                  prop: 'aOwner',
                  editable: true,
                  errorProp: 'aOwnerError',
                  type: 'text'
                }
              ]} />
          </Grid>
        </Grid>
      </div>
    );
  }
}

export default AdminPanel;