const axios = require('axios');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

// In Lambda, Region is provided via environment variables by default.
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || 'CryptoPrices';
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;

exports.handler = async (event) => {
    try {
        console.log("Starting crypto data scrape...");
        
        const url = 'https://api.coingecko.com/api/v3/simple/price';
        const params = {
            ids: 'bitcoin,ethereum,solana,ripple,cardano,dogecoin', // Added new coins
            vs_currencies: 'usd',
            include_last_updated_at: 'true'
        };
        
        let headers = {};
        if (COINGECKO_API_KEY) {
            // CoinGecko allows passing API key via header
            headers['x-cg-demo-api-key'] = COINGECKO_API_KEY; 
        }

        const response = await axios.get(url, { params, headers });
        const data = response.data;

        console.log("Data fetched from CoinGecko:", JSON.stringify(data));

        // Format to ISO 8601 string for sort key
        const timestamp = new Date().toISOString();

        // Loop through all fetched coins and save them to DynamoDB
        for (const [coin, details] of Object.entries(data)) {
            if (details && details.usd) {
                await saveToDynamoDB(coin, details.usd, timestamp);
            }
        }

        console.log("Scrape and save completed successfully.");
        return { statusCode: 200, body: 'Data scraped successfully' };

    } catch (error) {
        console.error("Error scraping data:", error.message);
        throw error;
    }
};

async function saveToDynamoDB(coinId, priceUsd, timestamp) {
    const params = {
        TableName: TABLE_NAME,
        Item: {
            coin_id: coinId,
            timestamp: timestamp, // Sort key
            price_usd: priceUsd,
            // Optional: TTL to auto-delete records after 30 days to save space
            ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) 
        }
    };
    
    await docClient.send(new PutCommand(params));
    console.log(`Saved ${coinId}: $${priceUsd}`);
}
