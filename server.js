'use strict';
const express = require('express');
const app = express();

const cors = require('cors');
app.use(cors());

require('dotenv').config();
const PORT = process.env.PORT;

// routes
app.get('/location', handleLocation);
app.get('/weather', handleWeather)

// handle requests functions
function handleLocation(req, res) {
    const query = req.query.city;
    const result = locationLonLat(query);
    res.status(200).send(result);
}

function handleWeather(req, res) {
    let result = handleWeatherResponse()
    res.status(200).send(result)
}
// functions
const locationLonLat = (query) => {
    const location = require('./data/location.json');
    const lon = location[0].lon;
    const lat = location[0].lat;
    const display = location[0].display_name;
    const resObj = new CityObject(query, display, lon, lat);
    return resObj;
}

function handleWeatherResponse() {
    const cityWeather = require('./data/weather.json').data;
    let arrayOfWeather = [];
    cityWeather.forEach(city => {
        const time = city.datetime;
        const forecast = city.weather.description;
        arrayOfWeather.push(new CityWeather(forecast, formateDate(time)))
    })
    return arrayOfWeather;  // possible error
}

function formateDate(time) {
    let date = new Date(time)
    let newFormat;
    const options = {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }
    newFormat = date.toLocaleString('en-US', options);
    return newFormat;
}
// data model
function CityObject(query, display, lon, lat) {
    this.search_query = query;
    this.formatted_query = display;
    this.latitude = lat;
    this.longitude = lon;
}

function CityWeather(forecast, time) {
    this.forecast = forecast;
    this.time = time;
}
app.listen(PORT, () => {
    console.log('app is listening on port ' + PORT);
})