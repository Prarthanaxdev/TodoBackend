const express = require('express')
const redis = require('redis')
const bodyParser = require('body-parser');
const db = require('./config/firestore');

const app = express()
const firestore = db.firestore()
const PORT = 5000;
const REDIS_PORT = 6379;

const client = redis.createClient(REDIS_PORT);

client.on("connect", function (error) {
    console.log("REDIS CONNECTION ESTABLISHED")
})

client.on('error', function(err) {
    console.log('Redis error: ' + err);
});

app.use(bodyParser.json());

app.use((req, res, next) => {
    res.append('Access-Control-Allow-Origin', ['*']);
    res.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.append('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

app.post('/addUser', function (req, res) {
    let body = req.body
    let id = body.uid
    client.set("uid", id)
})

/* Fetches the data from firestore and store it in the cache */
app.post('/setData', function (req, res) {
    let body = req.body

    let name = ''
    firestore.collection("todos").where('userId', '==', body.uid).onSnapshot(function (querySnapshot) {
        querySnapshot.docs.map((doc, i) => {
            let id = doc.id
            let title = doc.data().title
            let uid = doc.data().userId

            name = 'todo-' + i
            client.hmset(name, "id", id, "name", title, "uid", uid,"subtodos",JSON.stringify([]))
        })

        querySnapshot.docs.map((doc) => {
            let j = 0
            firestore.collection("subTodos").where('todoId', '==', doc.id).onSnapshot(function (querySnapshot) {
                querySnapshot.docs.map((doc1, i) => {
                    let todoId = doc1.data().todoId
                    let subTodoId = doc1.id
                    let subTodo = doc1.data().todo

                    client.keys("*", function (err, keys) {
                        if (err) {
                            return callback(err);
                        }

                        var len = keys.length

                        for (var i = 0; i < len; i++) {
                            let name = keys[i]

                            client.hgetall(keys[i], function (err, object) {
                                let subTodo = {}
                                if (object.id == todoId) {
                                    let obj = {
                                        id: doc1.id,
                                        name: doc1.data().todo,
                                        new: "No",
                                        deleted: 'No',
                                        updated: 'No',
                                        sub: 0,
                                        subtodos: []
                                    }

                                    client.hmset(name, 'totalSub', j, "subtodo" + j, JSON.stringify(obj))
                                    j++;
                                }
                            });
                        }
                    });
                })

            })
        })
    })

    res.send("DATA SAVED")
})

/* Fetches the data from cache */
app.get('/getData/:id', function (req, res) {
    var arr = []
    client.keys("*", function (err, keys) {
        if (err) {
            return callback(err);
        }

        for (var i = 0, len = keys.length; i < len; i++) {
            client.hgetall(keys[i], function (err, object) {
                let obj = {
                    id: object.id,
                    name: object.name,
                    subtodos: JSON.parse(object.subtodos),
                }

                arr.push(obj)
            });
        }

        setTimeout(() => {
            res.send(arr)
        }, 1000);
    });
})

app.post('/addNewTodo', function (req, res) {
    let body = req.body

    client.keys("*", function (err, keys) {
        if (err) {
            return callback(err);
        }

        let name = 'todo-' + keys.length

        client.hmset(name, "name", body.title, "new", "yes", "id", keys.length, "uid", body.userId,"subtodos",JSON.stringify([]))
    });

    res.send("DATA SAVED")
})

app.post('/addNewSubTodo', function (req, res) {
    let body = req.body

    client.keys("*", function (err, keys) {
        if (err) {
            return callback(err);
        }

        for(let i=0;i<body.data.length;i++){
            let name = 'todo-' + i
            
            client.hmset(name, "id",body.data[i].id, "name", body.data[i].name,"subtodos",JSON.stringify(body.data[i].subtodos) )
        }
    });

    res.send("DATA SAVED")
})

app.post('/updateTodo', function (req, res) {
    let body = req.body

    client.keys("*", function (err, keys) {
        if (err) {
            return callback(err);
        }

        for(let i=0;i<body.data.length;i++){
            let name = 'todo-' + i

            client.hmset(name, "id",body.data[i].id, "name", body.data[i].name,"subtodos",JSON.stringify(body.data[i].subtodos) )
        }
    });
    res.send("DATA SAVED")
})

app.post('/deleteTodo', function (req, res) {
    let body = req.body

    client.keys("*", function (err, keys) {
        if (err) {
            return callback(err);
        }

        for (var i = 0, len = keys.length; i < len; i++) {
            keys.map((ob, i) => {
                client.hgetall(ob, function (err, object) {
                    if (object.id == body.id) {
                        if (object.id.toString().length > 1) {
                            client.hmset(keys[i], "deleted", "true")
                        } else {
                            client.hdel(keys[i], "name", "subtodos", "id","new","uid")
                        }
                    }
                });
            })
        }
    });

    res.send("DELETED")
})

app.listen(5000, () => {
    console.log(`App listening on port ${PORT}`)
})

