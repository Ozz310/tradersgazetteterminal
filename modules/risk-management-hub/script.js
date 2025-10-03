// This file is now a module-specific script

// The init function will be called by app.js when the module is loaded

// API Key provided by the user
const API_KEY = "c27c0cc562a3bfd70fff7003";

// Base URL for the Exchangerate API, using a dynamic base currency
const API_BASE_URL = "https://v6.exchangerate-api.com/v6/";

// --- Global variables for DOM elements ---
let accountCurrencySelect;
let leverageSelect;
let currencyPairSelect;
let tradeSizeInput;
let tradeSizeLabel;
let messageBox;
let messageText;
let loadingSpinnerMargin;
let loadingSpinnerRR;

let ratePairDisplay;
let currentRateDisplay;
let timestampMargin;
let requiredMarginDisplay;
let marginCurrencySymbol;
let pipValueDisplay;
let pipValueCurrencySymbol;

let capitalInput;
let riskPercentInput;
let riskPercentValueSpan;
let instrumentRRSelect;
let entryPriceInput;
let stopLossPriceInput;
let takeProfitPriceInput;
let riskAmountDisplay;
let stopLossPipsDisplay;
let recommendedUnitsDisplay;
let rrRatioDisplay;

let emptyStateMessage;
let resultGrid;
let marginResultsGroup;
let rrResultsGroup;

let allResultCards;
let marginCards;
let rrCards;

// --- Main initialization function to be called by app.js ---
function initRiskManagementHub() {
    // Re-assign all DOM elements after the module has been loaded
    accountCurrencySelect = document.getElementById('accountCurrency');
    leverageSelect = document.getElementById('leverage');
    currencyPairSelect = document.getElementById('currencyPair');
    tradeSizeInput = document.getElementById('tradeSize');
    tradeSizeLabel = document.getElementById('tradeSizeLabel');
    messageBox = document.getElementById('messageBox');
    messageText = document.getElementById('messageText');
    loadingSpinnerMargin = document.getElementById('loadingSpinnerMargin');
    loadingSpinnerRR = document.getElementById('loadingSpinnerRR');

    ratePairDisplay = document.getElementById('ratePairDisplay');
    currentRateDisplay = document.getElementById('currentRateDisplay');
    timestampMargin = document.getElementById('timestampMargin');
    requiredMarginDisplay = document.getElementById('requiredMarginDisplay');
    marginCurrencySymbol = document.getElementById('marginCurrencySymbol');
    pipValueDisplay = document.getElementById('pipValueDisplay');
    pipValueCurrencySymbol = document.getElementById('pipValueCurrencySymbol');

    capitalInput = document.getElementById('capital');
    riskPercentInput = document.getElementById('riskPercent');
    riskPercentValueSpan = document.getElementById('riskPercentValue');
    instrumentRRSelect = document.getElementById('instrumentRR');
    entryPriceInput = document.getElementById('entryPrice');
    stopLossPriceInput = document.getElementById('stopLossPrice');
    takeProfitPriceInput = document.getElementById('takeProfitPrice');
    riskAmountDisplay = document.getElementById('riskAmountDisplay');
    stopLossPipsDisplay = document.getElementById('stopLossPipsDisplay');
    recommendedUnitsDisplay = document.getElementById('recommendedUnitsDisplay');
    rrRatioDisplay = document.getElementById('rrRatioDisplay');

    emptyStateMessage = document.getElementById('emptyStateMessage');
    resultGrid = document.querySelector('.results-grid');
    marginResultsGroup = document.getElementById('marginResults');
    rrResultsGroup = document.getElementById('rrResults');

    allResultCards = document.querySelectorAll('.result-card');
    marginCards = document.querySelectorAll('#cardMarginRate, #cardMarginRequired, #cardMarginPip');
    rrCards = document.querySelectorAll('#cardRRRisk, #cardRRStopLoss, #cardRRUnits, #cardRRRatio');

    // Add event listeners once elements are available
    addModuleEventListeners();

    // Initial load
    fetchAndDisplayInitialRate();
    updateTradeSizeLabel();
    handleTabSwitch('marginCalculator');
}

