const dotenv = require('dotenv');
dotenv.config();

module.exports = {
    PORT: process.env.PORT || 5000,
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/telemedicina_lui',
    JWT_SECRET: process.env.JWT_SECRET || 'secret_telemedicina_key_2026',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
};
