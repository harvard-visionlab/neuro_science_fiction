/**
 * Feature Analysis - Main Application Script
 */

// API Endpoint
const GENERATE_CSV_URL = 'https://psp3lye7ksadwc6d6krb56dmue0yfxjv.lambda-url.us-east-1.on.aws/';

// Global state
let appState = {
    rawDf: null,  // Unfiltered data (after removing incomplete raters)
    df: null,     // Filtered data (after applying exclusions)
    year: null,
    groupName: null,
    droppedRaters: [],
    excludedRaters: [],
    excludedFeatures: [],
    currentStep: 1,
    ratingsByFeature: null,
    reliabilityResults: null,
    reliabilityChart: null,
    agreementResults: null,
    agreementHeatmap: null,
    redundancyResults: null,
    redundancyChart: null,
    redundancyThresholdValue: 0.7,
    similarityResults: null,
    similarityChart: null,
    similarityThresholdValue: 0.7
};

// DOM Elements - Step 1
const yearInput = document.getElementById('yearInput');
const groupNameInput = document.getElementById('groupNameInput');
const loadDataBtn = document.getElementById('loadDataBtn');
const loadingIndicator = document.getElementById('loadingIndicator');
const dataLoadError = document.getElementById('dataLoadError');
const dataSummary = document.getElementById('dataSummary');
const downloadLoadedDataBtn = document.getElementById('downloadLoadedDataBtn');
const step1Next = document.getElementById('step1Next');

// DOM Elements - Step 2
const computeReliabilityBtn = document.getElementById('computeReliabilityBtn');
const reliabilityLoading = document.getElementById('reliabilityLoading');
const reliabilityResults = document.getElementById('reliabilityResults');
const step2Next = document.getElementById('step2Next');
const downloadReliabilityChart = document.getElementById('downloadReliabilityChart');

// DOM Elements - Step 3
const computeAgreementBtn = document.getElementById('computeAgreementBtn');
const agreementLoading = document.getElementById('agreementLoading');
const agreementResults = document.getElementById('agreementResults');
const step3Next = document.getElementById('step3Next');
const downloadAgreementChart = document.getElementById('downloadAgreementChart');

// DOM Elements - Step 4
const computeRedundancyBtn = document.getElementById('computeRedundancyBtn');
const redundancyLoading = document.getElementById('redundancyLoading');
const redundancyResults = document.getElementById('redundancyResults');
const step4Next = document.getElementById('step4Next');
const redundancyThreshold = document.getElementById('redundancyThreshold');
const redundancyThresholdValue = document.getElementById('redundancyThresholdValue');
const downloadRedundancyHeatmap = document.getElementById('downloadRedundancyHeatmap');
const downloadRedundancyChart = document.getElementById('downloadRedundancyChart');

// DOM Elements - Step 5
const computeSimilarityBtn = document.getElementById('computeSimilarityBtn');
const similarityLoading = document.getElementById('similarityLoading');
const similarityResults = document.getElementById('similarityResults');
const step5Next = document.getElementById('step5Next');
const similarityThreshold = document.getElementById('similarityThreshold');
const similarityThresholdValue = document.getElementById('similarityThresholdValue');
const downloadSimilarityHeatmap = document.getElementById('downloadSimilarityHeatmap');
const downloadSimilarityChart = document.getElementById('downloadSimilarityChart');

// Initialize app
function init() {
    setupEventListeners();
    setupNavigation();
}

// Setup event listeners
function setupEventListeners() {
    // Step 1
    loadDataBtn.addEventListener('click', handleLoadData);
    downloadLoadedDataBtn.addEventListener('click', handleDownloadLoadedData);
    step1Next.addEventListener('click', () => navigateToStep(2));

    // Step 2
    computeReliabilityBtn.addEventListener('click', handleComputeReliability);
    downloadReliabilityChart.addEventListener('click', handleDownloadReliabilityChart);
    step2Next.addEventListener('click', () => navigateToStep(3));

    // Step 3
    computeAgreementBtn.addEventListener('click', handleComputeAgreement);
    downloadAgreementChart.addEventListener('click', handleDownloadAgreementChart);
    step3Next.addEventListener('click', () => navigateToStep(4));

    // Step 4
    computeRedundancyBtn.addEventListener('click', handleComputeRedundancy);
    redundancyThreshold.addEventListener('input', handleThresholdChange);
    downloadRedundancyHeatmap.addEventListener('click', handleDownloadRedundancyHeatmap);
    downloadRedundancyChart.addEventListener('click', handleDownloadRedundancyChart);
    step4Next.addEventListener('click', () => navigateToStep(5));

    // Step 5
    computeSimilarityBtn.addEventListener('click', handleComputeSimilarity);
    similarityThreshold.addEventListener('input', handleSimilarityThresholdChange);
    downloadSimilarityHeatmap.addEventListener('click', handleDownloadSimilarityHeatmap);
    downloadSimilarityChart.addEventListener('click', handleDownloadSimilarityChart);
    step5Next.addEventListener('click', () => navigateToStep(6));

    // Navigation buttons for other steps
    document.getElementById('step2Prev').addEventListener('click', () => navigateToStep(1));
    document.getElementById('step4Prev').addEventListener('click', () => navigateToStep(3));
    document.getElementById('step4Next').addEventListener('click', () => navigateToStep(5));
    document.getElementById('step5Prev').addEventListener('click', () => navigateToStep(4));
    document.getElementById('step5Next').addEventListener('click', () => navigateToStep(6));
    document.getElementById('step6Prev').addEventListener('click', () => navigateToStep(5));
}

// Setup step navigation
function setupNavigation() {
    // Make progress steps clickable
    document.querySelectorAll('.progress-step').forEach((step, index) => {
        step.addEventListener('click', () => {
            const stepNum = index + 1;
            // Only allow navigation to completed steps or current step
            if (stepNum <= appState.currentStep || step.classList.contains('completed')) {
                navigateToStep(stepNum);
            }
        });
    });
}

// Filter out raters with incomplete datasets
function filterIncompleteRaters(df) {
    // Count ratings per rater
    const raterCounts = {};
    const raters = df.unique('workerId');

    raters.forEach(rater => {
        const raterData = df.subset({ workerId: rater });
        raterCounts[rater] = raterData.length;
    });

    // Find max count (this should be the expected/complete count)
    const maxCount = Math.max(...Object.values(raterCounts));

    console.log('Rater counts:', raterCounts);
    console.log('Max count (expected complete dataset):', maxCount);

    // Identify incomplete raters (those with fewer than max)
    const droppedRaters = raters.filter(rater => raterCounts[rater] < maxCount);

    if (droppedRaters.length > 0) {
        console.log('Dropping incomplete raters:', droppedRaters);
    }

    // Filter DataFrame - keep only raters with max count
    const filteredDf = df.filter(row => raterCounts[row.workerId] === maxCount);

    return {
        df: filteredDf,
        droppedRaters: droppedRaters,
        maxCount: maxCount,
        raterCounts: raterCounts
    };
}

