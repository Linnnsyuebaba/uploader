# 切片 + 断点续传
## 致谢：
>> [yeyan1996](https://juejin.im/post/5dff8a26e51d4558105420ed#heading-17)

>> [b站阿婆主：旅梦开发团](https://space.bilibili.com/43651653?spm_id_from=333.788.b_765f7570696e666f.2)
## 安装依赖
```
yarn install
```

### 运行项目
```
yarn serve
```

### 运行服务端
```
yarn server
```

### 结果测试
- 上传大文件视频
  ![大文件视频](https://linnnsyuebaba-github.oss-cn-shenzhen.aliyuncs.com/image/upload%20(1).png "上传大文件视频")
- 并发上传请求 + 合并请求
  ![并发上传请求+合并请求](https://linnnsyuebaba-github.oss-cn-shenzhen.aliyuncs.com/image/upload%20(2).png "并发上传请求+合并请求")
- 同文件再传
  ![同文件再传](https://linnnsyuebaba-github.oss-cn-shenzhen.aliyuncs.com/image/upload%20(3).png "同文件再传")