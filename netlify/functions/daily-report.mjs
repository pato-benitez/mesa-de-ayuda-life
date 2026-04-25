import { createClient } from "@supabase/supabase-js";

export default async (req) => {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // Fetch all open tickets
  const { data: tickets, error } = await supabase
    .from("tickets")
    .select("*")
    .neq("status", "Cerrado")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase error:", error);
    return new Response("Error fetching tickets", { status: 500 });
  }

  const total      = tickets.length;
  const abiertos   = tickets.filter(t => t.status === "Abierto").length;
  const enProceso  = tickets.filter(t => t.status === "En Proceso").length;
  const resueltos  = tickets.filter(t => t.status === "Resuelto").length;
  const urgentes   = tickets.filter(t => t.priority === "Urgente");
  const hoy        = new Date().toLocaleDateString("es-UY", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const priorityColor = { Urgente: "#E53E3E", Alta: "#DD6B20", Media: "#3182CE", Baja: "#718096" };
  const statusColor   = { Abierto: "#38A169", "En Proceso": "#D69E2E", Resuelto: "#3182CE" };

  const ticketRows = tickets.map(t => `
    <tr style="border-bottom:1px solid #F0F0F0;">
      <td style="padding:10px 12px;font-size:13px;color:#1a1a1a;max-width:200px;">${t.title}</td>
      <td style="padding:10px 12px;font-size:12px;">
        <span style="background:${priorityColor[t.priority]}22;color:${priorityColor[t.priority]};padding:2px 8px;border-radius:12px;font-weight:500;">${t.priority}</span>
      </td>
      <td style="padding:10px 12px;font-size:12px;">
        <span style="background:${statusColor[t.status]}22;color:${statusColor[t.status]};padding:2px 8px;border-radius:12px;font-weight:500;">${t.status}</span>
      </td>
      <td style="padding:10px 12px;font-size:13px;color:#555;">${t.location}</td>
      <td style="padding:10px 12px;font-size:13px;color:#555;">${t.reported_by || "—"}</td>
    </tr>
  `).join("");

  const urgentesSection = urgentes.length > 0 ? `
    <div style="background:#FFF5F5;border:1px solid #FEB2B2;border-radius:10px;padding:16px;margin-bottom:24px;">
      <div style="font-weight:700;color:#C53030;font-size:14px;margin-bottom:10px;">⚠️ Tickets Urgentes (${urgentes.length})</div>
      ${urgentes.map(t => `
        <div style="background:#fff;border-radius:8px;padding:10px 12px;margin-bottom:6px;border-left:3px solid #E53E3E;">
          <div style="font-weight:600;font-size:13px;color:#1a1a1a;">${t.title}</div>
          <div style="font-size:12px;color:#666;margin-top:2px;">${t.location}${t.reported_by ? ` · Reportado por ${t.reported_by}` : ""}</div>
        </div>
      `).join("")}
    </div>
  ` : "";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F7F8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:640px;margin:0 auto;padding:24px 16px;">

    <!-- Header -->
    <div style="background:#fff;border-radius:12px;padding:24px 28px;margin-bottom:16px;border:1px solid #EBEBEB;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
        <div style="font-weight:700;font-size:20px;color:#1a1a1a;">Mesa de Ayuda</div>
        <div style="font-size:12px;color:#999;">Reporte diario</div>
      </div>
      <div style="font-size:13px;color:#888;text-transform:capitalize;">${hoy}</div>
    </div>

    <!-- Stats -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;">
      <div style="background:#fff;border-radius:10px;padding:16px;border:1px solid #EBEBEB;text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#1a1a1a;">${abiertos}</div>
        <div style="font-size:12px;color:#888;margin-top:2px;">Abiertos</div>
      </div>
      <div style="background:#fff;border-radius:10px;padding:16px;border:1px solid #EBEBEB;text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#D69E2E;">${enProceso}</div>
        <div style="font-size:12px;color:#888;margin-top:2px;">En Proceso</div>
      </div>
      <div style="background:#fff;border-radius:10px;padding:16px;border:1px solid #EBEBEB;text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#38A169;">${resueltos}</div>
        <div style="font-size:12px;color:#888;margin-top:2px;">Resueltos</div>
      </div>
    </div>

    <!-- Urgentes -->
    ${urgentesSection}

    <!-- Tabla de tickets -->
    <div style="background:#fff;border-radius:12px;border:1px solid #EBEBEB;overflow:hidden;margin-bottom:16px;">
      <div style="padding:16px 20px;border-bottom:1px solid #F0F0F0;">
        <div style="font-weight:600;font-size:15px;color:#1a1a1a;">Todos los tickets activos (${total})</div>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#FAFAFA;">
            <th style="padding:10px 12px;font-size:11px;color:#999;font-weight:600;text-align:left;text-transform:uppercase;letter-spacing:0.05em;">Problema</th>
            <th style="padding:10px 12px;font-size:11px;color:#999;font-weight:600;text-align:left;text-transform:uppercase;letter-spacing:0.05em;">Prioridad</th>
            <th style="padding:10px 12px;font-size:11px;color:#999;font-weight:600;text-align:left;text-transform:uppercase;letter-spacing:0.05em;">Estado</th>
            <th style="padding:10px 12px;font-size:11px;color:#999;font-weight:600;text-align:left;text-transform:uppercase;letter-spacing:0.05em;">Ubicación</th>
            <th style="padding:10px 12px;font-size:11px;color:#999;font-weight:600;text-align:left;text-transform:uppercase;letter-spacing:0.05em;">Reportado por</th>
          </tr>
        </thead>
        <tbody>
          ${ticketRows}
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <div style="text-align:center;font-size:12px;color:#BBB;padding:8px 0;">
      Reporte automático · Mesa de Ayuda · LIFE
    </div>

  </div>
</body>
</html>
  `;

  // Send email via Resend
  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from:    "Mesa de Ayuda <reportes@tudominio.com>",   // ← cambiá por tu dominio verificado en Resend
      to:      [process.env.REPORT_EMAIL],                 // ← se configura en Netlify env vars
      subject: `📋 Reporte diario · ${total} tickets activos · ${new Date().toLocaleDateString("es-UY")}`,
      html,
    }),
  });

  if (!emailRes.ok) {
    const err = await emailRes.text();
    console.error("Resend error:", err);
    return new Response("Error sending email", { status: 500 });
  }

  console.log(`✅ Reporte enviado: ${total} tickets activos`);
  return new Response("OK", { status: 200 });
};

export const config = {
  schedule: "0 9 * * *",   // todos los días a las 9:00 AM UTC
};
