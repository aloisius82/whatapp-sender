require('dotenv').config()
const ExcelJS = require('exceljs');
const axios = require('axios').default
const qrcode = require('qrcode-terminal')
const jsonfile = require('jsonfile');

const device_id = process.env.DEVICE_ID

// console.log(process.env)
const haveHeader = true

const config = {
    headers: { Authorization: `Bearer ${process.env.API_KEY}` }
};

const bodyParameters = {
    device_id
}

async function getDeviceStatus(){
    try {
        console.log(`check status divice ${device_id}`)
        let res = await axios.get(`${process.env.API_URL}/devices/${device_id}`,config)
        return res.data
    } catch (error) {
        // console.log()
        if(error.response && 
            error.response.data && 
            error.response.data.message =='Error: Device not found.')
        return null
        else throw error
    }
}

async function registerDevice(){
    console.log('register device')
    axios.post( 
        `${process.env.API_URL}/devices`,
        bodyParameters,
        config
    ).then(res=>{
        let data = res.data
        return data
    }).catch(console.log);
}

async function connectDevice(){
    try {
        let res = await axios.get(
            `${process.env.API_URL}/qr?device_id=${device_id}`,config
        )
        qrcode.generate(res.data.qr_code, {small: true})    
        // console.log(res.data.qr_code)
        return true
    } catch (error) {
        throw error
    }
}

async function readExcel(filePath){
    console.log(`Read excel file ${filePath}`)
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath)
        let ws = workbook.worksheets[0]
        let isEnd = false
        let rowNumber = haveHeader ? 2 : 1
        let data = []
        while (!isEnd) {
            // console.log(rowNumber)
            let row = ws.getRow(rowNumber);
            if(row.getCell(1).value){
                if(typeof row.getCell(4).value!= 'undefined'){
                    let original_phone_number = `${row.getCell(4).value}`
                    let phone_number = original_phone_number.trim().replace(/\s/g, '').replace(/-/g, '')
                    let address =(`${row.getCell(3).value}`).trim()
                    data.push({
                        name: `${row.getCell(1).value}`, 
                        original_phone_number,
                        phone_number,
                        address
                    })
                }
                rowNumber++
            }else{
                isEnd = true
            }
        }
        console.log(`Done`)
        return {filePath, rowNumber, count: data.length, data}
    } catch (error) {
        throw error
    }
    
}

readExcel(process.env.FILE_PATH).then(async dataExcel=>{
    try {
        try {
            let res = await getDeviceStatus()
            if(res== null){
                let regRes = await registerDevice()
                console.log(regRes)
                await connectDevice()
                return false
            }else if(res.status =='disconnected'){
                await connectDevice()
                return false
            }else{
                console.log('device ready to send message')
            } 
        } catch (error) {
            // console.log(error)
        }
        
        let log = []
        for(let data of dataExcel.data){
            let url_param = `to=${data.name.replace(/\s/g, '%20')}%3Cbr%2F%3E%20di%20${data.address}`
            let url = `${process.env.URL}${url_param  ? ('?' + url_param) : '' }`
            let message =`Dewi dan Dedy mengundang ${data.name.replace(/\s/g, ' ')} untuk hadir dalam acara Pernikahan kami, berikut link undangan:\n${url}`
            let param = {
                phone_number: data.phone_number,
                message,
                device_id,
                message_type:"text"
            }
            console.log(`send message ${data.name} - ${data.phone_number}`)
            let sendRes = await axios.post(`${process.env.API_URL}/messages`, param, config)
            log.push(sendRes.data)
            // console.log(sendRes.data)
        }
        // console.log();
        let date = new Date()
        let strDate = `${date.getFullYear()}${date.getMonth()}${date.getDate()}_${date.getHours()}${date.getMinutes()}`
        await jsonfile.writeFile(`./logs/log_${device_id}_${strDate}.json`, log, {spaces: 2, EOL: '\r\n'})
    } catch (error) {
        // console.log(error.message)
    }
})

// getDeviceStatus().then(async res=>{
//     // console.log(res)
//     if(res== null){
//         await registerDevice()
//     }else if(res.status =='disconnected'){
//         await connectDevice()
//     }else{
//         console.log('device ready to send message')
//     }

//     let param = {
//         phone_number: "6285710349028",
//         message: "test, hore berhasil",
//         device_id,
//         message_type:"text"
//     }
//     let sendRes = await axios.post(`${process.env.API_URL}/messages`, param, config)
//     console.log(sendRes)

// })

// axios.delete(
//     `${process.env.API_URL}/devices/${process.env.DEVICE_ID}`,
//     config).then(res=>{
//         console.log(res.data)
//     }).catch(console.log);

