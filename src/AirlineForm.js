import React from 'react';
import Grid from '@material-ui/core/Grid';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';

/**
 * A form to create a new Airline
 * @param onValidate - function to be called to validate the data before submitting
 * @param onSubmit - function to be called to submit the data
 */
class AirlineForm extends React.Component {
  state = {
    // input data
    aName: '',
    aOwner: '',
    // errors for the inputs
    aNameError: '',
    aOwnerError: ''
  };

  /** Update the data in the state whenever an input value is changed */
  change = e => {
    this.setState({
      [e.target.name]: e.target.value
    });
  };

  /** Submit the data */
  onSubmit = e => {
    e.preventDefault();
    // Clear the errors first
    this.setState({
      aNameError: '',
      aOwnerError: ''
    });
    // Extract the data and remove unnecessary spaces on the sides, if any
    let data = {
      aName: this.state.aName.trim(),
      aOwner: this.state.aOwner.trim()
    };
    // Validate the data
    this.props.onValidate(data).then(errors => {
      if (Object.keys(errors).length > 0) {
        // Set errors if any
        this.setState(errors);
      } else {
        // Submit the data otherwise
        this.props.onSubmit(data);
        // And clear the form
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

export default AirlineForm;
