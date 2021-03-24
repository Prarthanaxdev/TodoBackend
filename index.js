const express = require('express')
const redis = require('redis')
const bodyParser = require('body-parser');

const app = express()
const PORT = 5000;

app.use(bodyParser.json());

app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, access-control-allow-origin,x-access-token");
    res.header('Access-Control-Request-Method', 'GET,HEAD,OPTIONS,POST,PUT');
    res.header('Access-Control-Allow-Credentials', true);
    if ('OPTIONS' === req.method) {
        res.send(200);
    } else {
        next();
    }
});

const routes = require('./routes/index');

app.post('/setData', routes.todos);
app.post('/addNewTodo', routes.todos);
app.post('/addNewSubTodo', routes.todos);
app.post('/updateTodo', routes.todos);
app.post('/deleteTodo', routes.todos);
app.post('/removeSession', routes.todos);

app.get('/getData/:id', routes.todos);

module.exports = app;

app.listen(5000, () => {
    console.log(`App listening on port ${PORT}`)
})

module.exports = app;