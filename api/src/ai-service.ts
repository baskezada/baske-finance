import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "./logger";
import { db } from "./db";
import { banks } from "./schema";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export interface ParsedTransaction {
  isTransaction: boolean;
  bankId?: string;
  amount?: number;
  currency?: string;
  category?: string;
  description?: string;
  cardLastFour?: string;
  transactionDate?: string; // ISO format string
  transactionType?: "cargo" | "abono"; // New field
}

export interface ParsedPurchaseInfo {
  isPurchase: boolean;
  amount?: number;
  currency?: string;
  purchaseDate?: string; // ISO format string
  summary?: string; // Markdown formatted summary of the purchase
}

export const aiService = {
  async checkIfLikelyTransaction(
    subject: string,
    from: string
  ): Promise<boolean> {
    if (!process.env.GEMINI_API_KEY) return false;

    const prompt = `
            
            Clasifica el siguiente encabezado de correo (Asunto y Remitente) en una de las siguientes tres categorías, priorizando la fuente del mensaje sobre el contenido:

            BANK_TRANSACTION: Todo correo enviado por una entidad bancaria o financiera (bancos, emisores de tarjetas, billeteras virtuales). Incluye avisos de compras, transferencias, pagos de cartolas o movimientos de fondos, ya que son notificaciones de movimientos de dinero reportados por el banco.

            PURCHASE_INFORMATION: Todo correo enviado directamente por un comercio, tienda o plataforma de ventas (e-commerce, retail, apps de delivery, servicios de suscripción). Incluye confirmaciones de pedido, boletas, facturas o detalles de productos comprados.

            OTHER: Correos que no correspondan a movimientos financieros ni a confirmaciones de compras en comercios (publicidad, seguridad, spam, boletines).

            Instrucción estricta: Responde solo con una de las frases exactas: "BANK_TRANSACTION", "PURCHASE_INFORMATION", o "OTHER".

            Subject: ${subject}
            From: ${from}
        `;
    logger.info({ prompt }, "Pre-filtering classification prompt");
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim().toUpperCase();

      logger.info(
        { subject, from, classification: text },
        "Pre-filtering classification result"
      );

      return text.includes("BANK_TRANSACTION");
    } catch (error) {
      logger.error({ error }, "Error in pre-filtering check");
      return true; // Default to true to avoid missing potential transactions on error
    }
  },

  async parseEmailTransaction(
    subject: string,
    from: string,
    content: string
  ): Promise<ParsedTransaction | null> {
    if (!process.env.GEMINI_API_KEY) {
      logger.warn("GEMINI_API_KEY is not set. Skipping AI parsing.");
      return null;
    }
    // List banks for validation
    const banks_availables = await db
      .select({ id: banks.id, name: banks.name })
      .from(banks);

    logger.info("Sending email content to Gemini for parsing...");

    const banksForPrompt = banks_availables.map((b) => ({
      id: b.id,
      name: b.name,
    }));

    const prompt = `
Analyze the following email and determine if it represents a bank transaction (purchase, transfer, etc.).
If it is a transaction, extract the following details in JSON format.
If it is NOT a transaction, return {"isTransaction": false}.

Fields to extract:
- isTransaction (boolean)
- bankId (string, id of the bank or fintech. You MUST choose one of the following banks and return its id exactly)
- amount (number, only the numeric value)
- currency (string, ISO code like USD, EUR, CLP - default to CLP if not specified)
- category (string, e.g., Food, Transport, Subscription, etc.)
- description (string, merchant name or short description)
- cardLastFour (string, last 4 digits of the card if available)
- transactionDate (string, ISO 8601 format if available, otherwise null)

Available banks (JSON):
${JSON.stringify(banksForPrompt, null, 2)}

Email details:
Subject: ${subject}
From: ${from}

Email body:
"""
${content}
"""

Return ONLY the JSON.
`;
    logger.info({ prompt }, "AI Parsing Prompt");
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract JSON from potential markdown blocks
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.warn({ text }, "No JSON found in Gemini response");
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]) as ParsedTransaction;
      return parsed.isTransaction ? parsed : null;
    } catch (error) {
      logger.error({ error }, "Error calling Gemini API");
      return null;
    }
  },

  async parseExcelTransactions(
    excelDataString: string
  ): Promise<ParsedTransaction[]> {
    if (!process.env.GEMINI_API_KEY) {
      logger.warn("GEMINI_API_KEY is not set. Skipping AI parsing.");
      return [];
    }

    logger.info("Sending Excel data to Gemini for parsing...");

    const prompt = `
            You are analyzing transaction data from an Excel file.
            
            Your task is to extract ALL transactions from this data and return them as a JSON array.
            
            For each transaction, extract:
            - amount (number, the absolute value without sign)
            - transactionType ("cargo" for expenses or "abono" for income - infer from negative/positive amounts or debit/credit columns, if is a charge in a credit card is a cargo)
            - currency (string, ISO code like USD, EUR, CLP - default to CLP if not specified)
            - category (string, categorize the transaction: Food, Transport, Shopping, Services, Salary, Transfer, etc.)
            - description (string, merchant name or transaction description)
            - transactionDate (string, ISO 8601 format if available)
            - cardLastFour (string, last 4 digits if available)

            Important rules:
            - If amount is negative or marked as "cargo", set transactionType to "cargo"
            - If amount is positive or marked as "abono", set transactionType to "abono"
            - Always use absolute values for amount (no negative signs)
            - Skip header rows and summary rows
            - Only include actual transactions

            Excel data:
            """
            ${excelDataString}
            """

            Return ONLY a JSON array of transactions. Example:
            [
                {
                    "amount": 1500.50,
                    "transactionType": "cargo",
                    "currency": "ARS",
                    "category": "Food",
                    "description": "Supermercado",
                    "transactionDate": "2024-01-15T00:00:00Z",
                    "cardLastFour": "1234"
                }
            ]
        `;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      // Extract JSON from response
      const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (!jsonMatch) {
        logger.warn("No JSON array found in AI response");
        return [];
      }

      const transactions = JSON.parse(jsonMatch[0]) as ParsedTransaction[];
      logger.info(
        { count: transactions.length },
        "Transactions parsed from Excel"
      );

      return transactions;
    } catch (error) {
      logger.error({ error }, "Error parsing Excel with AI");
      return [];
    }
  },

  async parsePurchaseInformation(
    subject: string,
    from: string,
    content: string
  ): Promise<ParsedPurchaseInfo | null> {
    if (!process.env.GEMINI_API_KEY) {
      logger.warn("GEMINI_API_KEY is not set. Skipping AI parsing.");
      return null;
    }

    logger.info("Parsing purchase information from email...");

    const prompt = `
Analyze the following email and determine if it represents a purchase confirmation or receipt.
If it is a purchase, extract the following details in JSON format.
If it is NOT a purchase confirmation, return {"isPurchase": false}.

Fields to extract:
- isPurchase (boolean)
- amount (number, the total purchase amount)
- currency (string, ISO code like USD, EUR, CLP - default to CLP if not specified)
- purchaseDate (string, ISO 8601 format if available, otherwise null)
- summary (string, a detailed markdown-formatted summary of the purchase including: items purchased, quantities, merchant name, order number if available, and any other relevant details)

The summary should be in markdown format with sections and bullet points where appropriate. Include all relevant purchase details.

Email details:
Subject: ${subject}
From: ${from}

Email body:
"""
${content}
"""

Return ONLY the JSON.
`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract JSON from potential markdown blocks
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.warn({ text }, "No JSON found in Gemini response");
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]) as ParsedPurchaseInfo;
      return parsed.isPurchase ? parsed : null;
    } catch (error) {
      logger.error({ error }, "Error calling Gemini API for purchase parsing");
      return null;
    }
  },
};
