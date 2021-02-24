'use strict';
// ........................................................................... Modules
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const yelp = require('yelp-fusion')
const pg = require('pg')

// use packages
const app = express();
app.use(cors());
require('dotenv').config();

const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});
// const client = new pg.Client(process.env.DATABASE_URL)
// ..................................................................... app variables
const PORT = process.env.PORT;
// ............................................................................ routes
app.get('/location', handleLocation);
app.get('/weather', handleWeather)
app.get('/parks', handleParks)
app.get('/movies', handleMovies)
app.get('/yelp', handleYelp)
app.get('*', handle404)

//............................................................ handle requests functions
// ........... handle Location data request
function handleLocation(req, res) {
    const query = req.query.city;
    const selectQuery = `SELECT * FROM locations WHERE search_query = '${query}';`;

    client.query(selectQuery).then(data => {

        if (data.rows.length > 0) {
            const row = data.rows[0];
            let dbLocation = new CityObject(row.search_query, row.formatted_query, row.longitude, row.latitude)
            res.status(200).send(dbLocation)
        } else {
            locationRequest(query, res)
        }
    }).catch(error => { console.log(error) })
}

function locationRequest(query, res) {
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
                console.log('has been added to database', resObj)
                let safeValues = [resObj.search_query, resObj.formatted_query, resObj.longitude, resObj.latitude];
                client.query(queryDB, safeValues)
                    .then(data => console.log(data.rows[0]))
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
    const queryPark = {
        api_key: process.env.PARKS_API_KEY,
        q: req.query.search_query,
        format: 'json',
    }
    let url = 'https://developer.nps.gov/api/v1/parks';

    superagent.get(url).query(queryPark)
        .then(response => {
            let data = response.body.data;
            let parkObject = []

            data.map(element => {
                parkObject.push(
                    new Park(element.fullName,
                        Object.values(element.addresses[0]).join(' '),
                        element.entranceFees.cost,
                        element.description, element.url)
                )
            })
            res.status(200).send(parkObject)
        }).catch(error => {
            {
                console.log(error)
                res.status(500).send(error)
            }
        })
}

//.................................. handle yelp
function handleYelp(req, res) {

    const yelpClient = yelp.client(process.env.YELP_API_KEY)
    yelpClient.search({
        location: req.query.search_query,
        limit: 5
    }).then(response => {
        let yelpInstance = response.jsonBody.businesses;

        let yelp = yelpInstance.map(yelpInstance => {
            return new Yelp(yelpInstance.name, yelpInstance.image_url, yelpInstance.price, yelpInstance.rating, yelpInstance.url)
        })
        res.send(yelp)
    }).catch(err => console.log(err))
}
// .......................................................... handle movies
function handleMovies(req, res) {
    let url = `https://api.themoviedb.org/3/search/movie`;
    let movieKey = {
        api_key: process.env.MOVIE_API_KEY,
        query: req.query.search_query
    }

    superagent.get(url).query(movieKey)
        .then(data => {
            let movies = data.body.results
            // let title = data.title; average_votes, total_votes, image_url, popularity, released_on
            let returnMovies = movies.map(movie => {
                let myMovie = new Movie(movie.title, movie.overview, movie.average_votes, movie.total_votes, movie.image_url, movie.popularity, movie.released_on)
                return myMovie;
            })
            res.status(200).send(returnMovies)
        })
        .catch(err => console.log(err))
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

function Park(name, address, fee, description, url) {
    this.name = name;
    this.fee = fee;
    this.address = address
    this.description = description;
    this.url = url;
}

function Movie(title, overview, average_votes, total_votes, image_url, popularity, released_on) {
    this.title = title;
    this.overview = overview;
    this.average_votes = average_votes;
    this.total_votes = total_votes;
    this.image_url = image_url;
    this.popularity = popularity;
    this.released_on = released_on;
}

function Yelp(name, image_url, price, rating, url) {
    this.name = name;
    this.image_url = image_url;
    this.price = price;
    this.rating = rating;
    this.url = url
}


client.connect()
    .then(() =>
        app.listen(PORT, () => {
            console.log('app is listening on port ' + PORT);
        })
    ).catch(err => console.log(err))