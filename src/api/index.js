const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || 'CryptoPrices';

exports.handler = async (event) => {
    // Enable CORS (Cross-Origin Resource Sharing) since frontend is hosted elsewhere
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "OPTIONS,GET"
    };

    try {
        // Support querying specific coin, default to bitcoin
        const coinId = event.queryStringParameters?.coin || 'bitcoin';
        
        // Fetch data for the last 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const params = {
            TableName: TABLE_NAME,
            KeyConditionExpression: 'coin_id = :coinId AND #ts >= :minDate',
            ExpressionAttributeNames: {
                '#ts': 'timestamp' // Alias because 'timestamp' is a reserved keyword
            },
            ExpressionAttributeValues: {
                ':coinId': coinId,
                ':minDate': twentyFourHoursAgo
            }
        };

        const data = await docClient.send(new QueryCommand(params));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                coin: coinId,
                count: data.Count,
                data: data.Items
            })
        };
    } catch (error) {
        console.error("API Error:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: "Internal server error", error: error.message })
        };
    }
};
