
const express = require('express')
const app = express()
const redis = require('redis')
const bodyParser = require('body-parser');
const db = require('./firestore');
const { response } = require('express');

const firestore = db.firestore()
const PORT = 5000;
const REDIS_PORT = 6379;

const client = redis.createClient(REDIS_PORT);

client.on("connect", function (error) {
    console.log("REDIS CONNECTION ESTABLISHED")
})

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

app.post('/setData', function (req, res) {
    let body = req.body

    let name= ''
    firestore.collection("todos").where('userId', '==', body.uid).onSnapshot(function (querySnapshot) {
        querySnapshot.docs.map((doc,i) => {
            let id = doc.id
            let title = doc.data().title
            let uid = doc.data().userId

            name = 'todo-' + i
            client.hmset(name, "id", id, "title", title, "uid", uid)
        })

        querySnapshot.docs.map((doc)=>{
            let j =0
            firestore.collection("subTodos").where('todoId', '==', doc.id).onSnapshot(function (querySnapshot) {
                querySnapshot.docs.map((doc1,i)=>{
                    let todoId = doc1.data().todoId
                    let subTodoId = doc1.id
                    let subTodo = doc1.data().todo

                    client.keys("*", function (err, keys) {
                        if (err) {
                            return callback(err);
                        }

                        var len = keys.length

                        for (var i = 0; i < len; i++) {
                            let name=keys[i]

                            client.hgetall(keys[i], function (err, object) {
                                if(object.id == todoId){
                                    let obj ={
                                        subTodoId : doc1.id,
                                        subTodo : doc1.data().todo, 
                                        new : "No",
                                        deleted : 'No',
                                        updated : 'No',
                                        sub : 0
                                    }

                                    client.hmset(name,'totalSub',j,"subtodo"+j,JSON.stringify(obj))
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

app.post('/setSubtodo', function (req, res) {
    let body = req.body

    body.items.map((ob, i) => {
        let todoId = ob.id
        let subTodoId = ob.subTodoId
        let subTodo = ob.subTodo

        let name = 'Subtodo-' + i

        client.hmset(name, "id", todoId, "subTodo", subTodo, "subTodoId", subTodoId)
    })

    res.send("DATA SAVED")
})

app.get('/getData/:id', function (req, res) {
    var arr = []
    client.keys("*", function (err, keys) {
        if (err) {
            return callback(err);
        }

        let j =0
        for (var i = 0, len = keys.length; i < len; i++) {
            client.hgetall(keys[i], function (err, object) {
                if(object.deleted !='true'){
                    var arr2= []

                    if(object.totalSub){
                        let n = object.totalSub
    
                        for(let i =0; i <= n; i++){
                            let name= "subtodo"+i
                            let val = JSON.parse(object[name])
                            if(val.deleted !='yes'){
                                arr2.push(JSON.parse(object[name]))
                            }
                        }
                    }

                    let obj={
                        id : object.id,
                        title : object.title,
                        subtodos : arr2,
                    }
                    
                    arr.push(obj)
                }
            });
        }

        setTimeout(() => {
            res.send(arr.sort())
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
        client.hmset(name, "title", body.title, "new", "yes", "id", keys.length, "uid", body.userId)
    });

    res.send("DATA SAVED")
})

app.post('/addNewSubTodo', function (req, res) {
    let body = req.body

    client.keys("*", function (err, keys) {
        if (err) {
            return callback(err);
        }

        for (var i = 0, len = keys.length; i < len; i++) {
            let name=keys[i]

            client.hgetall(keys[i], function (err, object) {
                if(object.id == body.todoId){
                    if(object.totalSub){
                        let id = parseInt(object.totalSub)
                        let obj ={
                            subTodoId : id+1,
                            subTodo : body.subTodo, 
                            new : "yes",
                        }

                        let x = id+1
                        client.hmset(name,'totalSub',x,"subtodo"+x,JSON.stringify(obj))

                    }else {
                        let obj ={
                            subTodoId : 0,
                            subTodo : body.subTodo, 
                            new : "yes"
                        }

                        client.hmset(name,'totalSub',0,"subtodo"+0,JSON.stringify(obj))
                    }
                }
            });                            
        }
    });

    res.send("DATA SAVED")
})

app.post('/addNewSubsubTodo', function (req, res) {
    let body = req.body

    client.keys("*", function (err, keys) {
        if (err) {
            return callback(err);
        }

        for (var i = 0, len = keys.length; i < len; i++) {
            keys.map((ob, i) => {
                client.hgetall(ob, function (err, object) {
                    if (object.id == body.todoId) {
                        for(let i =0; i<=object.totalSub;i++){
                            let name= "subtodo"+i
                            client.hget(ob, name, function(err, object1){
                                let parse = JSON.parse(object1)
                                if(parse.subTodoId == body.subTodoId){

                                    let obj ={
                                        subTodo : parse.subTodo,
                                        subTodoId : parse.subTodoId,
                                        new : parse.new,
                                        updated : parse.updated,
                                        deleted : parse.deleted,
                                        sub : parse.sub+1
                                    }

                                    console.log("*****", obj)

                                    // client.hmset(ob,name,JSON.stringify(obj))
                                }
                            })

                        }
                        
                        // if (object.id.toString().length > 1) {
                        //     client.hmset(keys[i], "deleted", "true")
                        // }else {
                        //     client.hdel(keys[i], "title", "uid", "id","new")
                        // }
                    }
                });
            })
            // let name=keys[i]

            // client.hgetall(keys[i], function (err, object) {
            //     if(object.id == body.todoId){
            //         if(object.totalSub){
            //             let id = parseInt(object.totalSub)
            //             // let obj ={
            //             //     subTodoId : id+1,
            //             //     subTodo : body.subTodo, 
            //             //     new : "yes"
            //             // }

            //             console.log("HERERERRERE", ob)

            //             // let x = id+1
            //             // client.hmset(name,'totalSub',x,"subtodo"+x,JSON.stringify(obj))

            //         }
            //     }
            // });                            
        }
    });

    // res.send("DATA SAVED")
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
                        }else {
                            client.hdel(keys[i], "title", "uid", "id","new")
                        }
                    }
                });
            })
        }
    });
    res.send("DELETED")
})

app.post('/deleteSubTodo', function (req, res) {
    let body = req.body

    client.keys("*", function (err, keys) {
        if (err) {
            return callback(err);
        }

        for (var i = 0, len = keys.length; i < len; i++) {
            keys.map((ob, i) => {
                client.hgetall(ob, function (err, object) {
                    if (object.id == body.todoId) {
                        for(let i =0; i<=object.totalSub;i++){
                            let name= "subtodo"+i
                            
                            client.hget(ob, name, function(err, object1){
                                let parse = JSON.parse(object1)
                                if(parse.subTodoId == body.subTodoId){
                                    let val = object.totalSub-1
                                    let obj ={
                                        subTodoId : body.subTodoId,
                                        deleted : "yes",
                                        new: 'No',
                                        updated: 'No' 
                                    }
            
                                    client.hmset(ob,name,JSON.stringify(obj))
                                }
                            })
                        }
                    }
                });
            })
        }
    });
    res.send("DELETED")
})

app.post('/updateTodo', function (req, res) {
    let body = req.body

    client.keys("*", function (err, keys) {
        if (err) {
            return callback(err);
        }

        for (var i = 0, len = keys.length; i < len; i++) {
            keys.map((ob, i) => {
                client.hgetall(ob, function (err, object) {
                    if (object.id == body.id) {
                        client.hdel(keys[i], "title")
                        if (object.id.toString().length > 1) {
                            client.hmset(keys[i], "title", body.title, "updated", "yes")
                        }
                        else {
                            client.hmset(keys[i], "title", body.title)
                        }
                    }
                });
            })
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

        for (var i = 0, len = keys.length; i < len; i++) {
            keys.map((ob, i) => {
                client.hgetall(ob, function (err, object) {
                    if (object.id == body.id) {
                        client.hdel(keys[i], "title")
                        if (object.id.toString().length > 1) {
                            client.hmset(keys[i], "title", body.title, "updated", "yes")
                        }
                        else {
                            client.hmset(keys[i], "title", body.title)
                        }
                    }
                });
            })
        }
    });
    res.send("DATA SAVED")
})

app.post('/updateSubTodo', function (req, res) {
    let body = req.body

    client.keys("*", function (err, keys) {
        if (err) {
            return callback(err);
        }

        for (var i = 0, len = keys.length; i < len; i++) {
            keys.map((ob, i) => {
                client.hgetall(ob, function (err, object) {
                    if(object.id == body.todoId){
                        for(let i =0; i<=object.totalSub;i++){
                            let name= "subtodo"+i
                            client.hget(ob, name, function(err, object1){
                                let parse = JSON.parse(object1)

                                if(parse.subTodoId ==body.id){
                                    if (parse.subTodoId.toString().length > 1) {
                                        let obj ={
                                            subTodo : body.title,
                                            subTodoId : body.id,
                                            new : "NO",
                                            updated : "yes",
                                            deleted : "NO"
                                        }

                                        client.hmset(ob,name,JSON.stringify(obj))
                                    }else {
                                        let obj ={
                                            subTodo : body.title,
                                            subTodoId : body.id,
                                            new : "yes",
                                            updated : "No",
                                            deleted : "NO"
                                        }
                                        client.hmset(ob,name,JSON.stringify(obj))
                                    }
                                }
                            })
                        }
                    }
                });
            })
        }
    });

    res.send("DATA SAVED")
})


app.post('/removeSession', function (req, res) {
    client.keys("*", function (err, keys) {
        if (err) {
            return callback(err);
        }

        keys.map((ob, i) => {
            client.hgetall(keys[i], function (err, object) {
                client.hexists(keys[i], 'new', function (err, reply) {
                    if (reply === 1) {
                        firestore.collection("todos").add({
                            title: object.title,
                            userId: object.uid
                        })
                        .then(function (docRef) {
                            client.hdel(keys[i], "id") 
                            client.hmset(keys[i],"new","No" ,"id",docRef.id) 
                        }) 
                    } 
                });

                client.hexists(keys[i], 'updated', function (err, reply) {
                    if (reply === 1) {
                        firestore.collection("todos").doc(object.id).update({
                            title: object.title
                        });
                    } else {
                    }
                });

                client.hexists(keys[i], 'deleted', function (err, reply) {
                    if (reply === 1) {

                        firestore.collection("todos").doc(object.id).delete();
                    } else {
                    }
                });               
            })
        })
    });

    setTimeout(()=>{
        client.keys("*", function (err, keys) {
            if (err) {
                return callback(err);
            }

            keys.map((ob, i) => {
                client.hgetall(keys[i], function (err, object) {
                    for(let i = 0;i<= object.totalSub;i++){
                        let name= "subtodo"+i
    
                        client.hget(ob, name,function(err, object1){    
                            let parse = JSON.parse(object1)
                            if(parse !=null){
                                if(parse.new == 'yes'){
                                    let val = parse.totalSub-1    
                                    client.hdel(ob, "totalSub")
                                    client.hmset(ob, "totalSub",val)
    
                                    firestore.collection("subTodos").add({
                                        todo: parse.subTodo,
                                        todoId :object.id
                                    })
                                }
                                
                                if(parse.updated == 'yes'){
                                    firestore.collection("subTodos").doc(parse.subTodoId).update({
                                        todo: parse.subTodo
                                    });
                                }

                                if(parse.deleted =='yes'){
                                    if(parse.subTodoId.toString().length > 1){
                                        firestore.collection("subTodos").doc(parse.subTodoId).delete();
                                    }   
                                }
                            }
                        })   
                    }                   
                })
            })
        });
    },1000)

    setTimeout(() => {
        client.flushall(function (err, succeeded) {
            console.log("MESSGAE", succeeded);
        });
    }, 2000)
})

app.listen(5000, () => {
    console.log(`App listening on port ${PORT}`)
})