// Navigate to a specific step
function navigateToStep(stepNum) {
    // Hide all steps
    document.querySelectorAll('.step-section').forEach(section => {
        section.classList.remove('active');
    });

    // Show target step
    document.getElementById(`step${stepNum}`).classList.add('active');

    // Update progress indicator
    document.querySelectorAll('.progress-step').forEach((step, index) => {
        step.classList.remove('active');
        if (index + 1 === stepNum) {
            step.classList.add('active');
        }
        if (index + 1 < stepNum) {
            step.classList.add('completed');
        }
    });

    // Update current step
    appState.currentStep = stepNum;

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Standardize group name: lowercase and replace spaces with underscores
function standardizeGroupName(name) {
    return name.trim().toLowerCase().replace(/\s+/g, '_');
}

// localStorage functions for exclusions
function getExclusionsKey(year, groupName) {
    return `exclusions_${year}_${groupName}`;
}

function loadExclusions(year, groupName) {
    const key = getExclusionsKey(year, groupName);
    const saved = localStorage.getItem(key);
    if (saved) {
        try {
            const exclusions = JSON.parse(saved);
            appState.excludedRaters = exclusions.excludedRaters || [];
            appState.excludedFeatures = exclusions.excludedFeatures || [];
            console.log('Loaded exclusions from localStorage:', exclusions);
        } catch (e) {
            console.error('Error loading exclusions:', e);
            appState.excludedRaters = [];
            appState.excludedFeatures = [];
        }
    } else {
        appState.excludedRaters = [];
        appState.excludedFeatures = [];
    }
}

function saveExclusions(year, groupName) {
    const key = getExclusionsKey(year, groupName);
    const exclusions = {
        excludedRaters: appState.excludedRaters,
        excludedFeatures: appState.excludedFeatures
    };
    localStorage.setItem(key, JSON.stringify(exclusions));
    console.log('Saved exclusions to localStorage:', exclusions);
}

// Step 1: Load Data
async function handleLoadData() {
    const year = yearInput.value.trim();
    const groupNameRaw = groupNameInput.value.trim();

    if (!year || !groupNameRaw) {
        showError('Please enter both year and group name');
        return;
    }

    // Standardize group name
    const groupName = standardizeGroupName(groupNameRaw);
    console.log(`Standardized group name: "${groupNameRaw}" → "${groupName}"`);

    // Show loading
    loadingIndicator.style.display = 'block';
    dataLoadError.style.display = 'none';
    dataSummary.style.display = 'none';
    loadDataBtn.disabled = true;

    try {
        // Fetch surrogate (LLM) ratings from Lambda
        const surrogateUrl = `${GENERATE_CSV_URL}?year=${year}&groupName=${groupName}`;
        console.log('Fetching surrogate ratings from:', surrogateUrl);
        const surrogateResponse = await fetch(surrogateUrl);

        if (!surrogateResponse.ok) {
            throw new Error(`Failed to load surrogate data: ${surrogateResponse.statusText}`);
        }

        const surrogateCsvText = await surrogateResponse.text();

        // Fetch human ratings from scorsese server
        const humanUrl = `https://scorsese.wjh.harvard.edu/turk/experiments/nsf/survey/${groupName}/data`;
        console.log('Fetching human ratings from:', humanUrl);

        let humanCsvText = '';
        let humanData = [];

        try {
            const humanResponse = await fetch(humanUrl);
            if (humanResponse.ok) {
                humanCsvText = await humanResponse.text();
                const humanParsed = Papa.parse(humanCsvText, {
                    header: true,
                    dynamicTyping: true,
                    skipEmptyLines: true
                });
                humanData = humanParsed.data;
                console.log(`Loaded ${humanData.length} human ratings`);
            } else {
                console.warn('Human ratings not found, using only surrogate ratings');
            }
        } catch (humanError) {
            console.warn('Could not fetch human ratings:', humanError.message);
            console.log('Continuing with surrogate ratings only');
        }

        // Parse surrogate CSV
        console.log('\n=== DIAGNOSTIC: Parsing surrogate CSV ===');
        console.log('First 500 chars of CSV:', surrogateCsvText.substring(0, 500));

        const surrogateParsed = Papa.parse(surrogateCsvText, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true
        });

        if (surrogateParsed.errors.length > 0) {
            console.error('CSV parsing errors (surrogate):', surrogateParsed.errors);
        }

        const surrogateData = surrogateParsed.data;

        console.log('CSV headers detected:', surrogateParsed.meta.fields);
        console.log('First parsed row:', surrogateData[0]);
        console.log(`Loaded ${surrogateData.length} surrogate ratings`);

        // Search for the problematic butterfly row in the raw CSV
        console.log('\nSearching for butterfly in raw CSV...');
        const butterflyLines = surrogateCsvText.split('\n').filter(line => line.includes('蝶'));
        console.log(`Found ${butterflyLines.length} lines containing 蝶:`);
        butterflyLines.forEach((line, i) => {
            console.log(`  Line ${i + 1}: ${line}`);
        });

        console.log('=== END CSV PARSING DIAGNOSTIC ===\n');

        // DIAGNOSTIC: Check unique items in each data source
        console.log('\n=== DIAGNOSTIC: Checking unique items in data sources ===');

        const humanItems = [...new Set(humanData.map(row => row.itemName))].sort();
        console.log(`Human data unique items (${humanItems.length}):`, humanItems);

        const surrogateItems = [...new Set(surrogateData.map(row => row.itemName))].sort();
        console.log(`Surrogate data unique items (${surrogateItems.length}):`, surrogateItems);

        // DIAGNOSTIC: Find all rows with the mystery character '蝶'
        console.log('\n=== DIAGNOSTIC: Searching for 蝶 character ===');
        const butterflyRows = surrogateData.filter(row => row.itemName === '蝶');
        console.log(`Found ${butterflyRows.length} rows with itemName === '蝶'`);
        if (butterflyRows.length > 0) {
            console.log('Full row details:');
            butterflyRows.forEach((row, i) => {
                console.log(`  Row ${i + 1}:`, row);
            });
        }

        // Also check for partial matches or similar strings
        const suspiciousRows = surrogateData.filter(row =>
            row.itemName && (
                row.itemName.includes('蝶') ||
                row.itemName.charCodeAt(0) > 127 // Non-ASCII characters
            )
        );
        console.log(`Found ${suspiciousRows.length} rows with non-ASCII or butterfly-containing itemName`);
        if (suspiciousRows.length > 0 && suspiciousRows.length !== butterflyRows.length) {
            console.log('Suspicious rows:');
            suspiciousRows.slice(0, 10).forEach((row, i) => {
                console.log(`  Row ${i + 1}:`, row);
            });
        }
        console.log('=== END BUTTERFLY SEARCH ===\n');

        // Merge human and surrogate data
        const allData = [...humanData, ...surrogateData];
        console.log(`Total ratings after merge: ${allData.length}`);

        const mergedItems = [...new Set(allData.map(row => row.itemName))].sort();
        console.log(`Merged data unique items (${mergedItems.length}):`, mergedItems);

        // Add workerType to each row
        allData.forEach(row => {
            row.workerType = categorizeRater(row.workerId);
        });

        // Store year and groupName first
        appState.year = year;
        appState.groupName = groupName;

        // Load exclusions from localStorage
        loadExclusions(year, groupName);

        // Create DataFrame
        let df = createDataFrame(allData);

        const dfItems = df.unique('itemName');
        console.log(`DataFrame unique items after creation (${dfItems.length}):`, dfItems);

        // DIAGNOSTIC: Check if 蝶 appears in DataFrame and find its rows
        console.log('\n=== DIAGNOSTIC: Checking DataFrame for 蝶 ===');
        const dfButterflyRows = df.data.filter(row => row.itemName === '蝶');
        console.log(`Found ${dfButterflyRows.length} rows in DataFrame with itemName === '蝶'`);
        if (dfButterflyRows.length > 0) {
            console.log('DataFrame butterfly rows:');
            dfButterflyRows.forEach((row, i) => {
                console.log(`  Row ${i + 1}:`, row);
            });
        }

        // Check all unique itemName values for unusual characters
        const allItemNames = allData.map(row => row.itemName);
        const itemNameCounts = {};
        allItemNames.forEach(name => {
            itemNameCounts[name] = (itemNameCounts[name] || 0) + 1;
        });

        console.log('\nItemName counts (first 10):');
        Object.entries(itemNameCounts).slice(0, 10).forEach(([name, count]) => {
            console.log(`  "${name}": ${count} rows (charCodes: ${[...name].map(c => c.charCodeAt(0)).join(', ')})`);
        });

        if (itemNameCounts['蝶']) {
            console.log(`\n"蝶" appears ${itemNameCounts['蝶']} times in allData`);
            console.log(`Character codes: ${[...'蝶'].map(c => c.charCodeAt(0)).join(', ')}`);
        }
        console.log('=== END DATAFRAME BUTTERFLY CHECK ===\n');

        // Filter out incomplete raters
        const filterResult = filterIncompleteRaters(df);

        // Store raw (unfiltered by exclusions) data
        appState.rawDf = filterResult.df;
        appState.droppedRaters = filterResult.droppedRaters;
        appState.maxCount = filterResult.maxCount;
        appState.raterCounts = filterResult.raterCounts;

        const rawDfItems = appState.rawDf.unique('itemName');
        console.log(`rawDf unique items after filtering incomplete raters (${rawDfItems.length}):`, rawDfItems);

        // Apply exclusions to get final filtered df
        applyExclusions();

        const finalDfItems = appState.df.unique('itemName');
        console.log(`Final df unique items after applying exclusions (${finalDfItems.length}):`, finalDfItems);
        console.log('=== END DIAGNOSTIC ===\n');

        // Display summary and exclusion controls
        displayDataSummary();
        renderExclusionControls();

        // Enable next button
        step1Next.disabled = false;

        loadingIndicator.style.display = 'none';

    } catch (error) {
        console.error('Error loading data:', error);
        showError(`Error loading data: ${error.message}`);
        loadingIndicator.style.display = 'none';
        loadDataBtn.disabled = false;
    }
}

