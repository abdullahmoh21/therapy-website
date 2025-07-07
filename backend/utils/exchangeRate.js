const axios = require("axios");
const fs = require("fs");
const path = require("path");
const logger = require("../logs/logger");

const CACHE_FILE_PATH = path.join(__dirname, "exchange_rate.bin");

/**
 * Store exchange rate to binary file
 * @param {number} rate - Exchange rate to store
 * @param {Date} timestamp - Timestamp when rate was fetched
 */
const storeExchangeRate = async (rate, timestamp) => {
  try {
    // Ensure cache directory exists
    const cacheDir = path.dirname(CACHE_FILE_PATH);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Create buffer with rate (8 bytes) + timestamp (8 bytes)
    const buffer = Buffer.allocUnsafe(16);
    buffer.writeDoubleLE(rate, 0);
    buffer.writeDoubleLE(timestamp.getTime(), 8);

    await fs.promises.writeFile(CACHE_FILE_PATH, buffer);
    logger.info(`Exchange rate ${rate} cached successfully`);
  } catch (error) {
    logger.error("Error storing exchange rate:", error.message);
  }
};

/**
 * Retrieve exchange rate from binary file
 * @returns {Promise<{rate: number, timestamp: Date} | null>}
 */
const getStoredExchangeRate = async () => {
  try {
    if (!fs.existsSync(CACHE_FILE_PATH)) {
      return null;
    }

    const buffer = await fs.promises.readFile(CACHE_FILE_PATH);

    if (buffer.length !== 16) {
      logger.warn("Invalid cache file format for exchangeRate");
      return null;
    }

    const rate = buffer.readDoubleLE(0);
    const timestamp = new Date(buffer.readDoubleLE(8));

    return { rate, timestamp };
  } catch (error) {
    logger.error("Error reading stored exchange rate:", error.message);
    return null;
  }
};

/**
 * Fetch USD to PKR exchange rate from free API
 * @returns {Promise<number>} Exchange rate (USD to PKR)
 */
const getUSDToPKRRate = async () => {
  try {
    // Using exchangerate-api.com (free tier: 1500 requests/month)
    const response = await axios.get(
      "https://api.exchangerate-api.com/v4/latest/USD",
      { timeout: 5000 }
    );

    if (response.data && response.data.rates && response.data.rates.PKR) {
      const rate = response.data.rates.PKR;
      const timestamp = new Date();

      // Store the fetched rate
      await storeExchangeRate(rate, timestamp);

      logger.info(`Exchange rate fetched successfully: ${rate}`);
      return rate;
    }

    throw new Error("PKR rate not found in response");
  } catch (error) {
    logger.error("Error fetching exchange rate:", error.message);

    // Try to fallback to stored rate
    const storedRate = await getStoredExchangeRate();
    if (storedRate) {
      const ageHours = (new Date() - storedRate.timestamp) / (1000 * 60 * 60);
      logger.info(
        `Using cached exchange rate: ${storedRate.rate} (${ageHours.toFixed(
          1
        )} hours old)`
      );
      return storedRate.rate;
    }
    logger.warn("No cached rate available, using hardcoded fallback");
    return 280;
  }
};

module.exports = {
  getUSDToPKRRate,
  getStoredExchangeRate,
};
