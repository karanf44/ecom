module.exports = {
  "development": {
    "username": process.env.DB_USERNAME,
    "password": process.env.DB_PASSWORD,
    "database": process.env.DB_NAME,
    "host": process.env.DB_HOST || '127.0.0.1',
    "dialect": "postgres",
    "port": parseInt(process.env.DB_PORT || '5432', 10),
    "dialectOptions": {
      "ssl": {
        "require": true,
        "rejectUnauthorized": false
      }
    }
  },
  "test": {
    "username": "${process.env.DB_USERNAME_TEST}",
    "password": "${process.env.DB_PASSWORD_TEST}",
    "database": "${process.env.DB_NAME_TEST}",
    "host": "${process.env.DB_HOST_TEST || '127.0.0.1'}",
    "dialect": "postgres",
    "port": "${process.env.DB_PORT_TEST || 5432}"
  },
  "production": {
    "username": "${process.env.DB_USERNAME_PROD}",
    "password": "${process.env.DB_PASSWORD_PROD}",
    "database": "${process.env.DB_NAME_PROD}",
    "host": "${process.env.DB_HOST_PROD}",
    "dialect": "postgres",
    "port": "${process.env.DB_PORT_PROD || 5432}",
    "dialectOptions": {
      "ssl": {
        "require": true,
        "rejectUnauthorized": false
      }
    }
  }
}
