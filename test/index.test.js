const _ = require("lodash");
const Serverless = require("serverless/lib/Serverless");
const AwsProvider = require("serverless/lib/plugins/aws/provider/awsProvider");
const CLI = require("serverless/lib/classes/CLI");
const SnsToSqsPlugin = require("../src/index");

let serverless;
let snsToSqsPlugin;
let hook = "before:package:compileEvents";

process.env.SLS_DEBUG = "*";

beforeEach(() => {
	serverless = new Serverless();
	serverless.service.service = "hello-world";
	const options = {
		stage: "dev",
		region: "us-east-1"
	};	
	serverless.setProvider("aws", new AwsProvider(serverless));
	serverless.service.provider.compiledCloudFormationTemplate = {
		Resources: {      
		}
	};
	serverless.cli = new CLI(serverless);
	snsToSqsPlugin = new SnsToSqsPlugin(serverless, options);
});

describe("serverless-sns-to-sqs-events", () => {
	test("when there is no snsToSqs events, no additional resources are created", () => {
		serverless.service.functions = {
			hello: {
				handler: "handler.hello",
			}
		};
    
		snsToSqsPlugin.hooks[hook]();
		const resources = serverless.service.provider.compiledCloudFormationTemplate.Resources;
		expect(resources).toEqual({});
	});
  
	test("when schema is wrong, it errors", () => {
		serverless.service.functions = {
			hello: {
				handler: "handler.hello",
				events: [{
					snsToSqs: {
						sns: [42]
					}
				}]
			}
		};
    
		expect(snsToSqsPlugin.hooks[hook]).toThrow();
	});
  
	test("when SNS is a Ref and SQS is a GetAtt, no topic or queue is created", () => {
		const snsArn = { Ref: "MyTopic" };
		const sqsArn = { "Fn::GetAtt": ["MyQueue", "Arn"] };
		const sqsUrl = { Ref: "MyQueue" };
		givenAnSnsToSqsEvent(snsArn, sqsArn);

		snsToSqsPlugin.hooks[hook]();
		const resources = serverless.service.provider.compiledCloudFormationTemplate.Resources;
    
		noQueueOrTopicIsCreated(resources, snsArn, sqsArn, sqsUrl); 
	});
  
	test("when SNS is an ARN, no topic is created", () => {
		const snsArn = "arn:aws:sns:us-east-1:12345:my-topic";
		const sqsArn = { "Fn::GetAtt": ["MyQueue", "Arn"] };
		const sqsUrl = { Ref: "MyQueue" };
		givenAnSnsToSqsEvent(snsArn, sqsArn);

		snsToSqsPlugin.hooks[hook]();
		const resources = serverless.service.provider.compiledCloudFormationTemplate.Resources;
    
		noQueueOrTopicIsCreated(resources, snsArn, sqsArn, sqsUrl); 
	});

	test("when SNS is an ImportValue, no topic is created", () => {
		const snsArn = { "Fn::ImportValue": "MyExportedTopic"};
		const sqsArn = { "Fn::GetAtt": ["MyQueue", "Arn"] };
		const sqsUrl = { Ref: "MyQueue" };
		givenAnSnsToSqsEvent(snsArn, sqsArn);

		snsToSqsPlugin.hooks[hook]();
		const resources = serverless.service.provider.compiledCloudFormationTemplate.Resources;
		 
		noQueueOrTopicIsCreated(resources, snsArn, sqsArn, sqsUrl); 
	});
  
	test("when SQS is an ARN, no queue is created", () => {
		const snsArn = { Ref: "MyTopic" };
		const sqsArn = "arn:aws:sqs:us-east-1:12345:my-queue";
		const sqsUrl = "https://sqs.us-east-1.amazonaws.com/12345/my-queue";
		givenAnSnsToSqsEvent(snsArn, sqsArn);

		snsToSqsPlugin.hooks[hook]();
		const resources = serverless.service.provider.compiledCloudFormationTemplate.Resources;
    
		noQueueOrTopicIsCreated(resources, snsArn, sqsArn, sqsUrl); 
	});
  
	test("when SNS is not a Ref or an Arn, a new topic is created", () => {
		const sns = {
			topicName: "topicName",
			displayName: "displayName"
		};
		const sqsArn = { "Fn::GetAtt": ["MyQueue", "Arn"] };
		const sqsUrl = { Ref: "MyQueue" };
		givenAnSnsToSqsEvent(sns, sqsArn);

		snsToSqsPlugin.hooks[hook]();
		const resources = serverless.service.provider.compiledCloudFormationTemplate.Resources;
    
		expect(Object.keys(resources)).toHaveLength(3);
    
		const logicalId = shouldAddSnsTopic(resources, "topicName", "displayName");
		const snsArn = { Ref: logicalId };
    
		shouldAddSnsSubscription(resources, snsArn, sqsArn);
		shouldAddQueuePolicy(resources, snsArn, sqsArn, sqsUrl); 
	});
  
	test("when SNS logicalId is defined, it's used instead", () => {
		const sns = {
			logicalId: "MyTopic",
			topicName: "topicName",
			displayName: "displayName"
		};
		const sqsArn = { "Fn::GetAtt": ["MyQueue", "Arn"] };
		const sqsUrl = { Ref: "MyQueue" };
		givenAnSnsToSqsEvent(sns, sqsArn);

		snsToSqsPlugin.hooks[hook]();
		const resources = serverless.service.provider.compiledCloudFormationTemplate.Resources;
    
		expect(Object.keys(resources)).toHaveLength(3);
    
		const snsArn = { Ref: "MyTopic" };
    
		shouldAddSnsSubscription(resources, snsArn, sqsArn);
		shouldAddQueuePolicy(resources, snsArn, sqsArn, sqsUrl); 
	});
  
	test("when SQS is not a GetAtt or an Arn, a new queue is created", () => {
		const snsArn = { Ref: "my-topic" };
		const sqs = {
			queueName: "my-queue"
		};
		givenAnSnsToSqsEvent(snsArn, sqs);

		snsToSqsPlugin.hooks[hook]();
		const resources = serverless.service.provider.compiledCloudFormationTemplate.Resources;
    
		expect(Object.keys(resources)).toHaveLength(3);
    
		const logicalId = shouldAddSqsQueue(resources, "my-queue");
		const sqsArn = { "Fn::GetAtt": [logicalId, "Arn"] };
		const sqsUrl = { Ref: logicalId };
        
		shouldAddSnsSubscription(resources, snsArn, sqsArn);
		shouldAddQueuePolicy(resources, snsArn, sqsArn, sqsUrl); 
	});
  
	test("when SQS logicalId is defined, it's used instead", () => {
		const snsArn = { Ref: "my-topic" };
		const sqs = {
			logicalId: "MyQueue",
			queueName: "my-queue"
		};
		givenAnSnsToSqsEvent(snsArn, sqs);

		snsToSqsPlugin.hooks[hook]();
		const resources = serverless.service.provider.compiledCloudFormationTemplate.Resources;
    
		expect(Object.keys(resources)).toHaveLength(3);
    
		const sqsArn = { "Fn::GetAtt": ["MyQueue", "Arn"] };
		const sqsUrl = { Ref: "MyQueue" };
        
		shouldAddSnsSubscription(resources, snsArn, sqsArn);
		shouldAddQueuePolicy(resources, snsArn, sqsArn, sqsUrl);
	});
  
	test("when SQS defines a DLQ, two new queues are created", () => {
		const snsArn = { Ref: "my-topic" };
		const sqs = {
			queueName: "my-queue",
			dlq: {
				queueName: "my-dlq-queue",
				maxReceiveCount: 3
			}
		};
		givenAnSnsToSqsEvent(snsArn, sqs);

		snsToSqsPlugin.hooks[hook]();
		const resources = serverless.service.provider.compiledCloudFormationTemplate.Resources;
    
		expect(Object.keys(resources)).toHaveLength(4);
    
		const logicalId = shouldAddSqsQueue(resources, "my-queue");
		const sqsArn = { "Fn::GetAtt": [logicalId, "Arn"] };
		const sqsUrl = { Ref: logicalId };
    
		const dlqLogicalId = shouldAddSqsQueue(resources, "my-dlq-queue");
		const sqsResource = resources[logicalId];
		expect(sqsResource.Properties.RedrivePolicy).toEqual({
			maxReceiveCount: 3,
			deadLetterTargetArn: {
				"Fn::GetAtt": [dlqLogicalId, "Arn"]
			}
		});
        
		shouldAddSnsSubscription(resources, snsArn, sqsArn);
		shouldAddQueuePolicy(resources, snsArn, sqsArn, sqsUrl);
	});
  
	test("when DLQ logicalId is defined, it's used instead", () => {
		const snsArn = { Ref: "my-topic" };
		const sqs = {
			queueName: "my-queue",
			dlq: {
				logicalId: "MyDLQ",
				queueName: "my-dlq-queue",
				maxReceiveCount: 3
			}
		};
		givenAnSnsToSqsEvent(snsArn, sqs);

		snsToSqsPlugin.hooks[hook]();
		const resources = serverless.service.provider.compiledCloudFormationTemplate.Resources;
    
		expect(Object.keys(resources)).toHaveLength(4);
    
		const logicalId = shouldAddSqsQueue(resources, "my-queue");
		const sqsArn = { "Fn::GetAtt": [logicalId, "Arn"] };
		const sqsUrl = { Ref: logicalId };
    
		const sqsResource = resources[logicalId];
		expect(sqsResource.Properties.RedrivePolicy).toEqual({
			maxReceiveCount: 3,
			deadLetterTargetArn: {
				"Fn::GetAtt": ["MyDLQ", "Arn"]
			}
		});
        
		shouldAddSnsSubscription(resources, snsArn, sqsArn);
		shouldAddQueuePolicy(resources, snsArn, sqsArn, sqsUrl);
	});
});

