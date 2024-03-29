// Utils 
const logger = require('../../health/logging/index') // Logger 
const { serverErrorResponse } = require('../../utils/response/res_500') // Error Response For server 
const { checkUserExists, authenticateUser } = require('../../utils/functions/user/user.function') // User utils 
const { sendMail } = require('../../utils/email/sendmail') // Mail Sender 
const { hashPassword }  = require('../../utils/functions/password.function') // Password Hashing 
const { getMailBody }  = require('../../utils/email/getMailBody')// Signup Email 
const crypto = require('crypto');// User to create verification string 



// models 
const User = require('../../models/User')
const MerchantBalance = require('../../models/MerchantBalance') 


const sendNewUserMail = async function(firstname,email,verificationLink)
{
    const mailBody = await getMailBody(firstname,verificationLink)

    if( !mailBody )
    { 
        return false 
    }
    
    const mailSent = await sendMail(email,mailBody)

     if( !mailSent )
     {
         return false 
     }


     return true 
}




const signup = async function(req, res, next)
        {
            try
            {
                const { firstname, lastname, email, password } = req.body 


                if( !firstname || !lastname || !email || !password ) 
                {
                    return res.status(400).json({ "success": false, "msg":" check request body "})
                }

                const userExists = await checkUserExists(email) 

                if( userExists )
                {
                    logger.info(`email taken : ${ userExists }`)
                    return res.status(400).json({"success": false, "msg":"email taken"})
                }


                // Hash password 
                const hashedPassword = await hashPassword(password) 
                const emailVerificationCode = crypto.randomBytes(15).toString('hex');
                const verificationLink = `http://${req.headers.host}/api/v1/verifyEmail/${emailVerificationCode}`
                
                console.log(" error not with verification link ")
                const newUserDoc = { firstname, lastname, email, password: hashedPassword, emailVerificationCode } 
                const newUser = new User(newUserDoc) 
                const createdUser = await newUser.save() 

                console.dir( createdUser) 

                const mailSent = await sendNewUserMail(firstname,email,verificationLink)  
                console.log(' mailsent is ' + mailSent ) 
                
                const merchantBalanceDoc = { merchant_id: createdUser._id }
                const newMerchantBalance = new MerchantBalance(merchantBalanceDoc) 
                await newMerchantBalance.save() 

                if( !mailSent ){ await User.deleteOne({ email });  return serverErrorResponse(res," Server encountered error during signup  ") }

                return res.status(201).json({"success": true, "msg":" new user created, check email for verfication link "})
            }
            catch(err)
            {
                logger.error(err)
                return serverErrorResponse(res," Server encountered error during signup ")
            }
        }



    
const verifyEmail = async function(req, res, next)
        {
            try 
            {
                const emailVerificationCode = req.params.verificationCode 
                const fields = { _id: 1, emailVerificationCode: 1, emailVerified: 1 }
                const userWithVerificationCode = await User.findOne({ emailVerificationCode },fields) 

                console.log( userWithVerificationCode ) 
                if( !userWithVerificationCode )
                {
                    return res.status(400).json({"success": false, "msg":" Invalid verification link "})
                }

                userWithVerificationCode.emailVerificationCode = ' '
                userWithVerificationCode.emailVerified = true 
                await userWithVerificationCode.save() 
                
                return res.status(200).json({"success": true, "msg":" email verified "})
            }
            catch(err)
            {
                logger.error(err)
                return serverErrorResponse(res," Server encountered error during email verification ")
            }
        }


        const signin = async function(req, res, next)
        {
                try 
                {


                    logger.info(` User on ${ req.url }`)

                    const { email, password } = req.body 

                    
                    logger.info(' user entered email and password ')
                    logger.info(' Authenticating email and password ') 

                    const authResponse = await authenticateUser(email,password) 

                    const statusCode = authResponse.statusCode 
                    delete authResponse.statusCode


                    if( authResponse.success === false ) 
                    {
                        logger.info(' login failed ')
                        return res.status(statusCode).json(authResponse)
                    }

                    
                    logger.info(' login passed ')
                    return res.status(statusCode).json(authResponse)
                    
                }
                catch(err)
                {
                    logger.error(err)
                    return serverErrorResponse(res," Server encountered error while signing in user ")
                }
        }




module.exports = { signup, verifyEmail, signin } 