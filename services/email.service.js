const nodemailer = require("nodemailer")
require("dotenv").config()

const EmailService = {
    send: async (email, code) => {
      try{
        const transporter = nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 587,
          secure: false, // Use `true` for port 465, `false` for all other ports
          auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PASSWORD,
          },
        });
        const info = await transporter.sendMail({
          from: '"App Service" <appservice.uit.se@gmail.com>', // sender address
          to: email, 
          subject: "Verify your email", 
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
              <div style="max-width: 500px; margin: auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
                <h2 style="color: #4CAF50; text-align: center;">🔒 Verification Code</h2>
                <p style="font-size: 16px; color: #333;">Hello,</p>
                <p style="font-size: 16px; color: #333;">
                  Please use the following verification code to complete your action. This code will expire in <strong>2 minutes</strong>.
                </p>
                <div style="text-align: center; margin: 20px 0;">
                  <span style="display: inline-block; padding: 12px 24px; font-size: 24px; font-weight: bold; background-color: #4CAF50; color: white; border-radius: 6px;">
                    ${code}
                  </span>
                </div>
                <p style="font-size: 14px; color: #888; text-align: center;">
                  If you did not request this code, please ignore this email.
                </p>
              </div>
            </div>
          `,
        });
      } catch (error) {
        console.error("Error sending email:", error);
        throw new Error("Failed to send verification email");
      }
    }
}

module.exports = EmailService;