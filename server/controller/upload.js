const fse = require('fs-extra')
const path = require('path')

const OUT_PATH = path.resolve(__dirname, '..', 'out')
const UPLOAD_PATH = path.resolve(__dirname, '..', 'upload')

const _pipeStream = (path, writeStream) => {
  new Promise(resolve => {
    const readStream = fse.createReadStream(path)
    readStream.on('end', () => {
      resolve()
    })
    readStream.pipe(writeStream)
  })
}

const uploadChunk = async (ctx) => {
  const { chunk } = ctx.request.files
  const { hash, fileHash } = ctx.request.body
  const chunkDir = path.resolve(UPLOAD_PATH, fileHash)
  if (!fse.existsSync(UPLOAD_PATH)) {
    fse.mkdirsSync(UPLOAD_PATH)
  }
  if (!fse.existsSync(chunkDir)) {
    fse.mkdirsSync(chunkDir)
  }
  await fse.move(chunk.path, path.resolve(chunkDir, hash))
  ctx.status = 200
  ctx.body = {
    success: true,
    message: '切片上传成功'
  }
}

const mergeChunk = async (ctx) => {
  const { fileHash, size, fileExt } = ctx.request.body
  const chunkDir = path.resolve(UPLOAD_PATH, fileHash)
  const chunkPaths = await fse.readdir(chunkDir)
  const outputFilePath = path.resolve(OUT_PATH, `${fileHash}.${fileExt}`)
  const piece = size * 1024*1024
  chunkPaths.sort((a, b) => a.split("-")[1] - b.split("-")[1])
  if (!fse.existsSync(OUT_PATH)) {
    fse.mkdirsSync(OUT_PATH)
  }
  await Promise.all(
    chunkPaths.map((chunkPath, index) =>
      _pipeStream(
        path.resolve(chunkDir, chunkPath),
        // 指定位置创建可写流
        fse.createWriteStream(outputFilePath, {
          start: index * piece,
          end: (index + 1) * piece
        })
      )
    )
  )
  await fse.remove(chunkDir)
  ctx.status = 200
  ctx.body = {
    success: true,
    message: '上传成功'
  }
}

const getUploadedFileList = async (fileHash) => 
  fse.existsSync(path.resolve(UPLOAD_PATH, fileHash)) ? await fse.readdir(path.resolve(UPLOAD_PATH, fileHash)) : []

const verify = async (ctx) => {
  const { fileHash, fileExt } = ctx.request.body
  const filePath = path.resolve(OUT_PATH, `${fileHash}.${fileExt}`)
  let result = {
    success: true,
    shouldUpload: null
  }
  if (fse.existsSync(filePath)) {
    result.shouldUpload = false
    result.uploadedFile = await getUploadedFileList(fileHash)
  } else {
    result.shouldUpload = true
    result.uploadedFile = await getUploadedFileList(fileHash)
  }
  ctx.status = 200
  ctx.body = result
}



module.exports = {
  uploadChunk,
  mergeChunk,
  verify
}