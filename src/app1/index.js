const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Load gRPC Proto
const packageDef = protoLoader.loadSync(path.resolve(__dirname, 'proto/service.proto'));
const grpcObject = grpc.loadPackageDefinition(packageDef);
const service = grpcObject.MyService;

// Start gRPC Server
const server = new grpc.Server();
server.addService(service.service, {
  sayHello: (call, callback) => {
    callback(null, { message: `Hello ${call.request.name} from App1!` });
  },
});

server.bindAsync('0.0.0.0:4000', grpc.ServerCredentials.createInsecure(), (error, port) => {
  if (error) {
    console.error(`Server error: ${error.message}`);
    return;
  }
  console.log(`App1 running on port ${port}`);
});
