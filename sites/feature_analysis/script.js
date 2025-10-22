/**
 * Feature Analysis - Main Application Script
 */

// API Endpoint
const GENERATE_CSV_URL = 'https://psp3lye7ksadwc6d6krb56dmue0yfxjv.lambda-url.us-east-1.on.aws/';

// Global state
let appState = {
    df: null,
    year: null,
    groupName: null,
    droppedRaters: [],
    currentStep: 1,
    ratingsByFeature: null,
    reliabilityResults: null,
    reliabilityChart: null,
    agreementResults: null,
    agreementHeatmap: null
};

// DOM Elements - Step 1
const yearInput = document.getElementById('yearInput');
const groupNameInput = document.getElementById('groupNameInput');
const loadDataBtn = document.getElementById('loadDataBtn');
const loadingIndicator = document.getElementById('loadingIndicator');
const dataLoadError = document.getElementById('dataLoadError');
const dataSummary = document.getElementById('dataSummary');
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

// Initialize app
function init() {
    setupEventListeners();
    setupNavigation();
}

// Setup event listeners
function setupEventListeners() {
    // Step 1
    loadDataBtn.addEventListener('click', handleLoadData);
    step1Next.addEventListener('click', () => navigateToStep(2));

    // Step 2
    computeReliabilityBtn.addEventListener('click', handleComputeReliability);
    downloadReliabilityChart.addEventListener('click', handleDownloadReliabilityChart);
    step2Next.addEventListener('click', () => navigateToStep(3));

    // Step 3
    computeAgreementBtn.addEventListener('click', handleComputeAgreement);
    downloadAgreementChart.addEventListener('click', handleDownloadAgreementChart);
    step3Next.addEventListener('click', () => navigateToStep(4));

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

// Step 1: Load Data
async function handleLoadData() {
    const year = yearInput.value.trim();
    const groupName = groupNameInput.value.trim();

    if (!year || !groupName) {
        showError('Please enter both year and group name');
        return;
    }

    // Show loading
    loadingIndicator.style.display = 'block';
    dataLoadError.style.display = 'none';
    dataSummary.style.display = 'none';
    loadDataBtn.disabled = true;

    try {
        // Fetch CSV from Lambda
        const url = `${GENERATE_CSV_URL}?year=${year}&groupName=${groupName}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to load data: ${response.statusText}`);
        }

        const csvText = await response.text();

        // Parse CSV
        const parsed = Papa.parse(csvText, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true
        });

        if (parsed.errors.length > 0) {
            console.error('CSV parsing errors:', parsed.errors);
        }

        // Create DataFrame
        let df = createDataFrame(parsed.data);

        // Filter out incomplete raters
        const filterResult = filterIncompleteRaters(df);
        appState.df = filterResult.df;
        appState.droppedRaters = filterResult.droppedRaters;
        appState.maxCount = filterResult.maxCount;
        appState.raterCounts = filterResult.raterCounts;
        appState.year = year;
        appState.groupName = groupName;

        // Display summary
        displayDataSummary();

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
    const data = appState.reliabilityResults;

    let html = '<table><thead><tr>';
    html += '<th>Rank</th>';
    html += '<th>Feature Name</th>';
    html += '<th>Avg Correlation</th>';
    html += '<th>Quality</th>';
    html += '</tr></thead><tbody>';

    data.forEach((row, index) => {
        let quality = '';
        let corrDisplay = '';

        if (isNaN(row.avgCorr)) {
            quality = 'No Variance';
            corrDisplay = 'NaN';
        } else {
            corrDisplay = row.avgCorr.toFixed(3);
            if (row.avgCorr >= 0.7) quality = 'Excellent';
            else if (row.avgCorr >= 0.5) quality = 'Good';
            else if (row.avgCorr >= 0.3) quality = 'Fair';
            else quality = 'Poor';
        }

        html += '<tr>';
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

    // Sort raters by average agreement (ascending)
    const sortedRaters = raters.slice().sort((a, b) => raterSummary[a] - raterSummary[b]);

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

        if (isNaN(avgCorr)) {
            quality = 'No Variance';
            corrDisplay = 'NaN';
        } else {
            corrDisplay = avgCorr.toFixed(3);
            if (avgCorr >= 0.7) quality = 'Excellent';
            else if (avgCorr >= 0.5) quality = 'Good';
            else if (avgCorr >= 0.3) quality = 'Fair';
            else quality = 'Poor';
        }

        html += '<tr>';
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

    let html = '';

    if (nanCount > 0) {
        html += `<p class="explanation-text" style="margin-bottom: 15px;">
            <strong>Note:</strong> Showing ${validResults.length} valid results.
            ${nanCount} NaN values (from ${zeroVarianceFeatures.length} zero-variance features) are hidden.
        </p>`;
    }

    html += '<table><thead><tr>';
    html += '<th>Feature</th>';
    html += '<th>Rater</th>';
    html += '<th>Avg Correlation</th>';
    html += '</tr></thead><tbody>';

    validResults.forEach(row => {
        html += '<tr>';
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

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', init);
