import React from 'react';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';


function formatDate(timestamp) {
  const addZero = i => (i < 10 ? "0" + i : i);
  let d = new Date(timestamp * 1000);
  let day = addZero(d.getUTCDate());
  let month = addZero(d.getUTCMonth() + 1);
  let year = addZero(d.getUTCFullYear());
  let hours = addZero(d.getUTCHours());
  let minutes = addZero(d.getUTCMinutes());
  return day + '/' + month + '/' + year + ' ' + hours + ':' + minutes;
}

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


function Ticket(props) {
  const { ticket, formatETH } = props;

  return (
    <Grid container spacing={8}>
      <Grid item xs={3}>
        <div className="city">{ticket.tFrom}</div>
        <div className="datetime">{formatDate(ticket.tDeparture)}</div>
      </Grid>
      <Grid item xs={1}>
        <div className="arrow">&#8594;</div>
      </Grid>
      <Grid item xs={3}>
        <div className="city">{ticket.tTo}</div>
        <div className="datetime">{formatDate(ticket.tArrival)}</div>
      </Grid>
      <Grid item xs={3}>
        <div className="airline-and-price">
          <div>by <span className="airline">{ticket.airline.aName}</span></div>
          <div>for <span className="price">{formatETH(ticket.tPrice)}</span></div>
        </div>
      </Grid>
    </Grid >
  );
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