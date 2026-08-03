output "lambda_function_arn" {
  description = "ARN of the AWS Lambda Function"
  value       = aws_lambda_function.ai_service.arn
}

output "lambda_function_name" {
  description = "Name of the AWS Lambda Function"
  value       = aws_lambda_function.ai_service.function_name
}

output "api_gateway_endpoint" {
  description = "Public API Gateway HTTP endpoint"
  value       = aws_apigatewayv2_stage.default_stage.invoke_url
}
