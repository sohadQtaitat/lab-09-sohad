'use strict';
const superagent = require('superagent');
const client = require('./client.js');
let cache = {};
const location ={};

//  get data from data base if it found else take from API /////
location.getLocationData = function (city) {
    let SQL ='SELECT * FROM location WHERE search_query = $1';
    let values = [city];
    return client.query(SQL , values)
    .then( results => {
        if(results.rowCount) { return results.rows[0];}
        else{
            const url= `https://maps.googleapis.com/maps/api/geocode/json?address=${city}&key=${process.env.GEOCODE_API_KEY}`;
            return superagent.get(url)
            .then(data => cacheLocation(city , data.body));
        }
    });
};
// //// INSERT THE DATA FROM API TO DATABASE //////
function cacheLocation(city , data){
    const location = new Location(data.results[0]);
    let SQL ='INSERT INTO location (search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4) RETURNING *';
    let values = [city , location.formatted_query , location.latitude , location.longitude];
    return client.query(SQL, values )
    .then(results => {
        const savedLocation = results.rows[0];
        cache[city] = savedLocation;
        return savedLocation;
      });
  }
//   CONSTACTOR FUNCTION OF LOCATION 
  function Location(data) {
    this.formatted_query = data.formatted_address;
    this.latitude = data.geometry.location.lat;
    this.longitude = data.geometry.location.lng;
  }
module.exports=location ;