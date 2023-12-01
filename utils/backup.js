const fs = require('fs');
const { promisify } = require('util');
const sqlite3 = require('sqlite3').verbose();
const stream = require('stream');
const dbBackupFolder = './backup/db';
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
    const res = await fetch('https://localtest.2gether.video:3004/api/downloadDb', {
        headers: {
            'x-password': password
        }
    });

    const fileStream = fs.createWriteStream(dbName)
    await pipeline(res.body, fileStream)
};

async function downloadAttachment(url, attachmentName) {
    const res = await fetch(url, {
        headers: {
            'x-password': password
        }
    });
    const fileStream = fs.createWriteStream(attachmentName)
    await pipeline(res.body, fileStream)
}

async function scheduledBackup() {
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
    console.log(rows);
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const attachments = JSON.parse(row.attachments);
        if(!attachments) continue;
        for (let j = 0; j < attachments.length; j++) {
            const attachment = attachments[j];
            const fileUrl = attachment.fileUrl;
            let attachmentName = `${attachmentBackupFolder}/${fileUrl}`;
            // await downloadAttachment(url, attachmentName);
            console.log( attachmentName);
            // remove ?tempTime=1642084579170 from attachmentName
            attachmentName = attachmentName.split('?')[0];
            const url = `https://localtest.2gether.video:3004/${fileUrl}`;
            console.log(url);
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
scheduledBackup();