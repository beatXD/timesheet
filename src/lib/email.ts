import { Resend } from "resend";
import { format } from "date-fns";
import { th } from "date-fns/locale";

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY is not set. Email notifications are disabled.");
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@example.com";
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Timesheet";

interface LeaveRequestEmailParams {
  to: string;
  leaderName: string;
  userName: string;
  startDate: Date;
  endDate: Date;
  leaveType: string;
  reason?: string;
}

const leaveTypeLabels: Record<string, { en: string; th: string }> = {
  sick: { en: "Sick Leave", th: "ลาป่วย" },
  personal: { en: "Personal Leave", th: "ลากิจ" },
  annual: { en: "Annual Leave", th: "ลาพักร้อน" },
};

export async function sendLeaveRequestEmail(params: LeaveRequestEmailParams) {
  const { to, leaderName, userName, startDate, endDate, leaveType, reason } =
    params;

  // Calculate number of days
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const leaveLabel = leaveTypeLabels[leaveType] || { en: leaveType, th: leaveType };

  const formatDate = (date: Date) =>
    format(date, "dd MMMM yyyy", { locale: th });

  const subject = `[${APP_NAME}] คำขอลางาน: ${userName} ขอ${leaveLabel.th}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Leave Request Notification</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">📋 คำขอลางาน / Leave Request</h1>
  </div>

  <div style="background: #f8f9fa; padding: 30px; border: 1px solid #e9ecef; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="margin-top: 0;">สวัสดี <strong>${leaderName}</strong>,</p>

    <p><strong>${userName}</strong> ได้ส่งคำขอลางานมาเพื่อขออนุมัติ:</p>

    <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666; width: 120px;">ประเภทการลา:</td>
          <td style="padding: 8px 0; font-weight: bold;">${leaveLabel.th} (${leaveLabel.en})</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">วันที่เริ่ม:</td>
          <td style="padding: 8px 0; font-weight: bold;">${formatDate(start)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">วันที่สิ้นสุด:</td>
          <td style="padding: 8px 0; font-weight: bold;">${formatDate(end)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">จำนวนวัน:</td>
          <td style="padding: 8px 0; font-weight: bold;">${diffDays} วัน</td>
        </tr>
        ${
          reason
            ? `
        <tr>
          <td style="padding: 8px 0; color: #666; vertical-align: top;">เหตุผล:</td>
          <td style="padding: 8px 0;">${reason}</td>
        </tr>
        `
            : ""
        }
      </table>
    </div>

    <p style="margin-bottom: 25px;">กรุณาเข้าสู่ระบบเพื่ออนุมัติหรือปฏิเสธคำขอนี้:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/team/leaves"
         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
        ดูคำขอลางาน
      </a>
    </div>

    <hr style="border: none; border-top: 1px solid #e9ecef; margin: 30px 0;">

    <p style="color: #666; font-size: 12px; margin-bottom: 0;">
      อีเมลนี้ถูกส่งโดยอัตโนมัติจากระบบ ${APP_NAME}<br>
      กรุณาอย่าตอบกลับอีเมลนี้
    </p>
  </div>
</body>
</html>
  `;

  const resend = getResendClient();
  if (!resend) {
    console.log("Email not sent: Resend client not configured");
    return null;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error("Failed to send leave request email:", error);
      throw new Error(error.message);
    }

    console.log("Leave request email sent successfully:", data?.id);
    return data;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}
