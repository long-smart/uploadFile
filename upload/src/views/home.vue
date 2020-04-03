<template>
    <div calss="home">
        <input type="file" @change="handleFileChange" />
        <el-button @click="handleUpload">上传</el-button>
        <el-button @click="handlePause">暂停</el-button>

        {{ uploadPercentage }}
        <div class="progress">
            <div>计算文件 hash</div>
            <el-progress :percentage="hashPercentage"></el-progress>
            <div>总进度</div>
            <el-progress :percentage="uploadPercentage"></el-progress>
        </div>
    </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'

const SIZE: number = 10 * 1024 * 1024 // 切片大小

interface Con {
    file: any
    hash: string
    worker: any
}

@Component
export default class Home extends Vue {
    private container: Con = {
        file: null,
        hash: '',
        worker: null
    }
    // 文件切片
    private data: Array<any> = []
    // hash计算进度
    private hashPercentage = 0
    // 保存当前正在上传切片的 request
    private requestList: Array<XMLHttpRequest> = []

    private handleFileChange(e: any) {
        const [file] = e.target.files
        if (!file) return
        // Object.assign(this.$data, this.$options.data())
        this.container.file = file
    }

    // 计算属性计算进度
    get uploadPercentage() {
        if (!this.container.file || !this.data.length) return 0
        const loaded = this.data.map(item => item.chunk.size * item.percentage).reduce((acc, cur) => acc + cur)
        return parseInt((loaded / this.container.file.size).toFixed(2))
    }

    // 计算文件hash
    private calcHash(fileChunkList: Array<any>) {
        return new Promise(resolve => {
            // 添加 worker
            this.container.worker = new Worker('/hash.js')
            this.container.worker.postMessage({ fileChunkList })
            this.container.worker.onmessage = (e: any) => {
                const { percentage, hash } = e.data
                this.hashPercentage = Number(percentage.toFixed(1))
                if (hash) {
                    resolve(hash)
                }
            }
        })
    }

    private async verifyUpload(filename: string, fileHash: string) {
        const { data }: any = await this.request({
            url: 'http://localhost:3000/verify',
            headers: {
                'content-type': 'application/json'
            },
            data: JSON.stringify({
                filename,
                fileHash
            })
        })
        return JSON.parse(data)
    }

    // 生成文件切片
    private createFileChunk(file: any, size: number = SIZE) {
        const fileChunkList: Array<any> = []
        let cur = 0
        while (cur < file.size) {
            fileChunkList.push({ file: file.slice(cur, cur + size) })
            cur += size
        }
        return fileChunkList
    }

    private createProgressHandler(item: any) {
        return (e: any) => {
            item.percentage = parseInt(String((e.loaded / e.total) * 100))
        }
    }

    // 合并每个切片
    private async mergeRequest() {
        await this.request({
            url: 'http://localhost:3000/merge',
            headers: {
                'content-type': 'application/json'
            },
            data: JSON.stringify({ fileName: this.container.file.name, size: SIZE, fileHash: this.container.hash })
        })
        this.$message.success('上传成功')
    }

    // 上传文件
    private async handleUpload() {
        if (!this.container.file) return
        const fileChunkList = this.createFileChunk(this.container.file)
        this.container.hash = (await this.calcHash(fileChunkList)) as string

        const { shouldUpload, uploadedList } = await this.verifyUpload(this.container.file.name, this.container.hash)

        if (!shouldUpload) {
            this.$message.success('上传成功')
            return
        }

        this.data = fileChunkList.map(({ file }, index) => ({
            fileHash: this.container.hash,
            chunk: file,
            index,
            hash: this.container.file.name + '-' + index,
            percentage: uploadedList.includes(this.container.file.name + '-' + index) ? 100 : 0
        }))
        await this.uploadChunks(uploadedList)
    }

    // 上传切片
    private async uploadChunks(uploadedList: Array<any>) {
        const requestList = this.data
            .filter(({ hash }) => !uploadedList.includes(hash))
            .map(({ chunk, hash, index, fileHash }: any) => {
                const formData: FormData = new FormData()
                formData.append('chunk', chunk)
                formData.append('hash', hash)
                formData.append('fileName', this.container.file.name)
                formData.append('fileHash', fileHash)
                return { formData, index }
            })
            .map(async ({ formData, index }) => {
                await this.request({
                    url: 'http://localhost:3000',
                    method: 'post',
                    data: formData,
                    onProgress: this.createProgressHandler(this.data[index]),
                    requestList: this.requestList
                })
            })
        console.log('requestList :', requestList)
        await Promise.all(requestList)
        // 之前上传的切片数量 + 本次上传的切片数量 = 所有切片数量时
        // 合并切片
        if (uploadedList.length + requestList.length === this.data.length) {
            await this.mergeRequest()
        }
    }

    // 暂停上传
    private handlePause() {
        this.requestList.forEach(xhr => xhr?.abort())
        this.requestList = []
    }

    public request({ url, method = 'post', data, headers = {}, onProgress, requestList }: any) {
        return new Promise(resolve => {
            const xhr = new XMLHttpRequest()
            xhr.open(method, url)
            xhr.upload.onprogress = onProgress
            Object.keys(headers).forEach(key => xhr.setRequestHeader(key, headers[key]))
            xhr.send(data)
            xhr.onload = (e: any) => {
                if (requestList) {
                    const xhrIndex = requestList.findIndex((item: any) => item === xhr)
                    requestList.splice(xhrIndex, 1)
                }

                resolve({
                    data: e.target.response
                })
            }
            requestList?.push(xhr)
        })
    }
}
</script>

<style scoped lang="stylus"></style>
