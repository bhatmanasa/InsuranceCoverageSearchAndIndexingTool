var express = require('express');
var planSchema = require('./JsonSchema/planSchema.json');
var jsonValidator = require('jsonschema').Validator;
var bodyParser = require('body-parser');
const redis = require('redis');
const { generateKeyPair} = require("crypto");
const  JSONServices = require("./Services/JSONServices");
const  IndexerServices = require("./Services/IndexerServices");
const  MQListener = require("./Services/MQListener");
const jwt = require('jsonwebtoken');
var crypto = require('crypto');
const client = redis.createClient();
var private_key = '';
var public_key = '';
const MQqueue = [];
const verifyOptions = {
    issuer : "ManasaBhat",
    subject : "bhat.ma@northeastern.edu",
     audience : 'http://localhost:8000/generateToken',
     maxAge : "120s",
     algorithms : ["RS256"]
 };
client.on('connect', function() {
    console.log('Connected!');
});
var app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
var validator = new jsonValidator();
     //POST REQUEST : Takes in the request body, validates and stores the JSON Object in redis.
     app.post('/', verifyToken,function(req, res) {  
             var verified = jwt.verify(req.token,public_key,verifyOptions,(err,authData)=>{
             if(err){
                 res.status(401).json({"Message":"UnAuthorized! Invalid Token"});
             }else{
                if (req.get('Content-Type') != 'application/json') {    
                    res.status(401).send({"Error":"Invalid header format!"});    
                    return;  
                }  
                var objectId = req.body.objectType+":"+req.body.objectId;
                client.get(objectId, (err, data) => {
                    if (data == null) {
                        try {
                            validator.validate(req.body, planSchema, {
                                throwError: true 
                            });  
                        } catch (error) {    
                            res.status(400).json({'Input Error': error.message});    
                            return;  
                        }  
                        const jsonServiceObj = new JSONServices();
                       var key = "plan:" + req.body.objectId;
                       let resBody = jsonServiceObj.createPlan(req.body);
               
                       // Send the plan message to queue for indexing

                        let message = {
                            "action":"SAVE",
                            "body":(req.body)
                        };
                        const queueObj = new MQListener();
                        queueObj.addToQueue(message,MQqueue);
                        queueObj.receiveMsg(MQqueue);

                        try{
                            var jsonString = JSON.stringify(req.body,null," ")
                            var newEtag = crypto.createHash('md5').update(jsonString).digest('hex');
                            client.set("etag_"+key, newEtag);
                            res.setHeader("ETag", newEtag);
                            res.status(201).json({"objectId":resBody.objectId,"objectType":resBody.objectType});
                        }catch(e){
                            console.log("Error encountered: "+e)
                        }
                    }else{
                        try{
                            let newTag = '';
                            client.get(("etag_"+req.body.objectType+":"+req.body.objectId), (err, data) => {
                                newTag = data;
                            });
                            res.setHeader("ETag", newTag);
                            res.status(409).json({"Error":"Unable to Post Request object!. Object '"+objectId+"' already exists!"});    
                        }catch(e){
                        console.log(e)
                        }
                        return;  
                    }
                });
                console.log("POST REQUEST SUCCESFUL");
            }
        });
});

    //GET REQUEST - fetches JSON Object from redis taking the object id
    app.get('/:id',verifyToken,function(req, res) {
        var verified = jwt.verify(req.token,public_key,verifyOptions,(err,authData)=>{
            if(err){
                res.status(401).json({"Message":"UnAuthorized! Invalid Token"});
            }else{
                 var objectId = req.params.id;
                client.get(objectId, (err, data) => {
                    console.log("er="+err)
                    if (err) {
                        res.status(500).json({"Error":err});
                        return;
                    }
                    if (data == null) {
                        res.status(404).json({"Error:":"Object '"+objectId+"' Not Found"});
                        return;
                    }else{

                        client.get("etag_"+objectId,  (err, obj) => {
                        if (err) throw err;
                            if (obj) {
                                res.setHeader("ETag", obj);
                                if (req.get('If-None-Match')) {  
                                    var headerEtag = req.get('If-None-Match') ;
                                    if(obj == headerEtag){
                                        res.status(304).json({"Error":"Not Modified"});
                                        return;
                                    }else{
                                    
                                        res.status(200).json(JSON.parse(data));
                                    }
                                }else{
                                    res.status(200).json(JSON.parse(data));
                                }
                            }
                        });
                   }
                });
           }
       });
    });
            

    app.listen(8000, function() {  
         console.log('INFO7255-DEMO app listening on port 8000');
    });



    //DELETE REQUEST - Delete the JSON Object and corresponding etag from redis. Takes in object ID.
    app.delete('/:id',verifyToken,function(req, res) {
        var verified = jwt.verify(req.token,public_key,verifyOptions,(err,authData)=>{
            if(err){
                res.status(401).json({"Message":"UnAuthorized! Invalid Token"});
               // res.sendStatus(403);
            }else{
                var objectId = req.params.id; 
                try{
                    client.get(objectId, async (err, data) => {
                        if (err) {
                            res.status(500).json({"Error":err});
                            return;
                        }
                        if (data == null) {
                            res.status(404).json({"Error":"Object '"+objectId+"' Not Found"});
                            return;
                        }else{
                            client.get(req.params.id, async (err, data) => {
                                console.log("data="+data)
                                if(data){
                                const indexObj = new IndexerServices();
                                let message = {
                                    "action":"DELETE",
                                    "body":data
                                };
                                const queueObj = new MQListener();
                                queueObj.addToQueue(message,MQqueue);
                                queueObj.receiveMsg(MQqueue);
                                }   
                            })
                            const jsonServiceObj = new JSONServices();
                            let result = jsonServiceObj.deletePlan(req.params.id);
                        //   console.log("Goes to delete from indexer")
                        //   //   if(msg.action === "POST"){
                        //     indexObj.deleteMessageFromIndexer(req.body);
                            res.status(200).json({"Message":result}); 
                            return
                        }
                    });
                }catch(err){
                    res.status(500).json({"Error":err});
                    return;
                }
          }
      });
    });

    app.post('/generateToken', function(req, res) {
        generateKeyPair("rsa",{
            modulusLength: 2048, 
            publicKeyEncoding: {
                type: "pkcs1", 
                format: "pem",
            },
            privateKeyEncoding: {
                type: "pkcs1", 
                format: "pem",
            },
        },(err, publicKey, privateKey) => {
            if (err) console.log("Error!", err);
            private_key = privateKey;
            public_key = publicKey;

            const signOptions = {
                issuer : "ManasaBhat",
                subject : "bhat.ma@northeastern.edu",
                audience : 'http://localhost:8000/generateToken',
                expiresIn : "2h",
                algorithm : "RS256",
                header :{
                     "alg": 'RS256', 
                     "kid" : "1fdad2efc45e3e6bde70d83dc04573d0"
                }
            }
            var payload = {};
            payload.userName = "Manasa";
            payload.userId = "bhat.ma@northeastern.edu";
            payload.role = "Admin";

            var token =jwt.sign(payload,private_key,signOptions);
            res.json({token})
        });
    });
    app.put('/:id', verifyToken,function(req, res){

        var verified = jwt.verify(req.token,public_key,verifyOptions,(err,authData)=>{
            if(err){
                res.status(401).json({"Message":"UnAuthorized! Invalid Token"});
             //   res.sendStatus(403);
            }else{
        client.get(req.params.id, async (err, data) => {
            if (err) {
                res.status(500).json({"Error":err});
                return;
            }
            if (data == null) {
                res.status(404).json({"Error":"Cannot PUT - Object '"+req.params.id+"' Not Found"});
                return;
            }else{
                console.log("Reached data for delete")
                client.get("etag_"+req.params.id,  (err, recentEtag) => {
                if (req.get('If-None-Match')) {  
                    var headerEtag = req.get('If-None-Match') ;
                    if(recentEtag == headerEtag){
                        var key = "plan:" + req.body.objectId;
                        console.log("key="+key)
                        console.log("create plan from here="+req.body)
                        let message = {
                            "action":"SAVE",
                            "body":(req.body)
                        };
                        const queueObj = new MQListener();
               
                        const indexObj = new IndexerServices();
                        client.get(req.body.objectId, async (err, data) => {
                            console.log("data="+data)
                            if(data){
                                let message = {
                                    "action":"DELETE",
                                    "body":data
                                };
                                queueObj.addToQueue(message,MQqueue);
                                queueObj.receiveMsg(MQqueue);
                        }
                        })
                        const jsonServiceObj= new JSONServices();
                        let resBody = jsonServiceObj.createPlan(req.body);
                        message = {
                            "action":"SAVE",
                            "body":(req.body)
                        };
                        queueObj.addToQueue(message,MQqueue);
                        queueObj.receiveMsg(MQqueue);
                       try{  
                            var jsonString = JSON.stringify(req.body,null," ")
                            var newEtag = crypto.createHash('md5').update(jsonString).digest('hex');
                            client.set("etag_"+key, newEtag);
                            var objectId = req.params.id;
                client.get(objectId, (err, data) => {
                    console.log("Data inside put="+data)
                });
                             res.setHeader("ETag", newEtag);
                             res.status(200).json({"Message":"PUT request complete","objectId":req.body.objectId,"objectType":req.body.objectType});
                        }catch(e){
                            console.log("Error encountered: "+e)
                        }
                    }else{
                        res.setHeader("ETag", recentEtag);
                        res.status(412).json({"MEssage":"Invalid ETag, Plan has been updated!"});
                    }
                }else{
                    res.setHeader("ETag", recentEtag);
                    res.status(500).json({"Message":"Passing ETag is mandatory!"});
                }
            });
        }
    });
    }
  });
});


