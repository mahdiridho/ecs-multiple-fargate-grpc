# Intoduction

This project is a Proof of Concept (POC) for deploying Fargate applications to perform gRPC communication within the same ECS cluster. It includes service auto-scaling and an integrated Network Load Balancer (NLB) to automate task distribution.

The project utilizes AWS CDK and GitHub Actions for CI/CD management.

# Prerequisites

Before getting started, ensure you have the following:

- An AWS account
- GitHub secrets configured with the following variables:
    AWS_ACCESS_KEY_ID
    AWS_SECRET_ACCESS_KEY
    AWS_ACCOUNT_ID
    AWS_REGION
- Docker (optional) if you want to test or deploy locally.

# Local Deployment

To deploy the project locally, follow these steps:

1. Set up the CDK bootstrap:

```
cdk bootstrap --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess --force aws://<AWS_ACCOUNT_ID>/<AWS_REGION>
```

2. Deploy the project:

```
cdk deploy --all --require-approval never --app "node cdk.out/bin/fargate-grpc-sample.js"
```

# Validation Testing

After a successful deployment, verify the setup as follows:

1. Navigate to the Fargate services in the AWS Management Console.
2. Check the events section to ensure both services are in a steady state.
3. Review the logs to validate gRPC request/response communication between services.