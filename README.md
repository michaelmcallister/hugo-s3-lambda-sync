# hugo-s3-lambda-sync
AWS Lambda Function to download the latest release of a github repo and build it with hugo (and then sync to s3!)

# Prerequisites 
* An Amazon [S3 Bucket](https://aws.amazon.com/documentation/s3/)
* A GitHub Repo

### Optional
* If you'd like this to work out of the box with minimal configuration I recommend you name your github the repo the same as your S3 bucket (which should be your blog URL)

## SNS Configuration

In order for GitHub to send you a notification when there is a commit you will need to setup SNS

* Create an [SNS Topic](https://console.aws.amazon.com/sns/v2/home?region=us-east-1#/home)
* Set the Display to 'GitHub'
* Optional: Add your e-mail address if you want to recieve a notification when there is a commit

## Create an API Key

GitHub will need credentials to publish to your SNS topic

* Create a new [IAM user](https://console.aws.amazon.com/iam/home?region=us-east-1#/users)
* Add the ```AmazonSNSRole``` policy to your user
* Save the secret access key somewhere safe (you'll need this next)

## GitHub Webhook

From GitHubs [documentation](https://developer.github.com/webhooks/creating/)

>  To set up a repository webhook on GitHub, head over to the Settings page of your repository, and click on Webhooks & services. After that, click on Add webhook.

You'll need to provide the IAM credentials that you previously created.

## Create a IAM role

Your Lambda function will need permissions to sync to S3, in order to do so head over to the [IAM Console](https://console.aws.amazon.com/iam/home?region=us-east-1#/roles)

create a role policy called ```s3_blog_upload``` and attach a policy that is similiar to the following

```
{   
    "Version": "2012-10-17",
    "Statement": [
        {   
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:GetObjectVersion",
                "s3:DeleteObject",
                "s3:DeleteObjectVersion"
            ],
            "Resource": "arn:aws:s3:::BUCKETNAME/*"
        },
        {   
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
                "logs:DescribeLogStreams"
            ],
            "Resource": "arn:aws:logs:::*"
        }
    ]
}
```

Note: the logs actions are optional. Include them if you want the output of the Lambda function to be returned to you

## Lambda

Download the code from [michaelmcallister/hugo-s3-lambda-sync](https://github.com/michaelmcallister/hugo-s3-lambda-sync)

* Create a new [Lambda function](https://console.aws.amazon.com/lambda/home?region=us-east-1#/create/select-blueprint) named BlogSync
* Select your GitHub SNS topic as the trigger
* under 'Lambda function code' select the code entry type as 'upload a .ZIP file'
* select the master.zip file you just downloaded
* select the role you just created (s3_blog_upload)

## Testing

* Head over to your [Lambda function](https://console.aws.amazon.com/lambda/home?region=us-east-1#/functions/BlogSync?tab=code)
* Click on Test and use an event template such as this:

```
{
  "Records": [
    {
      "EventVersion": "1.0",
      "EventSubscriptionArn": "arn:aws:sns:EXAMPLE",
      "EventSource": "aws:sns",
      "Sns": {
        "SignatureVersion": "1",
        "Timestamp": "1970-01-01T00:00:00.000Z",
        "Signature": "EXAMPLE",
        "SigningCertUrl": "EXAMPLE",
        "MessageId": "95df01b4-ee98-5cb9-9903-4c221d41eb5e",
        "Message": {
          "repository": {
            "name": "REPO_NAME",
            "full_name": "USER/REPO_NAME",
        "html_url": "https://github.com/USER/REPO_NAME"
          }
        }
      }
    }
  ]
}
```

* Watch the Execution result for the messages - there's enough logging to try and pinpoint where the issue lies. Here's an example of mine

![Lambda Success](https://blog.skunkw0rks.io/images/lambda_output.png)

