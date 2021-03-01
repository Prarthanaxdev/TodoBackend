
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

        // querySnapshot.docs.map((doc)=>{
        //     firestore.collection("subTodos").where('todoId', '==', doc.id).onSnapshot(function (querySnapshot) {
        //         querySnapshot.docs.map((doc1,i)=>{
        //             let todoId = doc1.data().todoId
        //             let subTodoId = doc1.id
        //             let subTodo = doc1.data().todo
        //             let name = 'Subtodo-' + i

        //             client.hmset(name, "id", todoId, "subTodo", subTodo, "subTodoId", subTodoId)
        //         })
        //     })
        // })

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

                        for (var i = 0, len = keys.length; i < len; i++) {
                            let name=keys[i]
                            client.hgetall(keys[i], function (err, object) {
                                
                                if(object.id == todoId){
                                    let obj ={
                                        subTodoId : doc1.id,
                                        subTodo : doc1.data().todo, 
                                    }

                                    client.hmset(name,'totalSub',j,"subtodo"+j,JSON.stringify(obj),redis.print)
                                    j++;
                                    console.log("HERE", j)
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
                            arr2.push(JSON.parse(object[name]))
                        }
                    }

                    let obj={
                        id : object.id,
                        title : object.title,
                        subtodos : arr2
                    }
                    
                    arr.push(obj)
                }
            });
        }

        setTimeout(() => {
            res.send(arr)
        }, 1000);
    });
})

// app.get('/getSubtodos/:id', function (req, res) {
//     var arr = []

//     client.keys("*", function (err, keys) {
//         if (err) {
//             return callback(err);
//         }

//         for (var i = 0, len = keys.length; i < len; i++) {
//             // if (keys[i].split("-")[0] == "Subtodo") {
//             client.hgetall(keys[i], function (err, object) {
//                 if(object.totalSub){

//                     let n = object.totalSub

//                     for(let i =0; i <= n; i++){
//                         console.log("HHHH", i)
//                         let name= "subtodo"+i
//                         arr.push(JSON.parse(object[name]))

//                         console.log("YES HERE",object[name])
//                     }
//                 }
//             });
//         }
//         setTimeout(() => {

//             console.log("GGGGGGGGGG", arr)
//             // res.send(arr)
//         }, 1000);
//     });
// })

