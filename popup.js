const textInput = document.getElementById('text-input');
const extractBtn = document.getElementById('extract-btn');
const summarizeBtn = document.getElementById('summarize-btn');
const summaryOutput = document.getElementById('summary-output');
const statusDiv = document.getElementById('status');
const summaryType = document.getElementById('summary-type');
const summaryLength = document.getElementById('summary-length');
const summaryFormat = document.getElementById('summary-format');

let summarizer = null;

function updateStatus(message, isError = false, showLoader = false) {
  statusDiv.textContent = showLoader ? `⏳ ${message}` : message;
  statusDiv.className = `status ${isError ? 'error' : 'success'}`;
  statusDiv.classList.remove('hidden');

  if (!showLoader) {
    setTimeout(() => hideStatus(), 3000);
  }
}

function hideStatus() {
  statusDiv.classList.add('hidden');
}


async function checkSummarizerAvailability() {
  try {
    const availability = await Summarizer.availability();
    console.log('Summarizer availability:', availability);
    return availability;
  } catch (error) {
    console.error('Error checking availability:', error);
    return 'no';
  }
}

function buildSummarizerConfig() {
  return {
    sharedContext: "A general summary to help a user decide if the text is worth reading",
    type: summaryType.value,
    length: summaryLength.value,
    format: summaryFormat.value,
    expectedInputLanguages: ["en-US"],
    outputLanguage: "en-US"
  };
}

async function initializeSummarizer(config) {
  console.log('Creating summarizer with config:', config);
  const instance = await Summarizer.create(config);
  console.log('Summarizer created successfully');
  return instance;
}

function cleanupSummarizer() {
  if (summarizer) {
    summarizer.destroy();
    summarizer = null;
  }
}



function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 10000)
    .join(' ');
}

async function extractWebPageText(tabId) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    function: () => {
      const unwanted = ['script', 'style', 'nav', 'footer', 'iframe', 'header'];
      unwanted.forEach(tag => {
        const elements = document.getElementsByTagName(tag);
        Array.from(elements).forEach(el => el.remove());
      });

      const main = document.querySelector('main, article, [role="main"], .content, #content');
      const textContent = main ? main.innerText : document.body.innerText;

      return textContent
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .slice(0, 10000)
        .join(' ');
    }
  });

  return results[0].result;
}

async function detectPdfTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab.url.toLowerCase();

  return url.endsWith('.pdf') ||
         url.includes('/pdf/') ||
         url.includes('.pdf?') ||
         tab.title.toLowerCase().includes('.pdf');
}

