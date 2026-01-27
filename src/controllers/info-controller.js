const info=(req, res) => {
    return res.json({
        success:true,
        message:'API is lIVE',
        error:{},
        data:{}
    })
}

module.exports={
    info
}