function showError(message) {
    dataLoadError.textContent = message;
    dataLoadError.style.display = 'block';
}

function handleDownloadLoadedData() {
    if (!appState.df || !appState.df.data) {
        alert('No data loaded. Please load data first.');
        return;
    }

    // DIAGNOSTIC: Check what items are in the data being exported
    console.log('\n=== DIAGNOSTIC: Download CSV ===');
    const exportItems = [...new Set(appState.df.data.map(row => row.itemName))].sort();
    console.log(`Items in df.data being exported (${exportItems.length}):`, exportItems);
    console.log('=== END DIAGNOSTIC ===\n');

    // Convert DataFrame back to CSV using PapaParse
    const csv = Papa.unparse(appState.df.data);

    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${appState.year}_${appState.groupName}_loaded_data.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}

// Apply exclusions to filter rawDf → df
function applyExclusions() {
    if (!appState.rawDf) return;

    // Filter out excluded raters and features
    const filteredData = appState.rawDf.data.filter(row => {
        return !appState.excludedRaters.includes(row.workerId) &&
               !appState.excludedFeatures.includes(row.featureName);
    });

    // Create new DataFrame from filtered data
    appState.df = createDataFrame(filteredData);

    console.log(`Applied exclusions: ${appState.excludedRaters.length} raters, ${appState.excludedFeatures.length} features excluded`);
    console.log(`Filtered data: ${filteredData.length} rows`);
}

// Invalidate all analysis results (Steps 2-5)
function invalidateAnalyses() {
    // Clear all analysis results
    appState.ratingsByFeature = null;
    appState.reliabilityResults = null;
    appState.reliabilityChart = null;
    appState.agreementResults = null;
    appState.agreementHeatmap = null;
    appState.redundancyResults = null;
    appState.redundancyChart = null;
    appState.similarityResults = null;
    appState.similarityChart = null;

    // Hide results sections
    if (reliabilityResults) reliabilityResults.style.display = 'none';
    if (agreementResults) agreementResults.style.display = 'none';
    if (redundancyResults) redundancyResults.style.display = 'none';
    if (similarityResults) similarityResults.style.display = 'none';

    // Disable navigation beyond Step 2
    document.getElementById('step2Next').disabled = true;
    document.getElementById('step3Next').disabled = true;
    document.getElementById('step4Next').disabled = true;
    document.getElementById('step5Next').disabled = true;

    // Show warning if exclusions were changed
    showExclusionWarning();
}

function showExclusionWarning() {
    const warningDiv = document.getElementById('exclusionWarning');
    if (warningDiv) {
        warningDiv.style.display = 'block';
        // Auto-hide after 5 seconds
        setTimeout(() => {
            warningDiv.style.display = 'none';
        }, 5000);
    }
}

function handleRaterExclusionToggle(event) {
    const workerId = event.target.value;
    const isChecked = event.target.checked;

    if (isChecked) {
        // Add to exclusions
        if (!appState.excludedRaters.includes(workerId)) {
            appState.excludedRaters.push(workerId);
        }
    } else {
        // Remove from exclusions
        appState.excludedRaters = appState.excludedRaters.filter(id => id !== workerId);
    }

    // Save to localStorage
    saveExclusions(appState.year, appState.groupName);

    // Re-apply exclusions
    applyExclusions();

    // Update display
    displayDataSummary();
    renderExclusionControls();

    // Invalidate analyses
    invalidateAnalyses();
}

function handleFeatureExclusionToggle(event) {
    const featureName = event.target.value;
    const isChecked = event.target.checked;

    if (isChecked) {
        // Add to exclusions
        if (!appState.excludedFeatures.includes(featureName)) {
            appState.excludedFeatures.push(featureName);
        }
    } else {
        // Remove from exclusions
        appState.excludedFeatures = appState.excludedFeatures.filter(f => f !== featureName);
    }

    // Save to localStorage
    saveExclusions(appState.year, appState.groupName);

    // Re-apply exclusions
    applyExclusions();

    // Update display
    displayDataSummary();
    renderExclusionControls();

    // Invalidate analyses
    invalidateAnalyses();
}

function renderExclusionControls() {
    if (!appState.rawDf) return;

    // Get all unique raters and features from raw (unfiltered) data
    const allRaters = appState.rawDf.unique('workerId');
    const allFeatures = appState.rawDf.unique('featureName');

    // Render rater exclusions
    const raterListDiv = document.getElementById('raterExclusionList');
    let raterHtml = '';

    allRaters.forEach(workerId => {
        const isExcluded = appState.excludedRaters.includes(workerId);
        const raterType = categorizeRater(workerId);
        const raterData = appState.rawDf.subset({ workerId: workerId });
        const numRatings = raterData.length;

        raterHtml += `
            <div class="exclusion-item ${isExcluded ? 'excluded' : ''}">
                <label>
                    <input type="checkbox"
                           class="rater-exclusion-checkbox"
                           value="${workerId}"
                           ${isExcluded ? 'checked' : ''}>
                    <span class="exclusion-label">
                        ${workerId}
                        <span class="rater-type ${raterType.toLowerCase()}">${raterType}</span>
                        <span class="exclusion-stats">${numRatings} ratings</span>
                        ${isExcluded ? '<span class="excluded-badge">EXCLUDED</span>' : ''}
                    </span>
                </label>
            </div>
        `;
    });

    raterListDiv.innerHTML = raterHtml;

    // Add event listeners to rater checkboxes
    document.querySelectorAll('.rater-exclusion-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', handleRaterExclusionToggle);
    });

    // Update exclusion count in summary
    const raterExclusionSummary = document.querySelector('#raterExclusionSection summary');
    if (raterExclusionSummary) {
        const count = appState.excludedRaters.length;
        raterExclusionSummary.textContent = `Exclude Raters (Optional)${count > 0 ? ` - ${count} excluded` : ''}`;
    }

    // Render feature exclusions
    const featureListDiv = document.getElementById('featureExclusionList');
    let featureHtml = '';

    allFeatures.forEach(featureName => {
        const isExcluded = appState.excludedFeatures.includes(featureName);

        featureHtml += `
            <div class="exclusion-item ${isExcluded ? 'excluded' : ''}">
                <label>
                    <input type="checkbox"
                           class="feature-exclusion-checkbox"
                           value="${featureName}"
                           ${isExcluded ? 'checked' : ''}>
                    <span class="exclusion-label">
                        ${featureName}
                        ${isExcluded ? '<span class="excluded-badge">EXCLUDED</span>' : ''}
                    </span>
                </label>
            </div>
        `;
    });

    featureListDiv.innerHTML = featureHtml;

    // Add event listeners to feature checkboxes
    document.querySelectorAll('.feature-exclusion-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', handleFeatureExclusionToggle);
    });

    // Update exclusion count in summary
    const featureExclusionSummary = document.querySelector('#featureExclusionSection summary');
    if (featureExclusionSummary) {
        const count = appState.excludedFeatures.length;
        featureExclusionSummary.textContent = `Exclude Features (Optional)${count > 0 ? ` - ${count} excluded` : ''}`;
    }
}

