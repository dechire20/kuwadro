const https = require('https');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let email;
  try {
    const body = JSON.parse(event.body);
    email = body.email;
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request' }) };
  }

  if (!email || !email.includes('@')) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid email' }) };
  }

  // ── REPLACE THESE with your real values ──────────────────
  const API_KEY      = process.env.MAILCHIMP_API_KEY;   // set in Netlify env vars
  const LIST_ID      = process.env.MAILCHIMP_LIST_ID;   // your audience ID
  const DATACENTER   = API_KEY.split('-')[1];            // e.g. us15
  // ─────────────────────────────────────────────────────────

  const data = JSON.stringify({
    email_address: email,
    status: 'subscribed',
    tags: ['kuwadro-waitlist'],
    merge_fields: {
      DISCOUNT: 'KUWADRO10'
    }
  });

  const options = {
    hostname: `${DATACENTER}.api.mailchimp.com`,
    path: `/3.0/lists/${LIST_ID}/members`,
    method: 'POST',
    headers: {
      'Authorization': `apikey ${API_KEY}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const parsed = JSON.parse(body);
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve({
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: true })
          });
        } else if (parsed.title === 'Member Exists') {
          resolve({
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: true, existing: true })
          });
        } else {
          resolve({
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: parsed.detail || 'Signup failed' })
          });
        }
      });
    });

    req.on('error', () => {
      resolve({
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Server error' })
      });
    });

    req.write(data);
    req.end();
  });
};
