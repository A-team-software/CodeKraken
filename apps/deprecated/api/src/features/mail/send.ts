import nodemailer from "nodemailer"


const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', // Replace with your SMTP host
    port: 465,
    secure: true,           // Use true for 465, false for other ports
    auth: {
        user: 'benmatanda354@gmail.com',  // Your email address
        pass: 'jtia vkiu vasw hbay',           // Your email password
    },
});

// Send email function
export async function sendEmail(id: string, invitationID: string, email: string) {
    try {
        const mailOptions = {
            from: '"Ben Matanda" benmatanda354@gmail.com>', // Sender address
            to: `${email}`,                 // List of recipients
            subject: 'Hello from TypeScript!',           // Subject line
            text: `You have been invited to a project. Accept the invitation here: http://localhost:3000/invite/accept_invite?projectId=${id}&inviteID=${invitationID},`,         // Plain text body
            // html: `<b>${payload}</b>`,       // HTML body
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
}
