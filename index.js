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

        let name='todo-'+i
        client.hmset(name,"id",id,"title",title, "uid",uid)
    })
    res.send("DATA SAVED")
})

app.post('/setSubtodo', function (req, res) {
    let body = req.body

    body.items.map((ob,i)=>{
        let todoId = ob.id
        let subTodoId = ob.subTodoId
        let subTodo = ob.subTodo

        let name='Subtodo-'+i

        client.hmset(name,"id",todoId,"subTodo",subTodo, "subTodoId",subTodoId)
    })

    res.send("DATA SAVED")
})

app.get('/getData/:id', function (req, res) {
    var arr=[]

    client.keys("*", function(err, keys) {
        if (err) {
          return callback(err);
        }

        for(var i = 0, len = keys.length; i < len; i++) {
            if(keys[i].split("-")[0] == "todo"){   
                client.hgetall(keys[i], function(err, object) {
                    arr.push(object)
                });
            }
        }

        setTimeout(() => {
            res.send(arr)
        }, 1000);
    }); 
})

app.get('/getSubtodos/:id', function (req, res) {
    var arr=[]

    client.keys("*", function(err, keys) {
        if (err) {
          return callback(err);
        }

        for(var i = 0, len = keys.length; i < len; i++) {
            if(keys[i].split("-")[0] == "Subtodo"){   
                client.hgetall(keys[i], function(err, object) {
                    if(object.id == req.params.id){
                        arr.push(object)
                    }
                });
            }
        }
        setTimeout(() => {
            res.send(arr)
        }, 1000);
    }); 
})

app.post('/addNewTodo', function (req, res) {
    let body = req.body

    client.keys("*", function(err, keys) {
        if (err) {
          return callback(err);
        }

        let name='todo-'+keys.length
        client.hmset(name,"title",body.title,"id", keys.length,"uid",body.userId,redis.print)
    }); 

    res.send("DATA SAVED")
})

app.post('/addNewSubTodo', function (req, res) {
    let body = req.body

    client.keys("*", function(err, keys) {
        if (err) {
          return callback(err);
        }

        let name='Subtodo-'+keys.length
        client.hmset(name,"subTodo",body.subTodo,"subTodoId",keys.length,"id",body.todoId,redis.print)
    }); 

    res.send("DATA SAVED")
})

app.post('/deleteTodo', function (req, res) {
    let body = req.body

    client.keys("*", function(err, keys) {
        if (err) {
          return callback(err);
        }

        for(var i = 0, len = keys.length; i < len; i++) {            
            keys.map((ob,i)=>{
                client.hgetall(ob, function(err, object) {
                    if(object.id == body.id){
                        client.hdel(keys[i], "title","uid","id",redis.print )
                    }
                });
            })
        }
    }); 
    res.send("DELETED")
})

app.post('/updateTodo', function (req, res) {
    let body = req.body

    client.keys("*", function(err, keys) {
        if (err) {
          return callback(err);
        }

        for(var i = 0, len = keys.length; i < len; i++) {            
            keys.map((ob,i)=>{
                client.hgetall(ob, function(err, object) {

                    console.log("&&&&&&&&&&&", object,"&&&&&&", body)
                    if(object.id == body.id){
                        client.hdel(keys[i], "title")
                        client.hmset(keys[i],"title",body.title,redis.print)
                    }
                });
            })
        }

        
    }); 

    res.send("DATA SAVED")
})


app.post('/deleteSubTodo', function (req, res) {
    let body = req.body

    client.keys("*", function(err, keys) {
        if (err) {
          return callback(err);
        }

        for(var i = 0, len = keys.length; i < len; i++) {            
            keys.map((ob,i)=>{
                client.hgetall(ob, function(err, object) {
                    if(object.subTodoId == body.id){
                        client.hdel(keys[i], "subTodo","subTodoId","id",redis.print )
                    }
                });
            })
        }
    }); 
    res.send("DELETED")
})

app.post('/removeSession', function(req,res){
    client.flushall( function (err, succeeded) {
        console.log("MESSGAE",succeeded); // will be true if successfull
    });
})

app.listen(5000, () => {
    console.log(`App listening on port ${PORT}`)
})
