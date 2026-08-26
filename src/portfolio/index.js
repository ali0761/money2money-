const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        if (event.httpMethod === 'GET') {
            const userId = event.queryStringParameters?.userId;
            if (!userId) return { statusCode: 400, headers, body: 'Missing userId' };

            const params = { TableName: TABLE_NAME, Key: { userId } };
            const result = await docClient.get(params).promise();
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(result.Item || { userId, assets: {} })
            };
        } 
        else if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body);
            const { userId, coinId, amount } = body;
            
            if (!userId || !coinId || amount === undefined) {
                return { statusCode: 400, headers, body: 'Missing parameters' };
            }

            const numAmount = parseFloat(amount);
            
            const getParams = { TableName: TABLE_NAME, Key: { userId } };
            const current = await docClient.get(getParams).promise();
            
            let assets = (current.Item && current.Item.assets) ? current.Item.assets : {};
            
            if (numAmount <= 0) {
                delete assets[coinId];
            } else {
                assets[coinId] = numAmount;
            }

            const putParams = {
                TableName: TABLE_NAME,
                Item: {
                    userId,
                    assets,
                    updatedAt: new Date().toISOString()
                }
            };
            await docClient.put(putParams).promise();

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, assets })
            };
        }
    } catch (error) {
        console.error(error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};
