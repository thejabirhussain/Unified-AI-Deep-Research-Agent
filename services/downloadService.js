const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const https = require('https');

class DownloadService {
  constructor() {
    this.sciHubDomains = [
      'https://sci-hub.ru',
      'https://sci-hub.st',
      'https://sci-hub.se',
      'https://sci-hub.wf',
      'https://sci-hub.cat'
    ];
    
    this.downloadPath = path.join(__dirname, '../downloads');
    if (!fs.existsSync(this.downloadPath)) {
      fs.mkdirSync(this.downloadPath, { recursive: true });
    }
  }

  async downloadPaper({ url, title }) {
    let lastError = null;

    for (const domain of this.sciHubDomains) {
      try {
        console.log(`Trying domain: ${domain}`);
        
        // Create axios instance with custom settings
        const axiosInstance = axios.create({
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          }),
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });

        // First get the Sci-Hub page
        const sciHubUrl = `${domain}/${url}`;
        const response = await axiosInstance.get(sciHubUrl);
        const $ = cheerio.load(response.data);

        // Look for PDF link
        const pdfUrl = $('#pdf').attr('src') || 
                      $('iframe#pdf').attr('src') || 
                      $('embed#pdf').attr('src');

        if (!pdfUrl) {
          console.log(`No PDF found on ${domain}`);
          continue;
        }

        // Ensure PDF URL is absolute
        const fullPdfUrl = pdfUrl.startsWith('http') ? pdfUrl : `${domain}${pdfUrl}`;
        console.log(`Found PDF URL: ${fullPdfUrl}`);

        // Download the PDF
        const pdfResponse = await axiosInstance.get(fullPdfUrl, {
          responseType: 'arraybuffer'
        });

        if (pdfResponse.data.length < 1000) { // Basic check if it's a valid PDF
          throw new Error('Retrieved file too small to be a valid PDF');
        }

        // Save the PDF
        const safeTitle = title.replace(/[^a-z0-9]/gi, '_').substring(0, 100);
        const filePath = path.join(this.downloadPath, `${safeTitle}.pdf`);
        fs.writeFileSync(filePath, pdfResponse.data);
        
        console.log(`Successfully downloaded to: ${filePath}`);
        return filePath;

      } catch (error) {
        console.error(`Failed with domain ${domain}:`, error.message);
        lastError = error;
        continue;
      }
    }

    throw new Error(`Could not download from any Sci-Hub domain. Last error: ${lastError?.message}`);
  }
}

module.exports = new DownloadService();