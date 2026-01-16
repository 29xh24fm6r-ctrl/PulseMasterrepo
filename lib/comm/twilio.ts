import { twilioClient as newClient } from "@/services/twilio";
export const twilioClient = () => newClient;
export * from "@/services/twilio";
