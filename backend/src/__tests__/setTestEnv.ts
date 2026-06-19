// Runs in each Jest worker before test modules are imported.
// Sets DATABASE_URL to the test database so dotenv won't override it.
const host = process.env.POSTGRES_HOST || 'postgres'
const user = process.env.POSTGRES_USER || 'metrolinea'
const pass = process.env.POSTGRES_PASSWORD || 'metrolinea'

process.env.DATABASE_URL = `postgresql://${user}:${pass}@${host}:5432/metrolinea_test`
