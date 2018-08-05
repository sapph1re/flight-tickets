import React from 'react';
import Grid from '@material-ui/core/Grid';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Card from '@material-ui/core/Card';
import CardActions from '@material-ui/core/CardActions';
import CardMedia from '@material-ui/core/CardMedia';
import CircularProgress from '@material-ui/core/CircularProgress';
import grey from '@material-ui/core/colors/grey';

const defaultLogoHash = 'QmZ9Nbn5Bfcf28p5Mn9Aobw2hvkW4ANxJJDBZdh5kUyQPm';
const ipfsGatewayPrefix = 'https://ipfs.io/ipfs/';

/**
 * A form to create a new Airline
 * @param onValidate - function to be called to validate the data before submitting
 * @param onSubmit - function to be called to submit the data
 */
class AirlineForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      // input data
      aName: '',
      aOwner: '',
      aLogoHash: defaultLogoHash,
      // errors for the inputs
      aNameError: '',
      aOwnerError: '',
      // flag when uploading to IPFS
      isUploading: false
    };
    this.airlineLogoInput = React.createRef();
  }

  /** Update the data in the state whenever an input value is changed */
  change = e => {
    this.setState({
      [e.target.name]: e.target.value
    });
  };

  captureFile = (e) => {
    e.stopPropagation();
    e.preventDefault();
    this.setState({ isUploading: true });
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
        this.setState({
          aLogoHash: fileHash,
          isUploading: false
        });
      }).catch(err => {
        console.log('Failed to upload the logo to IPFS: ', err);
      })
    };
  };

  removeLogo = () => {
    this.setState({
      aLogoHash: defaultLogoHash,
      isUploading: false
    });
  }

  /** Submit the data */
  onSubmit = e => {
    e.preventDefault();
    // Clear the errors first
    this.setState({
      aNameError: '',
      aOwnerError: ''
    });
    // Extract and format the data
    let data = {
      aLogo: this.state.aLogoHash,
      aName: this.state.aName.trim(),
      aOwner: this.state.aOwner.trim()
    };
    // Validate the data
    this.props.onValidate(data).then(errors => {
      if (Object.keys(errors).length > 0) {
        // Set errors if any
        this.setState(errors);
      } else {
        // Submit the data
        this.props.onSubmit(data);
        // And clear the form
        this.setState({
          aName: '',
          aOwner: '',
          aLogoHash: defaultLogoHash
        });
      }
    });
  };

  render() {
    return (
      <form onSubmit={e => this.onSubmit(e)}>
        <Grid container spacing={24}>
          <Grid item xs={3}>
            <input
              id="airline-logo-input"
              ref={this.airlineLogoInput}
              type="file"
              onChange={this.captureFile}
            />
            <Card className="airline-logo-card">
              {this.state.isUploading ? (
                <CircularProgress size={50} style={{ color: grey[200] }} className="airline-logo-loader" />
              ) : null}
              <CardMedia
                className="airline-logo-form-image"
                image={ipfsGatewayPrefix+this.state.aLogoHash}
                title="Airline Logo"
              />
              <CardActions className="airline-logo-actions">
                <Button
                  size="small"
                  color="primary"
                  onClick={() => this.airlineLogoInput.current.click()}
                  className="airline-logo-button"
                >
                  Upload Logo
                </Button>
                <Button
                  size="small"
                  color="primary"
                  className="airline-logo-button"
                  onClick={this.removeLogo}
                >
                  Remove Logo
                </Button>
              </CardActions>
            </Card>
          </Grid>
          <Grid item xs={3}>
            <TextField
              name="aName"
              placeholder="Airline Name"
              label="Airline Name"
              fullWidth={true}
              value={this.state.aName}
              onChange={this.change}
              helperText={this.state.aNameError}
              error={this.state.aNameError.length > 0}
            />
          </Grid>
          <Grid item xs={3}>
            <TextField
              name="aOwner"
              placeholder="Airline Owner Address"
              label="Airline Owner"
              fullWidth={true}
              value={this.state.aOwner}
              onChange={this.change}
              helperText={this.state.aOwnerError}
              error={this.state.aOwnerError.length > 0}
            />
          </Grid>
          <Grid item xs={2}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={this.state.isUploading}
              style={{ marginTop: 7 }}
            >
              Add
            </Button>
          </Grid>
        </Grid>
      </form>
    );
  }
}

export default AirlineForm;
