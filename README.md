# AI Text Summarizer

A Chrome extension that summarizes web pages and PDF documents using Chrome's built-in Summarizer API.

## Inspiration

When I did Jigsaw 2025 Kaggle Challenge last 2 weeks, I had to read through some elementary paper of NLP to have some foundational knowledge to train one model using BERT. And I realize it would be quicker to know what paper might benefit me if I have a summarizer right in my pocket to use.

## What it does

User clicks Extract → Detect content type → Extract text → User clicks Summarize → Tier decision → Process → Display summary

The extension uses a three-tier approach:

- **Tier 1**: Direct summarization for short documents that fit within the API quota
- **Tier 2**: Smart section extraction for academic papers (Abstract, Introduction, Results, Conclusion)
- **Tier 3**: Chunking method for long documents that exceed the quota

## How we built it

Vanilla HTML and CSS, with a popup.js and a background.js to extract the texts, do some background works, then make API calls.

### APIs Used

- Chrome Summarizer API (built-in AI)
- Chrome Scripting API (for content extraction)
- Chrome Tabs API (for tab detection and management)
- PDF.js (Mozilla library for PDF parsing)

## Challenges we ran into

Initially, you could extract text from regular web pages easily using document.body.innerText. But then you wanted to handle PDFs, there is no accessible DOM. The solution involved fetching the PDF as binary data and parsing it with PDF.js.

Then the tool crash when I try to summarize the cat's Wikipedia page, it is too long. Therefore I come up with the chunking method, that I will splice the texts into smaller chunks, and make one API call for each chunk.

But the chunk method is a bit overwhelming when dealing with the academic paper, you would see that academic papers fall between 10-20 pages. So I build a function to output a confidence score out of 5, and if one file is >= 3, it is a academic paper, I would only make API calls upon the Abstract, Introduction, Result, and Summary.

## Installation and Testing

### Prerequisites

- Chrome Canary or Chrome Dev (version 127 or higher)
- Enable the following flags in chrome://flags:
  - Summarization API for Gemini Nano: Enabled
  - Prompt API for Gemini Nano: Enabled
- Restart Chrome after enabling flags

### Installation Steps

1. Clone this repository:
   ```
   git clone https://github.com/matchalatte2609/ai-text-summarizer.git
   ```

2. Open Chrome and navigate to chrome://extensions

3. Enable "Developer mode" in the top right corner

4. Click "Load unpacked"

5. Select the extension directory from the cloned repository

6. The extension icon should appear in your toolbar

### How to Use

1. Navigate to any web page or PDF document you want to summarize

2. Click the extension icon to open the popup

3. Click "Extract Text" to pull content from the current page

4. Adjust summary settings if needed (type, length, format)

5. Click "Summarize" to generate the summary

6. The extension will automatically detect if the content is:
   - A short document (direct summarization)
   - An academic paper (extract key sections)
   - A long document (split into chunks)

### Testing Notes

The extension works best with:
- Wikipedia articles
- Research papers (PDF or web)
- News articles
- Blog posts

For PDF files, the extension can handle both online PDFs and locally opened files.

## What's next for AI Text Summarizer

Improving the conversion rate of how much to splice a long text, to optimize the number of API calls and the quality of output for the chunking method.

Next feature is to build a Prompt AI into this extension so you can ask questions to elaborate besides the summary generated.

## License

MIT License

Copyright (c) 2025

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
