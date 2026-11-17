import { useCallback, useEffect, useState } from "react";

// Variables
import { CURRENCIES_API } from "@/lib/variables";

// Type
import { CurrencyType } from "@/types";

/**
 * Built-in fallback currencies so currency selection works reliably even offline,
 * during tests, or when openexchangerates.org rate limits.
 */
const DEFAULT_FALLBACK_CURRENCIES: CurrencyType[] = [
    { code: "USD", name: "United States Dollar" },
    { code: "EUR", name: "Euro" },
    { code: "GBP", name: "British Pound Sterling" },
    { code: "CNY", name: "Chinese Yuan" },
    { code: "JPY", name: "Japanese Yen" },
    { code: "CAD", name: "Canadian Dollar" },
    { code: "AUD", name: "Australian Dollar" },
    { code: "CHF", name: "Swiss Franc" },
    { code: "HKD", name: "Hong Kong Dollar" },
    { code: "SGD", name: "Singapore Dollar" },
    { code: "SEK", name: "Swedish Krona" },
    { code: "KRW", name: "South Korean Won" },
    { code: "INR", name: "Indian Rupee" },
    { code: "BRL", name: "Brazilian Real" },
    { code: "RUB", name: "Russian Ruble" },
    { code: "ZAR", name: "South African Rand" },
    { code: "MXN", name: "Mexican Peso" },
    { code: "NZD", name: "New Zealand Dollar" },
    { code: "TRY", name: "Turkish Lira" },
    { code: "AZN", name: "Azerbaijani Manat" },
    { code: "AED", name: "United Arab Emirates Dirham" },
    { code: "SAR", name: "Saudi Riyal" },
    { code: "PLN", name: "Polish Zloty" },
    { code: "NOK", name: "Norwegian Krone" },
    { code: "DKK", name: "Danish Krone" },
    { code: "THB", name: "Thai Baht" },
    { code: "MYR", name: "Malaysian Ringgit" },
    { code: "IDR", name: "Indonesian Rupiah" },
    { code: "PHP", name: "Philippine Peso" },
    { code: "VND", name: "Vietnamese Dong" },
    { code: "ILS", name: "Israeli New Shekel" },
];

/** Cached across mounts — the currency list does not change within a session. */
let currenciesCache: CurrencyType[] | null = null;

const useCurrencies = () => {
    const [currencies, setCurrencies] = useState<CurrencyType[]>(
        currenciesCache ?? DEFAULT_FALLBACK_CURRENCIES
    );
    const [currenciesLoading, setCurrenciesLoading] = useState<boolean>(false);
    const [currenciesError, setCurrenciesError] = useState<boolean>(false);

    /**
     * Fetches all the currencies asynchronously.
     *
     * @return {Promise<void>} Promise that resolves when the currencies are fetched.
     */
    const fetchCurrencies = useCallback(async () => {
        setCurrenciesLoading(true);
        setCurrenciesError(false);

        try {
            const response = await fetch(`${CURRENCIES_API}`);

            if (!response.ok) {
                throw new Error(
                    `Failed to load currencies (${response.status})`
                );
            }

            const data = await response.json();

            const currencyOptions = Object.keys(data).map((currencyCode) => {
                const currencyName = data[currencyCode];
                return { code: currencyCode, name: currencyName };
            });

            currenciesCache = currencyOptions;
            setCurrencies(currencyOptions);
        } catch (err) {
            /*
             * Previously only console.log'd, leaving the dropdown silently
             * empty with no indication anything had gone wrong.
             * Now we warn (not console.error: this is an expected, handled path),
             * set error state, and fall back to the built-in list.
             */
            console.warn("Error fetching currencies (using fallback list):", err);
            setCurrenciesError(true);
            if (!currenciesCache) {
                currenciesCache = DEFAULT_FALLBACK_CURRENCIES;
                setCurrencies(DEFAULT_FALLBACK_CURRENCIES);
            }
        } finally {
            setCurrenciesLoading(false);
        }
    }, []);

    useEffect(() => {
        if (currenciesCache) return;
        fetchCurrencies();
    }, [fetchCurrencies]);

    return {
        currencies,
        currenciesLoading,
        currenciesError,
        retryFetchCurrencies: fetchCurrencies,
    };
};

export default useCurrencies;
