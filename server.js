'use strict';
// ........................................................................... Modules
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');

const pg = require('pg')

// use packages
const app = express();
app.use(cors());
require('dotenv').config();

const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// ..................................................................... app variables
const PORT = process.env.PORT;
// ............................................................................ routes
app.get('/location', handleLocation);
app.get('/weather', handleWeather)
app.get('/parks', handleParks)
app.get('*', handle404)

//............................................................ handle requests functions
// ........... handle Location data request
function handleLocation(req, res) {
    const query = req.query.city;
    let url = `https://eu1.locationiq.com/v1/search.php?`
    const resKeys = {
        key: process.env.GEOCODE_API_KEY,
        q: query,
        format: 'json',
        limit: 1
    }

    try {
        superagent.get(url).query(resKeys)
            .then(data => {
                // data received
                const lon = data.body[0].lon;
                const lat = data.body[0].lat;
                const display = data.body[0].display_name;

                const resObj = new CityObject(query, display, lon, lat);
                const queryDB = `INSERT INTO locations (search_query, formatted_query, latitude, longitude) VALUES($1,$2,$3,$4) RETURNING *`

                let safeValues = [resObj.search_query, resObj.formatted_query, resObj.longitude, resObj.latitude];
                client.query(queryDB, safeValues)
                    .then(data => console.log(data.rows))
                    .catch(error => console.log(error))

                return res.status(200).send(resObj);

            }).catch(error => {
                console.log('error eccourred while requesting data : ' + error)
            })
    } catch (error) {
        return res.status(500).send('error occured please try again later : ' + error);
    }
}

// ........................weather data request
function handleWeather(req, res) {
    const url = `http://api.weatherbit.io/v2.0/forecast/daily`;
    const weatherQuery = {
        key: process.env.WEATHER_API_KEY,
        city: req.query.search_query,
    }

    superagent.get(url).query(weatherQuery)
        .then(response => {
            let data = response.body.data;

            let weatherObjects = data.map(day => {
                var dayInfo = new Weather(day.weather.description, formateDate(day.datetime))
                return dayInfo;
            })
            res.status(200).send(weatherObjects)
        }).catch(err => {
            res.status(500).send(err)
        })
}
// .................... handle 404 page
function handle404(req, res) {
    res.status(404).send('<h1> INVALID URL, PAGE NOT FOUND 404</h1>')
}

// ......................handleParks
function handleParks(req, res) {
    let parkKeys = {
        key: process.env.PARKS_API_KEY,
        q: req.query.search_query
    }
    superagent.get(`https://developer.nps.gov/api/v1/parks?parkCode=acad&`)
        .then(data => {
            console.log(data)
            res.status(200).send(data)
        }).catch(error => {
            res.status(500).send(error)
        })
}

//............................................................................... functions

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

// ........................................................................... data model
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



client.connect()
    .then(() =>
        app.listen(PORT, () => {
            console.log('app is listening on port ' + PORT);
        })
    ).catch(err => console.log(err))