function displayDataSummary() {
    const items = appState.df.unique('itemName');
    const features = appState.df.unique('featureName');
    const raters = appState.df.unique('workerId');

    // Update summary numbers
    document.getElementById('numItems').textContent = items.length;
    document.getElementById('numFeatures').textContent = features.length;
    document.getElementById('numRaters').textContent = raters.length;
    document.getElementById('totalRatings').textContent = appState.df.length;

    // Display dropped raters if any
    displayDroppedRaters();

    // Display rater breakdown
    displayRaterBreakdown(raters);

    // Display data preview
    displayDataPreview();

    // Show summary
    dataSummary.style.display = 'block';
}

function displayDroppedRaters() {
    const droppedRatersSection = document.getElementById('droppedRatersSection');
    const droppedRatersList = document.getElementById('droppedRatersList');

    if (appState.droppedRaters && appState.droppedRaters.length > 0) {
        droppedRatersSection.style.display = 'block';
        droppedRatersList.innerHTML = '';

        appState.droppedRaters.forEach(rater => {
            const badge = document.createElement('div');
            badge.className = 'rater-badge dropped';

            const raterType = categorizeRater(rater);
            const typeClass = raterType === 'LLM' ? 'llm' : 'human';

            // Get actual count for this rater
            const actualCount = appState.raterCounts[rater] || 0;
            const maxCount = appState.maxCount;
            const countInfo = `${actualCount}/${maxCount}`;

            badge.innerHTML = `
                <span class="rater-name">${rater}</span>
                <span class="rater-type ${typeClass}">${raterType}</span>
                <span class="rater-count">${countInfo}</span>
            `;

            droppedRatersList.appendChild(badge);
        });
    } else {
        droppedRatersSection.style.display = 'none';
    }
}

function displayRaterBreakdown(raters) {
    const raterList = document.getElementById('raterList');
    raterList.innerHTML = '';

    raters.forEach(rater => {
        const badge = document.createElement('div');
        badge.className = 'rater-badge';

        const raterType = categorizeRater(rater);
        const typeClass = raterType === 'LLM' ? 'llm' : 'human';

        badge.innerHTML = `
            <span class="rater-name">${rater}</span>
            <span class="rater-type ${typeClass}">${raterType}</span>
        `;

        raterList.appendChild(badge);
    });
}

function displayDataPreview() {
    const preview = appState.df.head(10);
    const previewTable = document.getElementById('dataPreviewTable');

    if (preview.length === 0) {
        previewTable.innerHTML = '<p>No data to preview</p>';
        return;
    }

    // Get columns from first row
    const columns = Object.keys(preview.data[0]);

    // Create table
    let html = '<table><thead><tr>';
    columns.forEach(col => {
        html += `<th>${col}</th>`;
    });
    html += '</tr></thead><tbody>';

    preview.data.forEach(row => {
        html += '<tr>';
        columns.forEach(col => {
            html += `<td>${row[col]}</td>`;
        });
        html += '</tr>';
    });

    html += '</tbody></table>';
    previewTable.innerHTML = html;
}

// Step 2: Feature Reliability
async function handleComputeReliability() {
    if (!appState.df) {
        alert('Please load data first');
        return;
    }

    // Show loading
    reliabilityLoading.style.display = 'block';
    reliabilityResults.style.display = 'none';
    computeReliabilityBtn.disabled = true;

    // Use setTimeout to allow UI to update
    setTimeout(() => {
        try {
            // Compute ratings by feature
            appState.ratingsByFeature = computeRatingsByFeature(appState.df);

            // Sort features by consistency
            appState.reliabilityResults = sortFeaturesByConsistency(appState.ratingsByFeature);

            // Display results
            displayReliabilityResults();

            // Show results
            reliabilityLoading.style.display = 'none';
            reliabilityResults.style.display = 'block';

            // Enable next button
            step2Next.disabled = false;

        } catch (error) {
            console.error('Error computing reliability:', error);
            alert(`Error computing reliability: ${error.message}`);
            reliabilityLoading.style.display = 'none';
            computeReliabilityBtn.disabled = false;
        }
    }, 100);
}

function displayReliabilityResults() {
    // Create chart
    createReliabilityChart();

    // Create data table
    createReliabilityTable();
}

