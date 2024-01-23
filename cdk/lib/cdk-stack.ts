import * as cdk from 'aws-cdk-lib';
import { CfnNatGateway } from 'aws-cdk-lib/aws-ec2';
import { InstanceTarget } from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // create a vpc with 1 public subnet and 1 private subnet, and create a NAT Gateway for private subnet
    const vpc = new cdk.aws_ec2.Vpc(this, 'Vpc', {
      subnetConfiguration: [
        {
          name: 'public',
          subnetType: cdk.aws_ec2.SubnetType.PUBLIC,
        },
        {
          name: 'private',
          subnetType: cdk.aws_ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
      natGateways: 1
    });
    
    // create a new security group in vpc, allow ingress access on port 22 and 8080 from all sources
    const sg = new cdk.aws_ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc,
      allowAllOutbound: true,
      description: 'security group for ALB',
      securityGroupName: 'ALB-SG'
    });

    sg.addIngressRule(cdk.aws_ec2.Peer.anyIpv4(), cdk.aws_ec2.Port.tcp(22));
    sg.addIngressRule(cdk.aws_ec2.Peer.anyIpv4(), cdk.aws_ec2.Port.tcp(80));


    // create a instance in private subnet, using AMI ID from environment value.
    const vmServer = new cdk.aws_ec2.Instance(this, 'Instance', {
      vpc,
      instanceType: cdk.aws_ec2.InstanceType.of(cdk.aws_ec2.InstanceClass.T3, cdk.aws_ec2.InstanceSize.LARGE),
      machineImage: cdk.aws_ec2.MachineImage.lookup({
        name: 'nginx-server'
      }),
      securityGroup: sg,
      vpcSubnets: {
        subnetType: cdk.aws_ec2.SubnetType.PRIVATE_WITH_EGRESS,
        onePerAz: true
      }
    });

    // create a ALB in public subnet and a listener targeting to the instance on port 8080
    const alb = new cdk.aws_elasticloadbalancingv2.ApplicationLoadBalancer(this, 'ALB', {
      vpc,
      internetFacing: true,
      vpcSubnets: {
        subnetType: cdk.aws_ec2.SubnetType.PUBLIC,
        onePerAz: true
      },
      securityGroup: sg,
      dropInvalidHeaderFields: true
    })
    alb.addListener('Listener', {
      port: 80,
      defaultTargetGroups: [new cdk.aws_elasticloadbalancingv2.ApplicationTargetGroup(this, 'TargetGroup', {
        vpc,
        port: 80,
        protocol: cdk.aws_elasticloadbalancingv2.ApplicationProtocol.HTTP,
        targetType: cdk.aws_elasticloadbalancingv2.TargetType.INSTANCE,
        healthCheck: {
          enabled: true,
          path: '/'
        },
        targets: [new InstanceTarget(vmServer, 80)]
      })]
    })
    
    // bind a waf to ALB
    const waf = new cdk.aws_wafv2.CfnWebACL(this, 'WAF', {
      defaultAction: { allow: {} },
      scope: 'REGIONAL',
      rules: [
        {
          name: 'AWS-AWSManagedRulesBotControlRuleSet',
          priority: 0,
          statement: {
            managedRuleGroupStatement: {
              name: 'AWSManagedRulesBotControlRuleSet',
              vendorName: 'AWS',
              managedRuleGroupConfigs: [
                {
                  awsManagedRulesBotControlRuleSet:{
                    inspectionLevel: 'COMMON'
                  }

                }
              ]
            }
          },
          overrideAction: {
            none: {}
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWS-AWSManagedRulesBotControlRuleSet'
          }
        },
        {
          name: 'AWS-AWSManagedRulesAmazonIpReputationList',
          priority: 1,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesAmazonIpReputationList'
            }
          },
          overrideAction: {
            none: {}
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWS-AWSManagedRulesAmazonIpReputationList'
          }
        },
        {
          name: 'AWS-AWSManagedRulesAnonymousIpList',
          priority: 2,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesAnonymousIpList'
            }
          },
          overrideAction: {
            none: {}
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWS-AWSManagedRulesAnonymousIpList'
          }
        },
        {
          name: 'AWS-AWSManagedRulesCommonRuleSet',
          priority: 3,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet'
            }
          },
          overrideAction: {
            none: {}
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWS-AWSManagedRulesCommonRuleSet'
          }
        },
        {
          name: 'AWS-AWSManagedRulesKnownBadInputsRuleSet',
          priority: 4,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesKnownBadInputsRuleSet'
            }
          },
          overrideAction: {
            none: {}
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWS-AWSManagedRulesKnownBadInputsRuleSet'
          }
        },
        {
          name: 'AWS-AWSManagedRulesSQLiRuleSet',
          priority: 5,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesSQLiRuleSet'
            }
          },
          overrideAction: {
            none: {}
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWS-AWSManagedRulesSQLiRuleSet'
          }
        }
      ],
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'WAF',
        sampledRequestsEnabled: true
      }
    })

    // define CfnWebACLAssociation
    new cdk.aws_wafv2.CfnWebACLAssociation(this, 'WebACLAssociation', {
      resourceArn: alb.loadBalancerArn,
      webAclArn: waf.attrArn
    })

    // define loggroup and WAF logging configuration
    const logGroup = new cdk.aws_logs.LogGroup(this, 'waf-logging', {
      logGroupName: 'aws-waf-logs-dashboard',
      removalPolicy: cdk.RemovalPolicy.DESTROY
    })

    new cdk.aws_wafv2.CfnLoggingConfiguration(this, 'WAFLoggingConfiguration', {
      logDestinationConfigs: [logGroup.logGroupArn],
      resourceArn: waf.attrArn,
    })

  }
}