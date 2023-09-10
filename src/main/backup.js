import fs from 'fs'
import path from 'path'
import AWS from 'aws-sdk'
import { Client } from 'pg'

const downloadThumbnails = true

const s3 = new AWS.S3({
  accessKeyId: import.meta.env.MAIN_VITE_AWS_ID,
  secretAccessKey: import.meta.env.MAIN_VITE_AWS_SECRET_KEY
})

export async function performBackup(savePath, mainWindow) {
  function send(data) {
    mainWindow.webContents.send('downloadStatus', data)
  }
  try {
    send({
      started: true,
      error: false,
      done: false,
      percent: 0,
      message: `Getting metadata JSON...`
    })
    const pg = new Client({
      host: import.meta.env.MAIN_VITE_POSTGRES_HOST,
      port: import.meta.env.MAIN_VITE_POSTGRES_PORT,
      user: import.meta.env.MAIN_VITE_POSTGRES_USER,
      password: import.meta.env.MAIN_VITE_POSTGRES_PASSWORD,
      database: import.meta.env.MAIN_VITE_POSTGRES_DATABASE
    })
    const name = 'deepfield-backup_' + new Date().toISOString().split('.')[0].replace(/:/g, '-')
    const backupDir = path.join(savePath, name)
    const backupImageDir = path.join(backupDir, 'images')
    const backupThumbnailDir = path.join(backupDir, 'thumbnails')
    if (!fs.existsSync(backupImageDir)) {
      fs.mkdirSync(backupImageDir, { recursive: true })
    }
    if (downloadThumbnails) fs.mkdirSync(backupThumbnailDir)

    await pg.connect()
    const res = await pg.query('select * from metadata')
    let metadata = res.rows
    await fs.promises.writeFile(
      path.join(backupDir, 'metadata.json'),
      JSON.stringify(metadata, null, '\t')
    )
    await pg.end()
    send({
      started: true,
      error: false,
      done: false,
      percent: 0,
      message: `Got metadata JSON`
    })

      metadata = metadata.filter((x, i) => i < 3)

    let i = 1
    for await (const data of metadata) {
      // console.log(data)
      //   console.log(`Downloading image ${i}`)
      const imageName = `${data.image_id}.png`
      const savedImageName = `${data.created_timestamp.toISOString().slice(0,-5).replaceAll(':', '-')}_${data.venue}_${data.drawing_prompt.replaceAll(' ', '-')}_${data.image_id}.png`
      const imageData = await downloadS3Object('biospheres-images', imageName)
      await fs.promises.writeFile(path.join(backupImageDir, savedImageName), imageData.Body)
      if (downloadThumbnails) {
        const thumbnailData = await downloadS3Object('biospheres-image-thumbnails', imageName)
        await fs.promises.writeFile(path.join(backupThumbnailDir, savedImageName), thumbnailData.Body)
      }
      send({
        started: true,
        error: false,
        done: false,
        percent: Math.round((i / metadata.length) * 100),
        message: `${i}/${metadata.length}: ${savedImageName}`
      })
      i++
    }

    send({
      started: true,
      error: false,
      done: true,
      percent: 100,
      message: `Backup completed at ${backupDir}`
    })
  } catch (error) {
    console.error(error)
    send({
      started: true,
      error: true,
      done: false,
      percent: 50,
      message: `${error}`
    })
  }
}

function downloadS3Object(bucket, key) {
  return new Promise((resolve, reject) => {
    s3.getObject({ Bucket: bucket, Key: key }, (e, data) => {
      if (e) reject(e)
      else resolve(data)
    })
  })
}

export function mockDownload(mainWindow) {
  let status = 0
  let interval = setInterval(() => {
    status++
    mainWindow.webContents.send('downloadStatus', {
      started: true,
      error: false,
      percent: status,
      message: `${status}/100`,
      done: status === 100
    })
    if (status === 100) clearInterval(interval)
  }, 200)
}
