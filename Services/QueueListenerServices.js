const IndexerServices = require("../Services/IndexerServices");
const amqp = require('amqplib/callback_api');

class QueueListenerServices{
    constructor(){
        // if(this.clientIndex){
        //     setClientIndex();
        // }
        amqp.connect('amqp://localhost', function(error, connection) {
  if (error) {
    throw error;
  }
  connection.createChannel(function(error1, channel) {
    if (error1) {
      throw error1;
    }

    let queue = 'node_queue';
  //  let msg = 'Test message';

    channel.assertQueue(queue, {
      durable: true
    });
});
});
    }

    addToQueue(msg){
amqp.connect('amqp://localhost', function(error, connection) {
  if (error) {
    throw error;
  }

    channel.sendToQueue('node_queue', Buffer.from(msg), {
      persistent: true
    });
    console.log("Sent "+ JSON.stringify(msg));
  });


    }


    receiveMsg(){
        amqp.connect('amqp://localhost', function(error0, connection) {
  if (error0) {
    throw error0;
  }
  connection.createChannel(function(error1, channel) {
    if (error1) {
      throw error1;
    }
    channel.consume('node_queue', function(msg) {

      console.log("Received"+JSON.stringify(msg));

      const indexObj = new IndexerServices();
      indexObj.indexingPing();
      if(msg.action === "POST"){
     // indexObj.sendMessageToIndexer(msg.body);
      }
      setTimeout(function() {
        channel.ack(msg);
      }, 1000);
    });
  });
});
    }
}
module.exports = QueueListenerServices;