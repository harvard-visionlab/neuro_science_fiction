// API Endpoints
const SURROGATE_RATERS_URL = 'https://ndcjdmrtswun7t2hzgbj7b7fle0whpro.lambda-url.us-east-1.on.aws/';
const GENERATE_CSV_URL = 'https://psp3lye7ksadwc6d6krb56dmue0yfxjv.lambda-url.us-east-1.on.aws/';

// State
let surveyData = null;
let currentFeatureIndex = -1;

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const removeFileBtn = document.getElementById('removeFile');
const errorMessage = document.getElementById('errorMessage');
const surveyInfo = document.getElementById('surveyInfo');
const featureSection = document.getElementById('featureSection');
const featureList = document.getElementById('featureList');
const ratingSection = document.getElementById('ratingSection');
const modelSelect = document.getElementById('modelSelect');
const getRatingsBtn = document.getElementById('getRatingsBtn');
const loadingMessage = document.getElementById('loadingMessage');
const responseMessage = document.getElementById('responseMessage');
const actionButtons = document.getElementById('actionButtons');
const nextFeatureBtn = document.getElementById('nextFeatureBtn');
const sameFeatureBtn = document.getElementById('sameFeatureBtn');
const downloadSection = document.getElementById('downloadSection');
const downloadBtn = document.getElementById('downloadBtn');
const downloadMessage = document.getElementById('downloadMessage');

// Event Listeners
uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', handleDragOver);
uploadArea.addEventListener('dragleave', handleDragLeave);
uploadArea.addEventListener('drop', handleDrop);
fileInput.addEventListener('change', handleFileSelect);
removeFileBtn.addEventListener('click', handleRemoveFile);
modelSelect.addEventListener('change', handleModelChange);
getRatingsBtn.addEventListener('click', handleGetRatings);
nextFeatureBtn.addEventListener('click', handleNextFeature);
sameFeatureBtn.addEventListener('click', handleSameFeature);
downloadBtn.addEventListener('click', handleDownload);

// Drag and Drop Handlers
function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

// File Processing
function processFile(file) {
    if (!file.name.endsWith('.txt')) {
        showError('Please upload a .txt file');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        parseSurvey(content, file.name);
    };
    reader.readAsText(file);
}

// Parse Survey File
function parseSurvey(content, filename) {
    try {
        const lines = content.split('\n').map(line => line.trim()).filter(line => line);
        
        const survey = {
            features: []
        };
        
        let currentFeature = null;
        
        for (const line of lines) {
            if (line.startsWith('year:')) {
                survey.year = line.split(':')[1].trim();
            } else if (line.startsWith('groupName:')) {
                survey.groupName = line.split(':')[1].trim();
            } else if (line.startsWith('feature:')) {
                if (currentFeature) {
                    survey.features.push(currentFeature);
                }
                currentFeature = {
                    name: line.split(':')[1].trim(),
                    definition: '',
                    question: '',
                    type: '',
                    options: ''
                };
            } else if (line.startsWith('definition:') && currentFeature) {
                currentFeature.definition = line.substring('definition:'.length).trim();
            } else if (line.startsWith('question:') && currentFeature) {
                currentFeature.question = line.substring('question:'.length).trim();
            } else if (line.startsWith('type:') && currentFeature) {
                currentFeature.type = line.split(':')[1].trim();
            } else if (/^\d+:/.test(line) && currentFeature) {
                // This is an option line
                currentFeature.options += (currentFeature.options ? '\n' : '') + line;
            }
        }
        
        if (currentFeature) {
            survey.features.push(currentFeature);
        }
        
        // Validate
        if (!survey.year || !survey.groupName || survey.features.length === 0) {
            showError('Invalid survey format. Missing year, groupName, or features.');
            return;
        }
        
        // Validate each feature
        for (const feature of survey.features) {
            if (!feature.name || !feature.definition || !feature.question || !feature.type) {
                showError(`Feature "${feature.name || 'unknown'}" is missing required fields.`);
                return;
            }
            
            if (!['yesno', 'scale', 'checklist'].includes(feature.type)) {
                showError(`Feature "${feature.name}" has invalid type "${feature.type}". Must be yesno, scale, or checklist.`);
                return;
            }
            
            if ((feature.type === 'scale' || feature.type === 'checklist') && !feature.options) {
                showError(`Feature "${feature.name}" is type "${feature.type}" but has no options defined.`);
                return;
            }
        }
        
        // Success!
        surveyData = survey;
        displaySurveyInfo(filename);
        displayFeatures();
        hideError();
        
    } catch (error) {
        showError('Error parsing survey file: ' + error.message);
    }
}

// Display Functions
function displaySurveyInfo(filename) {
    uploadArea.style.display = 'none';
    fileInfo.style.display = 'flex';
    fileName.textContent = filename;
    
    surveyInfo.innerHTML = `
        <h3>Survey Loaded Successfully</h3>
        <p><strong>Year:</strong> ${surveyData.year}</p>
        <p><strong>Group Name:</strong> ${surveyData.groupName}</p>
        <p><strong>Features:</strong> ${surveyData.features.length}</p>
    `;
    surveyInfo.classList.add('show');
}

