const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const PROTO_PATH = './service.proto';
const GRPC_SERVER_HOST = process.env.GRPC_SERVER_HOST || 'localhost';

const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const grpcObject = grpc.loadPackageDefinition(packageDefinition);
const grpcService = grpcObject.MyService;

const client = new grpcService(
  `${GRPC_SERVER_HOST}:4001`,
  grpc.credentials.createInsecure(),
  {
    'grpc.lb_policy_name': 'pick_first'
  }
);

client.sayHello({ message: 'Hello from gRPC Client' }, (error, response) => {
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Response:', response.message);
    getMsg = true;
  }
});

let getMsg = false;
let attempts = 10;
function sendInterval() {
  if (!getMsg) {
    setTimeout(() => {
      client.sayHello({ message: 'Hello from gRPC Client' }, (error, response) => {
        if (error) {
          console.error('Error:', error);
        } else {
          console.log('Response:', response.message);
          if (--attempts === 0) {
            getMsg = true;
          }
        }
      });
    }, 5000)
  }
}

sendInterval();