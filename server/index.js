const Koa = require('koa')
const Router = require('koa-router')
const KoaBody = require('koa-body')

const app = new Koa()
const router = new Router()
const PORT = 5000
const UploaderController = require('./controller/upload')

app.use(KoaBody({
  multipart: true,
  formidable: {
    maxFieldsSize: 200 * 1024 * 1024,
  }
}))

const uploadChunk = new Router()
uploadChunk.post('/uploadChunk', UploaderController.uploadChunk)
const mergeChunk = new Router()
mergeChunk.post('/mergeChunk', UploaderController.mergeChunk)
const verify = new Router()
verify.post('/verify', UploaderController.verify)

router.use(
  '/api',
  uploadChunk.routes(),
  uploadChunk.allowedMethods()
)
router.use(
  '/api',
  mergeChunk.routes(),
  mergeChunk.allowedMethods()
)

router.use(
  '/api',
  verify.routes(),
  verify.allowedMethods()
)
app.use(
  router.routes(),
  router.allowedMethods()
)

app.listen(PORT, () => {
  console.log('server run ' + PORT)
})