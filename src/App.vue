<template>
  <v-app>
    <v-app-bar app
               color="primary"
               dark>
      <div class="d-flex align-center">
        <v-img alt="Vuetify Logo"
               class="shrink mr-2"
               contain
               src="https://cdn.vuetifyjs.com/images/logos/vuetify-logo-dark.png"
               transition="scale-transition"
               width="40" />
        切片+断点续传
      </div>
    </v-app-bar>
    <v-content>
      <div class="uploader">
        <v-file-input show-size
                      counter
                      multiple
                      label="点击上传文件"
                      @change="fileChange"></v-file-input>
        <div class="btn">
          <v-btn color="primary"
                 @click="upload"
                 :disabled="!enableToUpload"
                 :loading="loading">
            开始上传
            <v-icon right
                    dark>mdi-cloud-upload</v-icon>
          </v-btn>
          <v-btn color="teal"
                 @click="pauseOrRegain"
                 :disabled="!enableToPause">
            {{ isPause ? '恢复' : '暂停' }}
            <v-icon right
                    dark>{{ isPause ? 'mdi-play' : 'mdi-pause' }}</v-icon>
          </v-btn>
        </div>
      </div>
      <div class="content">
        <v-img :src="container.filePreview"
               v-if="container.filePreview && container.fileExt !== 'mp4'"
               aspect-ratio="1.7"
               contain
               width="300"
               transition="fade-transition"></v-img>
        <video class="video"
               v-if="container.filePreview && container.fileExt === 'mp4'"
               width="300"
               :src="container.filePreview"
               controls></video>
        <v-progress-linear :value="container.precent"
                           height="25"
                           rounded
                           v-if="container.precent > 0">
          文件哈希值计算进度：<strong>{{ Math.ceil(container.precent) }}%</strong>
        </v-progress-linear>
        <br>
        <v-progress-linear :value="container.uploadPrecent"
                           height="25"
                           rounded
                           v-if="container.uploadPrecent > 0">
          文件上传进度：<strong>{{ Math.ceil(container.uploadPrecent) }}%</strong>
        </v-progress-linear>
        <v-data-table :headers="headers"
                      :items="data"
                      :items-per-page="5"
                      v-if=" data.length > 0">
          <template v-slot:item.size="{ item }">
            <span>{{ (item.size / 1024 / 1024).toFixed(2) }}MB</span>
          </template>
          <template v-slot:item.percentage="{ item }">
            <v-progress-linear rounded
                               :value="item.percentage"></v-progress-linear>
          </template>
        </v-data-table>
      </div>
    </v-content>
    <v-snackbar v-model="snackbar.show"
                :top="true"
                :color="snackbar.type"
                :timeout="2000">
      {{ snackbar.text }}
      <v-btn dark
             text
             @click="snackbar.show = false">
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </v-snackbar>

  </v-app>
</template>

