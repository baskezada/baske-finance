import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "./logger";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export interface ParsedTransaction {
    isTransaction: boolean;
    bankName?: string;
    amount?: number;
    currency?: string;
    category?: string;
    description?: string;
    cardLastFour?: string;
    transactionDate?: string; // ISO format string
    transactionType?: 'cargo' | 'abono'; // New field
}

export const aiService = {
    async checkIfLikelyTransaction(subject: string, from: string): Promise<boolean> {
        if (!process.env.GEMINI_API_KEY) return false;

        const prompt = `
            Determine if the following email header (subject and sender) is likely to be a bank or financial transaction notification.
            Respond only with "YES" or "NO".

            Subject: ${subject}
            From: ${from}
        `;

        try {
            const result = await model.generateContent(prompt);
            const text = result.response.text().trim().toUpperCase();
            return text.includes("YES");
        } catch (error) {
            logger.error({ error }, "Error in pre-filtering check");
            return true; // Default to true to avoid missing potential transactions on error
        }
    },

    async parseEmailTransaction(subject: string, from: string, content: string): Promise<ParsedTransaction | null> {
        if (!process.env.GEMINI_API_KEY) {
            logger.warn("GEMINI_API_KEY is not set. Skipping AI parsing.");
            return null;
        }

        logger.info("Sending email content to Gemini for parsing...");

        const prompt = `
            Analyze the following email and determine if it represents a bank transaction (purchase, transfer, etc.).
            If it is a transaction, extract the following details in JSON format.
            If it is NOT a transaction, return {"isTransaction": false}.

            Fields to extract:
            - isTransaction (boolean)
            - bankName (string, name of the bank or fintech - you can infer this from the sender email or name)
            - amount (number, only the numeric value)
            - currency (string, ISO code like USD, EUR, ARS)
            - category (string, e.g., Food, Transport, Subscription, etc.)
            - description (string, merchant name or short description)
            - cardLastFour (string, last 4 digits of the card if available)
            - transactionDate (string, the date and time of the transaction in ISO 8601 format if available, otherwise null)

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

            const parsed = JSON.parse(jsonMatch[0]) as ParsedTransaction;
            return parsed.isTransaction ? parsed : null;
        } catch (error) {
            logger.error({ error }, "Error calling Gemini API");
            return null;
        }
    },

    async parseExcelTransactions(excelDataString: string): Promise<ParsedTransaction[]> {
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
            logger.info({ count: transactions.length }, "Transactions parsed from Excel");

            return transactions;
        } catch (error) {
            logger.error({ error }, "Error parsing Excel with AI");
            return [];
        }
    }
};
