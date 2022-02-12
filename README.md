## About
This Project was created as a apart of INFO7255 course in Fall 2021. 
This is a search and indexing tool for adding insurance coverage plans into redis server using REST API PUT, GET, POST, PATCH, DELETE requests, forwarding data into indexer and search using Elastic search(connected to Kibana). 


# Features Implemented:
- Rest API that can handle any structured data in Json
- Rest API with support for crud operations, including merge support, cascaded delete
- Rest API with support for validation
- Json Schema describing the data model for the use case
- Advanced semantics with rest API operations such as update if not changed
- Storage of data in key/value store and Elastic
- Search with Parent/Child queries using Elastic
- Queue implementation
- Parent-Child indexing
- Security (OAuth implementation - generating RSA token)

# Demo:


# How to Use:
- Install Kibana
- Install Elastic Search
- Install Redis server
- Use Postman application
- Run the application in Visual Studio Code
- Run redis, kibana and elastic search
- Using postman send rest api requests
- Search coverage plans in local host port 5601 
