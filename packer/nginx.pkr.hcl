packer {
  required_plugins {
    amazon = {
      version = ">= 1.2.8"
      source  = "github.com/hashicorp/amazon"
    }
  }
}
variable "aws_access_key" {
  type = string
  // default = "hardcoded_key"
}

variable "aws_secret_key" {
  type = string
  // default = "hardcoded_secret_key"
}

source "amazon-ebs" "al2023" {
  ami_name      = "nginx-server"
  instance_type = "t3.large"
  access_key = var.aws_access_key
  secret_key =  var.aws_secret_key
  region        = "ap-southeast-1"
  source_ami_filter {
    filters = {
      name                = "al2023-ami-2023*x86_64*"
      root-device-type    = "ebs"
      virtualization-type = "hvm"
    }
    most_recent = true
    owners      = ["amazon"]
  }
  ssh_username = "ec2-user"
}

build {
  name = "waf-dashboard"
  sources = [
    "source.amazon-ebs.al2023"
  ]
  provisioner "shell" {
    inline = [
      "sudo dnf update",
      "sudo dnf install -y nginx",
      "sudo systemctl start nginx.service",
      "sudo systemctl status nginx.service",
      "sudo systemctl enable nginx.service",
    ]
  }
}

