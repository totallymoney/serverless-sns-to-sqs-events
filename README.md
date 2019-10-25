# serverless-sns-to-sqs-events

[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)
[![CircleCI](https://circleci.com/gh/totallymoney/serverless-sns-to-sqs-events.svg?style=svg)](https://circleci.com/gh/totallymoney/serverless-sns-to-sqs-events)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A [Serverless framework](https://serverless.com/framework) plugin that simplifies the configuration of SNS to SQS to Lambda.

Instead of:

1. configure the SNS topic
2. configure the SNS subscription
3. configure the SQS queue
4. configure the SQS queue policy
5. configure the SQS event subscription for Lambda

you can do all 5 as a `snsToSqs` event:

```yml
functions:
  hello:
    handler: handler.hello
    events:
      - snsToSqs: # subscribe an existing queue to an existing topic
          sns: "arn:aws:sns:#{AWS::Region}:#{AWS::AccountId}:my-topic"
          rawMessageDelivery: true
          sqs: "arn:aws:sqs:#{AWS::Region}:#{AWS::AccountId}:my-queue"
      - snsToSqs: # reference custom resources in serverless.yml
          sns: !Ref MyTopic
          rawMessageDelivery: true
          sqs: !GetAtt MyQueue.Arn
      - snsToSqs: # configure a new queue and subscribe to new topic
          sns:
            topicName: yc-test-${self:provider.region}
            displayName: yc-test-${self:provider.region}  # required
          rawMessageDelivery: false
          batchSize: 10
          sqs:
            delaySeconds: 60
            visibilityTimeout: 120
            queueName: yc-${self:provider.region} # required
            dlq:
              maxReceiveCount: 3
              visibilityTimeout: 120
              queueName: yc-dlq-${self:provider.region} # required
```

The full schema spec is available [here](/src/schema.js).
