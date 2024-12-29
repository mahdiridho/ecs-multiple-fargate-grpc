#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { FargateGrpcSampleStack } from '../lib/fargate-grpc-sample-stack';

const app = new cdk.App();
new FargateGrpcSampleStack(app, 'FargateGrpcSampleStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
