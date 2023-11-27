fullData.forEach(item => {
    item.localId = "soul" + item.id
    item.attachments?.forEach(attachment => {
        attachment.fileUrl = './files/soul/' + attachment.id + '.' + attachment.fileUrl.split('.').pop()
        attachment.fileUrl = attachment.fileUrl.replace('png', 'jpg')
    })
    item.attachments = JSON.stringify(item.attachments)
    item.comments = JSON.stringify(item.comments)
    item.location = item.position
})

async function importMoments() {
    for (let i = 0; i < fullData.length; i++) {
        const moment = fullData[i]
        const resp = await fetch('./adhoc/api/soul', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(moment)
        })
    }
}
importMoments()