// app.post('/api/addPost', (req, res) => {
//     const { localId, content, location, type, replyToId, parentPostId, attachments } = req.body;
//     // id is timestamp + localId
//     const id = Date.now() + localId;
//     const createTime = Date.now();
//     db.run('INSERT INTO posts (id, content, location, type, replyToId, parentPostId, createTime,attachments ) VALUES (?, ?, ?, ?,?,?,?,?)',
//         [id, content, location, type, replyToId, parentPostId, createTime, attachments],
//         function (err) {
//             if (err) {
//                 return console.error(err.message);
//             }
//             res.send(`A row has been inserted with rowid ${this.lastID}`);
//         });
// });
// Endpoint to get all posts
// app.get('/api/getPosts', (req, res) => {
//     // check password
//     const { password } = req.query;
//     if (password !== userPassword) {
//         res.status(401).send('Unauthorized');
//         return;
//     }
//     db.all('SELECT * FROM posts', [], (err, rows) => {
//         if (err) {
//             throw err;
//         }
//         res.json(rows);
//     });
// });

// import { PostType } from "./constant";

class API {
    static async AddPost(localId, content, location, type, replyToId, parentPostId, attachments) {
        attachments = JSON.stringify(attachments)
        const res = await fetch('/api/addPost', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-password': getLocalPassword()
            },
            body: JSON.stringify({ localId, content, location, type, replyToId, parentPostId, attachments })
        });
        return await res.json();
    }
    static async GetPosts(password) {
        password = password || getLocalPassword()
        const res = await fetch('/api/getPosts', {
            headers: {
                'x-password': password
            }
        });
        const posts = await res.json();
        posts.forEach(post => {
            try {
                post.attachments = JSON.parse(post.attachments)
            } catch {
                post.attachments = []
            }
            // post.comments 
            try {
                post.comments = JSON.parse(post.comments)
            } catch {
                post.comments = []
            }
        });
        return posts;
    }
}

function getAttachmentType(attachment) {
    if (attachment.type == 'UNKNOWN') {
        const extension = attachment.fileUrl.split('.').pop()
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
            return 'IMAGE'
        } else if (['mp4', 'mov', 'avi'].includes(extension)) {
            return 'VIDEO'
        } else if (['mp3', 'wav', 'm4a'].includes(extension)) {
            return 'AUDIO'
        } else {
            return 'FILE'
        }
    } else {
        return attachment.type
    }
}

function createAttachmentElement(attachment) {
    const attachmentType = getAttachmentType(attachment)
    if (attachmentType == 'IMAGE') {
        const imgElement = document.createElement('img')
        imgElement.src = attachment.fileUrl
        imgElement.loading = 'lazy'
        imgElement.addEventListener('click', () => {
            imgElement.classList.toggle('fullscreen');
            if (imgElement.classList.contains('fullscreen')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = 'auto';
            }
        });
        return imgElement
    } else if (attachmentType == 'VIDEO') {
        const videoElement = document.createElement('video')
        videoElement.src = attachment.fileUrl
        videoElement.controls = true
        return videoElement
    } else if (attachmentType == 'AUDIO') {
        const audioElement = document.createElement('audio')
        audioElement.src = attachment.fileUrl
        audioElement.controls = true
        return audioElement
    } else if (attachmentType == 'FILE') {
        const fileElement = document.createElement('a')
        fileElement.href = attachment.fileUrl
        fileElement.innerText = attachment.fileUrl.split('/').pop()
        fileElement.target = '_blank'
        return fileElement
    }
}

function uuidv4() {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

function getSavedDraft() {
    const draft = localStorage.getItem('draft')
    return draft
}

function saveDraft(draft) {
    localStorage.setItem('draft', draft)
}

function getLocalPassword() {
    const password = localStorage.getItem('password')
    return password
}

function saveLocalPassword(password) {
    localStorage.setItem('password', password)
}