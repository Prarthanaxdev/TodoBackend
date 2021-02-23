const express = require('express')
const app = express()
const redis = require('redis')
var bodyParser = require('body-parser');

const PORT = 5000;
const REDIS_PORT = 6379;

const client = redis.createClient(REDIS_PORT);

client.on("connect", function(error){
    console.log("REDIS CONNECTION ESTABLISHED")
})

app.use( bodyParser.json());

app.use((req, res, next) => {
    res.append('Access-Control-Allow-Origin', ['*']);
    res.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.append('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

app.post('/addUser', function (req, res) {
    let body = req.body
    let id = body.uid
    client.set("uid",id)
})

app.post('/setData', function (req, res) {
    let body = req.body

    body.todoObj.map((ob,i)=>{
        let id = ob.id
        let title= ob.title
        let uid = ob.uid

        let name='todo'+i
        client.hmset(name,"id",id,"title",title, "uid",uid)
    })
})


app.post('/deleteTodo', function (req, res) {
    let body = req.body

    client.keys("*", function(err, keys) {
        if (err) {
          return callback(err);
        }

        for(var i = 0, len = keys.length; i < len; i++) {
            let id = body.id.toString().length
            
            if(id > 1){
                keys.map((ob,i)=>{
                    console.log(ob)
                    client.hgetall(ob, function(err, object) {
                        if(object.id == body.id){
                            client.hdel(ob,id, "title","uid",redis.print )
                        }
                    });
                })
            }
            else {
                console.log("HERE")
            }
        }
    }); 
    // client.hdel()
})

app.post('/addNewTodo', function (req, res) {
    let body = req.body

    client.keys("*", function(err, keys) {
        if (err) {
          return callback(err);
        }

        let name='todo'+keys.length
        client.hmset(name,"title",body.title, "uid",body.userId,redis.print)
    }); 
})

app.get('/getData/:id', function (req, res) {
    var arr=[]

    client.keys("*", function(err, keys) {
        if (err) {
          return callback(err);
        }
        for(var i = 0, len = keys.length; i < len; i++) {
            client.hgetall(keys[i], function(err, object) {
                arr.push(object)
            });
        }
        setTimeout(() => {
            res.send(arr)
        }, 1000);
    }); 
})

app.post('/removeSession', function(req,res){
    client.flushall( function (err, succeeded) {
        console.log("MESSGAE",succeeded); // will be true if successfull
    });
})

app.listen(5000, () => {
    console.log(`App listening on port ${PORT}`)
})
