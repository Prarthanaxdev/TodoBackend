const redis = require('redis')
const db = require('../config/firestore');

const firestore = db.firestore()
const REDIS_PORT = 6379;
const client = redis.createClient(REDIS_PORT);
const router = (require('express')).Router();

/* Fetches the data from firestore and store it in the cache */
router.post('/setData',(req, res)=> {
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
        res.send("DATA SAVED")
    })
})

/* Fetches the data from cache */
router.get('/getData/:id',(req, res)=> {
    var arr = []
    client.keys("*",(err, keys)=> {
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

router.post('/addNewTodo',(req, res)=> {
    let body = req.body

    client.keys("*",(err, keys)=> {
        if (err) {
            return callback(err);
        }

        let name = 'todo-' + keys.length
        client.hmset(name, "name", body.title, "new", "yes", "id", keys.length, "uid", body.userId,"subtodos",JSON.stringify([]))
    });

    res.send("DATA SAVED")
})

router.post('/addNewSubTodo',(req, res)=> {
    let body = req.body

    client.keys("*",(err, keys)=> {
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

router.post('/updateTodo',(req, res)=> {
    let body = req.body

    client.keys("*",(err, keys)=> {
        if (err) {
            return callback(err);
        }

        for(let i=0;i<body.data.length;i++){
            let name = 'todo-' + i
            client.hmset(name, "id",body.data[i].id, "name", body.data[i].name,"subtodos",JSON.stringify(body.data[i].subtodos) )
        }
        res.send("DATA SAVED")
    });
})

router.post('/deleteTodo',(req, res)=> {
    let body = req.body

    client.keys("*", (err, keys)=> {
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
        res.send("DELETED")
    });
})

/* Pushes the data from cache to firestore */
router.post('/removeSession', function (req, res) {
    client.keys("*", function (err, keys) {
        if (err) {
            return callback(err);
        }

        keys.map((ob, i) => {
            client.hgetall(keys[i], function (err, object) {
                firestore.collection("todos").add({
                    title: object.name,
                    userId: object.uid,
                    subtodos : object.subtodos
                })
            })
        })
    });

    setTimeout(() => {
        client.flushall(function (err, succeeded) {
            console.log("MESSAGE", succeeded);
        });
    }, 3000)
})

module.exports = router
