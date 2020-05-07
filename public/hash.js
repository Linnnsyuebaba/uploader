self.importScripts('/spark-md5.min.js')
const HUNDRED = 100
self.onmessage = e => {
  const { fileChunkList } = e.data
  const fileLength = fileChunkList.length
  const spark = new self.SparkMD5.ArrayBuffer()
  let count = 0
  let precent = 0
  const _loadNext = i => {
    const fileReader = new FileReader()
    fileReader.readAsArrayBuffer(fileChunkList[i].chunk)
    fileReader.onload = e => {
      count ++
      spark.append(e.target.result)
      if (count === fileLength) {
        self.postMessage({
          precent: HUNDRED,
          hash: spark.end()
        })
        self.close()
      } else {
        precent += HUNDRED / fileLength
        self.postMessage({
          precent
        })
        _loadNext(count)
      }
    }
  }
  _loadNext(0)
}