const IndexerServices = require("../Services/IndexerServices");
const amqp = require('amqplib/callback_api');
const RedisSMQ = require("rsmq");
//const rsmq = new RedisSMQ( {host: "127.0.0.1", port: 6379, ns: "rsmq"} );


var open = require('amqplib');

class MQListener{
    constructor(){
        try{
            open.connect('amqp://localhost');
            }catch(e){
                console.log(e)
            }
        // rsmq.createQueue({ qname: "searchQueue" }, function (err, resp) {
        //     if (err) {
        //         console.error(err)
        //         return
        //     }
        
        //     if (resp === 1) {
        //         console.log("queue created")
        //     }
        // });

    }
    queueGetOrCreate(){
        // rsmq.createQueue({ qname: "searchQueue" }, function (err, resp) {
        //     if (err) {
        //         console.error(err)
        //         return
        //     }
        
        //     if (resp === 1) {
        //         console.log("queue created")
        //     }
        // });
    }
    addToQueue(msg,MQqueue){
        MQqueue.push(msg);
        // open.then(function(conn) {
        //     return conn.createChannel();
        //   }).then(function(ch) {
        //     return ch.assertQueue("searchQueue").then(function(ok) {
        //       return ch.sendToQueue("searchQueue", Buffer.from(msg));
        //     });
        //   }).catch(console.log("error"));
    }

    receiveMsg(MQqueue){
        let jsonMsg = (MQqueue.shift());
        if(jsonMsg.action === "SAVE"){
            const indexObj = new IndexerServices();
            indexObj.indexingPing();
            indexObj.sendMessageToIndexer(jsonMsg.body);
        }else if(jsonMsg.action === "DELETE"){
            const indexObj = new IndexerServices();
            indexObj.indexingPing();
            indexObj.deleteMessageFromIndexer(jsonMsg.body);
        }

        // open.then(function(conn) {
        //     return conn.createChannel();
        //   }).then(function(ch) {
        //     return ch.assertQueue("searchQueue").then(function(ok) {
        //       return ch.consume("searchQueue", function(msg) {
        //         if (msg !== null) {
        //           console.log("Msg received"+JSON.stringify(msg));
        //           ch.ack(msg);
        //         }
        //       });
        //     });
        //   }).catch(console.warn);
    }
}
module.exports = MQListener;