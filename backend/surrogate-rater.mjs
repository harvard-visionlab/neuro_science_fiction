// survey-rater.mjs
import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { z } from 'zod';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET_NAME = process.env.BUCKET_NAME;

const NOUNS = [
  'bear', 'cat', 'cow', 'dog', 'horse', 'arm', 'eye', 'foot', 'hand', 'leg',
  'apartment', 'barn', 'church', 'house', 'igloo', 'arch', 'chimney', 'closet', 'door', 'window',
  'coat', 'dress', 'pants', 'shirt', 'skirt', 'bed', 'chair', 'desk', 'dresser', 'table',
  'ant', 'bee', 'beetle', 'butterfly', 'fly', 'bottle', 'cup', 'glass', 'knife', 'spoon',
  'bell', 'key', 'refrigerator', 'telephone', 'watch', 'chisel', 'hammer', 'pliers', 'saw', 'screwdriver',
  'carrot', 'celery', 'corn', 'lettuce', 'tomato', 'airplane', 'bicycle', 'car', 'train', 'truck'
];

const ITEM_CATEGORIES = {
  'bear': 'animals', 'cat': 'animals', 'cow': 'animals', 'dog': 'animals', 'horse': 'animals',
  'arm': 'bodyParts', 'eye': 'bodyParts', 'foot': 'bodyParts', 'hand': 'bodyParts', 'leg': 'bodyParts',
  'apartment': 'buildings', 'barn': 'buildings', 'church': 'buildings', 'house': 'buildings', 'igloo': 'buildings',
  'arch': 'buildingParts', 'chimney': 'buildingParts', 'closet': 'buildingParts', 'door': 'buildingParts', 'window': 'buildingParts',
  'coat': 'clothing', 'dress': 'clothing', 'pants': 'clothing', 'shirt': 'clothing', 'skirt': 'clothing',
  'bed': 'furniture', 'chair': 'furniture', 'desk': 'furniture', 'dresser': 'furniture', 'table': 'furniture',
  'ant': 'insects', 'bee': 'insects', 'beetle': 'insects', 'butterfly': 'insects', 'fly': 'insects',
  'bottle': 'kitchenUtensils', 'cup': 'kitchenUtensils', 'glass': 'kitchenUtensils', 'knife': 'kitchenUtensils', 'spoon': 'kitchenUtensils',
  'bell': 'manMadeObjects', 'key': 'manMadeObjects', 'refrigerator': 'manMadeObjects', 'telephone': 'manMadeObjects', 'watch': 'manMadeObjects',
  'chisel': 'tools', 'hammer': 'tools', 'pliers': 'tools', 'saw': 'tools', 'screwdriver': 'tools',
  'carrot': 'vegetables', 'celery': 'vegetables', 'corn': 'vegetables', 'lettuce': 'vegetables', 'tomato': 'vegetables',
  'airplane': 'vehicles', 'bicycle': 'vehicles', 'car': 'vehicles', 'train': 'vehicles', 'truck': 'vehicles'
};

const NOUN_TO_IMAGE = {
  'bear': '021_bear.jpg', 'cat': '049_cat.jpg', 'cow': '068_cow.jpg', 'dog': '073_dog.jpg', 'horse': '121_horse.jpg',
  'arm': '007_arm.jpg', 'eye': '086_eye.jpg', 'foot': '094_foot.jpg', 'hand': '115_hand.jpg', 'leg': '134_leg.jpg',
  'apartment': '122_apartment.jpg', 'barn': '017_barn.jpg', 'church': '057_church.jpg', 'house': '122_house.jpg', 'igloo': '000_igloo.jpg',
  'arch': '000_arch.jpg', 'chimney': '000_chimney.jpg', 'closet': '000_closet.jpg', 'door': '076_door.jpg', 'window': '257_window.jpg',
  'coat': '064_coat.jpg', 'dress': '078_dress.jpg', 'pants': '162_pants.jpg', 'shirt': '203_shirt.jpg', 'skirt': '205_skirt.jpg',
  'bed': '022_bed.jpg', 'chair': '053_chair.jpg', 'desk': '072_desk.jpg', 'dresser': '079_dresser.jpg', 'table': '226_table.jpg',
  'ant': '005_ant.jpg', 'bee': '023_bee.jpg', 'beetle': '024_beetle.jpg', 'butterfly': '040_butterfly.jpg', 'fly': '093_fly.jpg',
  'bottle': '032_bottle.jpg', 'cup': '070_cup.jpg', 'glass': '104_glass.jpg', 'knife': '130_knife.jpg', 'spoon': '215_spoon.jpg',
  'bell': '025_bell.jpg', 'key': '128_key.jpg', 'refrigerator': '185_refrigerator.jpg', 'telephone': '227_telephone.jpg', 'watch': '250_watch.jpg',
  'chisel': '056_chisel.jpg', 'hammer': '114_hammer.jpg', 'pliers': '176_pliers.jpg', 'saw': '196_saw.jpg', 'screwdriver': '199_screwdriver.jpg',
  'carrot': '048_carrot.jpg', 'celery': '051_celery.jpg', 'corn': '066_corn.jpg', 'lettuce': '137_lettuce.jpg', 'tomato': '236_tomato.jpg',
  'airplane': '002_airplane.jpg', 'bicycle': '027_bicycle.jpg', 'car': '047_car.jpg', 'train': '240_train.jpg', 'truck': '242_truck.jpg'
};

