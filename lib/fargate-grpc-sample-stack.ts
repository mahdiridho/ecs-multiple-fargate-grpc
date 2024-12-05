import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps } from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';

export class FargateGrpcSampleStack extends Stack {
  constructor(scope: cdk.App, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create a VPC
    const vpc = new ec2.Vpc(this, 'GrpcVpc', {
      maxAzs: 2, // Default is all AZs in the region
    });

    // Create an ECS cluster
    const cluster = new ecs.Cluster(this, 'GrpcCluster', {
      vpc,
    });

    // Task role
    const taskRole = new iam.Role(this, 'TaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    taskRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy')
    );

    // Create Task Definition for gRPC Server (Existing Fargate Service)
    const grpcServerTaskDef1 = new ecs.FargateTaskDefinition(this, 'GrpcServerTaskDef1', {
      memoryLimitMiB: 512,
      cpu: 256,
      taskRole,
    });
    const grpcServerTaskDef2 = new ecs.FargateTaskDefinition(this, 'GrpcServerTaskDef2', {
      memoryLimitMiB: 512,
      cpu: 256,
      taskRole,
    });

    const grpcServerContainer1 = grpcServerTaskDef1.addContainer('GrpcServerContainer1', {
      image: ecs.ContainerImage.fromAsset('./docker/server'), // gRPC server Dockerfile directory
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'GrpcServer1' }),
      environment: {
        NODE_ENV: 'production',
        SERVER_NAME: 'server1'
      },
    });
    const grpcServerContainer2 = grpcServerTaskDef2.addContainer('GrpcServerContainer2', {
      image: ecs.ContainerImage.fromAsset('./docker/server'), // gRPC server Dockerfile directory
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'GrpcServer2' }),
      environment: {
        NODE_ENV: 'production',
        SERVER_NAME: 'server2'
      },
    });

    grpcServerContainer1.addPortMappings({
      containerPort: 4001,
    });
    grpcServerContainer2.addPortMappings({
      containerPort: 4001,
    });

    // Create Security Group for gRPC Server
    const grpcServerSG = new ec2.SecurityGroup(this, 'GrpcServerSG', {
      vpc,
      description: 'Security group for gRPC server',
      allowAllOutbound: true
    });

    grpcServerSG.addIngressRule(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.tcp(4001), 'Allow gRPC traffic from NLB');
    grpcServerSG.addIngressRule(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.tcp(8080), 'Allow health check traffic from NLB');

    // Create gRPC Server Fargate Service
    const grpcServerService1 = new ecs.FargateService(this, 'GrpcServerService1', {
      cluster,
      taskDefinition: grpcServerTaskDef1,
      securityGroups: [grpcServerSG],
      desiredCount: 1,
    });
    const grpcServerService2 = new ecs.FargateService(this, 'GrpcServerService2', {
      cluster,
      taskDefinition: grpcServerTaskDef2,
      securityGroups: [grpcServerSG],
      desiredCount: 1,
    });

    // Create a Network Load Balancer for gRPC Server
    const nlb = new elbv2.NetworkLoadBalancer(this, 'GrpcNlb', {
      vpc,
      internetFacing: true,
    });

    const listener = nlb.addListener('GrpcListener', {
      port: 4001,
      protocol: elbv2.Protocol.TCP, // NLB uses TCP to support HTTP/2 for gRPC
    });
    
    listener.addTargets('GrpcServerTarget', {
      port: 4001, // Target gRPC server on port 4001
      targets: [grpcServerService1.loadBalancerTarget({
        containerName: 'GrpcServerContainer1',
        containerPort: 4001,
      }), grpcServerService2.loadBalancerTarget({
        containerName: 'GrpcServerContainer2',
        containerPort: 4001,
      })],
      healthCheck: {
        port: '8080', // Health check HTTP endpoint
        protocol: elbv2.Protocol.HTTP, // Health check via HTTP
        path: '/health', // A simple HTTP health check endpoint
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5), // Increase timeout for slow startups
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 2,
      },
    });

    // Enable autoscaling for gRPC Server
    const grpcServerScaling1 = grpcServerService1.autoScaleTaskCount({ maxCapacity: 3 });
    grpcServerScaling1.scaleOnCpuUtilization('GrpcServerCpuScaling1', {
      targetUtilizationPercent: 50,
    });
    const grpcServerScaling2 = grpcServerService2.autoScaleTaskCount({ maxCapacity: 3 });
    grpcServerScaling2.scaleOnCpuUtilization('GrpcServerCpuScaling2', {
      targetUtilizationPercent: 50,
    });

    // Create Task Definition for gRPC Client (New Internal Fargate Service)
    const grpcClientTaskDef = new ecs.FargateTaskDefinition(this, 'GrpcClientTaskDef', {
      memoryLimitMiB: 512,
      cpu: 256,
      taskRole,
    });

    const grpcClientContainer = grpcClientTaskDef.addContainer('GrpcClientContainer', {
      image: ecs.ContainerImage.fromAsset('./docker/client'), // gRPC client Dockerfile directory
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'GrpcClient' }),
      environment: {
        NODE_ENV: 'production',
        GRPC_SERVER_HOST: nlb.loadBalancerDnsName, // Point to the NLB DNS name
      },
    });

    grpcClientContainer.addPortMappings({
      containerPort: 4000,
    });

    // Create Security Group for gRPC Client
    const grpcClientSG = new ec2.SecurityGroup(this, 'GrpcClientSG', {
      vpc,
      description: 'Security group for gRPC client',
      allowAllOutbound: true,
    });

    grpcClientSG.addIngressRule(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.tcp(4001), 'Allow gRPC client to communicate with server');

    // Create gRPC Client Fargate Service
    new ecs.FargateService(this, 'GrpcClientService', {
      cluster,
      taskDefinition: grpcClientTaskDef,
      securityGroups: [grpcClientSG],
      desiredCount: 1,
    });
  }
}