function givenAnSnsToSqsEvent (sns, sqs, rawDelivery) {
	serverless.service.functions = {
		hello: {
			handler: "handler.hello",
			events: [{
				snsToSqs: {
					sns,
					rawMessageDelivery: rawDelivery,
					sqs
				}
			}]
		}
	};    
}

function noQueueOrTopicIsCreated (resources, snsArn, sqsArn, sqsUrl) {
	expect(Object.keys(resources)).toHaveLength(2);
	shouldAddSnsSubscription(resources, snsArn, sqsArn);
	shouldAddQueuePolicy(resources, snsArn, sqsArn, sqsUrl); 
}

function shouldAddSqsQueue (resources, queueName) {
	const keys = Object.keys(resources);
	const match = keys.find(key => {
		const x = resources[key];
    
		return x.Type === "AWS::SQS::Queue"
      && _.isEqual(x.Properties.QueueName, queueName);
	});
  
	expect(match).toBeTruthy();
	return match;
}

function shouldAddSnsTopic (resources, topicName, displayName) {
	const keys = Object.keys(resources);
	const match = keys.find(key => {
		const x = resources[key];
    
		return x.Type === "AWS::SNS::Topic"
      && _.isEqual(x.Properties, {
      	DisplayName : displayName,
      	TopicName : topicName
      });
	});
  
	expect(match).toBeTruthy();
	return match;
}

function shouldAddSnsSubscription (resources, snsArn, sqsArn, rawDelivery, filterPolicy) {
	const match = _.values(resources).find(x => 
		x.Type === "AWS::SNS::Subscription"
    && _.isEqual(x.Properties, {
    	Protocol: "sqs",
    	Endpoint: sqsArn,
    	RawMessageDelivery: rawDelivery,
    	FilterPolicy: filterPolicy,
    	TopicArn : snsArn
    })
	);
  
	expect(match).toBeTruthy();
}

function shouldAddQueuePolicy (resources, snsArn, sqsArn, sqsUrl) {
	const match = _.values(resources).find(x =>
		x.Type === "AWS::SQS::QueuePolicy"
    && _.isEqual(x.Properties.Queues[0], sqsUrl)
    && _.isEqual(x.Properties.PolicyDocument.Statement.Resource, sqsArn)
    && _.isEqual(x.Properties.PolicyDocument.Statement.Condition.ArnEquals["aws:SourceArn"], snsArn)
	);
  
	expect(match).toBeTruthy();
}
