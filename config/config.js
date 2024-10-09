require('dotenv').config();

const PORT = process.env.PORT || 3000;
const LOCALHOST = `http://localhost:${PORT}`;

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
const MAIL_SENDER_ID = process.env.MAIL_SENDER_ID

const DB_USER = process.env.DB_USER
const DB_HOST = process.env.DB_HOST
const DB_DATABASE = process.env.DB_DATABASE
const DB_PASSWORD = process.env.DB_PASSWORD
const DB_PORT = process.env.DB_PORT
const DB_INACTIVITY_TIMEOUT = process.env.DB_INACTIVITY_TIMEOUT

const BCRYPT_SALT = Number(process.env.BCRYPT_SALT)
const AUTH_MASTER_KEY = process.env.AUTH_MASTER_KEY

const G_DRIVE_CLIENT_EMAIL = process.env.G_DRIVE_CLIENT_EMAIL
const G_DRIVE_PRIVATE_KEY = process.env.G_DRIVE_PRIVATE_KEY
const G_DRIVE_PARENT_PATH_TEST = process.env.G_DRIVE_PARENT_PATH_TEST
const G_DRIVE_PARENT_PATH = process.env.G_DRIVE_PARENT_PATH

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

module.exports = {
    PORT,
    LOCALHOST,
    SENDGRID_API_KEY,
    MAIL_SENDER_ID,
    DB_USER,
    DB_HOST,
    DB_DATABASE,
    DB_PASSWORD,
    DB_PORT,
    DB_INACTIVITY_TIMEOUT,
    BCRYPT_SALT,
    AUTH_MASTER_KEY,
    G_DRIVE_CLIENT_EMAIL,
    G_DRIVE_PRIVATE_KEY,
    G_DRIVE_PARENT_PATH_TEST,
    G_DRIVE_PARENT_PATH,
    ADMIN_PASSWORD
};