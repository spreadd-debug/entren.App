
export const WhatsAppProvider = {
  async sendMessage(phone: string, message: string): Promise<boolean> {
    console.log(`[WHATSAPP] Sending to ${phone}: ${message}`);
    // Simulate API call
    return new Promise(resolve => setTimeout(() => resolve(true), 500));
  }
};