app.post('/addNewTodo', function (req, res) {
    let body = req.body

    client.keys("*", function (err, keys) {
        if (err) {
            return callback(err);
        }

        let name = 'todo-' + keys.length
        client.hmset(name, "title", body.title, "new", "yes", "id", keys.length, "uid", body.userId, redis.print)
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
                console.log("******", object)
                if(object.id == body.todoId){
                    if(object.totalSub){
                        let id = parseInt(object.totalSub)
                        console.log("*****", id+1) 
                        let obj ={
                            subTodoId : id+1,
                            subTodo : body.subTodo, 
                            new : "yes"
                        }

                        let x = id+1
                        client.hmset(name,'totalSub',x,"subtodo"+x,JSON.stringify(obj),redis.print)

                    }else {
                        let obj ={
                            subTodoId : 0,
                            subTodo : body.subTodo, 
                            new : "yes"
                        }

                        client.hmset(name,'totalSub',0,"subtodo"+0,JSON.stringify(obj),redis.print)
                    
                    }
                }
            });                            
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
                        // client.hdel(keys[i], "title", "uid", "id", redis.print)
                        if (object.id.toString().length > 1) {
                            client.hmset(keys[i], "deleted", "true", redis.print)
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
                            client.hmset(keys[i], "title", body.title, "updated", "yes", redis.print)
                        }
                        else {
                            client.hmset(keys[i], "title", body.title, redis.print)
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
                            client.hmset(keys[i], "title", body.title, "updated", "yes", redis.print)
                        }
                        else {
                            client.hmset(keys[i], "title", body.title, redis.print)
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
                    console.log(object, body)
                    if (object.subTodoId == body.id) {
                        client.hdel(keys[i], "subTodo")
                        if (object.id.toString().length > 1) {
                            client.hmset(keys[i], "subTodo", body.title, "updated", "yes", redis.print)
                        }
                        else {
                            client.hmset(keys[i], "subTodo", body.title, redis.print)
                        }
                    }
                });
            })
        }
    });

    res.send("DATA SAVED")
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
                    if (object.subTodoId == body.id) {
                        client.hdel(keys[i], "subTodo", "subTodoId", "id", redis.print)
                    }
                });
            })
        }
    });
    res.send("DELETED")
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
                            
                            // keys.map((ob, i) => {
                            //     client.hgetall(keys[i], function (err, obj) {
                            //         if (keys[i].split("-")[0] == "Subtodo") {
                            //             // console.log("*TODO**", object)
                            //             // console.log("*SUBTODO*",obj )
                            //             if (object.id == obj.id) {
                            //                 client.hdel(keys[i],"id", redis.print)
                            //                 client.hmset(keys[i], "id", docRef.id, redis.print)
                            //                 // console.log("GGGGG", obj.subTodo,"belongs To", object.title)
                            //             }
                            //         }
                            //     });
                            // })
                            // }
                            // client.hmset(keys[i], "new", docRef.id, redis.print)
                        })
                    } else {
                        
                    }
                });

                client.hexists(keys[i], 'updated', function (err, reply) {
                    if (reply === 1) {
                        firestore.collection("todos").doc(object.id).update({
                            title: object.title
                        });
                    } else {
                        console.log('not exists');
                    }
                });

                client.hexists(keys[i], 'deleted', function (err, reply) {
                    if (reply === 1) {

                        firestore.collection("todos").doc(object.id).delete();
                    } else {
                        console.log('not exists');
                    }
                });
               
            })
        })
    });

    setTimeout(() => {
        console.log("HERE")
        client.flushall(function (err, succeeded) {
            console.log("MESSGAE", succeeded);
        });
    }, 1000)


    // setTimeout(()=>{
    //     client.keys("*", function (err, keys) {
    //         if (err) {
    //             return callback(err);
    //         }

    //         keys.map((ob, i) => {
    //             client.hgetall(keys[i], function (err, object) {
    //                 console.log(keys[i])
    //                 if (keys[i].split("-")[0] == "Subtodo") {
                    
    //                         client.hexists(keys[i], 'new', function (err, reply) {
    //                             if (reply === 1) {
    //                                 console.log("**HERERRERERRERERRE***", object)
    //                                 // client.hgetall(keys[i], function (err, ob) {
    //                                 //     if (keys[i].split("-")[0] == "todo") {
    //                                 //         client.hexists(keys[i], 'new', function (err, reply) {
    //                                 //             if (reply === 1) {
    //                                 //                 console.log("HHHHHHH",ob , object)
    //                                 //                 // firestore.collection("todos").add({
    //                                 //                 //     title: object.title,
    //                                 //                 //     userId: object.uid
    //                                 //                 // })
    //                                 //                 // .then(function (docRef) {
    //                                 //                 //     // console.log("******", docRef.id)
    //                                 //                 //     client.hmset(keys[i], "new", docRef.id, redis.print)
    //                                 //                 // })
    //                                 //             } else {
    //                                 //                 console.log('not exists');
    //                                 //             }
    //                                 //         })
                
    //                                 //     }
                
    //                                 // })
    //                                 // firestore.collection("subTodos").add({
    //                                 //     todo: object.subTodo,
    //                                 //     todoId: object.id
    //                                 // })
                
    //                             } else {
    //                                 console.log('not exists');
    //                             }
    //                         });  
                
    //                     client.hexists(keys[i], 'updated', function (err, reply) {
    //                         if (reply === 1) {
    //                             firestore.collection("subTodos").doc(object.subTodoId).update({
    //                                 todo: object.subTodo
    //                             });
                
    //                         } else {
    //                             console.log('not exists');
    //                         }
    //                     });
                
    //                     // client.hexists(keys[i], 'deleted', function (err, reply) {
    //                     //     if (reply === 1) {
                
    //                     //         firestore.collection("todos").doc(object.id).delete();
    //                     //     } else {
    //                     //         console.log('not exists');
    //                     //     }
    //                     // });
    //                 }            
    //             })
    //         })
    //     });
    // },2000)


    

})

app.listen(5000, () => {
    console.log(`App listening on port ${PORT}`)
})