function displayFeatures() {
    featureList.innerHTML = '';
    
    surveyData.features.forEach((feature, index) => {
        const div = document.createElement('div');
        div.className = 'feature-item';
        div.innerHTML = `
            <div class="feature-name">${feature.name}</div>
            <div class="feature-type">Type: ${feature.type}</div>
        `;
        div.addEventListener('click', () => selectFeature(index));
        featureList.appendChild(div);
    });
    
    featureSection.style.display = 'block';
    downloadSection.style.display = 'block';
}

function selectFeature(index) {
    currentFeatureIndex = index;
    
    // Update UI
    document.querySelectorAll('.feature-item').forEach((item, i) => {
        if (i === index) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
    
    displayFeatureDetails();
    ratingSection.style.display = 'block';
    
    // Reset rating section
    modelSelect.value = '';
    getRatingsBtn.disabled = true;
    hideResponse();
    actionButtons.style.display = 'none';
}

function displayFeatureDetails() {
    const feature = surveyData.features[currentFeatureIndex];
    
    document.getElementById('displayYear').textContent = surveyData.year;
    document.getElementById('displayGroupName').textContent = surveyData.groupName;
    document.getElementById('displayFeature').textContent = feature.name;
    document.getElementById('displayDefinition').textContent = feature.definition;
    document.getElementById('displayQuestion').textContent = feature.question;
    document.getElementById('displayType').textContent = feature.type;
    
    const optionsDiv = document.getElementById('displayOptions');
    if (feature.options) {
        optionsDiv.style.display = 'block';
        document.getElementById('displayOptionsText').textContent = feature.options;
    } else {
        optionsDiv.style.display = 'none';
    }
}

// Handle Model Selection
function handleModelChange() {
    getRatingsBtn.disabled = !modelSelect.value;
}

// Handle Get Ratings
async function handleGetRatings() {
    const feature = surveyData.features[currentFeatureIndex];
    const modelName = modelSelect.value;
    
    if (!modelName) return;
    
    // Prepare request
    const requestBody = {
        year: surveyData.year,
        groupName: surveyData.groupName,
        featureName: feature.name,
        definition: feature.definition,
        question: feature.question,
        type: feature.type,
        modelName: modelName
    };
    
    // Add options for scale and checklist
    if (feature.type === 'scale') {
        requestBody.scaleOptions = feature.options;
    } else if (feature.type === 'checklist') {
        requestBody.checklistOptions = feature.options;
    }
    
    // Show loading
    getRatingsBtn.disabled = true;
    loadingMessage.style.display = 'block';
    hideResponse();
    actionButtons.style.display = 'none';
    
    try {
        const response = await fetch(SURROGATE_RATERS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showResponse('success', data.cached 
                ? `Ratings retrieved from cache. ${data.summary.nounsRated} nouns rated.`
                : `Ratings completed successfully! ${data.summary.nounsRated} nouns rated.`);
            actionButtons.style.display = 'flex';
        } else {
            showResponse('error', data.error || 'Failed to get ratings');
            getRatingsBtn.disabled = false;
        }
    } catch (error) {
        showResponse('error', 'Network error: ' + error.message);
        getRatingsBtn.disabled = false;
    } finally {
        loadingMessage.style.display = 'none';
    }
}

// Handle Next Feature
function handleNextFeature() {
    const nextIndex = currentFeatureIndex + 1;
    if (nextIndex < surveyData.features.length) {
        selectFeature(nextIndex);
        // Scroll to rating section
        ratingSection.scrollIntoView({ behavior: 'smooth' });
    } else {
        showResponse('info', 'You have rated all features!');
    }
}

// Handle Same Feature (Different Model)
function handleSameFeature() {
    modelSelect.value = '';
    getRatingsBtn.disabled = true;
    hideResponse();
    actionButtons.style.display = 'none';
}

// Handle Download
async function handleDownload() {
    downloadBtn.disabled = true;
    downloadMessage.textContent = 'Generating CSV...';
    downloadMessage.className = 'response-message info show';
    
    try {
        const url = `${GENERATE_CSV_URL}?year=${surveyData.year}&groupName=${surveyData.groupName}`;
        
        const response = await fetch(url);
        
        if (response.ok) {
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `featureRatings_${surveyData.groupName}${surveyData.year}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);
            
            downloadMessage.textContent = 'CSV downloaded successfully!';
            downloadMessage.className = 'response-message success show';
        } else {
            const data = await response.json();
            downloadMessage.textContent = 'Error: ' + (data.error || 'Failed to generate CSV');
            downloadMessage.className = 'response-message error show';
        }
    } catch (error) {
        downloadMessage.textContent = 'Network error: ' + error.message;
        downloadMessage.className = 'response-message error show';
    } finally {
        downloadBtn.disabled = false;
        setTimeout(() => {
            downloadMessage.classList.remove('show');
        }, 5000);
    }
}

// Handle Remove File
function handleRemoveFile() {
    fileInput.value = '';
    fileInfo.style.display = 'none';
    uploadArea.style.display = 'block';
    surveyInfo.classList.remove('show');
    featureSection.style.display = 'none';
    ratingSection.style.display = 'none';
    downloadSection.style.display = 'none';
    surveyData = null;
    currentFeatureIndex = -1;
    hideError();
}

// Utility Functions
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
}

function hideError() {
    errorMessage.classList.remove('show');
}

function showResponse(type, message) {
    responseMessage.textContent = message;
    responseMessage.className = `response-message ${type} show`;
}

function hideResponse() {
    responseMessage.classList.remove('show');
}
