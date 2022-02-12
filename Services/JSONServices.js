const redis = require('redis');
const client = redis.createClient();
var crypto = require('crypto');
class JSONServices{
    constructor(){
        client.on('connect', function() {
            console.log('Connected to REDIS!');
        });
    }

    patchPlan(existingJSON,inputJSON){
        var objectProps = {'_org':true,'objectId':true,'objectType':true,'planType':true,'creationDate':true}
        var jsonOld = JSON.parse(existingJSON);
        var jsonUpdate = inputJSON
        if(jsonOld.objectId == jsonUpdate.objectId){
            var keys = Object.keys( jsonUpdate );
            for( var i = 0,length = keys.length; i < length; i++ ) {
                if(objectProps[keys[i]]){
                    continue;
                }
                let value = inputJSON[ keys[ i ] ]
                if(jsonOld[ keys[ i ] ] == null){
                
                }else{  
                    let jsonObjKey = keys[ i ] + ":" + (value).objectId;
                    let newJSON = jsonOld[ keys[ i ] ].push((value[0]));
                    let relationKey = jsonOld.objectType + ":" + jsonOld.objectId+ ":" +jsonUpdate.planType;
                    let objectKey = jsonUpdate.planType + ":" + jsonOld.objectId;
                    client.set(relationKey,objectKey);
                    client.set(objectKey,JSON.stringify(jsonUpdate));
                    var newEtag = crypto.createHash('md5').update(objectKey).digest('hex');

                    client.set("etag_"+objectKey,newEtag);
                }
            }
        }
        client.set(jsonOld.objectType+":"+jsonOld.objectId,JSON.stringify(jsonOld,null," "))   
        return jsonOld;
    }

    deletePlan(planKey){
        var delTypes = ["plan","planservice","undefined","etag_undefined:undefined"];
        client.del(planKey);
        client.del("etag_"+planKey);
        for(var d = 0, len = delTypes.length; d < len; d++) {
            client.keys(delTypes[d]+':*', function (err, keys) {
                if (err) return "Error: "+err;
                for(var i = 0, len = keys.length; i < len; i++) {
                    let mappedKey = '';
                       client.get(keys[i] , (err, data) => {
                        if (err) return "Error: "+err;
                            mappedKey = data;
                            const jsonServiceObj = new JSONServices();
                        if(data){
                             jsonServiceObj.deletePlan(data);
                        }
                        });
                    client.del(keys[i]);
                    client.del("etag_"+keys[i]);
                }

            });
            client.del("etag_undefined:undefined");
        }
        return "Plan "+planKey+" deleted successfully!";
    }
        createPlan(plan ) {
            this.mapJson(plan);
            return plan;
        }
        mapJson(jsonObject) {
            let map = new Map();
            let contentMap = new Map();
            var keys = Object.keys( jsonObject );
            for( var i = 0,length = keys.length; i < length; i++ ) {
                var redisKey =jsonObject.objectType+ ":" + jsonObject.objectId;
                var value = jsonObject[ keys[ i ]];         
                if  (typeof (value) === "object") {
                    value = this.mapJson(value);
                    var nextKey;
                    for (var entry of value.entries()) {
                        nextKey = entry[0];
                        break;
                    }
                    client.set(redisKey + ":" + keys[i],nextKey);
                    var newEtag = crypto.createHash('md5').update(keys[i],nextKey).digest('hex');
                    client.set("etag_"+redisKey,newEtag);
                } else if (Array.isArray(typeof value)){
                    let value2 = this.jsonToList(JSON.Array(value));
                    (value2).forEach((entry) => {
                            entry.keySet()
                                    .forEach((listKey) => {
                                        client.set(redisKey + ":" + keys[i], listKey);
                                        var newEtag = crypto.createHash('md5').update(keys[i],listKey).digest('hex');
                                        client.set("etag_"+redisKey + ":" + keys[i],newEtag);
                                    });
                        });
                } else {
                    if(redisKey === "plan:12xvxc345ssdsds-508"){
                        value = JSON.stringify(jsonObject);
                    }
                    client.set(redisKey, value);
                    var newEtag = crypto.createHash('md5').update(keys[i],value).digest('hex');
                    if(redisKey != "plan:12xvxc345ssdsds-508"){
                        client.set("etag_"+redisKey,newEtag);
                    }
                    contentMap.set(keys[i], value);
                    map.set(redisKey, contentMap);
            }
        }
        return map;
    }
    jsonToList(jsonArray) {
       let result = new ArrayList();
       for( var i = 0,length = jsonArray.length; i < length; i++ ) {
     
            if (Array.isArray(typeof jsonArray[ i ] )) value = this.jsonToList(jsonArray[i] );
            else if (typeof (jsonArray[ i ]) === "object") value = this.mapJson(jsonArray[i]);
            result.add(jsonArray[i] );
        }
        return result;
    }
}

module.exports = JSONServices;