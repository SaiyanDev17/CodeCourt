// Validation middleware using Joi
const Joi = require('joi');

/**
 * Validate request body against Joi schema
 * @param {Joi.Schema} schema - Joi validation schema
 */
exports.validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(422).json({
        error: 'Validation Error',
        details: errors
      });
    }
    
    // Replace req.body with validated value
    req.body = value;
    next();
  };
};

/**
 * Common validation schemas
 */
exports.schemas = {
  // Auth schemas
  register: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required()
  }),
  
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),
  
  // Problem schemas
  createProblem: Joi.object({
    title: Joi.string().min(3).max(200).required(),
    slug: Joi.string().pattern(/^[a-z0-9-]+$/).required(),
    description: Joi.string().required(),
    constraints: Joi.string().required(),
    timeLimit: Joi.number().integer().min(100).max(10000).required(),
    memoryLimit: Joi.number().integer().min(16).max(512).required(),
    difficulty: Joi.string().valid('easy', 'medium', 'hard').required(),
    sampleTestCases: Joi.array().items(
      Joi.object({
        input: Joi.string().required(),
        output: Joi.string().required()
      })
    ).min(1).required()
  }),
  
  // Submission schemas
  createSubmission: Joi.object({
    problemId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    contestId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
    language: Joi.string().valid('cpp', 'python').required(),
    code: Joi.string().min(1).max(50000).required()
  }),
  
  // Contest schemas
  createContest: Joi.object({
    title: Joi.string().min(3).max(200).required(),
    startTime: Joi.date().iso().required(),
    endTime: Joi.date().iso().greater(Joi.ref('startTime')).required(),
    problemIds: Joi.array().items(
      Joi.string().pattern(/^[0-9a-fA-F]{24}$/)
    ).min(1).required()
  })
};
