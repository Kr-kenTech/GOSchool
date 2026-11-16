require('dotenv').config();
const mysql = require('mysql2/promise');

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function createPoolWithRetry(options, retryCount = 0) {
    try {
        const newPool = mysql.createPool({
            ...options,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        // Test the connection immediately using promise-based method
        await newPool.query('SELECT 1');
        return newPool;
    } catch (error) {
        if (retryCount < MAX_RETRIES) {
            console.log(`[db] Connection attempt ${retryCount + 1} failed, retrying in ${RETRY_DELAY}ms...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return createPoolWithRetry(options, retryCount + 1);
        }
        console.error('[db] All connection attempts failed:', error);
        throw error;
    }
}

// Get MySQL config from environment variables
function getMySQLConfig() {
    return {
        host: process.env.MYSQL_HOST || 'localhost',
        port: parseInt(process.env.MYSQL_PORT) || 3306,
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'goschool'
    };
}

// Initialize pool with retries (runs once at module load)
const config = getMySQLConfig();
console.log(`[db] Connecting to MySQL: ${config.host}:${config.port}/${config.database}`);

// Check if demo mode is enabled but NODE_ENV is production
if (process.env.DEMO_MODE === 'true' && process.env.NODE_ENV === 'production') {
    console.error('[db] FATAL: DEMO_MODE=true cannot be used in production (NODE_ENV=production)');
    process.exit(1);
}

const poolPromise = createPoolWithRetry(config)
    .then(pool => {
        console.log('[db] MySQL connection pool ready');
        return pool;
    });

// Export an object with getPool() method and getMySQLConfig
module.exports = {
    getPool: () => poolPromise,
    getMySQLConfig: getMySQLConfig,

    // For backwards compatibility - allows awaiting the module directly
    then: (onFulfilled, onRejected) => poolPromise.then(onFulfilled, onRejected),
    catch: (onRejected) => poolPromise.catch(onRejected),
    finally: (onFinally) => poolPromise.finally(onFinally)
};