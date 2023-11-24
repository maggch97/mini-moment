const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const port = 3000;
const dataFolder = './data/';
const dbFile = dataFolder + 'moments.db';
const passwordFile = dataFolder + 'password';

// Create Express app
const app = express();
app.use(bodyParser.json()); // for parsing application/json
app.use(express.static('public'));  // Serve static files from public directory
app.use(checkPassword); // Check password for all requests

// Create data folder if not exist
const fs = require('fs');
if (!fs.existsSync(dataFolder)) {
    fs.mkdirSync(dataFolder);
}

// read password
let userPassword = fs.readFileSync(passwordFile, 'utf8');

// ------------------ DB START ------------------

// Connect to SQLite database
const db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the SQLite database.');
});


// Create table
const createTable = `
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  content TEXT,
  createTime INTEGER,
  location TEXT,
  attachments TEXT,
  replyToId TEXT,
  parentPostId TEXT,
  source INTEGER DEFAULT 0,
  type INTEGER DEFAULT 0,
)`;
db.run(createTable);

// Post type
class PostType {
    static get NORMAL() {
        return 0;
    }
    static get PLAN() {
        return 1;
    }
    static get EVENT() {
        return 2;
    }
}

// Post source
class PostSource {
    static get POST() {
        return 0;
    }
    static get SOUL() {
        return 1;
    }
}

// ------------------ DB END ------------------


// ------------------ Utils START ------------------
function checkPassword(req, res, next) {
    const { password } = req.query;
    // check password for /api/*
    if (req.path.startsWith('/api/') && password !== userPassword) {
        res.status(401).send('Unauthorized');
        return;
    }
    next();
}

// ------------------ Utils END ------------------

// Endpoint to add a new post
app.post('/api/addPost', (req, res) => {
    const { localId, content, location, type, replyToId, parentPostId, attachments } = req.body;
    // id is timestamp + localId
    const id = Date.now() + localId;
    const createTime = Date.now();
    db.run('INSERT INTO posts (id, content, location, type, replyToId, parentPostId, createTime,attachments ) VALUES (?, ?, ?, ?,?,?,?,?)',
        [id, content, location, type, replyToId, parentPostId, createTime, attachments],
        function (err) {
            if (err) {
                return console.error(err.message);
            }
            res.send(`A row has been inserted with rowid ${this.lastID}`);
        });
});

// Endpoint to get all posts
app.get('/api/getPosts', (req, res) => {
    // check password
    const { password } = req.query;
    if (password !== userPassword) {
        res.status(401).send('Unauthorized');
        return;
    }
    db.all('SELECT * FROM posts', [], (err, rows) => {
        if (err) {
            throw err;
        }
        res.json(rows);
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});