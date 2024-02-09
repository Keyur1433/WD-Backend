require('dotenv').config()

const express = require('express');
const app = express()
const port = 4000

app.get('/', (req, res) => {
    res.send('Hello')
})

app.get('/twitter', (req, res) => {
    res.send('Keyur Ajudiya')
})

// If page is showing that "Cannot GET /google", then terminate the server and then again start server.
app.get('/login', (req, res) => {
    res.send('<h1>Login in Google</h1>')
})

app.get('/youtube', (req, res) => {
    res.send('<h2>Login in Youtube</h2>')
})

app.listen(process.env.PORT, () => {
    console.log(`Example app listening on port ${port}`);
})