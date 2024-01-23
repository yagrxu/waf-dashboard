export PKR_VAR_aws_access_key=$AWS_ACCESS_KEY_ID                                                                                

export PKR_VAR_aws_secret_key=$AWS_SECRET_ACCESS_KEY

packer build nginx.pkr.hcl 

