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
    const url = `https://eu1.locationiq.com/v1/search.php?`
    const resKeys = {
        key: process.env.GEOCODE_API_KEY,
        q: query,
        format: 'json',
        limit: 1
    }

    try {
        superagent.get(url).query(resKeys)
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
// ........................weather data request 
function handleWeather(req, res) {
    const weatherQuery = {
        city: req.query.search_query,
        key: process.env.WEATHER_API_KEY

    }

    superagent.get(`http://api.weatherbit.io/v2.0/forecast/daily`).query(weatherQuery)
        .then(response => {
            const data = response.body.data

            let weatherObjects = data.map(day => {
                let time = formateDate(day.datetime)
                var dayInfo = new Weather(day.weather.description, time)
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
    this.longitude = lon;
    this.latitude = lat;

}

function Weather(forecast, time) {
    this.forecast = forecast;
    this.time = time;
}

app.listen(PORT, () => {
    console.log('app is listening on port ' + PORT);
})