import * as XLSX from 'xlsx';
import { logger } from './logger';

export const excelService = {
    /**
     * Parse Excel file buffer and convert to JSON
     */
    parseExcelToJson(buffer: Buffer): any[] {
        try {
            const workbook = XLSX.read(buffer, { type: 'buffer' });

            // Get the first sheet
            const sheetName = workbook.SheetNames[0];
            if (!sheetName) {
                throw new Error('No sheets found in Excel file');
            }

            const worksheet = workbook.Sheets[sheetName];

            // Convert to JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                raw: false, // Keep dates as strings
                defval: '' // Default value for empty cells
            });

            logger.info({ rowCount: jsonData.length }, 'Excel parsed successfully');
            return jsonData;
        } catch (error) {
            logger.error({ error }, 'Error parsing Excel file');
            throw new Error('Failed to parse Excel file');
        }
    },

    /**
     * Convert JSON data to a readable string for AI processing
     */
    jsonToReadableString(data: any[]): string {
        if (data.length === 0) {
            return 'Empty dataset';
        }

        // Get column headers
        const headers = Object.keys(data[0]);

        // Create a formatted string
        let result = `Columns: ${headers.join(', ')}\n\n`;
        result += 'Sample data (first 10 rows):\n';

        const sample = data.slice(0, 10);
        sample.forEach((row, index) => {
            result += `\nRow ${index + 1}:\n`;
            headers.forEach(header => {
                result += `  ${header}: ${row[header]}\n`;
            });
        });

        result += `\n\nTotal rows: ${data.length}`;

        return result;
    },

    parseAnyExcelToString(buffer: Buffer): string {
        try {
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            let fullContent = "";

            workbook.SheetNames.forEach((sheetName, index) => {
                const worksheet = workbook.Sheets[sheetName];

                // Convertimos a CSV para mantener la estructura espacial
                // Esto preserva la relación entre filas y columnas sin importar el formato
                const csvData = XLSX.utils.sheet_to_csv(worksheet, {
                    FS: " | ", // Usamos un separador visual claro
                    blankrows: false // Saltamos filas totalmente vacías para ahorrar tokens
                });

                fullContent += `--- HOJA: ${sheetName} ---\n`;
                fullContent += csvData + "\n\n";
            });

            return fullContent;
        } catch (error) {
            console.error('Error al procesar Excel genérico:', error);
            throw new Error('No se pudo leer el archivo Excel');
        }
    }
};
