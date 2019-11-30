


'use strict';

require('dotenv').config();

////////////////////////////////// Application Dependencies/////////////////////////////////////////
const express = require('express');
const superagent = require('superagent');
const pg = require('pg');
const cors = require('cors');


///////////////////////////////// Application Setup//////////////////////////////////////////////////
const app = express();
app.use(cors());
const PORT = process.env.PORT || 3000;

 ////////////////////////////////// Database Setup////////////////////////////////////////////////////



app.use(cors());
require('dotenv').config();
const PORT = process.env.PORT || 3000;

const client = new pg.Client(process.env.DATABASE_URL);
client.connect();






app.use(express.static('./'));

app.get('/', (request, response) => {
  response.status(200).send('Connected!');
});

app.get('/location', queryLocation);

app.get('/weather', weatherApp);

app.get('/events', eventsApp);

app.get('/movies', moviesApp);

app.get('/yelp', yelpApp);

app.get('/trails', trailsApp);





//////////////////////////////////// link pages  togther ////////////////////////////////////////////////////////

// const client = require('./modules/client.js');

// const events = require('./modules/events.js');

// const location = require('./modules/location.js');

// const movies = require('./modules/movie.js');

// const weather = require('./modules/weather.js');

// const yelp = require('./modules/yelp.js');

//////////////////////////////////// API ROUTES///////////////////////////////////////////////////////

app.get('/location', queryLocation);

app.get('/weather', weatherApp);

app.get('/events', eventsApp);

app.get('/movies', moviesApp);

app.get('/yelp', yelpApp);

app.get('/trails', trailsApp);


function locationApp(request, response) {
  const googleMapsUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${request.query.data}&key=${process.env.GEOCODE_API_KEY}`;
  return superagent.get(googleMapsUrl)
    .then(result => {
      const location = new Location(request, result);
      let insertSQL = 'INSERT INTO locations ( search_query, formatted_query, latitude, longitude, created_at ) VALUES ( $1, $2, $3, $4, $5);';
      let insertParams = [location.search_query, location.formatted_query, location.latitude, location.longitude, location.created_at];
      client.query(insertSQL, insertParams);
      queryLocation(request, response);
    })
    .catch(error => handleError(error, response));
}





function queryLocation(request, response) {
  const sql = 'SELECT * FROM locations WHERE search_query = $1;';
  const params = [request.query.data];
  return client.query(sql, params)
    .then(result => {
      if (result.rowCount > 0) {
        response.send(result.rows[0]);
      } else {
        locationApp(request, response);
      }
    })
    .catch(error => handleError(error, response));
}

function queryTable(table, request, response) {
  const sql = `SELECT * FROM ${table.name} WHERE location_id = $1`;
  const values = [request.query.data.id];
  console.log(values);
  return client.query(sql, values)
    .then(result => {
      if (result.rowCount > 0) {
        table.cacheHit(result.rows);
      } else {
        table.cacheMiss(request, response);
      }
    })
    .catch(error => handleError(error, response));
}





////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////




function weatherApp(req, res) {
  const weather = new Options('weathers', 15, req, res);
  weather.cacheMiss = getWeatherAPI;
  queryTable(weather, req, res);
}

function eventsApp(req, res) {
  const events = new Options('events', 15, req, res);
  events.cacheMiss = getEventsAPI;
  queryTable(events, req, res);
}

function moviesApp(req, res) {
  const movies = new Options('movies', 15, req, res);
  movies.cacheMiss = getMoviesAPI;
  queryTable(movies, req, res);
}

function yelpApp(req, res) {
  const yelp = new Options('yelp', 15, req, res);
  yelp.cacheMiss = getYelpAPI;
  queryTable(yelp, req, res);
}


function getWeatherAPI(req, res) {
  const darkSkyUrl = `https://api.darksky.net/forecast/${process.env.WEATHER_API_KEY}/${req.query.data.latitude},${req.query.data.longitude}`;
  return superagent.get(darkSkyUrl)
    .then(result => {
      const weatherSummaries = result.body.daily.data.map(data => {
        const day = new Weather(data, req.query.data.search_query);
        const SQL = `INSERT INTO weathers (forecast, time, location_id, created_at) VALUES ($1, $2, $3, $4);`;
        const values = [data.summary, day.time, req.query.data.id, day.created_at];
        client.query(SQL, values);
        return day;
      });
      res.send(weatherSummaries);
    })
    .catch(error => handleError(error, res));
}

