import low from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync.js';
import fs from 'fs';

if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data', { recursive: true });
}

const adapter = new FileSync('./data/database.json', {
    serialize: (data) => JSON.stringify(data),
    deserialize: (data) => JSON.parse(data)
});

const db = low(adapter);

db.defaults({ 
    users: {}, 
    groups: {} 
}).write();

setInterval(() => {
    db.write();
}, 20000);

export { db };