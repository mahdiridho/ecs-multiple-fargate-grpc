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

    // Create a Fargate Task Definition
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'GrpcTaskDef', {
      memoryLimitMiB: 512,
      cpu: 256,
      taskRole,
    });

    const container = taskDefinition.addContainer('GrpcContainer', {
      image: ecs.ContainerImage.fromAsset('./docker'), // Use Dockerfile from local directory
      environment: {
        NODE_ENV: 'production',
      },
    });

    container.addPortMappings({
      containerPort: 4001,
    });

    // Create a Security Group
    const securityGroup = new ec2.SecurityGroup(this, 'GrpcServiceSG', {
      vpc,
      description: 'Allow traffic for Fargate service',
      allowAllOutbound: true,
    });

    // Allow traffic from the NLB to the Fargate service
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(4001), 'Allow traffic on port 4001');

    // Create the Fargate service
    const service = new ecs.FargateService(this, 'GrpcService', {
      cluster,
      taskDefinition,
      securityGroups: [securityGroup],
      desiredCount: 1,
    });

    // Create a Network Load Balancer
    const nlb = new elbv2.NetworkLoadBalancer(this, 'GrpcNlb', {
      vpc,
      internetFacing: true,
    });

    const listener = nlb.addListener('GrpcListener', {
      port: 4001,
    });

    listener.addTargets('GrpcTarget', {
      port: 4001,
      targets: [service.loadBalancerTarget({
        containerName: 'GrpcContainer',
        containerPort: 4001,
      })],
      healthCheck: {
        port: '4001',
        protocol: elbv2.Protocol.HTTP,
        path: '/',
      },
    });

    // Enable autoscaling
    const scaling = service.autoScaleTaskCount({ maxCapacity: 3 });
    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 50,
    });
  }
}
