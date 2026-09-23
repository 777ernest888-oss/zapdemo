const nodemailer=require('nodemailer');
const t=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||465),secure:true,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}});
function sendMail(to,subject,html){return t.sendMail({from:process.env.SMTP_FROM||process.env.SMTP_USER,to:to,subject:subject,html:html});}
module.exports={sendMail:sendMail};
