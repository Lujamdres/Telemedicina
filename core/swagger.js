const path = require('path');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');

function loadOpenApiSpec() {
    const basePath = path.join(__dirname, '../docs/openapi.json');
    const localPath = path.join(__dirname, '../docs/openapi.local.json');
    const file = fs.existsSync(localPath) ? localPath : basePath;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function mountSwagger(app) {
    const spec = loadOpenApiSpec();
    app.use(
        '/api-docs',
        swaggerUi.serve,
        swaggerUi.setup(spec, {
            customSiteTitle: 'Telemedicina LUI — API',
            swaggerOptions: {
                persistAuthorization: true,
                docExpansion: 'list',
                filter: true,
            },
        })
    );
}

module.exports = { mountSwagger };