// --- Event Listeners Function ---
function addModuleEventListeners() {
    const switchButtons = document.querySelectorAll('.menu-button[data-target]');

    switchButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTabId = button.getAttribute('data-target');
            handleTabSwitch(targetTabId);
        });
    });

    const calculateMarginBtn = document.getElementById('calculateMarginBtn');
    if (calculateMarginBtn) {
        calculateMarginBtn.addEventListener('click', calculateMargin);
    }

    const calculateRRBtn = document.getElementById('calculateRRBtn');
    if (calculateRRBtn) {
        calculateRRBtn.addEventListener('click', calculateRiskRewardAndPosition);
    }

    if (riskPercentInput) {
        riskPercentInput.oninput = function() {
            riskPercentValueSpan.textContent = this.value;
        };
    }

    if (currencyPairSelect) {
        currencyPairSelect.addEventListener('change', () => {
            fetchAndDisplayInitialRate();
            updateTradeSizeLabel();
        });
    }
}

// --- Other Utility Functions (unchanged from original code) ---
function handleTabSwitch(targetId) {
    const switchButtons = document.querySelectorAll('.menu-button[data-target]');
    const calculatorTabs = document.querySelectorAll('.calculator-tab');
    const emptyStateMessage = document.getElementById('emptyStateMessage');
    const resultGrid = document.querySelector('.results-grid');

    switchButtons.forEach(btn => btn.classList.remove('active'));
    calculatorTabs.forEach(tab => tab.classList.remove('active'));

    const targetButton = document.querySelector(`.menu-button[data-target="${targetId}"]`);
    const targetTab = document.getElementById(targetId);

    if (targetButton && targetTab) {
        targetButton.classList.add('active');
        targetTab.classList.add('active');
    }

    resetResults();
    emptyStateMessage.classList.remove('hidden');
    resultGrid.style.display = 'none';
}

function showMessage(message, type = 'info') {
    if (!messageText || !messageBox) return;
    messageText.textContent = message;
    messageBox.classList.add('show');
    messageBox.style.backgroundColor = (type === 'error') ? '#d32f2f' : '#333';
    allResultCards.forEach(card => card.classList.remove('success-border'));
}

function hideMessage() {
    if (messageBox) {
        messageBox.classList.remove('show');
    }
}

function showLoading(spinner) {
    if (spinner) spinner.style.display = 'inline-block';
}

function hideLoading(spinner) {
    if (spinner) spinner.style.display = 'none';
}

function resetResults() {
    if (!allResultCards) return;
    allResultCards.forEach(card => card.classList.remove('success-border'));
    if (ratePairDisplay) ratePairDisplay.textContent = 'N/A';
    if (currentRateDisplay) currentRateDisplay.textContent = 'N/A';
    if (timestampMargin) timestampMargin.textContent = '';
    if (requiredMarginDisplay) requiredMarginDisplay.textContent = 'N/A';
    if (marginCurrencySymbol) marginCurrencySymbol.textContent = '';
    if (pipValueDisplay) pipValueDisplay.textContent = 'N/A';
    if (pipValueCurrencySymbol) pipValueCurrencySymbol.textContent = '';
    if (riskAmountDisplay) riskAmountDisplay.textContent = 'N/A';
    if (stopLossPipsDisplay) stopLossPipsDisplay.textContent = 'N/A';
    if (recommendedUnitsDisplay) recommendedUnitsDisplay.textContent = 'N/A';
    if (rrRatioDisplay) rrRatioDisplay.textContent = 'N/A';
}

function validateInputs(inputs) {
    let isValid = true;
    inputs.forEach(input => {
        if (input.value === "" || isNaN(parseFloat(input.value)) || parseFloat(input.value) <= 0) {
            input.classList.add('invalid');
            isValid = false;
        } else {
            input.classList.remove('invalid');
        }
    });
    return isValid;
}

function getAssetType(symbol) {
    if (symbol.length === 6 && !symbol.startsWith('X')) {
        return 'forex';
    } else if (symbol.startsWith('XAU') || symbol.startsWith('XAG')) {
        return 'metal';
    }
    return 'unknown';
}

