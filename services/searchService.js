const axios = require('axios');

class SearchService {
  constructor() {
    this.apiKey = process.env.SERPAPI_KEY;
  }

  async webSearch(query, options = {}) {
    try {
      // If academic search is requested, use academicSearch method
      if (options.type === 'scholar') {
        return this.academicSearch(query, options);
      }

      const params = {
        q: query,
        api_key: this.apiKey,
        num: options.num || 5,
        tbm: options.type || 'nws',
        hl: options.lang || 'en',
        gl: options.country || 'us'
      };

      const response = await axios.get('https://serpapi.com/search', { params });
      
      // Format results based on search type
      if (params.tbm === 'nws') {
        return this.formatNewsResults(response.data);
      } else if (params.tbm === 'isch') {
        return this.formatImageResults(response.data);
      } else {
        return this.formatOrganicResults(response.data);
      }
    } catch (error) {
      console.error('SERP API Error:', error);
      return [];
    }
  }

  async academicSearch(query, options = {}) {
    try {
      const params = {
        q: query,
        api_key: this.apiKey,
        engine: 'google_scholar',
        num: options.num || 10,
        hl: options.lang || 'en',
        as_ylo: options.startYear || 2015,
        as_yhi: options.endYear || new Date().getFullYear(),
        scisbd: 1 // Only return articles with full text available
      };

      const response = await axios.get('https://serpapi.com/search', { params });
      return this.formatAcademicResults(response.data);
    } catch (error) {
      console.error('Academic search error:', error);
      return [];
    }
  }

  formatNewsResults(data) {
    return data.news_results?.map(result => ({
      type: 'news',
      title: result.title,
      url: result.link,
      source: result.source,
      date: result.date,
      snippet: result.snippet,
      thumbnail: result.thumbnail
    })) || [];
  }

  formatImageResults(data) {
    return data.images_results?.map(result => ({
      type: 'image',
      title: result.title,
      url: result.link,
      source: result.source,
      thumbnail: result.thumbnail
    })) || [];
  }

  formatOrganicResults(data) {
    return data.organic_results?.map(result => ({
      type: 'organic',
      title: result.title,
      url: result.link,
      source: result.source,
      snippet: result.snippet
    })) || [];
  }

  formatAcademicResults(data) {
    return data.organic_results?.map(result => ({
      type: 'academic',
      title: result.title,
      authors: result.publication_info?.authors?.map(a => a.name) || [],
      publication: result.publication_info?.summary || '',
      year: result.publication_info?.year || '',
      url: result.link,
      pdfUrl: result.resources?.find(r => r.file_format === 'PDF')?.link || '',
      citedBy: result.inline_links?.cited_by?.total || 0,
      snippet: result.snippet
    })) || [];
  }
}

module.exports = new SearchService();