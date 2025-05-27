import { Resend } from 'resend';
import { AppUser, Ad } from './types'; // Assuming Ad and AppUser types are defined

let resend: Resend | null = null;
const apiKey = process.env.RESEND_API_KEY;

if (apiKey) {
  resend = new Resend(apiKey);
} else {
  console.warn("RESEND_API_KEY is not set. Email notifications will be disabled.");
}

interface AdResponseMessageDetails {
  adOwnerEmail: string;
  adOwnerName: string;
  responderName: string;
  adDetails: Pick<Ad, 'requested' | 'id'>;
  responseMessage: string;
}

export const sendAdResponseMessageEmail = async (details: AdResponseMessageDetails): Promise<boolean> => {
  if (!resend) {
    console.log("Email sending skipped: Resend client not initialized (API key missing or invalid).");
    return false;
  }

  const { adOwnerEmail, adOwnerName, responderName, adDetails, responseMessage } = details;
  const subject = `Yeni Bir Takas Yanıtı Aldınız: ${adDetails.requested}`;
  const appName = "Beyler Bi' Dal?"; // Or your app name
  // TODO: Replace with your actual domain and email sending address
  const fromEmail = process.env.EMAIL_FROM || `noreply@${process.env.NEXT_PUBLIC_APP_DOMAIN || 'example.com'}`;
  const adLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/my-activity`; // Link to where they can see responses

  try {
    const emailHtml = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Merhaba ${adOwnerName},</h2>
          <p><strong>${responderName}</strong> adlı kullanıcı, "<strong>${adDetails.requested}</strong>" başlıklı ilanınıza yeni bir yanıt gönderdi.</p>
          <p><strong>Yanıtı:</strong></p>
          <blockquote style="border-left: 4px solid #ccc; padding-left: 1em; margin-left: 0;">
            <p>${responseMessage}</p>
          </blockquote>
          <p>Yanıtı ve diğer ilan hareketlerinizi görmek için aşağıdaki bağlantıyı ziyaret edebilirsiniz:</p>
          <p><a href="${adLink}" style="display: inline-block; padding: 10px 15px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px;">Hareketlerimi Görüntüle</a></p>
          <p>Teşekkürler,<br/>${appName} Ekibi</p>
        </body>
      </html>
    `;

    const { data, error } = await resend.emails.send({
      from: fromEmail, 
      to: [adOwnerEmail],
      subject: subject,
      html: emailHtml,
    });

    if (error) {
      console.error('Error sending email via Resend:', error);
      return false;
    }

    console.log('Email sent successfully via Resend:', data);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}; 