const yesnoSchema = z.object({
  ratings: z.array(z.object({
    noun: z.string(),
    response: z.enum(['yes', 'no'])
  })).length(60)
});

const scaleSchema = z.object({
  ratings: z.array(z.object({
    noun: z.string(),
    response: z.number().int().min(1).max(5)
  })).length(60)
});

const checklistSchema = z.object({
  ratings: z.array(z.object({
    noun: z.string(),
    selected: z.array(z.number().int())
  })).length(60)
});

async function checkIfRatingsExist(s3Key) {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key
    });
    const response = await s3Client.send(command);
    const str = await response.Body.transformToString();
    return JSON.parse(str);
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      return null;
    }
    throw error;
  }
}

function getModelConfig(modelName, apiKey) {
  const modelMap = {
    'gpt-4o-mini': 'gpt-4o-mini',
    'gpt-4o': 'gpt-4o',
    'gpt-4': 'gpt-4-turbo',
    'gpt-5': 'gpt-5',
    'gpt-5-mini': 'gpt-5-mini',
    'o1-mini': 'o1-mini',
    'o3-mini': 'o3-mini',
    'gemini-2.5-flash': 'gemini-2.5-flash-preview-05-20',
    'gemini-2.0-flash': 'gemini-2.0-flash',
    'gemini-2.5-pro': 'gemini-2.5-pro'
  };
  
  const actualModel = modelMap[modelName] || modelName;
  const isOpenAI = actualModel.includes('gpt') || actualModel.includes('o1') || actualModel.includes('o3') || actualModel.includes('o4');
  const isGemini = actualModel.includes('gemini');
  
  if (isOpenAI) {
    return {
      type: 'openai',
      provider: createOpenAI({ 
        apiKey,
        baseURL: 'https://go.apis.huit.harvard.edu/ais-openai-direct/v1',
        headers: { 'api-key': apiKey }
      }),
      model: actualModel
    };
  } else if (isGemini) {
    return {
      type: 'gemini',
      model: actualModel,
      apiKey
    };
  } else {
    throw new Error(`Unsupported model: ${modelName}`);
  }
}

function buildPrompt(question, definition, type, scaleOptions = null, checklistOptions = null) {
  let prompt = `You are a research assistant helping with a neuroscience study on how the brain represents objects. Your task is to rate each of 60 nouns on a specific feature dimension.

Feature: ${definition}
Question: ${question}

Instructions:
`;

  if (type === 'yesno') {
    prompt += `- Answer "yes" or "no" for each noun
- Base your answer on typical, common-sense understanding
- Be consistent in your judgments

Format: For each noun, provide { "noun": "...", "response": "yes" or "no" }
`;
  } else if (type === 'scale') {
    prompt += `- Rate each noun on a scale from 1 to 5
- Scale meanings:
${scaleOptions}
- Be consistent in your judgments
- Use the full range of the scale when appropriate

Format: For each noun, provide { "noun": "...", "response": 1-5 }
`;
  } else if (type === 'checklist') {
    prompt += `- For each noun, select all options that apply
- Options:
${checklistOptions}
- Provide the indices (numbers) of applicable options as an array
- An empty array means none apply

Format: For each noun, provide { "noun": "...", "selected": [array of option numbers] }
`;
  }

  prompt += `\nNouns to rate:\n${NOUNS.join(', ')}

Rate all 60 nouns in order.`;

  return prompt;
}

async function rateWithOpenAI(config, prompt, schema) {
  const result = await generateObject({
    model: config.provider(config.model),
    schema,
    prompt,
    temperature: 0.3
  });
  
  return result.object.ratings;
}

