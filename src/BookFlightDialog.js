import React from 'react';
import FlightSummary from './FlightSummary';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import CircularProgress from '@material-ui/core/CircularProgress';
import grey from '@material-ui/core/colors/grey';


/**
 * Displays a modal window to buy a ticket. Asks to enter passenger details
 * and submits the data back to the parent via callback.
 * @param isOpen - a bool flag whether the modal is open right now or not
 * @param onClose - a callback to close the modal
 * @param onSubmit - a callback to submit the data, which is expected to call the callback on completion
 */
class BookFlightDialog extends React.Component {

  state = {
    firstName: '',
    lastName: '',
    firstNameError: '',
    lastNameError: '',
    isProcessing: false
  }

  /** Update the data in the state whenever an input value is changed */
  change = e => {
    this.setState({
      [e.target.name]: e.target.value
    });
  };

  submit = e => {
    e.preventDefault();
    this.setState({
      firstNameError: '',
      lastNameError: ''
    });
    let data = {
      flight: this.props.flight,
      firstName: this.state.firstName.trim(),
      lastName: this.state.lastName.trim()
    }
    this.setState({
      firstName: data.firstName,
      lastName: data.lastName
    });
    // Validate
    let errors = {};
    if (data.firstName.length === 0) {
      errors.firstNameError = 'Please enter passenger\'s first name';
    }
    if (data.lastName.length === 0) {
      errors.lastNameError = 'Please enter passenger\'s last name';
    }
    if (Object.keys(errors).length > 0) {
      // Display errors if any
      this.setState(errors);
    } else {
      // Submit the data otherwise and display a loader
      this.setState({ isProcessing: true });
      this.props.onSubmit(data, () => {
        // When the processing is done, remove the loader and clear the form
        this.setState({
          isProcessing: false,
          firstName: '',
          lastName: ''
        });
      }, () => {
        // When error occured, just remove the loader
        this.setState({
          isProcessing: false
        });
      });
    }
  }

  render() {
    const { isOpen, onClose, flight, formatETH } = this.props;

    return (
      <form>
        <Dialog
          open={isOpen}
          onClose={onClose}
          fullWidth
          maxWidth='lg'
        >
          <DialogTitle>Book Your Flight</DialogTitle>
          <DialogContent>
            <FlightSummary
              flight={flight}
              formatETH={formatETH}
              onClickBook={null}
            />
            <div className="booking-passenger-details">
              <p>Please enter passenger details:</p>
              <div>
                <TextField
                  name="firstName"
                  placeholder="First name"
                  label="First name"
                  value={this.state.firstName}
                  onChange={e => this.change(e)}
                  helperText={this.state.firstNameError}
                  error={this.state.firstNameError.length > 0}
                  className="booking-details-field"
                />
              </div>
              <div>
                <TextField
                  name="lastName"
                  placeholder="Last name"
                  label="Last name"
                  value={this.state.lastName}
                  onChange={e => this.change(e)}
                  helperText={this.state.lastNameError}
                  error={this.state.lastNameError.length > 0}
                  className="booking-details-field"
                />
              </div>
            </div>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} color="primary">
              Cancel
            </Button>
            <Button type="submit" variant="contained" onClick={this.submit} color="primary" className="buy-now-button">
              {this.state.isProcessing ? (
                <CircularProgress size={20} style={{ color: grey[200] }} />
              ) : 'Buy Now'}
            </Button>
          </DialogActions>
        </Dialog>
      </form>
    );
  }

}

export default BookFlightDialog;