function updateTradeSizeLabel() {
    const selectedSymbol = currencyPairSelect.value;
    const assetType = getAssetType(selectedSymbol);
    let labelText = "Trade Size (Units):";
    let defaultValue = "1";

    switch (assetType) {
        case 'forex':
            labelText = "Trade Size (Base Currency Units):";
            defaultValue = "100000";
            break;
        case 'metal':
            labelText = "Trade Size (Ounces):";
            defaultValue = "1";
            break;
        default:
            labelText = "Trade Size (Units):";
            defaultValue = "1";
            break;
    }
    tradeSizeLabel.textContent = labelText;
    tradeSizeInput.value = defaultValue;
    tradeSizeInput.placeholder = `e.g., ${defaultValue}`;
}

function getPipPointDetails(symbol) {
    const assetType = getAssetType(symbol);
    let pipSize = 0;
    let valueLabel = 'N/A';
    let isPipCalculable = false;

    switch (assetType) {
        case 'forex':
            isPipCalculable = true;
            valueLabel = 'Pip Value';
            if (symbol.includes('JPY')) {
                pipSize = 0.01;
            } else {
                pipSize = 0.0001;
            }
            break;
        case 'metal':
            isPipCalculable = true;
            valueLabel = 'Point Value';
            pipSize = 0.01; // XAUUSD moves in cents
            break;
        default:
            isPipCalculable = false;
            valueLabel = 'N/A';
            break;
    }
    return { pipSize, valueLabel, isPipCalculable };
}

function parseSymbol(symbol) {
    if (symbol.startsWith('XAU') || symbol.startsWith('XAG')) {
        return { base: symbol.substring(0, 3), quote: symbol.substring(3, 6) };
    } else if (symbol.length === 6) {
        return { base: symbol.substring(0, 3), quote: symbol.substring(3, 6) };
    }
    return { base: '', quote: '' };
}

