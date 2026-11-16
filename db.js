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

// Initialize pool with retries (runs once at module load)
let pool;
(async () => {
    pool = await createPoolWithRetry({
        host: 'localhost',
        user: 'root',
        password: 'Eddsworld!1',
        database: 'banco_amaral_hub'
    });
})();

module.exports = pool;