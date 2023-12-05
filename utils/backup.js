const fs = require('fs');
const { promisify } = require('util');
const sqlite3 = require('sqlite3').verbose();
const stream = require('stream');
const dbBackupFolder = './backup/db';
const endpoint = 'https://panghair.com:3004'

// create backup folder if not exist
fs.mkdirSync(dbBackupFolder, { recursive: true });
const attachmentBackupFolder = './backup/attachments';
// create backup folder if not exist
fs.mkdirSync(attachmentBackupFolder, { recursive: true });

const pipeline = promisify(stream.pipeline);
// read first args
const args = process.argv.slice(2);
const password = args[0];

async function downloadDb(dbName) {
    const res = await fetch(`${endpoint}/api/downloadDb`, {
        headers: {
            'x-password': password
        }
    });
    // check http code
    if (res.status !== 200) {
        console.log(res.status)
        throw new Error('Failed to download db');
    }
    const fileStream = fs.createWriteStream(dbName)
    await pipeline(res.body, fileStream)
};

async function downloadAttachment(url, attachmentName) {
    const res = await fetch(url, {
        headers: {
            'x-password': password
        }
    });
    // check http code
    if (res.status !== 200) {
        throw new Error('Failed to download attachment');
    }
    const fileStream = fs.createWriteStream(attachmentName)
    await pipeline(res.body, fileStream)
}

async function backup() {
    const timestamp = Date.now();
    const dbName = `${dbBackupFolder}/${timestamp}.db`;
    await downloadDb(dbName);
    // open db and read rows
    const db = new sqlite3.Database(dbName, (err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Connected to the database.');
    });
    const sql = `SELECT * FROM posts`;
    const rows = await new Promise((res, rej) => {
        db.all(sql, [], (err, rows) => {
            if (err) {
                rej(err);
            }
            res(rows);
        });
    });
    console.log('rows.length', rows.length);
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const attachments = JSON.parse(row.attachments);
        if (!attachments) continue;
        for (let j = 0; j < attachments.length; j++) {
            const attachment = attachments[j];
            const fileUrl = attachment.fileUrl;
            let attachmentName = `${attachmentBackupFolder}/${fileUrl}`;
            // await downloadAttachment(url, attachmentName);
            // console.log(attachmentName);
            // remove ?tempTime=1642084579170 from attachmentName
            attachmentName = attachmentName.split('?')[0];
            const url = `${endpoint}/${fileUrl}`;
            // console.log(url);
            // create folder
            const folder = attachmentName.split('/').slice(0, -1).join('/');
            fs.mkdirSync(folder, { recursive: true });

            // download if not exist
            if (!fs.existsSync(attachmentName)) {
                await downloadAttachment(url, attachmentName);
            }
        }
    }
}


async function scheduledBackup(seconds = 60 * 60 * 24) {
    while (true) {
        const date = new Date();
        console.log('backup start', date);
        try {
            await backup();
            console.log('backup done', date);
        } catch (err) {
            console.error(err);
            console.log('backup fail', date);
        }
        await new Promise((res) => {
            setTimeout(() => {
                res();
            }, seconds * 1000);
        });
    }
}

scheduledBackup();