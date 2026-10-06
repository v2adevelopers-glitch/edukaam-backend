const path = require('path');
const fs = require('fs');
const swaggerJsdoc = require('swagger-jsdoc');

const DOCS_DIR = path.join(__dirname, '../docs');
const docFiles = fs.readdirSync(DOCS_DIR)
    .filter(file => file.endsWith('.swagger.js'))
    .map(file => path.join(DOCS_DIR, file));

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'EduJobs Backend API',
            version: '1.0.0',
            contact: { name: '' }
        },
        servers: [
            { url: 'http://localhost:8080', description: 'Development server' },
            { url: process.env.PROD_API_URL || '{{PROD_API_URL}}', description: 'Production server' }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'x-access-token',
                    description: 'JWT from POST /api/v1/users/login'
                }
            },
            schemas: {
                SuccessResponse: {
                    type: 'object',
                    properties: {
                        statusCode: { type: 'integer', example: 200 },
                        success: { type: 'boolean', example: true },
                        message: { type: 'string' },
                        resData: { type: 'object', description: 'Response payload' }
                    }
                },
                Error: {
                    type: 'object',
                    properties: {
                        statusCode: { type: 'integer', example: 400 },
                        success: { type: 'boolean', example: false },
                        message: { type: 'string' },
                        resData: {
                            type: 'object',
                            nullable: true,
                            properties: { error: { type: 'string', example: 'job_not_found' } }
                        }
                    }
                },
                PaginationResponse: {
                    type: 'object',
                    properties: {
                        total: { type: 'integer', example: 42 },
                        page: { type: 'integer', example: 1 },
                        limit: { type: 'integer', example: 10 },
                        totalPages: { type: 'integer', example: 5 }
                    }
                }
            }
        }
    },
    apis: docFiles
};

module.exports = swaggerJsdoc(options);
