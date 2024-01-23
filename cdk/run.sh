
export CDK_DEFAULT_ACCOUNT=`aws sts get-caller-identity --profile global | jq .Account -r`
export CDK_DEFAULT_REGION=`aws configure get region --profile global`