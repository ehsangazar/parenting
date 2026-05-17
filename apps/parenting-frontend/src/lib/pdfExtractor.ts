/**
 * PDF text extraction utility using PDF.js
 */

import * as pdfjsLib from 'pdfjs-dist';

// Set the worker source to use the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

/**
 * Extract text content from a PDF file
 * @param file - PDF file to extract text from
 * @returns Promise resolving to extracted text
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    const textParts: string[] = [];
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Combine text items
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      if (pageText.trim()) {
        textParts.push(pageText);
      }
    }
    
    // Join all pages with double newlines
    const fullText = textParts.join('\n\n');
    
    if (!fullText.trim()) {
      throw new Error('No text content could be extracted from the PDF. The PDF might be image-based or empty.');
    }
    
    return fullText;
  } catch (error: any) {
    console.error('PDF extraction error:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