function createReliabilityChart() {
    const canvas = document.getElementById('reliabilityChart');
    const ctx = canvas.getContext('2d');

    // Destroy existing chart if it exists
    if (appState.reliabilityChart) {
        appState.reliabilityChart.destroy();
    }

    const data = appState.reliabilityResults;

    appState.reliabilityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.featureName),
            datasets: [{
                label: 'Average Inter-Rater Correlation',
                data: data.map(d => isNaN(d.avgCorr) ? null : d.avgCorr),
                backgroundColor: data.map(d => {
                    if (isNaN(d.avgCorr)) return '#6c757d'; // Gray for NaN
                    if (d.avgCorr >= 0.7) return '#28a745'; // Green
                    if (d.avgCorr >= 0.5) return '#ffc107'; // Yellow
                    if (d.avgCorr >= 0.3) return '#fd7e14'; // Orange
                    return '#dc3545'; // Red
                }),
                borderColor: '#2c3e50',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                title: {
                    display: true,
                    text: 'Feature Reliability (sorted from lowest to highest)',
                    font: { size: 16 }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.x;
                            if (value === null || isNaN(value)) {
                                return 'No variance (all ratings identical)';
                            }
                            return `Avg Correlation: ${value.toFixed(3)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    min: 0,
                    max: 1,
                    title: {
                        display: true,
                        text: 'Average Correlation'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Feature Name'
                    }
                }
            }
        }
    });
}

function createReliabilityTable() {
    const tableDiv = document.getElementById('reliabilityTable');
    // Sort from high to low (reverse the original ascending order)
    const data = [...appState.reliabilityResults].reverse();

    let html = '<table><thead><tr>';
    html += '<th>Rank</th>';
    html += '<th>Feature Name</th>';
    html += '<th>Avg Correlation</th>';
    html += '<th>Quality</th>';
    html += '</tr></thead><tbody>';

    data.forEach((row, index) => {
        let quality = '';
        let corrDisplay = '';
        let rowClass = '';

        if (isNaN(row.avgCorr)) {
            quality = 'No Variance';
            corrDisplay = 'NaN';
            rowClass = 'row-warning';
        } else {
            corrDisplay = row.avgCorr.toFixed(3);
            if (row.avgCorr >= 0.7) quality = 'Excellent';
            else if (row.avgCorr >= 0.5) quality = 'Good';
            else if (row.avgCorr >= 0.3) quality = 'Fair';
            else {
                quality = 'Poor';
                rowClass = 'row-poor';
            }
        }

        html += `<tr class="${rowClass}">`;
        html += `<td>${index + 1}</td>`;
        html += `<td>${row.featureName}</td>`;
        html += `<td>${corrDisplay}</td>`;
        html += `<td>${quality}</td>`;
        html += '</tr>';
    });

    html += '</tbody></table>';
    tableDiv.innerHTML = html;
}

function handleDownloadReliabilityChart() {
    const canvas = document.getElementById('reliabilityChart');
    const link = document.createElement('a');
    link.download = `${appState.year}_${appState.groupName}_feature_reliability.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// Step 3: Rater Agreement
async function handleComputeAgreement() {
    if (!appState.df || !appState.ratingsByFeature) {
        alert('Please complete Step 2 (Feature Reliability) first');
        return;
    }

    // Show loading
    agreementLoading.style.display = 'block';
    agreementResults.style.display = 'none';
    computeAgreementBtn.disabled = true;

    // Use setTimeout to allow UI to update
    setTimeout(() => {
        try {
            // Compute rater agreement
            const { results, raterVsRaterAll } = computeRaterAgreement(appState.df, appState.ratingsByFeature);

            // Average the correlation matrices across features
            const avgMatrix = averageMatrices(raterVsRaterAll);

            // Get raters
            const raters = appState.df.unique('workerId');

            // Calculate average agreement per rater (NaN values are filtered via nanmean)
            const raterSummary = {};
            raters.forEach(rater => {
                const raterResults = results.filter(r => r.rater === rater);
                const avgAgreement = nanmean(raterResults.map(r => r.avgCorr));
                raterSummary[rater] = avgAgreement;
            });

            // Identify features with zero variance (all NaN for all raters)
            const features = appState.df.unique('featureName');
            const zeroVarianceFeatures = [];
            features.forEach(feature => {
                const featureResults = results.filter(r => r.featureName === feature);
                const allNaN = featureResults.every(r => isNaN(r.avgCorr));
                if (allNaN) {
                    zeroVarianceFeatures.push(feature);
                }
            });

            // Store results
            appState.agreementResults = {
                results: results,
                avgMatrix: avgMatrix,
                raters: raters,
                raterSummary: raterSummary,
                zeroVarianceFeatures: zeroVarianceFeatures
            };

            // Display results
            displayAgreementResults();

            // Show results
            agreementLoading.style.display = 'none';
            agreementResults.style.display = 'block';

            // Enable next button
            step3Next.disabled = false;

        } catch (error) {
            console.error('Error computing agreement:', error);
            alert(`Error computing agreement: ${error.message}`);
            agreementLoading.style.display = 'none';
            computeAgreementBtn.disabled = false;
        }
    }, 100);
}

function displayAgreementResults() {
    // Show warning about zero-variance features if any
    showZeroVarianceWarning();

    // Create summary table
    createAgreementSummaryTable();

    // Create heatmap
    createAgreementHeatmap();

    // Create detailed table
    createAgreementDetailTable();
}

function showZeroVarianceWarning() {
    const { zeroVarianceFeatures } = appState.agreementResults;

    // Find or create warning div (insert after the compute button)
    let warningDiv = document.getElementById('zeroVarianceWarning');
    if (!warningDiv) {
        warningDiv = document.createElement('div');
        warningDiv.id = 'zeroVarianceWarning';
        warningDiv.className = 'note';
        warningDiv.style.marginTop = '20px';
        document.getElementById('agreementResults').prepend(warningDiv);
    }

    if (zeroVarianceFeatures.length > 0) {
        warningDiv.style.display = 'block';
        warningDiv.innerHTML = `
            <strong>⚠️ Zero-Variance Features Detected:</strong><br>
            The following ${zeroVarianceFeatures.length} feature(s) have zero variance (all raters gave identical ratings for all items).
            These features produce NaN correlation values and are excluded from the average agreement calculations:<br>
            <ul style="margin-top: 10px; margin-left: 20px;">
                ${zeroVarianceFeatures.map(f => `<li><code>${f}</code></li>`).join('')}
            </ul>
            These features don't discriminate between items and should likely be removed from your feature set.
        `;
    } else {
        warningDiv.style.display = 'none';
    }
}

function createAgreementSummaryTable() {
    const tableDiv = document.getElementById('agreementSummaryTable');
    const { raters, raterSummary } = appState.agreementResults;

    // Sort raters by average agreement (descending - high to low)
    const sortedRaters = raters.slice().sort((a, b) => raterSummary[b] - raterSummary[a]);

    let html = '<table><thead><tr>';
    html += '<th>Rank</th>';
    html += '<th>Rater</th>';
    html += '<th>Type</th>';
    html += '<th>Avg Agreement</th>';
    html += '<th>Quality</th>';
    html += '</tr></thead><tbody>';

    sortedRaters.forEach((rater, index) => {
        const avgCorr = raterSummary[rater];
        const raterType = categorizeRater(rater);
        const typeClass = raterType === 'LLM' ? 'llm' : 'human';

        let quality = '';
        let corrDisplay = '';
        let rowClass = '';

        if (isNaN(avgCorr)) {
            quality = 'No Variance';
            corrDisplay = 'NaN';
            rowClass = 'row-warning';
        } else {
            corrDisplay = avgCorr.toFixed(3);
            if (avgCorr >= 0.7) quality = 'Excellent';
            else if (avgCorr >= 0.5) quality = 'Good';
            else if (avgCorr >= 0.3) quality = 'Fair';
            else {
                quality = 'Poor';
                rowClass = 'row-poor';
            }
        }

        html += `<tr class="${rowClass}">`;
        html += `<td>${index + 1}</td>`;
        html += `<td>${rater}</td>`;
        html += `<td><span class="rater-type ${typeClass}">${raterType}</span></td>`;
        html += `<td>${corrDisplay}</td>`;
        html += `<td>${quality}</td>`;
        html += '</tr>';
    });

    html += '</tbody></table>';
    tableDiv.innerHTML = html;
}

function createAgreementHeatmap() {
    const { avgMatrix, raters } = appState.agreementResults;

    // Create heatmap data in Plotly format
    const data = [{
        z: avgMatrix,
        x: raters,
        y: raters,
        type: 'heatmap',
        colorscale: 'RdBu',  // Red-Blue colorscale
        reversescale: false,  // Blue=low (negative correlation), Red=high (positive correlation)
        zmin: -1,
        zmax: 1,
        hoverongaps: false,
        hovertemplate: '%{y} vs %{x}<br>Correlation: %{z:.3f}<extra></extra>',
        colorbar: {
            title: 'Correlation',
            titleside: 'right',
            tickmode: 'linear',
            tick0: -1,
            dtick: 0.5
        }
    }];

    const layout = {
        xaxis: {
            title: '',
            side: 'bottom',
            tickangle: -45
        },
        yaxis: {
            title: '',
            autorange: 'reversed'  // Y-axis top to bottom
        },
        width: 700,
        height: 700,
        margin: { l: 150, r: 100, t: 50, b: 150 }
    };

    const config = {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['lasso2d', 'select2d']
    };

    Plotly.newPlot('agreementHeatmap', data, layout, config);
    appState.agreementHeatmap = true;
}

function createAgreementDetailTable() {
    const tableDiv = document.getElementById('agreementDetailTable');
    const { results, zeroVarianceFeatures } = appState.agreementResults;

    // Filter out NaN results (zero-variance features)
    const validResults = results.filter(row => !isNaN(row.avgCorr));
    const nanCount = results.length - validResults.length;

    // Sort by avgCorr descending (highest first), then by feature name
    validResults.sort((a, b) => {
        if (b.avgCorr !== a.avgCorr) {
            return b.avgCorr - a.avgCorr;
        }
        return a.featureName.localeCompare(b.featureName);
    });

    let html = '';

    if (nanCount > 0) {
        html += `<p class="explanation-text" style="margin-bottom: 15px;">
            <strong>Note:</strong> Showing ${validResults.length} valid results (sorted by correlation, highest first).
            ${nanCount} NaN values (from ${zeroVarianceFeatures.length} zero-variance features) are hidden.
        </p>`;
    }

    html += '<table style="width: 80%;"><thead><tr>';
    html += '<th style="width: 35%;">Feature</th>';
    html += '<th style="width: 35%;">Rater</th>';
    html += '<th style="width: 30%;">Avg Correlation</th>';
    html += '</tr></thead><tbody>';

    validResults.forEach(row => {
        let rowClass = '';
        if (row.avgCorr < 0.3) {
            rowClass = 'row-poor';
        }

        html += `<tr class="${rowClass}">`;
        html += `<td>${row.featureName}</td>`;
        html += `<td>${row.rater}</td>`;
        html += `<td>${row.avgCorr.toFixed(3)}</td>`;
        html += '</tr>';
    });

    html += '</tbody></table>';
    tableDiv.innerHTML = html;
}

function handleDownloadAgreementChart() {
    Plotly.downloadImage('agreementHeatmap', {
        format: 'png',
        width: 1000,
        height: 1000,
        filename: `${appState.year}_${appState.groupName}_rater_agreement`
    });
}

// Step 4: Feature Redundancy
async function handleComputeRedundancy() {
    if (!appState.df) {
        alert('Please complete Step 1 (Load Data) first');
        return;
    }

    // Show loading
    redundancyLoading.style.display = 'block';
    redundancyResults.style.display = 'none';
    computeRedundancyBtn.disabled = true;

    // Use setTimeout to allow UI to update
    setTimeout(() => {
        try {
            // Compute feature redundancy
            const { featureVsFeature } = computeFeatureVsFeatureCorr(appState.df);
            const pairs = computeFeatureRedundancy(appState.df);
            const features = appState.df.unique('featureName');

            // Store results
            appState.redundancyResults = {
                featureVsFeature: featureVsFeature,
                pairs: pairs,
                features: features
            };

            // Display results
            displayRedundancyResults();

            // Show results
            redundancyLoading.style.display = 'none';
            redundancyResults.style.display = 'block';

            // Enable next button
            step4Next.disabled = false;

        } catch (error) {
            console.error('Error computing redundancy:', error);
            alert(`Error computing redundancy: ${error.message}`);
            redundancyLoading.style.display = 'none';
            computeRedundancyBtn.disabled = false;
        }
    }, 100);
}

function displayRedundancyResults() {
    // Create heatmap
    createRedundancyHeatmap();

    // Create bar chart (with threshold)
    createRedundancyChart();

    // Create summary
    updateRedundancySummary();

    // Create detailed table
    createRedundancyTable();
}

function createRedundancyHeatmap() {
    const { featureVsFeature, features } = appState.redundancyResults;

    // Filter out features with all NaN values (except self-correlation)
    const validFeatureIndices = [];
    const validFeatures = [];

    for (let i = 0; i < features.length; i++) {
        // Check if this feature has at least some valid correlations with OTHER features
        let hasValidData = false;
        for (let j = 0; j < features.length; j++) {
            if (i !== j && !isNaN(featureVsFeature[i][j])) {
                hasValidData = true;
                break;
            }
        }
        if (hasValidData) {
            validFeatureIndices.push(i);
            validFeatures.push(features[i]);
        }
    }

    // Create filtered matrix
    const filteredMatrix = [];
    for (let i of validFeatureIndices) {
        const row = [];
        for (let j of validFeatureIndices) {
            row.push(featureVsFeature[i][j]);
        }
        filteredMatrix.push(row);
    }

    // Custom colorscale: Blue (negative) → Black (0) → Red (positive)
    const customColorscale = [
        [0.0, 'rgb(0, 0, 255)'],      // -1.0: Blue
        [0.25, 'rgb(100, 100, 200)'], // -0.5: Light blue
        [0.5, 'rgb(0, 0, 0)'],        //  0.0: Black
        [0.75, 'rgb(200, 100, 100)'], //  0.5: Light red
        [1.0, 'rgb(255, 0, 0)']       //  1.0: Red
    ];

    // Create heatmap data in Plotly format
    const data = [{
        z: filteredMatrix,
        x: validFeatures,
        y: validFeatures,
        type: 'heatmap',
        colorscale: customColorscale,
        zmin: -1,
        zmax: 1,
        hoverongaps: false,
        hovertemplate: '%{y} vs %{x}<br>Correlation: %{z:.3f}<extra></extra>',
        colorbar: {
            title: 'Correlation',
            titleside: 'right',
            tickmode: 'linear',
            tick0: -1,
            dtick: 0.5
        }
    }];

    const layout = {
        xaxis: {
            title: '',
            side: 'bottom',
            tickangle: -45
        },
        yaxis: {
            title: '',
            autorange: 'reversed'
        },
        width: 700,
        height: 700,
        margin: { l: 150, r: 100, t: 50, b: 150 }
    };

    const config = {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['lasso2d', 'select2d']
    };

    Plotly.newPlot('redundancyHeatmap', data, layout, config);
}

function createRedundancyChart() {
    const canvas = document.getElementById('redundancyChart');
    const ctx = canvas.getContext('2d');

    // Destroy existing chart if it exists
    if (appState.redundancyChart) {
        appState.redundancyChart.destroy();
    }

    const { pairs } = appState.redundancyResults;
    const threshold = appState.redundancyThresholdValue;

    // Filter pairs above threshold and reverse (highest first)
    const filteredPairs = pairs
        .filter(p => p.absCorrelation >= threshold)
        .reverse()
        .slice(0, 20); // Show top 20

    if (filteredPairs.length === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText('No feature pairs above threshold', canvas.width / 2, canvas.height / 2);
        return;
    }

    appState.redundancyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: filteredPairs.map(p => p.pair),
            datasets: [{
                label: 'Absolute Correlation',
                data: filteredPairs.map(p => p.absCorrelation),
                backgroundColor: filteredPairs.map(p => {
                    if (p.absCorrelation >= 0.9) return 'rgba(220, 53, 69, 0.8)';  // Red
                    if (p.absCorrelation >= 0.7) return 'rgba(255, 193, 7, 0.8)';  // Yellow
                    return 'rgba(33, 150, 243, 0.8)';  // Blue
                }),
                borderColor: filteredPairs.map(p => {
                    if (p.absCorrelation >= 0.9) return 'rgb(220, 53, 69)';
                    if (p.absCorrelation >= 0.7) return 'rgb(255, 193, 7)';
                    return 'rgb(33, 150, 243)';
                }),
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const pair = filteredPairs[context.dataIndex];
                            return `|r| = ${pair.absCorrelation.toFixed(3)} (${pair.sign})`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    min: 0,
                    max: 1,
                    title: {
                        display: true,
                        text: 'Absolute Correlation'
                    }
                },
                y: {
                    ticks: {
                        autoSkip: false,
                        font: {
                            size: 10
                        }
                    }
                }
            }
        }
    });
}

