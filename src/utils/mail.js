import Mailgen from "mailgen";
import nodemailer from "nodemailer";

const sendEmail=async (options)=>{
    const mailGenerator=new Mailgen({
        theme:"default",
        product:{
            name:"Task Manager",
            link:"https://taskmanager.com",
        }
    })

    const emailTextual=mailGenerator.generatePlaintext(options.mailgenContent)
    
    const emailhtml=mailGenerator.generate(options.mailgenContent)

    const transporter = nodemailer.createTransport({
        host:process.env.MAILTRAP_SMTP_HOST,
        port:Number(process.env.MAILTRAP_SMTP_PORT),
        auth:{
            user:process.env.MAILTRAP_SMTP_USERNAME,
            pass:process.env.MAILTRAP_SMTP_PASSWORD
        }
    })

    const mail={
        from:"mail.taskmanager@example.com",
        to:options.email,
        subject:options.subject,
        text:emailTextual,
        html:emailhtml
    }

    try{
        await transporter.sendMail(mail)

    }catch(error){
        console.error("Email service failed silently.Make sure that you provided your MAILTRAP crendiatls in ths .env file");

        console.error("Error: ",error);


    }


}




const emailVerificationMailgenContent=(username,verificationUrl)=>{
    return {
        body:{
            name:username,
            intro:"Welcome to our App! we're exicited to have you on board.",
            action:{
                instructions:"To verify your email email please click on the following button",
                button:{
                    color:"#22BC66",
                    text:"Verify Email",
                    link:verificationUrl
                }
            },
            outro:"Need help,or have question?Just reply to this email,We'd love to help."
        }
    }
}
const forgotPasswordMailgenContent=(username,passwordResetUrl)=>{
    return {
        body:{
            name:username,
            intro:"Welcome to our App! we're exicited to have you on board.",
            action:{
                instructions:"To reset your Password click on the following button or link",
                button:{
                    color:"#f17853",
                    text:"Reset Password",
                    link:passwordResetUrl
                }
            },
            outro:"Need help,or have question?Just reply to this email,We'd love to help."
        }
    }
}

export{
    emailVerificationMailgenContent,forgotPasswordMailgenContent,
    sendEmail
}
