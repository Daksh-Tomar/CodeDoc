const { Client } = require('pg');
const client = new Client('postgresql://codedoc:password@localhost:5432/codedoc?schema=public');
client.connect().then(() => {
  client.query('SELECT id, name FROM "Workspace"').then(res => {
    console.log(res.rows);
    client.end();
  });
});
