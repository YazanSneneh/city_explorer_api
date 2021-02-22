'use strict';
// ........................................................................... Modules
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
require('dotenv').config();

const app = express();
app.use(cors());
const PORT = process.env.PORT;

// ............................................................................ routes
app.get('/location', handleLocation);
app.get('/weather', handleWeather)
app.get('*', handle404)

//............................................................ handle requests functions
function handleLocation(req, res) {
    const query = req.query.city;
    console.log(query)
    locationLonLat(query, res);
}
// ........................weather data request
function handleWeather(req, res) {
    const weatherQuery = {
        key: process.env.WEATHER_API_KEY,
        lon: req.query.lan,
        lat: req.query.lat
    }

    superagent.get(`http://api.weatherbit.io/v2.0/forecast/daily`).query(weatherQuery)
        .then(response => {

            let weatherObjects = response.body.data.map(day => {
                var dayInfo = new Weather(day.weather.description, formateDate(day.datetime))
                return dayInfo;
            })

            res.status(200).send(weatherObjects)
        }).catch(err => {
            res.status(500).send(err)
        })
}
function handle404(req, res) {
    res.status(404).send('<h1> INVALID URL, PAGE NOT FOUND 404</h1>')
}
//........................................................................... functions
// handle location data request 
const locationLonLat = (query, res) => {
    const resKeys = {
        key: process.env.GEOCODE_API_KEY,
        q: query,
        format: 'json',
        limit: 5
    }
    try {
        superagent.get(`https://eu1.locationiq.com/v1/search.php?`).query(resKeys)
            .then(data => {
                const lon = data.body[0].lon;
                const lat = data.body[0].lat;
                const display = data.body[0].display_name;
                const resObj = new CityObject(query, display, lon, lat);
                return res.status(200).send(resObj);
            }).catch(err => {
                console.log(err)
            })
    } catch (error) {
        return res.status(500).send('error occured please try again later : ' + error);
    }
}
// handle weather data request 
function handleWeatherResponse(req, res) {

    // try {
    //     const cityWeather = require('./data/weather.json').data;
    //     // USING MAP
    //     let arrayOfWeather = cityWeather.map(city => {
    //         const time = city.datetime;
    //         const forecast = city.weather.description;
    //         return new CityWeather(forecast, formateDate(time));
    //     })
    //     return res.status(200).send(arrayOfWeather);

    // } catch (error) {
    //     return res.status(500).send('error occured please try again later : ' + error);
    // }
}
// convert string format
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

// ................................................................... data model
function CityObject(query, display, lon, lat) {
    this.search_query = query;
    this.formatted_query = display;
    this.latitude = lat;
    this.longitude = lon;
}

function Weather(forecast, time) {
    this.forecast = forecast;
    this.time = time;
}

app.listen(PORT, () => {
    console.log('app is listening on port ' + PORT);
})