import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const emailStyles = `
  .email-container {
    font-family: Arial, sans-serif;
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    background-color: #ffffff;
  }
  .header {
    text-align: center;
    padding: 20px 0;
    border-bottom: 2px solid #f0f0f0;
  }
  .header h1 {
    color: #2c3e50;
    margin: 0;
    font-size: 24px;
  }
  .content {
    padding: 20px 0;
    line-height: 1.6;
    color: #444444;
  }
  .footer {
    text-align: center;
    padding: 20px 0;
    border-top: 2px solid #f0f0f0;
    color: #666666;
    font-size: 14px;
  }
  .button {
    display: inline-block;
    padding: 12px 24px;
    background-color: #3498db;
    color: #ffffff;
    text-decoration: none;
    border-radius: 4px;
    margin: 20px 0;
  }
  .donation-details {
    background-color: #f8f9fa;
    padding: 15px;
    border-radius: 8px;
    margin: 15px 0;
  }
  ul {
    padding-left: 20px;
  }
  li {
    margin-bottom: 8px;
  }
`;

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

const wrapEmailContent = (content: string) => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <style>${emailStyles}</style>
    </head>
    <body>
      <div class="email-container">
        ${content}
        <div class="footer">
          <p>© ${new Date().getFullYear()} GiveToAfrica. All rights reserved.</p>
          <p>Making a difference in Africa, one donation at a time.</p>
        </div>
      </div>
    </body>
  </html>
