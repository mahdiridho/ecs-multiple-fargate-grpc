const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const express = require('express');

const PROTO_PATH = './service.proto';

const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const grpcObject = grpc.loadPackageDefinition(packageDefinition);
const grpcService = grpcObject.MyService;

// gRPC Server
const grpcServer = new grpc.Server();

const GRPC_PORT = Number(process.env.SERVER_PORT);

grpcServer.addService(grpcService.service, {
  sayHello: (call, callback) => {
    console.log(`Received message: ${call.request.message}`);
    callback(null, { message: `Hello from gRPC Server in port ${GRPC_PORT}` });
  },
});

grpcServer.bindAsync(`0.0.0.0:${GRPC_PORT}`, grpc.ServerCredentials.createInsecure(), () => {
  console.log(`gRPC Server running on port ${GRPC_PORT}`);
});

// HTTP Health Check Server
const app = express();
const HTTP_PORT = 8080;

app.get('/health', (req, res) => {
  res.status(200).send('Healthy');
});

app.listen(HTTP_PORT, () => {
  console.log(`Health check server running on port ${HTTP_PORT}`);
});
