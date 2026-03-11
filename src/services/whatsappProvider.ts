
export interface WhatsAppMessageParams {
  to: string;
  templateCode: string;
  variables: Record<string, string | number>;
}

export interface WhatsAppResponse {
  success: boolean;
  externalMessageId?: string;
  providerResponse?: any;
  error?: string;
}

export const WhatsAppProvider = {
  /**
   * Simulates sending a template message via WhatsApp Cloud API
   */
  sendTemplateMessage: async (params: WhatsAppMessageParams): Promise<WhatsAppResponse> => {
    console.log(`[WhatsAppProvider] Sending template "${params.templateCode}" to ${params.to}`, params.variables);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock success response
    return {
      success: true,
      externalMessageId: `wa_${Math.random().toString(36).substring(7)}`,
      providerResponse: {
        messaging_product: "whatsapp",
        contacts: [{ input: params.to, wa_id: params.to }],
        messages: [{ id: `wa_${Math.random().toString(36).substring(7)}` }]
      }
    };
  }
};
