import React from 'react';
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

export default Ticket;