async function rateWithGemini(config, prompt) {
  const response = await fetch(
    `https://go.apis.huit.harvard.edu/ais-google-gemini/v1beta/models/${config.model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: prompt + '\n\nRespond ONLY with valid JSON array format, no markdown or explanation.' }]
        }],
        generationConfig: {
          temperature: 0.3
        }
      })
    }
  );
  
  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} ${await response.text()}`);
  }
  
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  let jsonText = text.trim();
  jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  
  const ratings = JSON.parse(jsonText);
  return ratings;
}

function parseScaleBounds(scaleOptions) {
  if (!scaleOptions) return { min: 1, max: 5 };
  
  const lines = scaleOptions.split('\n').filter(line => line.trim());
  const numbers = [];
  
  lines.forEach(line => {
    const match = line.match(/^(\d+):/);
    if (match) {
      numbers.push(parseInt(match[1]));
    }
  });
  
  if (numbers.length === 0) return { min: 1, max: 5 };
  
  return {
    min: Math.min(...numbers),
    max: Math.max(...numbers)
  };
}

function parseChecklistOptions(checklistOptions) {
  if (!checklistOptions) return [];
  
  const lines = checklistOptions.split('\n').filter(line => line.trim());
  return lines.map(line => {
    const match = line.match(/^(\d+):\s*(.+)$/);
    if (match) {
      return { index: parseInt(match[1]), label: match[2].trim() };
    }
    return null;
  }).filter(item => item !== null);
}

