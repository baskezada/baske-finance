import { logger } from "./logger";

// Cache para evitar llamadas excesivas a la API para la misma fecha
const rateCache = new Map<string, number>();

/**
 * Obtiene el tipo de cambio USD a CLP para una fecha específica
 * @param date Fecha de la transacción
 * @returns Tipo de cambio USD a CLP
 */
export async function getUSDtoCLPRateForDate(date: Date): Promise<number> {
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

  // Verificar si ya tenemos el valor en caché
  if (rateCache.has(dateStr)) {
    const cachedRate = rateCache.get(dateStr)!;
    logger.info({ rate: cachedRate, date: dateStr }, "Using cached exchange rate");
    return cachedRate;
  }

  try {
    // Usar API pública de mindicador.cl (API chilena oficial)
    // Formato: https://mindicador.cl/api/dolar/DD-MM-YYYY
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const formattedDate = `${day}-${month}-${year}`;

    const url = `https://mindicador.cl/api/dolar/${formattedDate}`;
    logger.info({ url, date: dateStr }, "Fetching exchange rate");

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();

    // La API retorna el valor del dólar en pesos chilenos
    const rate = data.serie && data.serie.length > 0 ? data.serie[0].valor : null;

    if (!rate || typeof rate !== 'number') {
      throw new Error('Invalid rate format from API');
    }

    // Guardar en caché
    rateCache.set(dateStr, rate);

    logger.info({ rate, date: dateStr, source: 'mindicador.cl' }, "Fetched exchange rate");
    return rate;
  } catch (error) {
    logger.error({ error, date: dateStr }, "Failed to fetch exchange rate");

    // Fallback: intentar obtener el valor del día actual
    try {
      const response = await fetch("https://mindicador.cl/api/dolar");
      const data = await response.json();
      const rate = data.serie[0].valor;

      if (rate && typeof rate === 'number') {
        logger.warn({ rate, date: dateStr }, "Using current day exchange rate as fallback");
        rateCache.set(dateStr, rate);
        return rate;
      }
    } catch (fallbackError) {
      logger.error({ error: fallbackError }, "Fallback also failed");
    }

    // Último fallback: valor aproximado
    const fallbackRate = 950;
    logger.warn({ rate: fallbackRate, date: dateStr }, "Using hardcoded fallback exchange rate");
    rateCache.set(dateStr, fallbackRate);
    return fallbackRate;
  }
}

export function convertUSDtoCLP(amountUSD: number, rate: number): number {
  return amountUSD * rate;
}
