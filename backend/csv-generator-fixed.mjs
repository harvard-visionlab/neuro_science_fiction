// csv-generator.mjs
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET_NAME = process.env.BUCKET_NAME;

async function listAllCsvFilesForGroup(year, groupName) {
  const prefix = `survey/${year}/${groupName}/`;
  const allObjects = [];
  
  let continuationToken = null;
  
  do {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      ContinuationToken: continuationToken
    });
    
    const response = await s3Client.send(command);
    
    if (response.Contents) {
      // Filter for .csv files only
      const csvFiles = response.Contents.filter(obj => obj.Key.endsWith('.csv'));
      allObjects.push(...csvFiles);
    }
    
    continuationToken = response.NextContinuationToken;
  } while (continuationToken);
  
  return allObjects;
}

async function loadCsvFile(key) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key
  });
  
  const response = await s3Client.send(command);
  const str = await response.Body.transformToString();
  return str;
}

function combineCsvFiles(csvContents) {
  if (csvContents.length === 0) {
    return '';
  }
  
  // Get headers from first CSV
  const firstCsv = csvContents[0];
  const lines = firstCsv.split('\n').filter(line => line.trim());
  const headers = lines[0];
  
  // Start with headers
  const combinedLines = [headers];
  
  // Add data rows from all CSVs (skip header row from each)
  csvContents.forEach(csv => {
    const lines = csv.split('\n').filter(line => line.trim());
    // Skip the header row (index 0) and add all data rows
    for (let i = 1; i < lines.length; i++) {
      combinedLines.push(lines[i]);
    }
  });
  
  return combinedLines.join('\n');
}

export const handler = async (event) => {
  try {
    // Parse input - handle GET (query string) and POST (body)
    let year, groupName, format;
    
    if (event.queryStringParameters) {
      // GET request with query parameters
      year = event.queryStringParameters.year;
      groupName = event.queryStringParameters.groupName;
      format = event.queryStringParameters.format || 'file';
    } else if (event.body) {
      // POST request with body
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      year = body.year;
      groupName = body.groupName;
      format = body.format || 'file';
    } else {
      // Direct invocation
      year = event.year;
      groupName = event.groupName;
      format = event.format || 'file';
    }
    
    if (!year || !groupName) {
      return {
        statusCode: 400,
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          error: 'Missing required parameters',
          required: ['year', 'groupName'],
          usage: 'GET: ?year=2025&groupName=eternalcarrot or POST: {"year": "2025", "groupName": "eternalcarrot"}'
        })
      };
    }
    
    console.log(`Generating combined CSV for year=${year}, groupName=${groupName}`);
    
    // List all CSV files for this group
    const csvFiles = await listAllCsvFilesForGroup(year, groupName);
    
    if (csvFiles.length === 0) {
      return {
        statusCode: 404,
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          error: 'No CSV files found',
          searchPath: `survey/${year}/${groupName}/`,
          message: 'Make sure you have generated ratings first using the surrogate-feature-rater function'
        })
      };
    }
    
    console.log(`Found ${csvFiles.length} CSV files`);
    
    // Load all CSV files
    const csvContents = [];
    const processedFiles = [];
    
    for (const file of csvFiles) {
      try {
        const csvContent = await loadCsvFile(file.Key);
        csvContents.push(csvContent);
        processedFiles.push(file.Key);
        console.log(`Loaded ${file.Key}`);
      } catch (error) {
        console.error(`Error loading ${file.Key}:`, error);
      }
    }
    
    if (csvContents.length === 0) {
      return {
        statusCode: 500,
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          error: 'Could not load any CSV files'
        })
      };
    }
    
    // Combine all CSV files
    const combinedCsv = combineCsvFiles(csvContents);
    
    // Count total rows (excluding header)
    const totalRows = combinedCsv.split('\n').length - 1;
    
    console.log(`Successfully generated combined CSV with ${totalRows} data rows`);
    
    // Return format based on request
    if (format === 'json') {
      // Return JSON metadata
      return {
        statusCode: 200,
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: true,
          message: `Combined CSV generated successfully`,
          summary: {
            year,
            groupName,
            csvFilesProcessed: processedFiles.length,
            totalRows
          },
          processedFiles
        })
      };
    } else {
      // Return the actual CSV file for download
      const filename = `featureRatings_${groupName}${year}.csv`;
      return {
        statusCode: 200,
        headers: { 
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
        body: combinedCsv
      };
    }
    
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