app.patch('/:id',verifyToken, function(req, res){

    var verified = jwt.verify(req.token,public_key,verifyOptions,(err,authData)=>{
        if(err){
            res.status(401).json({"Message":"UnAuthorized! Invalid Token"});
         //   res.sendStatus(403);
        }else{
    client.get(req.params.id, async (err, data) => {
        if (err) {
            res.status(500).json({"Error":err});
            return;
        }
        if (data == null) {
            res.status(404).json({"Error":"Cannot PATCH - Object '"+req.params.id+"' Not Found"});
            return;
        }else{
                client.get("etag_"+req.params.id,  (err, recentEtag) => {
                if (req.get('If-None-Match')) {  
                    var headerEtag = req.get('If-None-Match') ;
                    if(recentEtag == headerEtag){
                    
                   const jsonServiceObj = new JSONServices();
                            let patchResult = jsonServiceObj.patchPlan(data,req.body);
                    
                            //Sending patched message to indexer
                            let message = {
                                "action":"SAVE",
                                "body":(req.body)
                            };
                            const queueObj = new MQListener();
                            queueObj.addToQueue(message,MQqueue);
                            queueObj.receiveMsg(MQqueue);
                            var jsonString = JSON.stringify(req.body,null," ")
                            var newEtag = crypto.createHash('md5').update(jsonString).digest('hex');
                            console.log("Creating Hash for new Object: "+newEtag);
                            client.set("etag_"+req.body.objectType+":"+req.body.objectId,newEtag);
                    
                            res.setHeader("ETag", newEtag);
                            res.status(200).json(patchResult);
                    
                    
                    }else{
                        res.setHeader("ETag", recentEtag);
                        res.status(412).json({"MEssage":"ETag mismatch, plan was updated"});
                    }
                }else{
                    res.status(500).json({"Message":"Passing ETag is mandatory!"});
                }

                });
            }
        });
        }
    });
});

    app.post('/generateKey', function(req, res) {
        generateKeyPair("rsa",{
            modulusLength: 2048, 
            publicKeyEncoding: {
              type: "pkcs1", 
              format: "pem",
            },
            privateKeyEncoding: {
              type: "pkcs1", 
              format: "pem",
            },
          },
          (err, publicKey, privateKey) => {
            if (err) console.log("Error!", err);  
        });
    });


    function verifyToken(req,res,next){
        const bearerHeader = req.headers['authorization'];
        if(typeof bearerHeader !== 'undefined'){
            const bearer = bearerHeader.split(' ')
            const bearerToken = bearer[1];
            req.token = bearerToken;
            next();
        }else{
           // res.sendStatus(403);
           res.status(401).json({"Message":"UnAuthorized! Invalid Token"});
        }
    }
    

    