<script>
let SIZE = 10
export default {
  computed: {
    calculaUploadPrecent () {
      if (!this.container.fileName || !this.data.length) return 0
      let uploaded = this.data
        .map(item => item.size * item.percentage)
        .reduce((cur, next) => (cur + next))
      return parseInt(uploaded / this.container.fileSize.toFixed(2))
    }
  },
  watch: {
    calculaUploadPrecent (newVal) {
      if (newVal >= 100) this.enableToPause = false
      if (newVal > this.container.uploadPrecent) this.container.uploadPrecent = newVal
    }
  },
  data: () => ({
    snackbar: {
      show: false,
      type: 'success',
      text: ''
    },
    container: {
      fileName: '',
      fileExt: '',
      fileChunkList: [],
      filePreview: '',
      fileHash: '',
      fileSize: 0,
      precent: 0,
      worker: null,
      uploadPrecent: 0
    },
    data: [],
    shouldUpload: false,
    requestList: [],
    enableToUpload: false,
    enableToPause: false,
    isPause: false,
    loading: false,
    headers: [
      {
        text: '文件名',
        align: 'start',
        sortable: false,
        value: 'fileName',
      },
      {
        text: '文件哈希值',
        align: 'start',
        sortable: false,
        value: 'fileHash',
      },
      {
        text: '切片名',
        align: 'start',
        sortable: false,
        value: 'hash',
      },
      {
        text: '切片大小',
        align: 'start',
        sortable: false,
        value: 'size',
      },
      {
        text: '切片上传进度',
        align: 'start',
        sortable: false,
        value: 'percentage',
      }
    ]
  }),
  methods: {
    upload () {
      this.enableToPause = true
      if (this.shouldUpload) {
        this.uploadRequest()
      } else {
        this.snackbar.show = true
        this.snackbar.text = '文件秒传成功'
        this.data.forEach(item => {
          item.percentage = 100
        })
      }
      this.enableToUpload = false
    },
    async pauseOrRegain () {
      this.isPause = !this.isPause
      if (this.isPause) {
        this._resetData()
      } else {
        const { shouldUpload, uploadedFile } = JSON.parse((await this.verifyRequest()).data)
        this.shouldUpload = shouldUpload
        this.uploadRequest(uploadedFile)
      }
    },
    async fileChange ([file]) {
      console.log(this.$options)
      Object.assign(this.$data, this.$options.data())
      const { size } = file
      const { name, ext } = this._getFileNameAndExt(file)
      SIZE =
        size / 1024 / 1024 >= 100 ? 10
          : size / 1024 / 1024 >= 50 ? 5
            : size / 1024 / 1024 >= 10 ? 2
              : 1
      this.container.fileName = name
      this.container.fileExt = ext
      this.container.fileSize = size
      this.container.filePreview = this._getFilePreview(file)
      this.container.fileChunkList = this._createChunkSlice(file)
      this.container.fileHash = await this._calculateHash(this.container.fileChunkList)
      const { shouldUpload, uploadedFile } = JSON.parse((await this.verifyRequest()).data)
      this.shouldUpload = shouldUpload
      this.data = this.container.fileChunkList.map(({ chunk }, i) => (
        {
          fileName: this.container.fileName,
          fileExt: this.container.fileExt,
          fileHash: this.container.fileHash,
          hash: `${this.container.fileHash}-${i}`,
          percentage: uploadedFile.includes(i) ? 100 : 0,
          size: chunk.size,
          index: i,
          chunk,
        }
      ))
      this.enableToUpload = true
    },
    async uploadRequest (uploadedList = []) {
      const request = this.data
        .filter(({ hash }) => !uploadedList.includes(hash))
        .map(({ chunk, fileHash, fileName, fileExt, hash, index }) => {
          const formData = new FormData()
          formData.append('chunk', chunk)
          formData.append('fileHash', fileHash)
          formData.append('fileName', fileName)
          formData.append('fileExt', fileExt)
          formData.append('hash', hash)
          return { formData, index }
        })
        .map(async ({ formData, index }) =>
          this._request({
            method: 'POST',
            data: formData,
            url: '/api/uploadChunk',
            onProgress: this._createProgress(this.data[index]),
            requestList: this.requestList
          })
        )
      await Promise.all(request).then(async () => {
        this.loading = true
        await this.mergeChunk().then(() => {
          this.loading = false
        })
      })
    },
    async mergeChunk () {
      const formData = new FormData()
      formData.append('fileHash', this.container.fileHash)
      formData.append('fileExt', this.container.fileExt)
      formData.append('size', SIZE)
      await this._request({
        method: 'POST',
        data: formData,
        url: '/api/mergeChunk'
      }).then(({ data }) => {
        const { success, message } = JSON.parse(data)
        if (success) {
          this.snackbar.show = true
          this.snackbar.text = message
        }
      })
    },
    async verifyRequest () {
      const formData = new FormData()
      formData.append('fileHash', this.container.fileHash)
      formData.append('fileExt', this.container.fileExt)
      return await this._request({
        method: 'POST',
        url: '/api/verify',
        data: formData
      })
    },
    _request ({ method, url, data, header = {}, onProgress = e => e, requestList }) {
      return new Promise(resolve => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = onProgress
        xhr.open(method, url)
        Object.keys(header).forEach(key => {
          xhr.setRequestHeader(key, header[key])
        })
        xhr.send(data)
        requestList?.push(xhr)
        xhr.onload = e => {
          if (requestList) {
            const xhrIndex = requestList.findIndex(item => item === xhr)
            requestList.splice(xhrIndex, 1)
          }
          resolve({
            data: e.target.response
          })
        }
      })
    },
    _createChunkSlice (file, size = SIZE * 1024 * 1024) {
      const fileChunkList = []
      let current = 0
      while (current < file.size) {
        fileChunkList.push({ chunk: file.slice(current, current + size) })
        current += size
      }
      return fileChunkList
    },
    async _calculateHash (fileChunkList) {
      return new Promise(resolve => {
        const worker = new Worker('/hash.js')
        worker.postMessage({ fileChunkList })
        worker.onmessage = e => {
          const { precent, hash } = e.data
          this.container.precent = precent
          if (precent === 100 && hash) {
            resolve(hash)
          }
        }
      })
    },
    _getFileNameAndExt (file) {
      return {
        ext: file.type.split('/')[1],
        name: file.name.split('.')[0]
      }
    },
    _getFilePreview (file) {
      const URL = window.URL
      const fileUrl = URL.createObjectURL(file)
      URL.revokeObjectURL(file)
      return fileUrl
    },
    _createProgress (item) {
      return e => {
        item.percentage = parseInt(String((e.loaded / e.total) * 100))
      }
    },
    _resetData () {
      this.requestList.forEach(xhr => xhr?.abort())
      this.requestList = []
    }
  }
};
</script>
<style scoped>
.uploader {
  padding: 0 30px;
  display: flex;
  align-items: center;
}
.uploader .btn {
  width: 300px;
  display: flex;
  justify-content: space-around;
}
.content {
  padding: 10px 30px;
  text-align: center;
}
.content .v-image,
.content .video {
  margin: 0 auto 10px;
}
.content .v-data-table {
  margin: 20px auto;
}
</style>
