const AWS = require('aws-sdk');
const crypto = require('crypto');
const docClient = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'OPTIONS,POST'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const body = JSON.parse(event.body);
        const { action, username, password } = body;
        
        if (!action || !username || !password) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Eksik bilgi girdiniz.' }) };
        }

        const safeUsername = username.toLowerCase().trim();
        const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

        if (action === 'register') {
            const getParams = { TableName: TABLE_NAME, Key: { username: safeUsername } };
            const current = await docClient.get(getParams).promise();
            
            if (current.Item) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'Bu kullanici adi zaten alinmis.' }) };
            }

            const putParams = {
                TableName: TABLE_NAME,
                Item: {
                    username: safeUsername,
                    passwordHash: passwordHash,
                    createdAt: new Date().toISOString()
                }
            };
            await docClient.put(putParams).promise();
            return { statusCode: 200, headers, body: JSON.stringify({ success: true, username: safeUsername }) };
        } 
        else if (action === 'login') {
            const getParams = { TableName: TABLE_NAME, Key: { username: safeUsername } };
            const current = await docClient.get(getParams).promise();
            
            if (!current.Item || current.Item.passwordHash !== passwordHash) {
                return { statusCode: 401, headers, body: JSON.stringify({ error: 'Kullanici adi veya sifre hatali.' }) };
            }
            
            return { statusCode: 200, headers, body: JSON.stringify({ success: true, username: safeUsername }) };
        }
        else {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Gecersiz islem.' }) };
        }
    } catch (error) {
        console.error(error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Sunucu hatasi.' }) };
    }
};
