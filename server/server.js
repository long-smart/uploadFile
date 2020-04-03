const http = require('http')
const server = http.createServer()
const path = require('path')
const fse = require("fs-extra")
const multiparty = require("multiparty")

const UPLOAD_DIR = path.resolve(__dirname, "target"); // 大文件存储目录

// 解析POST数据
const reslovePost = req => {
    return new Promise((reslove, reject) => {
        let chunk = ''
        req.on('data', data => {
            chunk += data
        })
        req.on('end', () => {
            reslove(JSON.parse(chunk));
        })
    })
}

// 写入文件
const pipeStream = (path, writeStream) => {
    return new Promise((reslove, reject) => {
        const readStream = fse.createReadStream(path)
        readStream.on('end', () => {
            fse.unlinkSync(path)
            reslove()
        })
        try {
            readStream.pipe(writeStream)

        } catch (err) {
            console.log('错误=>', err)
        }
    })
}

// 合并切片
const mergeFileChunk = async (filePath, filename, size) => {
    // const chunkDir = path.resolve(UPLOAD_DIR, filename)
    const chunkPaths = await fse.readdir(filePath)
    // 根据切片下标顺序进行排序
    chunkPaths.sort((a, b) => a.split('-')[1] - b.split('-')[1])
    // 合并文件
    await Promise.all(
        chunkPaths.map((chunkPath, index) => {
            return pipeStream(
                path.resolve(filePath, chunkPath),
                fse.createWriteStream(path.resolve(__dirname, "target", filename), {
                    start: index * size,
                    end: (index + 1) * size
                })
            )
        })
    )

    // 合并完成后删除切片目录
    fse.rmdirSync(filePath)
}

// 获取后缀名
const extractExt = filename =>
    filename.slice(filename.lastIndexOf("."), filename.length); // 提取后缀名


// 返回已经上传切片名列表
const createUploadedList = async fileHash =>
    fse.existsSync(path.resolve(UPLOAD_DIR, "slice", fileHash))
        ? await fse.readdir(path.resolve(UPLOAD_DIR, "slice", fileHash))
        : [];


server.on('request', async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Headers", "*")
    if (req.method === "OPTIONS") {
        res.status = 200;
        res.end()
        return
    }
    if (req.url == '/') {
        const multipart = new multiparty.Form()

        multipart.parse(req, async (err, fields, files) => {
            if (err) return
            const [chunk] = files.chunk
            const [hash] = fields.hash
            const [fileHash] = fields.fileHash
            const [filename] = fields.fileName
            const chunkdir = path.resolve(UPLOAD_DIR, "slice", fileHash)

            if (!fse.existsSync(chunkdir)) {
                await fse.mkdirs(chunkdir)
            }
            await fse.move(chunk.path, `${chunkdir}/${hash}`)
            res.end("received file chunk")
        })
    } else if (req.url == '/merge') {
        const data = await reslovePost(req)
        const { fileName, size, fileHash } = data
        const filePath = path.resolve(UPLOAD_DIR, "slice", `${fileHash}`)
        try {
            await mergeFileChunk(filePath, fileHash, size)
        } catch (err) {
            console.log('错武！', err)
        }

        res.end(
            JSON.stringify({ code: 0, message: "file merged success" })
        )
    } else if (req.url == '/verify') {
        const data = await reslovePost(req)
        const { fileHash, filename } = data
        const ext = extractExt(filename)
        const filePath = path.resolve(UPLOAD_DIR, `${fileHash}`);

        if (fse.existsSync(filePath)) {
            res.end(JSON.stringify({
                shouldUpload: false
            }))
        } else {
            const uploadedList = await createUploadedList(fileHash)
            console.log("已经上传的", uploadedList)
            res.end(JSON.stringify({
                shouldUpload: true,
                uploadedList: uploadedList
            }))
        }
    }

})


server.listen(3000, () => {
    console.log('server listing on port 3000')
})