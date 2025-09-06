const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const https = require('https');
const multer = require('multer');
const path = require('path');

const port = 3000;
const dataFolder = './data/';
const uploadFilesFolder = './public/files/upload/';
const dbFile = dataFolder + 'moments.db';
const passwordFile = dataFolder + 'password';

// Create Express app
const app = express();
app.use(express.static('public'));  // Serve static files from public directory
app.use(checkPassword); // Check password for all requests
app.use(bodyParser.json({ limit: '20mb' })); // Adjust '10mb' to your requirements

// Create data folder if not exist
const fs = require('fs');
const { randomUUID } = require('crypto');
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


// Create the folder if it doesn't exist
if (!fs.existsSync(uploadFilesFolder)) {
    fs.mkdirSync(uploadFilesFolder, { recursive: true });
}

// Configure multer for file storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadFilesFolder);
    },
    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname);
        const fileName = Date.now() + '-' + randomUUID() + extension;
        cb(null, fileName);
    }
});
const upload = multer({ storage: storage });

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
  comments TEXT,
  source INTEGER DEFAULT 0,
  type INTEGER DEFAULT 0
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
let checkPasswordLock = false;
async function waitAndGetCheckPasswordLock() {
    while (checkPasswordLock) {
        await new Promise((res) => {
            setTimeout(() => {
                res();
            }, 100);
        });
    }
    checkPasswordLock = true;
}

async function checkPassword(req, res, next) {
    try {
        await waitAndGetCheckPasswordLock();
        // const { password } = req.query;
        // read password from header
        const password = req.headers['x-password'];
        // check password for /api/*
        if (req.path.startsWith('/api/') && password !== userPassword) {
            // delay 1 seconds
            await new Promise((res) => {
                setTimeout(() => {
                    res();
                }, 1000);
            });
            res.status(401).send('Unauthorized');
            return;
        }
    } catch {
        res.status(401).send('Unauthorized');
        return;
    } finally {
        checkPasswordLock = false;
    }

    next();
}

// ------------------ Utils END ------------------

// Endpoint to add a new post
app.post('/api/addPost', (req, res) => {
    const { localId, content, location, type, replyToId, parentPostId, attachments } = req.body;
    // id is timestamp + localId
    const id = Date.now() + '-' + localId;
    const createTime = Date.now();
    db.run('INSERT INTO posts (id, content, location, type, replyToId, parentPostId, createTime,attachments ) VALUES (?, ?, ?, ?,?,?,?,?)',
        [id, content, location, type, replyToId, parentPostId, createTime, attachments],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return console.error(err.message);
            }
            res.json({ id });
        });
});

// Endpoint to get all posts
app.get('/api/getPosts', (req, res) => {
    db.all('SELECT * FROM posts', [], (err, rows) => {
        if (err) {
            throw err;
        }
        rows.sort((a, b) => b.createTime - a.createTime);
        res.json(rows);
    });
});

// app.post('/adhoc/api/soul', (req, res) => {
//     const { localId, content, location, type, replyToId, parentPostId, attachments, comments, createTime } = req.body;
//     db.run('INSERT INTO posts (id, content, location, type, replyToId, parentPostId, createTime,attachments,comments ) VALUES (?, ?, ?, ?,?,?,?,?,?)',
//         [localId, content, location, type, replyToId, parentPostId, createTime, attachments, comments],
//         function (err) {
//             if (err) {
//                 res.status(500).json({ error: err.message });
//                 return console.error(err.message);
//             }
//             res.json({ localId });
//         });
// });


// Handle file upload
app.post('/api/uploadFile', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = './files/upload/' + req.file.filename;
    res.json({ fileUrl: fileUrl });
});


// download sqlite3 db file
app.get('/api/downloadDb', (req, res) => {
    res.download(dbFile);
});



// Start server
const debug = process.argv.includes('--debug');
const PORT = process.env.PORT || 3004;

if (debug) {
    console.log('Running in debug mode');
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}else{
    const certificate = fs.readFileSync('/etc/letsencrypt/live/panghair.com/fullchain.pem', 'utf8');
    const privateKey = fs.readFileSync('/etc/letsencrypt/live/panghair.com/privkey.pem', 'utf8');
    const credentials = { key: privateKey, cert: certificate };
    
    const server = https.createServer(credentials, app);
    server.listen(PORT, () => {
        console.log(`HTTPS Server is running on port ${PORT}`);
    });
}
