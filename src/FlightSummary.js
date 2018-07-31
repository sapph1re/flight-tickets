import React from 'react';
import Ticket from './Ticket';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';


function formatDuration(seconds) {
  let hours = Math.floor(seconds / 3600);
  let remainder = seconds % 3600;
  let minutes = Math.floor(remainder / 60);
  let str = hours + 'h';
  if (minutes > 0) {
    str += ' ' + minutes + 'min';
  }
  return str;
}


function Layover(props) {
  const { ticket1, ticket2 } = props;

  let layover = formatDuration(ticket2.tDeparture - ticket1.tArrival);
  return (
    <div className="layover">Layover in {ticket1.tTo} for {layover}</div>
  );
}


function Flight(props) {
  const { flight, formatETH, onClickBook } = props;

  let duration = formatDuration(flight.tickets[flight.tickets.length - 1].tArrival - flight.tickets[0].tDeparture);
  return (
    <Grid container spacing={16}>
      <Grid item xs={2}>
        <div className="stops">{flight.stops === 0 ? 'Direct flight' : 'Stops: ' + flight.stops}</div>
        <div className="duration">Duration: {duration}</div>
      </Grid>
      <Grid item xs={8}>
        {flight.tickets.map((ticket, j) => (
          <div key={`srt-${j}`}>
            {j > 0 ? (
              <Grid container spacing={8}>
                <Grid item xs={6}>
                  <Layover ticket1={flight.tickets[j - 1]} ticket2={ticket} />
                </Grid>
              </Grid>
            ) : ''}
            <Ticket ticket={ticket} formatETH={formatETH} />
          </div>
        ))}
      </Grid>
      <Grid item xs={2}>
        <div className="total">
          Total: <span className="price">{formatETH(flight.priceTotal)}</span>
        </div>
        {onClickBook !== null ? (
          <Button
            variant="contained"
            color="primary"
            className="book-button"
            onClick={onClickBook}
          >
            Book
          </Button>
        ) : ''}
      </Grid>
    </Grid>
  );
}

export default Flight;