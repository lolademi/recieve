

const serverErrorResponse = function(res,message)
                            {
                                return res.status(500).json({ "sucess": false, "msg": message })
                            }


module.exports = { serverErrorResponse } 