async function fetchPdfBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF: ${response.statusText}`);
  }
  return await response.arrayBuffer();
}

async function parsePdfText(arrayBuffer) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdf.worker.min.js');

  console.log('Starting PDF parsing...');
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  console.log('PDF loaded. Total pages:', pdf.numPages);

  let fullText = '';
  const maxPages = Math.min(pdf.numPages, 100);

  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
    console.log(`Page ${i} extracted, length: ${pageText.length}`);
  }

  console.log('Full text length before cleaning:', fullText.length);
  const cleaned = cleanText(fullText);
  console.log('Cleaned text length:', cleaned.length);
  console.log('First 200 chars:', cleaned.substring(0, 200));

  return cleaned;
}

async function extractPdfText(tabId) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isPdf = await detectPdfTab();

  if (!isPdf) {
    throw new Error('Current tab is not a PDF file');
  }

  const arrayBuffer = await fetchPdfBuffer(tab.url);
  return await parsePdfText(arrayBuffer);
}

async function detectAndExtract() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isPdf = await detectPdfTab();

  if (isPdf) {
    return await extractPdfText(tab.id);
  } else {
    return await extractWebPageText(tab.id);
  }
}

function checkInputQuota(summarizerInstance, text) {
  return summarizerInstance.measureInputUsage(text);
}

// academic paper detection - checks for common keywords
function detectAcademicPaper(text) {
  const lowerText = text.toLowerCase();
  const indicators = {
    hasAbstract: lowerText.includes('abstract'),
    hasIntroduction: lowerText.includes('introduction'),
    hasReferences: lowerText.includes('references') || lowerText.includes('bibliography'),
    hasConclusion: lowerText.includes('conclusion'),
    hasMethod: lowerText.includes('method') || lowerText.includes('experiment')
  };

  const score = Object.values(indicators).filter(Boolean).length;
  const isAcademic = score >= 3;

  console.log('Academic paper detection:', indicators, 'Score:', score, 'Is academic:', isAcademic);
  return isAcademic;
}

function extractAcademicSections(text) {
  const sections = [];

  const markers = [
    { name: 'abstract', pattern: /\bAbstract\b/i, maxWords: 500, priority: 1 },
    { name: 'introduction', pattern: /\b(\d+\.?\s*)?Introduction\b/i, maxWords: 2000, priority: 2 },
    { name: 'results', pattern: /\b(\d+\.?\s*)?(Experimental\s+Results|Results(?:\s+and\s+Discussion)?)\b/i, maxWords: 3000, priority: 3 },
    { name: 'conclusion', pattern: /\b(\d+\.?\s*)?Conclusion\b/i, maxWords: 2000, priority: 4 }
  ];

  const stopPattern = /\b(References|Bibliography|Appendix)/i;

  const found = [];
  for (const marker of markers) {
    const match = marker.pattern.exec(text);
    if (match) {
      found.push({
        ...marker,
        start: match.index,
        matchText: match[0]
      });
      console.log('Found section:', marker.name, 'at position:', match.index, 'text:', match[0]);
    }
  }

  const stopMatch = stopPattern.exec(text);
  const stopPos = stopMatch ? stopMatch.index : text.length;
  console.log('Stop position:', stopPos);

  found.sort((a, b) => a.start - b.start);

  for (let i = 0; i < found.length; i++) {
    const section = found[i];
    const nextStart = i < found.length - 1 ? found[i + 1].start : stopPos;

    const sectionText = text.substring(section.start, nextStart);
    const words = sectionText.split(/\s+/).slice(0, section.maxWords);
    const extractedText = words.join(' ');

    sections.push({
      name: section.name,
      text: extractedText,
      wordCount: words.length,
      priority: section.priority
    });
  }

  // fallback if no sections detected
  if (sections.length === 0) {
    console.log('No sections found. Using fallback extraction.');
    const allWords = text.split(/\s+/);
    const totalWords = allWords.length;

    const firstPart = allWords.slice(0, Math.floor(totalWords * 0.3)).join(' ');
    const lastPart = allWords.slice(Math.floor(totalWords * 0.8)).join(' ');

    return {
      text: firstPart + '\n\n' + lastPart,
      sections: [
        { name: 'beginning', text: firstPart, wordCount: firstPart.split(/\s+/).length, priority: 1 },
        { name: 'ending', text: lastPart, wordCount: lastPart.split(/\s+/).length, priority: 2 }
      ]
    };
  }

  const extractedText = sections
    .sort((a, b) => a.priority - b.priority)
    .map(s => s.text)
    .join('\n\n');

  console.log('Extracted sections:', sections.map(s => `${s.name} (${s.wordCount} words)`));
  return { text: extractedText, sections };
}

function chunkTextAtBoundaries(text, maxTokens) {
  const maxChars = Math.floor(maxTokens * 1.3); //TBD. but testing with cats wiki pedia 21000 chars ~ 16000 tokens, approx 1.3 rate
  const paragraphs = text.split(/\n\n+/);
  const chunks = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    if ((currentChunk + para).length > maxChars) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = para;
      } else {
        // paragraph too long, just split it into multiple chunks
        let remainingPara = para;
        while (remainingPara.length > 0) {
          chunks.push(remainingPara.substring(0, maxChars));
          remainingPara = remainingPara.substring(maxChars);
        }
        currentChunk = '';
        continue;
      }
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  console.log(`Split into ${chunks.length} chunks:`, chunks.map(c => c.length));
  return chunks;
}

async function summarizeChunk(chunkText, chunkIndex, totalChunks) {
  updateStatus(`Processing chunk ${chunkIndex + 1}/${totalChunks}...`, false, true);

  const stream = summarizer.summarizeStreaming(chunkText);
  let summary = '';

  for await (const chunk of stream) {
    summary += chunk;
  }

  console.log(`Chunk ${chunkIndex + 1} summary length:`, summary.length);
  return summary;
}

async function mergeSummaries(summaries) {
  updateStatus('Combining summaries...', false, true);

  const combinedText = summaries
    .map((s, i) => `Part ${i + 1}: ${s}`)
    .join('\n\n');

  console.log('Merging', summaries.length, 'summaries. Combined length:', combinedText.length);

  const usage = await checkInputQuota(summarizer, combinedText);
  if (usage > summarizer.inputQuota) {
    // too big to merge, just concat them
    return summaries.join('\n\n---\n\n');
  }

  const stream = summarizer.summarizeStreaming(combinedText);
  let finalSummary = '';

  for await (const chunk of stream) {
    finalSummary += chunk;
    summaryOutput.textContent = finalSummary;
  }

  return finalSummary;
}

async function generateSummaryStream(text) {
  const availability = await checkSummarizerAvailability();

  if (availability === 'no') {
    throw new Error('Summarizer API is not available. Please ensure:\n1. You are using Chrome Canary/Dev (v127+)\n2. Flags are enabled at chrome://flags\n3. Restart Chrome after enabling flags');
  }

  if (availability === 'after-download') {
    updateStatus('Model download required. Please wait...', false, true);
  }

  updateStatus('Creating summarizer...', false, true);
  cleanupSummarizer();
  const config = buildSummarizerConfig();
  summarizer = await initializeSummarizer(config);

  const inputQuota = summarizer.inputQuota;
  console.log('Input quota available:', inputQuota);

  let textToSummarize = text;
  const usage = await checkInputQuota(summarizer, text);
  console.log('Text would use:', usage, 'tokens. Available quota:', inputQuota);

  // TIER 1: fits in quota -> direct summarization
  if (usage > inputQuota) {
    const percentOver = Math.round(((usage - inputQuota) / inputQuota) * 100);
    console.log(`Document exceeds quota by ${percentOver}%`);

    const isAcademic = detectAcademicPaper(text);

    // TIER 2: academic paper -> extract key sections
    if (isAcademic) {
      updateStatus('Detected research paper. Extracting key sections...', false, true);
      const extraction = extractAcademicSections(text);

      if (extraction.text && extraction.sections.length > 0) {
        const extractedUsage = await checkInputQuota(summarizer, extraction.text);
        console.log('Extracted text usage:', extractedUsage, 'tokens');

        if (extractedUsage <= inputQuota) {
          textToSummarize = extraction.text;
          updateStatus('Generating summary from key sections...', false, true);
        } else {
          // still too big, chunk it
          updateStatus(`Sections still exceed quota. Processing in chunks...`, false, true);
          const chunks = chunkTextAtBoundaries(extraction.text, inputQuota);
          return await processChunks(chunks);
        }
      } else {
        updateStatus('Section extraction failed. Processing in chunks...', false, true);
        const chunks = chunkTextAtBoundaries(text, inputQuota);
        return await processChunks(chunks);
      }
    } else {
      // TIER 3: not academic or too big -> chunk it
      updateStatus(`Document is ${percentOver}% over quota. Processing in chunks...`, false, true);
      const chunks = chunkTextAtBoundaries(text, inputQuota);
      return await processChunks(chunks);
    }
  } else {
    updateStatus('Generating summary...', false, true);
  }

  summaryOutput.textContent = '';

  const stream = summarizer.summarizeStreaming(textToSummarize);
  let summary = '';

  for await (const chunk of stream) {
    summary += chunk;
    summaryOutput.textContent = summary;
  }

  console.log('Stream complete');
  updateStatus('Summary complete!', false);
  return summary;
}

async function processChunks(chunks) {
  const chunkSummaries = [];

  for (let i = 0; i < chunks.length; i++) {
    const summary = await summarizeChunk(chunks[i], i, chunks.length);
    chunkSummaries.push(summary);
  }

  console.log('All chunks summarized. Merging...');
  const finalSummary = await mergeSummaries(chunkSummaries);

  updateStatus('Summary complete!', false);
  return finalSummary;
}

async function handleExtractClick() {
  try {
    const isPdf = await detectPdfTab();
    console.log('Is PDF:', isPdf);

    updateStatus(
      isPdf ? 'Extracting text from PDF...' : 'Extracting text from page...',
      false,
      true
    );

    const text = await detectAndExtract();
    console.log('Extracted text length:', text ? text.length : 0);
    console.log('First 100 chars:', text ? text.substring(0, 100) : 'NO TEXT');

    textInput.value = text;
    console.log('Textarea value set to:', textInput.value.substring(0, 100));

    updateStatus('Text extracted successfully!', false);
  } catch (error) {
    console.error('Extract error:', error);
    updateStatus(`Error: ${error.message}`, true);
  }
}

async function handleSummarizeClick() {
  const text = textInput.value.trim();

  if (!text) {
    updateStatus('Please enter some text to summarize', true);
    return;
  }

  try {
    await generateSummaryStream(text);
  } catch (error) {
    updateStatus(`Error: ${error.message}`, true);
    summaryOutput.textContent = 'Failed to generate summary. Please try again.';
  }
}

function handleSettingsChange() {
  cleanupSummarizer();
}

function cleanup() {
  cleanupSummarizer();
}

extractBtn.addEventListener('click', handleExtractClick);
summarizeBtn.addEventListener('click', handleSummarizeClick);

[summaryType, summaryLength, summaryFormat].forEach(element => {
  element.addEventListener('change', handleSettingsChange);
});

window.addEventListener('beforeunload', cleanup);

updateStatus('Ready to summarize!', false);