function updateRedundancySummary() {
    const summaryDiv = document.getElementById('redundantPairsSummary');
    const { pairs } = appState.redundancyResults;
    const threshold = appState.redundancyThresholdValue;

    const redundantPairs = pairs.filter(p => p.absCorrelation >= threshold);
    const veryHighPairs = pairs.filter(p => p.absCorrelation >= 0.9);

    let html = '<h3>Summary</h3>';
    html += '<div class="summary-grid">';
    html += `<div class="summary-item">
        <div class="summary-label">Total Feature Pairs:</div>
        <div class="summary-value">${pairs.length}</div>
    </div>`;
    html += `<div class="summary-item">
        <div class="summary-label">Above Threshold (${threshold.toFixed(2)}):</div>
        <div class="summary-value">${redundantPairs.length}</div>
    </div>`;
    html += `<div class="summary-item">
        <div class="summary-label">Very High (≥ 0.9):</div>
        <div class="summary-value" style="color: #dc3545;">${veryHighPairs.length}</div>
    </div>`;
    html += '</div>';

    if (veryHighPairs.length > 0) {
        html += '<div class="note" style="margin-top: 20px;">';
        html += '<strong>⚠️ Warning:</strong> You have ' + veryHighPairs.length + ' feature pair(s) with very high redundancy (≥ 0.9). ';
        html += 'Consider dropping one feature from each pair to reduce multicollinearity.';
        html += '</div>';
    }

    summaryDiv.innerHTML = html;
}