`;

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
      from: process.env.EMAIL_FROM,
    });
  }

  private async sendEmail(options: EmailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        ...options,
      });
    } catch (error) {
      console.error("Error sending email:", error);
      throw new Error("Failed to send email");
    }
  }

  // 1. Account Creation Email
  async sendWelcomeEmail(userEmail: string, userName: string): Promise<void> {
    const content = `
      <div class="header">
        <h1>Welcome to GiveToAfrica!</h1>
      </div>
      <div class="content">
        <h2>Hello ${userName},</h2>
        <p>Welcome to the GiveToAfrica community! We're thrilled to have you join us in our mission to make a positive impact in Africa.</p>
        <p>With your new account, you can:</p>
        <ul>
          <li>Explore meaningful campaigns</li>
          <li>Make secure donations</li>
          <li>Track your impact</li>
          <li>Connect with causes you care about</li>
        </ul>
      </div>
    `;

    const options: EmailOptions = {
      to: userEmail,
      subject: "Welcome to GiveToAfrica - Account Created Successfully",
      html: wrapEmailContent(content),
    };
    await this.sendEmail(options);
  }

  // 2. Admin Approval Email
  async sendApprovalEmail(
    userEmail: string,
    userName: string,
    isApproved: boolean
  ): Promise<void> {
    const content = isApproved
      ? `
        <div class="header">
          <h1>Account Approved!</h1>
        </div>
        <div class="content">
          <h2>Congratulations ${userName}!</h2>
          <p>Your GiveToAfrica account has been approved by our administrators.</p>
          <p>You now have full access to all features of our platform:</p>
          <ul>
            <li>Create and manage campaigns</li>
            <li>Receive donations</li>
            <li>Track impact metrics</li>
            <li>Connect with donors</li>
          </ul>
        </div>
      `
      : `
        <div class="header">
          <h1>Account Status Update</h1>
        </div>
        <div class="content">
          <h2>Dear ${userName},</h2>
          <p>We regret to inform you that your account application has not been approved at this time.</p>
          <p>If you believe this is an error or would like to provide additional information, please don't hesitate to contact our support team.</p>
        </div>
      `;

    const options: EmailOptions = {
      to: userEmail,
      subject: isApproved
        ? "Your GiveToAfrica Account Has Been Approved"
        : "GiveToAfrica Account Status Update",
      html: wrapEmailContent(content),
    };
    await this.sendEmail(options);
  }

  // 3. Donation Confirmation Email
  async sendDonationConfirmationEmail(
    userEmail: string,
    userName: string,
    campaignName: string,
    amount: number,
    currency: string,
    campaignId?: string
  ): Promise<void> {
    let content: string;
    let subject: string;

    if (campaignId === "688d5445cea70a7c2c17cc22") {
      // Special template for The Frontline Fund
      content = `
      <div class="header">
        <h1>Thank You for Your Donation</h1>
      </div>
      <div class="content">
        <h2>Dear Friend,</h2>
        <p>Thank you for your generous donation to Give to Africa.</p>
        
        <p>Your contribution is helping to uplift grassroots nonprofits across Africa — empowering local leaders, restoring dignity, and making real change possible. We are grateful for your support.</p>
        
        <div class="donation-details">
          <h3>Donation Details:</h3>
          <p>Campaign: ${campaignName}</p>
          <p>Amount: ${currency} ${amount.toLocaleString()}</p>
          <p>Date: ${new Date().toLocaleDateString()}</p>
        </div>

        <p>This email serves as your official donation receipt.</p>
        <p>Give to Africa Corporation is a 501(c)(3) public charity based in California.<br/>
        EIN: 33-1917403</p>
        <p>The full amount of your gift qualifies as a charitable contribution for federal tax purposes in the United States. No goods or services were provided in exchange for this donation.</p>
        
        <p>If you have any questions or need a detailed receipt, feel free to contact us at info@2africa.org.</p>
        
        <p>With deep appreciation,<br/>
        Give to Africa Team<br/>
        www.2africa.org</p>
      </div>
      `;
      subject =
        "Thank You for Your Donation – Your Receipt from Give to Africa";
    } else {
      // Default template for other campaigns
      content = `
      <div class="header">
        <h1>Thank You for Your Donation!</h1>
      </div>
      <div class="content">
        <h2>Dear ${userName},</h2>
        <p>Your generous contribution means the world to us and those we serve.</p>
        
        <div class="donation-details">
          <h3>Donation Details:</h3>
          <p>Campaign: ${campaignName}</p>
          <p>Amount: ${currency} ${amount.toLocaleString()}</p>
          <p>Date: ${new Date().toLocaleDateString()}</p>
          <p>Donor Email: ${userEmail}</p>
        </div>

        <p>Your donation will help create real change and improve lives in Africa. We'll keep you updated on the impact of your contribution.</p>
      </div>
      `;
      subject = "Thank You for Your Donation!";
    }

    const options: EmailOptions = {
      to: userEmail,
      subject: subject,
      html: wrapEmailContent(content),
    };
    await this.sendEmail(options);
  }

  // 4. NGO Donation Notification Email
  async sendNgoDonationNotificationEmail(
    ngoEmail: string,
    ngoName: string,
    campaignName: string,
    donorName: string,
    amount: number,
    currency: string,
    donorEmail: string
  ): Promise<void> {
    const content = `
      <div class="header">
        <h1>New Donation Received!</h1>
      </div>
      <div class="content">
        <h2>Dear ${ngoName},</h2>
        <p>Excellent news! Your campaign has received a new donation.</p>
        
        <div class="donation-details">
          <h3>Donation Details:</h3>
          <p>Campaign: ${campaignName}</p>
          <p>Amount: ${currency} ${amount.toLocaleString()}</p>
          <p>Donor: ${donorName}</p>
          <p>Donor Email: ${donorEmail}</p>
          <p>Date: ${new Date().toLocaleDateString()}</p>
        </div>

        <p>Thank you for your continued dedication to making a difference in Africa.</p>
      </div>
    `;

    const options: EmailOptions = {
      to: ngoEmail,
      subject: `New Donation Received for ${campaignName}`,
      html: wrapEmailContent(content),
    };
    await this.sendEmail(options);
  }

  // 5. NGO Pending Payment Notification Email
  async sendNgoPendingPaymentNotificationEmail(
    ngoEmail: string,
    ngoName: string,
    campaignName: string,
    donorName: string,
    amount: number,
    currency: string,
    paymentMethod: string
  ): Promise<void> {
    const content = `
      <div class="header">
        <h1>New Pending Payment</h1>
      </div>
      <div class="content">
        <h2>Dear ${ngoName},</h2>
        <p>A new pending payment has been initiated for your campaign.</p>
        
        <div class="donation-details">
          <h3>Payment Details:</h3>
          <p>Campaign: ${campaignName}</p>
          <p>Amount: ${currency} ${amount.toLocaleString()}</p>
          <p>Donor: ${donorName}</p>
          <p>Payment Method: ${paymentMethod}</p>
          <p>Status: Pending</p>
          <p>Date: ${new Date().toLocaleDateString()}</p>
        </div>

        <p>This payment is currently being processed through ${paymentMethod}. We'll notify you once the payment is confirmed.</p>
        
        <center>
      </div>
    `;

    const options: EmailOptions = {
      to: ngoEmail,
      subject: `New Pending Payment for ${campaignName}`,
      html: wrapEmailContent(content),
    };
    await this.sendEmail(options);
  }
}

// Export a singleton instance
export const emailService = new EmailService();