// ============================================================================
// NEW VALIDATION CODE - Added 2025-10-22
// Validates LLM ratings to prevent invalid nouns (e.g., "蝶" instead of "butterfly")
// ============================================================================
function validateRatings(ratings, type, scaleOptions, checklistOptions) {
  const errors = [];
  const warnings = [];

  // 1. Check count
  if (ratings.length !== 60) {
    errors.push(`Expected 60 ratings, got ${ratings.length}`);
  }

  // 2. Normalize and validate nouns
  const nounsLowercase = NOUNS.map(n => n.toLowerCase());
  const ratedNouns = new Set();
  const invalidNouns = [];
  const correctedRatings = [];

  ratings.forEach((rating, index) => {
    const originalNoun = rating.noun;
    const normalizedNoun = originalNoun.toLowerCase();

    // Check if noun is valid (case-insensitive)
    if (!nounsLowercase.includes(normalizedNoun)) {
      invalidNouns.push(originalNoun);
      return; // Don't add to correctedRatings
    }

    // Find the correct casing from NOUNS array
    const correctNoun = NOUNS.find(n => n.toLowerCase() === normalizedNoun);

    // Auto-correct case if needed
    const correctedRating = { ...rating, noun: correctNoun };
    if (originalNoun !== correctNoun) {
      warnings.push(`Auto-corrected noun casing: "${originalNoun}" → "${correctNoun}"`);
    }

    // Check for duplicates
    if (ratedNouns.has(correctNoun)) {
      errors.push(`Duplicate rating for noun: "${correctNoun}"`);
    }
    ratedNouns.add(correctNoun);

    correctedRatings.push(correctedRating);
  });

  // 3. Check for missing nouns
  const missingNouns = NOUNS.filter(noun => !ratedNouns.has(noun));
  if (missingNouns.length > 0) {
    errors.push(`Missing ratings for ${missingNouns.length} noun(s): ${missingNouns.join(', ')}`);
  }

  // 4. Report invalid nouns
  if (invalidNouns.length > 0) {
    errors.push(`Invalid nouns (not in NOUNS array): ${invalidNouns.join(', ')}`);
  }

  // 5. Validate response values by type
  if (type === 'yesno') {
    correctedRatings.forEach((rating, index) => {
      if (rating.response !== 'yes' && rating.response !== 'no') {
        errors.push(`Rating ${index + 1} (${rating.noun}): Invalid yes/no response: "${rating.response}"`);
      }
    });
  } else if (type === 'scale') {
    const bounds = parseScaleBounds(scaleOptions);
    correctedRatings.forEach((rating, index) => {
      const val = rating.response;
      if (typeof val !== 'number' || !Number.isInteger(val) || isNaN(val) || val < bounds.min || val > bounds.max) {
        errors.push(`Rating ${index + 1} (${rating.noun}): Invalid scale value ${val}, must be integer ${bounds.min}-${bounds.max}`);
      }
    });
  } else if (type === 'checklist') {
    const options = parseChecklistOptions(checklistOptions);
    const validIndices = options.map(o => o.index);
    correctedRatings.forEach((rating, index) => {
      if (!Array.isArray(rating.selected)) {
        errors.push(`Rating ${index + 1} (${rating.noun}): 'selected' must be an array`);
      } else {
        rating.selected.forEach(idx => {
          if (typeof idx !== 'number' || isNaN(idx) || !Number.isInteger(idx)) {
            errors.push(`Rating ${index + 1} (${rating.noun}): Checklist index must be an integer, got ${idx}`);
          } else if (!validIndices.includes(idx)) {
            errors.push(`Rating ${index + 1} (${rating.noun}): Invalid checklist index ${idx}, valid indices are [${validIndices.join(', ')}]`);
          }
        });
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    correctedRatings // Always return correctedRatings (even if invalid, for debugging)
  };
}
// ============================================================================
// END NEW VALIDATION CODE
// ============================================================================

function convertRatingDataToCsv(ratingData) {
  const { input, ratings } = ratingData;
  const { year, groupName, featureName, workerId, type, scaleOptions, checklistOptions } = input;
  
  const rows = [];
  
  let minRating, maxRating;
  if (type === 'yesno') {
    minRating = 0;
    maxRating = 1;
  } else if (type === 'scale') {
    const bounds = parseScaleBounds(scaleOptions);
    minRating = bounds.min;
    maxRating = bounds.max;
  } else if (type === 'checklist') {
    minRating = 0;
    maxRating = 1;
  }
  
  ratings.forEach((rating) => {
    const itemName = rating.noun;
    const itemCategory = ITEM_CATEGORIES[itemName] || 'unknown';
    const trialNumber = NOUNS.indexOf(itemName) + 1;
    const imageName = NOUN_TO_IMAGE[itemName] || `000_${itemName}.jpg`;
    
    if (type === 'yesno') {
      const rawRating = rating.response === 'yes' ? 1 : 0;
      const ratingsScaled = rawRating / (maxRating - minRating);
      const ratingsScaledMax = rawRating / maxRating;
      
      rows.push({
        year,
        groupName,
        workerId,
        assignmentId: 'NONE',
        trialNumber,
        imageName,
        itemName,
        itemCategory,
        featureName,
        rating: rawRating,
        ratingsScaled,
        ratingsScaledMax
      });
    } else if (type === 'scale') {
      const rawRating = rating.response;
      const ratingsScaled = (rawRating - minRating) / (maxRating - minRating);
      const ratingsScaledMax = rawRating / maxRating;
      
      rows.push({
        year,
        groupName,
        workerId,
        assignmentId: 'NONE',
        trialNumber,
        imageName,
        itemName,
        itemCategory,
        featureName,
        rating: rawRating,
        ratingsScaled,
        ratingsScaledMax
      });
    } else if (type === 'checklist') {
      const options = parseChecklistOptions(checklistOptions);
      const selectedIndices = rating.selected || [];
      
      options.forEach(option => {
        const rawRating = selectedIndices.includes(option.index) ? 1 : 0;
        const ratingsScaled = rawRating / (maxRating - minRating);
        const ratingsScaledMax = rawRating / maxRating;
        
        // Get first word of the option label
        const firstWord = option.label.split(/\s+/)[0].toLowerCase();
        
        rows.push({
          year,
          groupName,
          workerId,
          assignmentId: 'NONE',
          trialNumber,
          imageName,
          itemName,
          itemCategory,
          featureName: `${featureName}_${option.index}_${firstWord}`,
          rating: rawRating,
          ratingsScaled,
          ratingsScaledMax
        });
      });
    }
  });
  
  // Convert rows to CSV
  const headers = ['year', 'groupName', 'workerId', 'assignmentId', 'trialNumber', 'imageName', 'itemName', 'itemCategory', 'featureName', 'rating', 'ratingsScaled', 'ratingsScaledMax'];
  const csvLines = [headers.join(',')];
  
  rows.forEach(row => {
    const values = headers.map(header => {
      const value = row[header];
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value}"`;
      }
      return value;
    });
    csvLines.push(values.join(','));
  });
  
  return csvLines.join('\n');
}

export const handler = async (event) => {
  try {
    let body;
    if (event.body) {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } else {
      body = event;
    }
    
    const { 
      year,
      groupName,
      featureName, 
      definition, 
      question, 
      type, 
      modelName,
      scaleOptions,
      checklistOptions,
      forceRegenerate
    } = body;
    
    if (!year || !groupName || !featureName || !definition || !question || !type || !modelName) {
      return {
        statusCode: 400,
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          error: 'Missing required fields',
          required: ['year', 'groupName', 'featureName', 'definition', 'question', 'type', 'modelName']
        })
      };
    }
    
    if (!['yesno', 'scale', 'checklist'].includes(type)) {
      return {
        statusCode: 400,
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Invalid type. Must be: yesno, scale, or checklist' })
      };
    }
    
    const apiKey = process.env.HARVARD_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'API key not configured' })
      };
    }
    
    const jsonKey = `survey/${year}/${groupName}/${featureName}/${modelName}.json`;
    const csvKey = `survey/${year}/${groupName}/${featureName}/${modelName}.csv`;
    
    if (!forceRegenerate) {
      const existingRatings = await checkIfRatingsExist(jsonKey);
      if (existingRatings) {
        console.log(`Ratings already exist at s3://${BUCKET_NAME}/${jsonKey}, returning existing data`);
        return {
          statusCode: 200,
          headers: { 
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: true,
            cached: true,
            message: `Ratings already exist, returning saved results from s3://${BUCKET_NAME}/${jsonKey}`,
            s3Locations: {
              json: `s3://${BUCKET_NAME}/${jsonKey}`,
              csv: `s3://${BUCKET_NAME}/${csvKey}`
            },
            summary: {
              year,
              groupName,
              featureName,
              workerId: modelName,
              nounsRated: existingRatings.ratings?.length || 60,
              originalTimestamp: existingRatings.metadata?.timestamp
            },
            data: existingRatings
          })
        };
      }
    }
    
    const config = getModelConfig(modelName, apiKey);
    const prompt = buildPrompt(question, definition, type, scaleOptions, checklistOptions);
    
    let ratings;
    const startTime = Date.now();
    
    if (config.type === 'openai') {
      const schema = type === 'yesno' ? yesnoSchema : 
                     type === 'scale' ? scaleSchema : 
                     checklistSchema;
      ratings = await rateWithOpenAI(config, prompt, schema);
    } else if (config.type === 'gemini') {
      ratings = await rateWithGemini(config, prompt);
    }
    
    const duration = Date.now() - startTime;

    // ============================================================================
    // NEW: Validate ratings before saving to S3
    // ============================================================================
    console.log('Validating LLM ratings...');
    const validation = validateRatings(ratings, type, scaleOptions, checklistOptions);

    if (!validation.valid) {
      console.error('Validation failed:', validation.errors);
      return {
        statusCode: 422,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Invalid ratings from LLM',
          validationErrors: validation.errors,
          details: {
            year,
            groupName,
            featureName,
            workerId: modelName,
            ratingsReceived: ratings.length,
            expectedRatings: 60
          },
          message: 'LLM returned invalid data. Please regenerate with forceRegenerate=true.'
        })
      };
    }

    // Log warnings (if any case corrections were made)
    if (validation.warnings.length > 0) {
      console.log('Validation warnings:', validation.warnings);
    }

    // Use corrected ratings (with normalized casing)
    const correctedRatings = validation.correctedRatings;
    // ============================================================================
    // END NEW VALIDATION CODE
    // ============================================================================

    const result = {
      input: {
        year,
        groupName,
        featureName,
        definition,
        question,
        type,
        workerId: modelName,
        scaleOptions: scaleOptions || null,
        checklistOptions: checklistOptions || null
      },
      ratings: correctedRatings, // NEW: Use validated/corrected ratings
      metadata: {
        timestamp: new Date().toISOString(),
        model: config.model,
        duration: `${duration}ms`,
        nounsRated: correctedRatings.length,
        validationWarnings: validation.warnings.length > 0 ? validation.warnings : undefined // NEW: Include warnings if any
      }
    };
    
    // Store JSON
    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: jsonKey,
      Body: JSON.stringify(result, null, 2),
      ContentType: 'application/json'
    }));
    
    console.log(`Successfully stored JSON at s3://${BUCKET_NAME}/${jsonKey}`);
    
    // Generate and store CSV
    const csvContent = convertRatingDataToCsv(result);
    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: csvKey,
      Body: csvContent,
      ContentType: 'text/csv'
    }));
    
    console.log(`Successfully stored CSV at s3://${BUCKET_NAME}/${csvKey}`);
    
    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        cached: false,
        message: `New ratings generated and saved at s3://${BUCKET_NAME}/${jsonKey}`,
        s3Locations: {
          json: `s3://${BUCKET_NAME}/${jsonKey}`,
          csv: `s3://${BUCKET_NAME}/${csvKey}`
        },
        summary: {
          year,
          groupName,
          featureName,
          workerId: modelName,
          nounsRated: correctedRatings.length,
          duration: `${duration}ms`
        },
        data: result
      })
    };
    
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};