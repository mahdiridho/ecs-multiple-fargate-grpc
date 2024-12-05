const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const PROTO_PATH = './service.proto';
const GRPC_SERVER_HOST = process.env.GRPC_SERVER_HOST || 'localhost';

const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const grpcObject = grpc.loadPackageDefinition(packageDefinition);
const grpcService = grpcObject.MyService;

// Configure client to use NLB DNS name 
const client = new grpcService(
  `${GRPC_SERVER_HOST}:4003`,
  grpc.credentials.createInsecure(),
  {
    'grpc.lb_policy_name': 'pick_first', // Disable client-side load balancing
    // 'grpc.enable_retries': 1,
    // 'grpc.service_config': JSON.stringify({
    //   loadBalancingConfig: [{ round_robin: {} }],
    //   methodConfig: [{
    //     name: [{ service: 'YourService' }],
    //     retryPolicy: {
    //       maxAttempts: 3,
    //       initialBackoff: '0.1s',
    //       maxBackoff: '1s',
    //       backoffMultiplier: 2,
    //       retryableStatusCodes: ['UNAVAILABLE']
    //     }
    //   }]
    // })
  }
);

let getMsg = false;
function sendInterval() {
  if (!getMsg) {
    setTimeout(() => {
      client.sayHello({ message: 'Hello from gRPC Client' }, (error, response) => {
        if (error) {
          console.error('Error:', error);
        } else {
          console.log('Response:', response.message);
          // getMsg = true;
        }
      });
    }, 5000)
  }
}

sendInterval();