
export const WhatsAppProvider = {
  async sendMessage(phone: string, message: string): Promise<boolean> {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneNumberId) {
      // Dev/staging: no credentials configured — log and simulate success
      console.warn(`[WhatsApp] Credenciales no configuradas, simulando envío a ${phone}`);
      return true;
    }

    const cleanPhone = phone.replace(/\D/g, '');

    try {
      const res = await fetch(
        `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: cleanPhone,
            type: 'text',
            text: { body: message },
          }),
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[WhatsApp] Error API (${res.status}):`, errText);
        return false;
      }

      const data = await res.json() as any;
      console.log(`[WhatsApp] Mensaje enviado a ${cleanPhone}, id: ${data?.messages?.[0]?.id}`);
      return true;
    } catch (err) {
      console.error('[WhatsApp] Error de red:', err);
      return false;
    }
  }
};
