import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class FargateGrpcSampleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC
    const vpc = new ec2.Vpc(this, 'Vpc', { maxAzs: 2 });

    // ECS Cluster with Cloud Map
    const cluster = new ecs.Cluster(this, 'EcsCluster', {
      vpc,
      defaultCloudMapNamespace: {
        name: 'local', // Namespace for service discovery
      },
    });

    // Security Group for ECS Services
    const serviceSecurityGroup = new ec2.SecurityGroup(this, 'ServiceSecurityGroup', {
      vpc,
      description: 'Allow internal communication between ECS services',
    });
    serviceSecurityGroup.addIngressRule(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.tcp(4000), 'Allow internal traffic on port 4000');

    // App1 Task Definition
    const app1TaskDef = new ecs.FargateTaskDefinition(this, 'App1TaskDef');
    const app1Container = app1TaskDef.addContainer('App1Container', {
      image: ecs.ContainerImage.fromAsset('./src/app1'),
      memoryLimitMiB: 512,
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'App1' }),
    });
    app1Container.addPortMappings({ containerPort: 4000 });

    // App1 ECS Service with Service Discovery
    new ecs.FargateService(this, 'App1Service', {
      cluster,
      taskDefinition: app1TaskDef,
      desiredCount: 1,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      cloudMapOptions: {
        name: 'app1', // Service name in Cloud Map
      },
      securityGroups: [serviceSecurityGroup],
    });

    // App2 Task Definition
    const app2TaskDef = new ecs.FargateTaskDefinition(this, 'App2TaskDef');
    const app2Container = app2TaskDef.addContainer('App2Container', {
      image: ecs.ContainerImage.fromAsset('./src/app2'),
      memoryLimitMiB: 512,
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'App2' }),
      environment: {
        APP1_SERVICE_URL: 'app1.local:4000', // Service discovery DNS
      },
    });
    app2Container.addPortMappings({ containerPort: 4001 });

    // App2 ECS Service
    new ecs.FargateService(this, 'App2Service', {
      cluster,
      taskDefinition: app2TaskDef,
      desiredCount: 1,
      securityGroups: [serviceSecurityGroup],
    });
  }
}
