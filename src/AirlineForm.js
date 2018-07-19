import React from 'react';
import Grid from '@material-ui/core/Grid';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import getWeb3 from './utils/getWeb3';

export default class AirlineForm extends React.Component {
  state = {
    aName: '',
    aNameError: '',
    aOwner: '',
    aOwnerError: '',
    web3: null
  };

  componentWillMount() {
    getWeb3
      .then(results => {
        this.setState({
          web3: results.web3
        });
      })
      .catch(() => {
        console.log('Error finding web3.')
      });
  }

  change = e => {
    this.setState({
      [e.target.name]: e.target.value
    });
  };

  onSubmit = e => {
    e.preventDefault();
    // clear errors
    this.setState({
      aNameError: '',
      aOwnerError: ''
    });
    let data = {
      aName: this.state.aName.trim(),  // remove unnecessary spaces on the sides, if any
      aOwner: this.state.aOwner
    };
    this.props.onValidate(data).then(errors => {
      if (Object.keys(errors).length > 0) {
        // set errors if any
        this.setState(errors);
      } else {
        // submit data otherwise
        this.props.onSubmit(data);
        // and clear form
        this.setState({
          aName: '',
          aOwner: ''
        });
      }
    });
  };

  render() {
    return (
      <form>
        <Grid container spacing={24}>
          <Grid item xs={4}>
            <TextField
              name="aName"
              placeholder="Airline Name"
              label="Airline Name"
              fullWidth={true}
              value={this.state.aName}
              onChange={e => this.change(e)}
              helperText={this.state.aNameError}
              error={this.state.aNameError.length > 0}
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              name="aOwner"
              placeholder="Airline Owner Address"
              label="Airline Owner"
              fullWidth={true}
              value={this.state.aOwner}
              onChange={e => this.change(e)}
              helperText={this.state.aOwnerError}
              error={this.state.aOwnerError.length > 0}
            />
          </Grid>
          <Grid item xs={2}>
            <Button variant="contained" color="primary" onClick={e => this.onSubmit(e)}>
              Add
            </Button>
          </Grid>
        </Grid>
      </form>
    );
  }
}
