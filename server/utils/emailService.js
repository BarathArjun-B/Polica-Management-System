const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendOTP = async (email, otp, username) => {
    const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;600;800&display=swap');
            body { 
                background-color: #030712; 
                margin: 0; 
                padding: 0; 
                font-family: 'Outfit', sans-serif;
                color: #f8fafc;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background: linear-gradient(180deg, #0f172a 0%, #030712 100%);
                border: 1px solid #1e293b;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            }
            .header {
                background: linear-gradient(90deg, #0f172a 0%, #1e3a8a 100%);
                padding: 30px;
                text-align: center;
                border-bottom: 1px solid #334155;
            }
            .logo {
                font-size: 28px;
                font-weight: 800;
                color: #f8fafc;
                letter-spacing: 2px;
                text-transform: uppercase;
                background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            .content {
                padding: 40px 30px;
                text-align: center;
            }
            .title {
                font-size: 20px;
                font-weight: 600;
                color: #94a3b8;
                margin-bottom: 10px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .otp-box {
                margin: 30px 0;
                background: rgba(15, 23, 42, 0.6);
                border: 1px solid #06b6d4;
                border-radius: 12px;
                padding: 20px;
                display: inline-block;
                box-shadow: 0 0 15px rgba(6, 182, 212, 0.2);
            }
            .otp-code {
                font-family: 'Courier New', monospace;
                font-size: 36px;
                font-weight: 800;
                color: #06b6d4;
                letter-spacing: 8px;
                text-shadow: 0 0 10px rgba(6, 182, 212, 0.5);
            }
            .message {
                color: #94a3b8;
                font-size: 14px;
                line-height: 1.6;
                margin-bottom: 20px;
            }
            .footer {
                padding: 20px;
                text-align: center;
                font-size: 12px;
                color: #475569;
                border-top: 1px solid #1e293b;
                background: #020617;
            }
            .warning {
                color: #ef4444;
                font-weight: 600;
                font-size: 12px;
                margin-top: 15px;
            }
        </style>
    </head>
    <body>
        <div style="padding: 40px 0;">
            <div class="container">
                <div class="header">
                    <div class="logo">VANGUARD</div>
                    <div style="font-size: 10px; color: #64748b; margin-top: 5px; letter-spacing: 1px;">SECURE COMMAND PORTAL</div>
                </div>
                <div class="content">
                    <div class="title">Authentication Request</div>
                    <div class="message">
                        Officer <strong>${username}</strong>,<br>
                        A secure login attempt was detected for your command profile.
                        Use the code below to complete the handshake.
                    </div>
                    
                    <div class="otp-box">
                        <div class="otp-code">${otp}</div>
                    </div>
                    
                    <div class="message">
                        This code is valid for 5 minutes.<br>
                        Do not share this packet with unauthorized personnel.
                    </div>

                    <div class="warning">
                        ⚠️ IF YOU DID NOT REQUEST THIS, IMMEDIATE REPORTING IS MANDATORY.
                    </div>
                </div>
                <div class="footer">
                    &copy; ${new Date().getFullYear()} Indian Police Department • Cyber Crimes Division<br>
                    Secure Transmission • E2EE Encrypted
                </div>
            </div>
        </div>
    </body>
    </html>
    `;

    try {
        await transporter.sendMail({
            from: `"Vanguard Command" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '🔐 VANGUARD: Secure Access Code',
            html: htmlTemplate
        });
        console.log(`[EMAIL] OTP sent to ${email}`);
        return true;
    } catch (error) {
        console.error('❌ [EMAIL ERROR DETAILED] ❌');
        console.error('Error Code:', error.code);
        console.error('Error Command:', error.command);
        console.error('Error Message:', error.message);
        console.error('Error Response:', error.response);
        return false;
    }
};

module.exports = { sendOTP };