function createRedundancyTable() {
    const tableDiv = document.getElementById('redundancyTable');
    const { pairs } = appState.redundancyResults;

    // Sort by absolute correlation descending (highest first)
    const sortedPairs = [...pairs].sort((a, b) => {
        // Handle NaN values - put them at the end
        if (isNaN(a.absCorrelation) && isNaN(b.absCorrelation)) return 0;
        if (isNaN(a.absCorrelation)) return 1;
        if (isNaN(b.absCorrelation)) return -1;
        return b.absCorrelation - a.absCorrelation;
    });

    let html = '<table><thead><tr>';
    html += '<th>Rank</th>';
    html += '<th>Feature 1</th>';
    html += '<th>Feature 2</th>';
    html += '<th>Correlation</th>';
    html += '<th>|Correlation|</th>';
    html += '<th>Redundancy</th>';
    html += '</tr></thead><tbody>';

    sortedPairs.forEach((pair, index) => {
        let quality = '';
        let corrDisplay = '';
        let absCorrDisplay = '';
        let rowClass = '';

        if (isNaN(pair.correlation)) {
            corrDisplay = 'NaN';
            absCorrDisplay = 'NaN';
            quality = '—';  // Em dash for no data
            rowClass = 'row-warning';
        } else {
            corrDisplay = pair.correlation.toFixed(3);
            absCorrDisplay = pair.absCorrelation.toFixed(3);

            if (pair.absCorrelation >= 0.9) {
                quality = 'Very High';
                rowClass = 'row-redundant';
            } else if (pair.absCorrelation >= 0.7) {
                quality = 'Moderate';
            } else if (pair.absCorrelation >= 0.5) {
                quality = 'Low';
            } else {
                quality = 'Independent';
            }
        }

        html += `<tr class="${rowClass}">`;
        html += `<td>${index + 1}</td>`;
        html += `<td>${pair.feature1}</td>`;
        html += `<td>${pair.feature2}</td>`;
        html += `<td>${corrDisplay}</td>`;
        html += `<td>${absCorrDisplay}</td>`;
        html += `<td>${quality}</td>`;
        html += '</tr>';
    });

    html += '</tbody></table>';
    tableDiv.innerHTML = html;
}

function handleThresholdChange(event) {
    const newThreshold = parseFloat(event.target.value);
    appState.redundancyThresholdValue = newThreshold;
    redundancyThresholdValue.textContent = newThreshold.toFixed(2);

    // Update chart and summary if results exist
    if (appState.redundancyResults) {
        createRedundancyChart();
        updateRedundancySummary();
    }
}

function handleDownloadRedundancyHeatmap() {
    Plotly.downloadImage('redundancyHeatmap', {
        format: 'png',
        width: 1000,
        height: 1000,
        filename: `${appState.year}_${appState.groupName}_feature_redundancy_heatmap`
    });
}

