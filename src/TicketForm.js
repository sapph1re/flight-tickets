import React from 'react';
import Grid from '@material-ui/core/Grid';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';

/**
 * A form to create a new Ticket
 * @param onValidate - function to be called to validate the data before submitting
 * @param onSubmit - function to be called to submit the data
 */
class TicketForm extends React.Component {
  state = {
    // input data
    tFrom: '',
    tTo: '',
    tPrice: '',
    tQuantity: '',
    tDeparture: '',
    tArrival: '',
    // errors for the inputs
    tFromError: '',
    tToError: '',
    tPriceError: '',
    tQuantityError: '',
    tDepartureError: '',
    tArrivalError: '',
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
      tFromError: '',
      tToError: '',
      tPriceError: '',
      tQuantityError: '',
      tDepartureError: '',
      tArrivalError: '',
    });
    // Bring together the ticket data and cast it to proper formats
    let data = {
      tFrom: this.state.tFrom.trim(),
      tTo: this.state.tTo.trim(),
      tPrice: parseFloat(this.state.tPrice),
      tQuantity: parseInt(this.state.tQuantity, 10),
      tDeparture: parseInt(this.state.tDeparture, 10),
      tArrival: parseInt(this.state.tArrival, 10)
    };
    // Validate the data
    let errors = this.props.onValidate(data);
    if (Object.keys(errors).length > 0) {
      // Set errors if any
      this.setState(errors);
    } else {
      // Submit the data otherwise
      this.props.onSubmit(data);
      // And clear the form
      this.setState({
        tFrom: '',
        tTo: '',
        tPrice: '',
        tQuantity: '',
        tDeparture: '',
        tArrival: '',
      });
    }
  };

  render() {
    return (
      <form onSubmit={e => this.onSubmit(e)}>
        <h3 style={{marginTop: 10, marginLeft: 5, marginBottom: 5}}>Add Ticket</h3>
        <Grid container spacing={24}>
          <Grid item xs={6}>
            <TextField
              name="tFrom"
              placeholder="From City"
              label="From"
              fullWidth={true}
              value={this.state.tFrom}
              onChange={e => this.change(e)}
              helperText={this.state.tFromError}
              error={this.state.tFromError.length > 0}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              name="tTo"
              placeholder="To City"
              label="To"
              fullWidth={true}
              value={this.state.tTo}
              onChange={e => this.change(e)}
              helperText={this.state.tToError}
              error={this.state.tToError.length > 0}
            />
          </Grid>
        </Grid>
        <Grid container spacing={24}>
          <Grid item xs={6}>
            <TextField
              name="tPrice"
              placeholder="Ticket Price in ETH"
              label="Price, ETH"
              fullWidth={true}
              value={this.state.tPrice}
              onChange={e => this.change(e)}
              helperText={this.state.tPriceError}
              error={this.state.tPriceError.length > 0}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              name="tQuantity"
              placeholder="Number Of Seats Available"
              label="Quantity"
              fullWidth={true}
              value={this.state.tQuantity}
              onChange={e => this.change(e)}
              helperText={this.state.tQuantityError}
              error={this.state.tQuantityError.length > 0}
            />
          </Grid>
        </Grid>
        <Grid container spacing={24}>
          <Grid item xs={6}>
            <TextField
              name="tDeparture"
              placeholder="Departure Timestamp"
              label="Departure"
              fullWidth={true}
              value={this.state.tDeparture}
              onChange={e => this.change(e)}
              helperText={this.state.tDepartureError}
              error={this.state.tDepartureError.length > 0}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              name="tArrival"
              placeholder="Arrival Timestamp"
              label="Arrival"
              fullWidth={true}
              value={this.state.tArrival}
              onChange={e => this.change(e)}
              helperText={this.state.tArrivalError}
              error={this.state.tArrivalError.length > 0}
            />
          </Grid>
        </Grid>
        <Grid container spacing={24}>
          <Grid item xs={12}>
            <Button type="submit" variant="contained" color="primary" fullWidth>
              Add Ticket
            </Button>
          </Grid>
        </Grid>
      </form>
    );
  }
}

export default TicketForm;
