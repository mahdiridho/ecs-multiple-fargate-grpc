const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Load gRPC Proto
const packageDef = protoLoader.loadSync(path.resolve(__dirname, 'proto/service.proto'));
const grpcObject = grpc.loadPackageDefinition(packageDef);
const service = grpcObject.MyService;

// Connect to App1 via Service Discovery
const app1ServiceUrl = process.env.APP1_SERVICE_URL || 'localhost:4000';
console.log(`Connecting to App1 at ${app1ServiceUrl}`);

const client = new service(app1ServiceUrl, grpc.credentials.createInsecure());

client.sayHello({ name: 'App2' }, (error, response) => {
  if (error) {
    console.error('Error connecting to App1:', error.message);
  } else {
    console.log('Response from App1:', response.message);
  }
});
