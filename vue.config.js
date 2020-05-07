module.exports = {
  "transpileDependencies": [
    "vuetify"
  ],
  devServer: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true, //是否跨域
        ws: true, //是否启用websockets
        pathRewrite: {
          "^api": "/api"
        }
      }
    }
  }
}