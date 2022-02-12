const elasticsearch = require('elasticsearch');
const client = new elasticsearch.Client({
    hosts: ['http://localhost:9200'],
  });
class IndexerServices{
    constructor(){
    }

    indexingPing(){
        client.ping(
            {
              requestTimeout: 30000,
            },function (error) {
                  if (error) {
                    console.error('Elasticsearch cluster is down!');
                  } else {
                    console.log('Everything is okay.');
                  }
            }
        );
    }

    setClientIndex(){
        client.indices.create(
            {
              index: 'search_index',
            },
            function (error, response, status) {
              if (error) {
                console.log(error);
              } else {
                console.log('Created a new index.', JSON.stringify(response));
                clientIndex = true;
              }
            }
          );
    }

    sendMessageToIndexer(message){
        this.parseMsgToDoc(message, "", "plan");
    }

    parseMsgToDoc(JSONObject, parentId, objectName){
        let map = new Map();
        let mapJSON = {};
        var keys = Object.keys( JSONObject );
        for( var i = 0,length = keys.length; i < length; i++ ) {
            let redisKey = JSONObject.objectType + ":" + parentId;
            let value = JSONObject[ keys[ i ] ];
            if (typeof (JSONObject[ keys[ i ] ]) === "object") {
                this.parseMsgToDoc(value, JSONObject.objectId, keys[i]);
            } else {
                mapJSON[keys[i]] = value;
            }
        }
        let tempJSON = {};
        let id = parentId + ":" + JSONObject.objectId;
        var parentId = parentId;
        var objectId = JSONObject.objectId;
        if(objectName === "plan"){
            tempJSON = {
                "parent" : "",
                "name" : objectName
            }
        mapJSON["plan_join"] = tempJSON;
        } else if((objectName === "1") || (objectName === "0")){
            tempJSON = {
                "parent" : "12xvxc345ssdsds-508",
                "name" : "linkedPlanServices"
            }
            parentId = "12xvxc345ssdsds-508";
            mapJSON["plan_join"] = tempJSON;
        } else {
            tempJSON = {
             "parent" : parentId,
             "name" : objectName
            }
        mapJSON["plan_join"] = tempJSON;
        }
        if(objectId){
            client.index(
                {
                  index: 'search_index',
                  id:  objectId,
                  body: mapJSON,
                  routing: parentId,
                },
                function (err, resp, status) {
                    if(err){
                        console.log("Error encountered indexing message:"+err)
                    }else{
                        console.log("Sent message with parent id: "+objectId+" ; body as : "+mapJSON)
                    }
                }
            );
        }
        return map;
    }

    deleteMessageFromIndexer(message){
        this.removeDoc(JSON.parse(message), "", "plan");
    }

    removeDoc(JSONObject, parentId, objectName){
        let map = new Map();
        let mapJSON = {};
        var keys = Object.keys( JSONObject);
        console.log("keys="+keys)
        for( var i = 0,length = keys.length; i < length; i++ ) {
            let value =JSONObject[keys[ i ] ];
            if (typeof (JSONObject[ keys[ i ] ]) === "object") {
                let jsonObjId =JSONObject.objectId
                this.removeDoc(value, jsonObjId, keys[i]);
            } else {
                mapJSON[keys[i]] = value;
            }
        }
        let tempJSON = {};
        let id = parentId + ":" + JSONObject.objectId;
        var parentId = parentId;
        var objectId = JSONObject.objectId;
        if(objectName === "plan"){
            tempJSON = {
                 "parent" : "",
                 "name" : objectName
             }
            mapJSON["plan_join"] = tempJSON;
        } else if((objectName === "1") || (objectName === "0")){
            tempJSON = {
                "parent" : "12xvxc345ssdsds-508",
                "name" : "linkedPlanServices"
            }
            parentId = "12xvxc345ssdsds-508";
            mapJSON["plan_join"] = tempJSON;
        } else {
             tempJSON = {
                 "parent" : parentId,
                 "name" : objectName
             }
             mapJSON["plan_join"] = tempJSON;
        }
        if(objectId){
           client.delete(
               {
                 index: 'search_index',
                 id:  objectId,
               },
               function (err, resp, status) {
                   if(err){
                        console.log("Error encountered indexing message:"+err)
                   }else{

               console.log("Msg deleted from Indexer with Object id: "+objectId)

                   }
               }
             );
           }
        return map;
    }
}
module.exports = IndexerServices;