async function fetchConversionRates(baseCurrency) {
    showLoading(loadingSpinnerMargin);
    try {
        const url = `${API_BASE_URL}${API_KEY}/latest/${baseCurrency}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.result === 'success') {
            return data.conversion_rates;
        } else {
            const errorMsg = data['error-type'] || 'Unknown API Error';
            showMessage(`API Error: ${errorMsg}. Please check your API key or base currency.`, 'error');
            return null;
        }
    } catch (error) {
        console.error("Error fetching rates:", error);
        showMessage(`Failed to fetch rates. Check your internet connection.`, 'error');
        return null;
    } finally {
        hideLoading(loadingSpinnerMargin);
    }
}

async function calculateMargin() {
    hideMessage();
    const activeTab = document.getElementById('marginCalculator');
    if (activeTab) {
        activeTab.classList.add('active');
    }

    showLoading(loadingSpinnerMargin);

    allResultCards.forEach(card => card.classList.remove('success-border'));
    marginResultsGroup.style.display = 'contents';
    rrResultsGroup.style.display = 'none';
    resultGrid.style.display = 'grid';
    emptyStateMessage.classList.add('hidden');

    const selectedSymbol = currencyPairSelect.value;
    const assetType = getAssetType(selectedSymbol);

    if (assetType !== 'forex') {
        showMessage("This calculator only supports Forex pairs on the free plan.", 'error');
        hideLoading(loadingSpinnerMargin);
        return;
    }

    const inputsToValidate = [tradeSizeInput];
    if (!validateInputs(inputsToValidate)) {
        showMessage("Please check your inputs.", 'error');
        hideLoading(loadingSpinnerMargin);
        return;
    }

    const accountCurrency = accountCurrencySelect.value;
    const leverage = parseFloat(leverageSelect.value);
    const tradeSizeUnits = parseFloat(tradeSizeInput.value);

    const { base: baseCurrencyOfPair, quote: quoteCurrencyOfPair } = parseSymbol(selectedSymbol);

    const baseRates = await fetchConversionRates(baseCurrencyOfPair);
    if (!baseRates) {
        hideLoading(loadingSpinnerMargin);
        return;
    }
    const currentPrice = baseRates[quoteCurrencyOfPair];

    ratePairDisplay.textContent = `${baseCurrencyOfPair}/${quoteCurrencyOfPair}`;
    currentRateDisplay.textContent = currentPrice.toFixed(5);
    timestampMargin.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;

    let marginRequiredInBaseCurrency = (tradeSizeUnits / leverage);

    let finalMarginAmount = marginRequiredInBaseCurrency;

    let marginCurrency = (assetType === 'forex') ? baseCurrencyOfPair : quoteCurrencyOfPair;

    if (marginCurrency !== accountCurrency) {
        const conversionRates = await fetchConversionRates(marginCurrency);
        if (!conversionRates || !conversionRates[accountCurrency]) {
            showMessage(`Could not fetch conversion rate from ${marginCurrency} to ${accountCurrency}. Margin may be inaccurate.`, 'error');
            requiredMarginDisplay.textContent = finalMarginAmount.toFixed(2);
            marginCurrencySymbol.textContent = marginCurrency;
            hideLoading(loadingSpinnerMargin);
            return;
        }
        finalMarginAmount = finalMarginAmount * conversionRates[accountCurrency];
    }

    requiredMarginDisplay.textContent = finalMarginAmount.toFixed(2);
    marginCurrencySymbol.textContent = accountCurrency;

    const { pipSize, valueLabel, isPipCalculable } = getPipPointDetails(selectedSymbol);

    if (isPipCalculable) {
        let pipPointValue = tradeSizeUnits * pipSize;

        if (quoteCurrencyOfPair !== accountCurrency) {
            const conversionRates = await fetchConversionRates(quoteCurrencyOfPair);
            if (!conversionRates || !conversionRates[accountCurrency]) {
                showMessage(`Could not fetch conversion rate for pip/point value from ${quoteCurrencyOfPair} to ${accountCurrency}.`, 'error');
                pipValueDisplay.textContent = 'N/A';
                pipValueCurrencySymbol.textContent = '';
                hideLoading(loadingSpinnerMargin);
                return;
            }
            const conversionRateForPip = conversionRates[accountCurrency];
            pipPointValue = pipPointValue * conversionRateForPip;
        }

        pipValueDisplay.textContent = pipPointValue.toFixed(2);
        pipValueCurrencySymbol.textContent = accountCurrency;
    } else {
        pipValueDisplay.textContent = valueLabel;
        pipValueCurrencySymbol.textContent = '';
    }

    document.getElementById('cardMarginRate').classList.add('success-border');
    document.getElementById('cardMarginRequired').classList.add('success-border');
    document.getElementById('cardMarginPip').classList.add('success-border');

    hideLoading(loadingSpinnerMargin);
}

async function calculateRiskRewardAndPosition() {
    hideMessage();
    const activeTab = document.getElementById('rrCalculator');
    if (activeTab) {
        activeTab.classList.add('active');
    }

    showLoading(loadingSpinnerRR);

    allResultCards.forEach(card => card.classList.remove('success-border'));
    rrResultsGroup.style.display = 'contents';
    marginResultsGroup.style.display = 'none';
    resultGrid.style.display = 'grid';
    emptyStateMessage.classList.add('hidden');

    if (riskAmountDisplay) riskAmountDisplay.textContent = 'N/A';
    if (stopLossPipsDisplay) stopLossPipsDisplay.textContent = 'N/A';
    if (recommendedUnitsDisplay) recommendedUnitsDisplay.textContent = 'N/A';
    if (rrRatioDisplay) rrRatioDisplay.textContent = 'N/A';

    const inputsToValidate = [capitalInput, entryPriceInput, stopLossPriceInput];
    if (!validateInputs(inputsToValidate)) {
        showMessage("Please check your inputs.", 'error');
        hideLoading(loadingSpinnerRR);
        return;
    }

    const capital = parseFloat(capitalInput.value);
    const riskPercent = parseFloat(document.getElementById('riskPercent').value);
    const entryPrice = parseFloat(entryPriceInput.value);
    const stopLossPrice = parseFloat(stopLossPriceInput.value);
    const takeProfitPrice = parseFloat(takeProfitPriceInput.value);
    const selectedSymbol = instrumentRRSelect.value;
    const accountCurrency = accountCurrencySelect.value;

    const assetType = getAssetType(selectedSymbol);
    if (assetType === 'unknown') {
        showMessage("Position sizing is not supported for this asset type.", 'error');
        hideLoading(loadingSpinnerRR);
        return;
    }

    if (riskPercent > 100) {
        showMessage("Risk percent cannot exceed 100.", 'error');
        hideLoading(loadingSpinnerRR);
        return;
    }

    if (entryPrice === stopLossPrice) {
        showMessage("Entry and Stop Loss cannot be the same.", 'error');
        hideLoading(loadingSpinnerRR);
        return;
    }

    const riskAmount = capital * (riskPercent / 100);

    const { pipSize, isPipCalculable } = getPipPointDetails(selectedSymbol);
    if (!isPipCalculable) {
        showMessage("Position sizing is not supported for this asset type.", 'error');
        hideLoading(loadingSpinnerRR);
        return;
    }

    const priceDifference = Math.abs(entryPrice - stopLossPrice);
    const stopLossPips = priceDifference / pipSize;

    let recommendedUnits = 0;
    if (priceDifference > 0) {
        const { quote: quoteCurrencyOfPair } = parseSymbol(selectedSymbol);

        let pipValueInQuote = pipSize * 100000;
        if (assetType === 'metal') {
            // Gold is quoted in USD per ounce, so the pip value is in USD
            pipValueInQuote = 1;
        }

        let pipValueInAccount = pipValueInQuote;

        if (quoteCurrencyOfPair !== accountCurrency) {
            const conversionRates = await fetchConversionRates(quoteCurrencyOfPair);
            if (conversionRates && conversionRates[accountCurrency]) {
                pipValueInAccount = pipValueInQuote * conversionRates[accountCurrency];
            } else {
                showMessage(`Could not fetch conversion rate from ${quoteCurrencyOfPair} to ${accountCurrency}.`, 'error');
                hideLoading(loadingSpinnerRR);
                return;
            }
        }

        if (pipValueInAccount > 0 && stopLossPips > 0) {
            recommendedUnits = (riskAmount / (stopLossPips * pipValueInAccount)) * 100000;
        }
    }

    let rrRatio = 'N/A';
    const riskDistance = Math.abs(entryPrice - stopLossPrice);
    const rewardDistance = Math.abs(entryPrice - takeProfitPrice);
    if (riskDistance !== 0 && !isNaN(rewardDistance) && rewardDistance >= 0) {
        const calculatedRatio = (rewardDistance / riskDistance);
        if (calculatedRatio > 0) {
            rrRatio = `1:${calculatedRatio.toFixed(2)}`;
        }
    }

    riskAmountDisplay.textContent = `${riskAmount.toFixed(2)} ${accountCurrency}`;
    stopLossPipsDisplay.textContent = `${stopLossPips.toFixed(1)} ${assetType === 'forex' ? 'pips' : 'points'}`;
    recommendedUnitsDisplay.textContent = recommendedUnits.toFixed(0);
    rrRatioDisplay.textContent = rrRatio;

    document.getElementById('cardRRRisk').classList.add('success-border');
    document.getElementById('cardRRStopLoss').classList.add('success-border');
    document.getElementById('cardRRUnits').classList.add('success-border');
    if (takeProfitPriceInput.value) {
        document.getElementById('cardRRRatio').classList.add('success-border');
    }

    hideLoading(loadingSpinnerRR);
}

async function fetchAndDisplayInitialRate() {
    if (!currencyPairSelect || !ratePairDisplay || !currentRateDisplay) return;

    const selectedSymbol = currencyPairSelect.value;
    const { base: baseCurrency, quote: quoteCurrency } = parseSymbol(selectedSymbol);

    ratePairDisplay.textContent = `${baseCurrency}/${quoteCurrency}`;
    currentRateDisplay.textContent = 'Fetching...';

    const rates = await fetchConversionRates(baseCurrency);

    if (rates && rates[quoteCurrency]) {
        currentRateDisplay.textContent = rates[quoteCurrency].toFixed(5);
    } else {
        currentRateDisplay.textContent = 'N/A';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initRiskManagementHub();
});
