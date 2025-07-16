const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const SearchService = require('./searchService');

// Initialize Gemini
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

// Add the new function here
async function getWebSearchResults(query, searchType = 'web') {
    try {
        const baseParams = {
            q: query,
            api_key: process.env.SERPAPI_KEY,
            num: 10, // Increased from 5 to 10
            hl: 'en',
            gl: 'us'
        };

        // Add specific parameters based on search type
        let searchParams = { ...baseParams };
        if (searchType === 'scholar') {
            searchParams = {
                ...baseParams,
                engine: 'google_scholar',
                as_ylo: 2020,
                num: 10, // Increased to 10 results
                scisbd: 1
            };
        }

        const searchRes = await axios.get('https://serpapi.com/search', {
            params: searchParams,
            timeout: 10000 // Increased timeout for more results
        });

        // Return more results in the fallback case too
        if (!searchRes.data.organic_results) {
            const fallbackRes = await axios.get('https://serpapi.com/search', {
                params: {
                    ...baseParams,
                    engine: 'google',
                    as_qdr: 'y',
                    num: 10 // Increased to 10 results
                }
            });
            return fallbackRes.data.organic_results?.map(result => ({
                title: result.title,
                link: result.link,
                source: result.source || '',
                date: '',
                snippet: result.snippet || ''
            })) || [];
        }

        return searchRes.data.organic_results.slice(0, 10).map(result => ({
            title: result.title,
            link: result.link,
            source: result.source || '',
            date: result.date || '',
            snippet: result.snippet || ''
        }));
    } catch (err) {
        console.error('Search error:', err.message);
        return [];
    }
}

const AI_MODELS = {
    DEEPSEEK: 'deepseek',
    GEMINI: 'gemini',
    GPT3: 'gpt-3',
    GPT35: 'gpt-3.5',
    GPT4: 'gpt-4',
    CLAUDE_SONNET: 'claude-sonnet',
    CLAUDE_HEROKU: 'claude-heroku',
    GROK: 'grok',
    GROK35: 'grok-3.5',
    HUGGINGFACE: 'huggingface',
    TOGETHER_AI: 'together-ai',
    OLLAMA: 'ollama',
    DEEPINFRA: 'deepinfra',
    PERPLEXITY: 'perplexity',
    CLAUDE_01: 'claude-01'
};

const getResponse = async (message, model, mood, includeWebSearch = false) => {
    let response = '';
    const moodPrompt = mood ? `Respond in a ${mood} tone: ` : '';
    
    try {
        let searchResults = [];
        if (includeWebSearch) {
            searchResults = await SearchService.webSearch(message, {
                num: 3,
                type: 'nws'
            });
        }

        switch(model) {
            case AI_MODELS.GEMINI:
                if (genAI) {
                    const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
                    
                    let prompt = moodPrompt + message;
                    if (includeWebSearch) {
                        const searchResults = await getWebSearchResults(message);
                        if (searchResults.length > 0) {
                            prompt += "\n\nHere are some relevant web search results to consider:\n";
                            searchResults.forEach((result, index) => {
                                prompt += `${index + 1}. ${result.title} (${result.source})\n`;
                                prompt += `   URL: ${result.link}\n`;
                                prompt += `   Summary: ${result.snippet}\n\n`;
                            });
                            prompt += "Please use this information to provide an informed response and include relevant sources.";
                        }
                    }
                    
                    const geminiResult = await geminiModel.generateContent(prompt);
                    response = geminiResult.response.text();
                    
                    if (includeWebSearch && searchResults?.length > 0) {
                        response += "\n\n**References:**\n";
                        searchResults.forEach(result => {
                            response += `- [${result.title}](${result.link}) (${result.source})\n`;
                        });
                    }
                } else {
                    const prompt = {
                        contents: [{
                            parts: [{ text: moodPrompt + message }]
                        }]
                    };
                    
                    const geminiRes = await axios.post(
                        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent',
                        prompt,
                        {
                            params: { key: process.env.GEMINI_API_KEY },
                            headers: { 'Content-Type': 'application/json' }
                        }
                    );
                    response = geminiRes.data.candidates[0].content.parts[0].text;
                }
                break;

            case AI_MODELS.DEEPSEEK:
                const deepseekRes = await axios.post('https://api.deepseek.ai/v1/chat/completions', {
                    model: "deepseek-chat",
                    messages: [{
                        role: "user",
                        content: moodPrompt + message
                    }],
                    max_tokens: 500
                }, {
                    headers: { 
                        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                });
                response = deepseekRes.data.choices[0].message.content;
                break;
                
            case AI_MODELS.HUGGINGFACE:
                const huggingfaceRes = await axios.post('https://api-inference.huggingface.co/models/gpt2', {
                    inputs: moodPrompt + message,
                    parameters: {
                        max_length: 100,
                        temperature: 0.7
                    }
                }, {
                    headers: { 
                        'Authorization': `Bearer ${process.env.HF_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                });
                response = huggingfaceRes.data[0].generated_text;
                break;

            case AI_MODELS.GPT35:
            case AI_MODELS.GPT4:
                const openaiRes = await axios.post('https://api.openai.com/v1/chat/completions', {
                    model: model === AI_MODELS.GPT35 ? "gpt-3.5-turbo" : "gpt-4",
                    messages: [{
                        role: "user",
                        content: moodPrompt + message
                    }],
                    max_tokens: 1000
                }, {
                    headers: { 
                        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                });
                response = openaiRes.data.choices[0].message.content;
                break;

            case AI_MODELS.CLAUDE_SONNET:
            case AI_MODELS.CLAUDE_HEROKU:
            case AI_MODELS.CLAUDE_01:
                const claudeRes = await axios.post('https://api.anthropic.com/v1/messages', {
                    model: model === AI_MODELS.CLAUDE_SONNET ? "claude-3-sonnet-20240229" : 
                           model === AI_MODELS.CLAUDE_HEROKU ? "claude-3-heroku-20240229" : "claude-2.1",
                    messages: [{
                        role: "user",
                        content: moodPrompt + message
                    }],
                    max_tokens: 1000
                }, {
                    headers: { 
                        'x-api-key': process.env.CLAUDE_API_KEY,
                        'Content-Type': 'application/json',
                        'anthropic-version': '2023-06-01'
                    }
                });
                response = claudeRes.data.content[0].text;
                break;

            case AI_MODELS.PERPLEXITY:
                const perplexityRes = await axios.post('https://api.perplexity.ai/chat/completions', {
                    model: "llama-3-sonar-large-32k-online",
                    messages: [{
                        role: "user",
                        content: moodPrompt + message
                    }],
                    max_tokens: 1000
                }, {
                    headers: { 
                        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                });
                response = perplexityRes.data.choices[0].message.content;
                break;
                
            default:
                response = 'Model not supported.';
        }

        if (includeWebSearch && searchResults.length > 0) {
            response += "\n\n### References:\n";
            searchResults.forEach(result => {
                response += `- [${result.title}](${result.url}) (${result.source})\n`;
            });
        }
        
    } catch (err) {
        console.error('AI Service Error:', err.message);
        response = 'Error processing your request. Please try again.';
    }
    
    return response;
};

module.exports = { 
    getResponse,
    AI_MODELS
};