function getEventsAPI(req, res) {
  const eventBriteUrl = `https://www.eventbriteapi.com/v3/events/search/?location.within=10mi&location.latitude=${req.query.data.latitude}&location.longitude=${req.query.data.longitude}&token=${process.env.EVENTBRITE_API_KEY}`;
  return superagent.get(eventBriteUrl)
    .then(result => {
      const eventSummaries = result.body.events.map(event => {
        const eventItem = new Event(event, req.query.data.search_query);
        const SQL = `INSERT INTO events (link, name, event_date, summary, location_id, created_at) VALUES ($1, $2, $3, $4, $5, $6);`;
        const values = [eventItem.url, eventItem.name, eventItem.event_date, eventItem.summary, req.query.data.id, eventItem.created_at];
        client.query(SQL, values);
        return eventItem;
      });
      res.send(eventSummaries);
    })
    .catch(error => handleError(error, res));
}

function getMoviesAPI(req, res) {
  const movieDbUrl = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.MOVIE_API_KEY}&query=${req.query.data.search_query}&page=1&include_adult=false`;
  return superagent.get(movieDbUrl)
    .then(result => {
      const movies = result.body.results.map(movie => {
        const movieItem = new Movie(movie);
        const SQL = `INSERT INTO movies (title, overview, average_votes, total_votes, image_url, popularity, released_on, created_at, location_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`;
        const values = [movieItem.title, movieItem.overview, movieItem.average_votes, movieItem.total_votes, movieItem.image_url, movieItem.popularity, movieItem.released_on, movieItem.created_at, req.query.data.id];
        client.query(SQL, values);
        return movieItem;
      });
      res.send(movies);
    })
    .catch(error => handleError(error, res));
}

function getYelpAPI(req, res) {
  const yelpURL = `https://api.yelp.com/v3/businesses/search?location=${req.query.data.search_query}`;
  return superagent.get(yelpURL)
    .set('Authorization', `Bearer ${process.env.YELP_API_KEY}`)
    .then(result => {
      const yelps = result.body.businesses.map(yelp => {
        const yelpItem = new Yelp(yelp);
        const SQL = `INSERT INTO yelp (name, image_url, price, rating, url, created_at, location_id) VALUES ($1, $2, $3, $4, $5, $6, $7);`;
        const values = [yelpItem.name, yelpItem.image_url, yelpItem.price, yelpItem.rating, yelpItem.url, yelpItem.created_at, req.query.data.id];
        client.query(SQL, values);
        return yelpItem;
      });
      res.send(yelps);
    })
    .catch(error => handleError(error, res));
}

function handleError(err, res) {
  if (err) res.status(500).send('Internal 500 error!');
}




function Weather(day) {
  this.time = new Date(day.time * 1000).toDateString();
  this.forecast = day.summary;
  this.created_at = Date.now();
}

function Location(request, result) {
  this.search_query = request.query.data;
  this.formatted_query = result.body.results[0].formatted_address;
  this.latitude = result.body.results[0].geometry.location.lat;
  this.longitude = result.body.results[0].geometry.location.lng;
  this.created_at = Date.now();
}

function Event(data) {
  this.link = data.url;
  this.name = data.name.text;
  this.event_date = new Date(data.start.local).toDateString();
  this.summary = data.summary;
  this.created_at = Date.now();
}

function Movie(data) {
  this.title = data.title;
  this.overview = data.overview;
  this.average_votes = data.vote_average;
  this.total_votes = data.vote_count;
  this.image_url = `https://image.tmdb.org/t/p/w500${data.poster_path}`;
  this.popularity = data.popularity;
  this.released_on = data.release_date;
  this.created_at = Date.now();
}

function Yelp(data) {
  this.name = data.name;
  this.image_url = data.image_url;
  this.price = data.price;
  this.rating = data.rating;
  this.url = data.url;
  this.created_at = Date.now();
}


// /////////////////////////////////////////////////-----------Error------------/////////////////////////////Sohad/




// app.get('/foo',(request,response) =>{
//   throw new Error('ops');
// })

// app.use('*', (request, response) => {
//   response.status(404).send('Not Found')
// })


// app.get('/', (request,response)=>{
// response.status(200).send("Hi :)");
// });


// app.use((error,request,response) => {
//   response.status(500).send(error)
// })

// /////////////////////////////////////////////////-----------listening for requests------------/////////////////////////////Sohad/


// app.listen(PORT, () => console.log(`App is listening on ${PORT}`));

