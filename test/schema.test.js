const schema = require("../src/schema");

describe("schema", () => {
	test('when "sns" is missing it should error', () => {
		const {error} = schema.validate({
			sqs: "arn:aws:sqs"
		});
    
		expect(error).toBeTruthy();
	});
  
	test('when "sqs" is missing it should error', () => {
		const {error} = schema.validate({
			sns: "arn:aws:sns"
		});
    
		expect(error).toBeTruthy();
	});
  
	test("sns and sqs can be a simple ARN", () => {
		const {error} = schema.validate({
			sns: "arn:aws:sns",
			sqs: "arn:aws:sqs"
		});
    
		expect(error).toBeFalsy();
	});
  
	test("sns can be a Ref", () => {
		const {error} = schema.validate({
			sns: {
				Ref: "MyTopic"
			},
			sqs: "arn:aws:sqs"
		});
    
		expect(error).toBeFalsy();
	});
  
	test("sns can be a simple Sub", () => {
		const {error} = schema.validate({
			sns: {
				"Fn::Sub": "arn:aws:sns:${AWS::Region}:${AWS::Account}:topic"
			},
			sqs: "arn:aws:sqs"
		});
    
		expect(error).toBeFalsy();
	});
  
	test("sns can be a complex Sub", () => {
		const {error} = schema.validate({
			sns: {
				"Fn::Sub": [
					"arn:aws:sns:${AWS::Region}:${AWS::Account}:${TopicName}",
					{
						"TopicName": "MyTopic"
					}
				]
			},
			sqs: "arn:aws:sqs"
		});
    
		expect(error).toBeFalsy();
	});
  
	test("sns can be a simple ImportValue", () => {
		const {error} = schema.validate({
			sns: {
				"Fn::ImportValue": "OtherStack-TopicName"
			},
			sqs: "arn:aws:sqs"
		});
    
		expect(error).toBeFalsy();
	});
  
	test("sns can be a complex ImportValue", () => {
		const {error} = schema.validate({
			sns: {
				"Fn::ImportValue": {
					"Fn::Sub": "${OtherStack}-TopicName"
				}
			},
			sqs: "arn:aws:sqs"
		});
    
		expect(error).toBeFalsy();
	});
  
	test("sns can be an object", () => {
		const {error} = schema.validate({
			sns: {
				displayName: "my-topic",
				topicName: "my-topic"
			},
			sqs: "arn:aws:sqs"
		});
    
		expect(error).toBeFalsy();
	});
  
	test("when sns is an object, sns.displayName is required", () => {
		const {error} = schema.validate({
			sns: {
				topicName: "my-topic"
			},
			sqs: "arn:aws:sqs"
		});
    
		expect(error).toBeTruthy();
	});
  
	test("sqs can be a GetAtt", () => {
		const {error} = schema.validate({
			sns: "arn:aws:sns",
			sqs: {
				"Fn::GetAtt": ["MyQueue", "Arn"]
			}
		});
    
		expect(error).toBeFalsy();
	});
  
	test("sqs can be a simple Sub", () => {
		const {error} = schema.validate({
			sns: "arn:aws:sns",
			sqs: {
				"Fn::Sub": "arn:aws:sqs:${AWS::Region}:${AWS::Account}:myQueue"
			}
		});
    
		expect(error).toBeFalsy();
	});
  
	test("sqs can be a complex Sub", () => {
		const {error} = schema.validate({
			sns: "arn:aws:sns",
			sqs: {
				"Fn::Sub": [
					"arn:aws:sqs:${AWS::Region}:${AWS::Account}:${QueueName}",
					{
						"QueueName": "MyQueue"
					}
				]
			}			
		});
    
		expect(error).toBeFalsy();
	});
  
	test("sqs can be a simple ImportValue", () => {
		const {error} = schema.validate({
			sns: "arn:aws:sns",
			sqs: {
				"Fn::ImportValue": "OtherStack-QueueName"
			},
		});
    
		expect(error).toBeFalsy();
	});
  
	test("sqs can be a complex ImportValue", () => {
		const {error} = schema.validate({
			sns: "arn:aws:sns",
			sqs: {
				"Fn::ImportValue": {
					"Fn::Sub": "${OtherStack}-QueueName"
				}
			},
		});
    
		expect(error).toBeFalsy();
	});
  
	test("sqs can be an object", () => {
		const {error} = schema.validate({
			sns: "arn:aws:sns",
			sqs: {
				queueName: "my-queue",
				delaySeconds: 30
			}
		});
    
		expect(error).toBeFalsy();
	});
  
	test("when sqs is an object, sqs.queueName is required", () => {
		const {error} = schema.validate({
			sns: "arn:aws:sns",
			sqs: {
				delaySeconds: 30
			}
		});
    
		expect(error).toBeTruthy();
	});
});
