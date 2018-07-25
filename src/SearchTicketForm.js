import React from 'react';
import Grid from '@material-ui/core/Grid';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';

/**
 * A form to search tickets
 * @param onValidate - function to be called to validate the data before submitting
 * @param onSubmit - function to be called to submit the data
 */
class SearchTicketForm extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      // input data
      sFrom: '',
      sTo: '',
      // errors
      sFromError: '',
      sToError: ''
    }
  }

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
      sFromError: '',
      sToError: ''
    });
    // Extract the data and remove unnecessary spaces on the sides, if any
    let data = {
      sFrom: this.state.sFrom.trim(),
      sTo: this.state.sTo.trim()
    };
    this.setState(data);
    // Validate the data
    let errors = this.props.onValidate(data);
    if (Object.keys(errors).length > 0) {
      // Set errors if any
      this.setState(errors);
    } else {
      // Submit the data otherwise
      this.props.onSubmit(data);
    }
  };

  render() {
    return (
      <form onSubmit={e => this.onSubmit(e)}>
        <Grid container spacing={24}>
          <Grid item xs={5}>
            <TextField
              name="sFrom"
              placeholder="From City"
              label="From"
              fullWidth={true}
              value={this.state.sFrom}
              onChange={e => this.change(e)}
              helperText={this.state.sFromError}
              error={this.state.sFromError.length > 0}
            />
          </Grid>
          <Grid item xs={5}>
            <TextField
              name="sTo"
              placeholder="To City"
              label="To"
              fullWidth={true}
              value={this.state.sTo}
              onChange={e => this.change(e)}
              helperText={this.state.sToError}
              error={this.state.sToError.length > 0}
            />
          </Grid>
          <Grid item xs={2}>
            <Button type="submit" variant="contained" color="primary" style={{marginTop: 7}}>
              Search!
            </Button>
          </Grid>
        </Grid>
      </form>
    );
  }
}

export default SearchTicketForm;