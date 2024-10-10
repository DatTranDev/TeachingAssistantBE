const tokenController = require("../controller/token_controller.js")
const express = require("express")
const route = express.Router()

route.get("/refresh-token", async (req,res)=>{
    const header = req.headers.authorization
    const split = header.split(" ")
    const token = split[1]
    const newToken = await tokenController.getAccessToken(token)
    return res.json({
        access_token: newToken
    })
})

route.delete("/deleteall/:key", async (req,res)=>{
    const SECRET_KEY = process.env.SECRET_KEY;
    const key = req.params.key
    if(key !== SECRET_KEY){
        return res.status(401).json({
            message: "Unauthorized"
        })
    }
    await tokenController.deleteAllToken()
    return res.json({
        message: "Deleted successfully"
    })
})
module.exports= route