function handleDownloadRedundancyChart() {
    const canvas = document.getElementById('redundancyChart');
    const link = document.createElement('a');
    link.download = `${appState.year}_${appState.groupName}_feature_redundancy_chart.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// Step 5: Item Similarity
async function handleComputeSimilarity() {
    if (!appState.df) {
        alert('Please complete Step 1 (Load Data) first');
        return;
    }

    // Show loading
    similarityLoading.style.display = 'block';
    similarityResults.style.display = 'none';
    computeSimilarityBtn.disabled = true;

    // Use setTimeout to allow UI to update
    setTimeout(() => {
        try {
            // Compute item similarity
            const { itemVsItem } = computeItemVsItemCorr(appState.df);
            const items = appState.df.unique('itemName');

            // Compute pairwise correlations
            const pairs = [];
            for (let i = 0; i < items.length - 1; i++) {
                for (let j = i + 1; j < items.length; j++) {
                    const corr = itemVsItem[i][j];
                    pairs.push({
                        item1: items[i],
                        item2: items[j],
                        pair: `${items[i]} vs ${items[j]}`,
                        correlation: corr,
                        absCorrelation: Math.abs(corr)
                    });
                }
            }

            // Sort by absolute correlation descending
            pairs.sort((a, b) => {
                if (isNaN(a.absCorrelation) && isNaN(b.absCorrelation)) return 0;
                if (isNaN(a.absCorrelation)) return 1;
                if (isNaN(b.absCorrelation)) return -1;
                return b.absCorrelation - a.absCorrelation;
            });

            // Store results
            appState.similarityResults = {
                itemVsItem: itemVsItem,
                pairs: pairs,
                items: items
            };

            // Display results
            displaySimilarityResults();

            // Show results
            similarityLoading.style.display = 'none';
            similarityResults.style.display = 'block';

            // Enable next button
            step5Next.disabled = false;

        } catch (error) {
            console.error('Error computing similarity:', error);
            alert(`Error computing similarity: ${error.message}`);
            similarityLoading.style.display = 'none';
            computeSimilarityBtn.disabled = false;
        }
    }, 100);
}

function displaySimilarityResults() {
    // Create heatmap
    createSimilarityHeatmap();

    // Create bar chart (with threshold)
    createSimilarityChart();

    // Create summary
    updateSimilaritySummary();

    // Create detailed table
    createSimilarityTable();
}

function createSimilarityHeatmap() {
    const { itemVsItem, items } = appState.similarityResults;

    // Filter out items with all NaN values (except self-correlation)
    const validItemIndices = [];
    const validItems = [];

    for (let i = 0; i < items.length; i++) {
        // Check if this item has at least some valid correlations with OTHER items
        let hasValidData = false;
        for (let j = 0; j < items.length; j++) {
            if (i !== j && !isNaN(itemVsItem[i][j])) {
                hasValidData = true;
                break;
            }
        }
        if (hasValidData) {
            validItemIndices.push(i);
            validItems.push(items[i]);
        }
    }

    // Create filtered matrix
    const filteredMatrix = [];
    for (let i of validItemIndices) {
        const row = [];
        for (let j of validItemIndices) {
            row.push(itemVsItem[i][j]);
        }
        filteredMatrix.push(row);
    }

    // Custom colorscale: Blue (-1) → Black (0) → Red (+1)
    const customColorscale = [
        [0.0, 'rgb(0, 0, 255)'],      // -1.0: Blue
        [0.25, 'rgb(100, 100, 200)'], // -0.5: Light blue
        [0.5, 'rgb(0, 0, 0)'],        //  0.0: Black
        [0.75, 'rgb(200, 100, 100)'], //  0.5: Light red
        [1.0, 'rgb(255, 0, 0)']       //  1.0: Red
    ];

    const data = [{
        z: filteredMatrix,
        x: validItems,
        y: validItems,
        type: 'heatmap',
        colorscale: customColorscale,
        zmid: 0,
        zmin: -1,
        zmax: 1,
        colorbar: {
            title: 'Correlation',
            titleside: 'right'
        },
        hovertemplate: '%{y} vs %{x}<br>Correlation: %{z:.3f}<extra></extra>'
    }];

    const layout = {
        title: 'Item-vs-Item Correlation Heatmap',
        xaxis: {
            title: 'Items',
            tickangle: -45,
            side: 'bottom'
        },
        yaxis: {
            title: 'Items',
            autorange: 'reversed'
        },
        width: 800,
        height: 800,
        margin: { l: 150, r: 100, t: 80, b: 150 }
    };

    const config = {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d']
    };

    Plotly.newPlot('similarityHeatmap', data, layout, config);
}

function updateSimilaritySummary() {
    const summaryDiv = document.getElementById('similaritySummary');
    const { pairs } = appState.similarityResults;
    const threshold = appState.similarityThresholdValue;

    // Filter out NaN pairs for statistics
    const validPairs = pairs.filter(p => !isNaN(p.absCorrelation));
    const avgCorr = validPairs.length > 0
        ? validPairs.reduce((sum, p) => sum + p.absCorrelation, 0) / validPairs.length
        : 0;
    const aboveThresholdPairs = validPairs.filter(p => p.absCorrelation >= threshold);
    const veryHighPairs = validPairs.filter(p => p.absCorrelation >= 0.9);

    let html = '<h3>Summary</h3>';
    html += '<div class="summary-grid">';
    html += `<div class="summary-item">
        <div class="summary-label">Total Item Pairs:</div>
        <div class="summary-value">${pairs.length}</div>
    </div>`;
    html += `<div class="summary-item">
        <div class="summary-label">Average |Correlation|:</div>
        <div class="summary-value">${avgCorr.toFixed(3)}</div>
    </div>`;
    html += `<div class="summary-item">
        <div class="summary-label">Above Threshold (${threshold.toFixed(2)}):</div>
        <div class="summary-value">${aboveThresholdPairs.length}</div>
    </div>`;
    html += `<div class="summary-item">
        <div class="summary-label">Very High (≥ 0.9):</div>
        <div class="summary-value" style="color: #dc3545;">${veryHighPairs.length}</div>
    </div>`;
    html += '</div>';

    if (veryHighPairs.length > 0) {
        html += '<div class="note" style="margin-top: 20px;">';
        html += '<strong>⚠️ Note:</strong> You have ' + veryHighPairs.length + ' item pair(s) with very high similarity (≥ 0.9). ';
        html += 'This suggests some items may be confusable, which can limit prediction performance. ';
        html += 'This could be a limitation of your item set — Perhaps the brain responses are in fact indistinguishable. ';
        html += 'Alternatively, this could be a limitation of your feature set (you need to choose features that better distinguish the items).';
        html += '</div>';
    }

    summaryDiv.innerHTML = html;
}

function createSimilarityTable() {
    const tableDiv = document.getElementById('similarityTable');
    const { pairs } = appState.similarityResults;

    // Show top 20 most similar pairs
    const topPairs = pairs.slice(0, 20);

    let html = '<h4>Top 20 Most Similar Item Pairs</h4>';
    html += '<table><thead><tr>';
    html += '<th>Rank</th>';
    html += '<th>Item 1</th>';
    html += '<th>Item 2</th>';
    html += '<th>Correlation</th>';
    html += '<th>|Correlation|</th>';
    html += '<th>Similarity</th>';
    html += '</tr></thead><tbody>';

    topPairs.forEach((pair, index) => {
        let quality = '';
        let corrDisplay = '';
        let absCorrDisplay = '';
        let rowClass = '';

        if (isNaN(pair.correlation)) {
            corrDisplay = 'NaN';
            absCorrDisplay = 'NaN';
            quality = '—';  // Em dash for no data
            rowClass = 'row-warning';
        } else {
            corrDisplay = pair.correlation.toFixed(3);
            absCorrDisplay = pair.absCorrelation.toFixed(3);

            if (pair.absCorrelation >= 0.9) {
                quality = 'Very High';
                rowClass = 'row-redundant';
            } else if (pair.absCorrelation >= 0.8) {
                quality = 'High';
                rowClass = 'row-warning';
            } else if (pair.absCorrelation >= 0.7) {
                quality = 'Moderate';
            } else if (pair.absCorrelation >= 0.5) {
                quality = 'Low';
            } else {
                quality = 'Very Low';
            }
        }

        html += `<tr class="${rowClass}">`;
        html += `<td>${index + 1}</td>`;
        html += `<td>${pair.item1}</td>`;
        html += `<td>${pair.item2}</td>`;
        html += `<td>${corrDisplay}</td>`;
        html += `<td>${absCorrDisplay}</td>`;
        html += `<td>${quality}</td>`;
        html += '</tr>';
    });

    html += '</tbody></table>';
    tableDiv.innerHTML = html;
}

function createSimilarityChart() {
    const { pairs } = appState.similarityResults;
    const threshold = appState.similarityThresholdValue;

    // Filter pairs above threshold and sort by absolute correlation (highest first)
    const filteredPairs = pairs
        .filter(p => !isNaN(p.absCorrelation) && p.absCorrelation >= threshold)
        .sort((a, b) => b.absCorrelation - a.absCorrelation);

    // Destroy existing chart if it exists
    if (appState.similarityChart) {
        appState.similarityChart.destroy();
    }

    // If no pairs above threshold, show message
    if (filteredPairs.length === 0) {
        const canvas = document.getElementById('similarityChart');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '16px Arial';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText('No item pairs above threshold', canvas.width / 2, canvas.height / 2);
        return;
    }

    // Create bar chart
    const ctx = document.getElementById('similarityChart').getContext('2d');
    appState.similarityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: filteredPairs.map(p => p.pair),
            datasets: [{
                label: 'Absolute Correlation',
                data: filteredPairs.map(p => p.absCorrelation),
                backgroundColor: filteredPairs.map(p => {
                    if (p.absCorrelation >= 0.9) return 'rgba(220, 53, 69, 0.8)';
                    if (p.absCorrelation >= 0.8) return 'rgba(255, 193, 7, 0.8)';
                    return 'rgba(33, 150, 243, 0.8)';
                }),
                borderColor: filteredPairs.map(p => {
                    if (p.absCorrelation >= 0.9) return 'rgb(220, 53, 69)';
                    if (p.absCorrelation >= 0.8) return 'rgb(255, 193, 7)';
                    return 'rgb(33, 150, 243)';
                }),
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `Item Pairs with |Correlation| ≥ ${threshold.toFixed(2)}`
                },
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `|Correlation|: ${context.parsed.x.toFixed(3)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    max: 1,
                    title: {
                        display: true,
                        text: 'Absolute Correlation'
                    }
                },
                y: {
                    ticks: {
                        autoSkip: false
                    }
                }
            }
        }
    });
}

function handleSimilarityThresholdChange(event) {
    const newThreshold = parseFloat(event.target.value);
    appState.similarityThresholdValue = newThreshold;
    similarityThresholdValue.textContent = newThreshold.toFixed(2);

    // Update chart and summary if results exist
    if (appState.similarityResults) {
        createSimilarityChart();
        updateSimilaritySummary();
    }
}

function handleDownloadSimilarityHeatmap() {
    Plotly.downloadImage('similarityHeatmap', {
        format: 'png',
        width: 1000,
        height: 1000,
        filename: `${appState.year}_${appState.groupName}_item_similarity_heatmap`
    });
}

function handleDownloadSimilarityChart() {
    const canvas = document.getElementById('similarityChart');
    const link = document.createElement('a');
    link.download = `${appState.year}_${appState.groupName}_item_similarity_chart.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', init);
