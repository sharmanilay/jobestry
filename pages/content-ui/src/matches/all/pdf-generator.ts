/**
 * Cover Letter PDF Generator
 *
 * Generates a properly formatted PDF cover letter that can be downloaded
 * for file upload fields in job applications.
 */

import jsPDF from 'jspdf';

interface CoverLetterPDFOptions {
  content: string;
  applicantName?: string;
  applicantEmail?: string;
  applicantPhone?: string;
  applicantLocation?: string;
  jobTitle?: string;
  companyName?: string;
}

/**
 * Generate a formatted cover letter PDF and trigger download
 */
export const generateCoverLetterPDF = (options: CoverLetterPDFOptions): void => {
  const {
    content,
    applicantName = '',
    applicantEmail = '',
    applicantPhone = '',
    applicantLocation = '',
    jobTitle = 'Position',
    companyName = 'Company',
  } = options;

  // Create PDF document (Letter size: 8.5 x 11 inches)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  });

  // Page dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 72; // 1 inch margins
  const contentWidth = pageWidth - margin * 2;

  let yPosition = margin;

  // Header - Applicant info (right-aligned style)
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Applicant name (if available)
  if (applicantName) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(applicantName, margin, yPosition);
    yPosition += 18;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
  }

  // Contact info
  const contactParts: string[] = [];
  if (applicantEmail) contactParts.push(applicantEmail);
  if (applicantPhone) contactParts.push(applicantPhone);
  if (applicantLocation) contactParts.push(applicantLocation);

  if (contactParts.length > 0) {
    doc.text(contactParts.join(' | '), margin, yPosition);
    yPosition += 28;
  }

  // Date
  doc.text(today, margin, yPosition);
  yPosition += 32;

  // Greeting (if we can construct one)
  if (companyName && companyName !== 'Company') {
    doc.text(`Re: ${jobTitle} at ${companyName}`, margin, yPosition);
    yPosition += 24;
  }

  yPosition += 8;

  // Main content - split into paragraphs and wrap text
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  const paragraphs = content.split(/\n\n+/);
  const lineHeight = 16;

  paragraphs.forEach((paragraph, index) => {
    // Skip empty paragraphs
    if (!paragraph.trim()) return;

    // Wrap text to fit content width
    const lines = doc.splitTextToSize(paragraph.trim(), contentWidth);

    lines.forEach((line: string) => {
      // Check if we need a new page
      if (yPosition > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        yPosition = margin;
      }

      doc.text(line, margin, yPosition);
      yPosition += lineHeight;
    });

    // Add space between paragraphs
    if (index < paragraphs.length - 1) {
      yPosition += lineHeight * 0.5;
    }
  });

  // Closing signature
  yPosition += lineHeight;
  if (yPosition > doc.internal.pageSize.getHeight() - margin - 60) {
    doc.addPage();
    yPosition = margin;
  }

  doc.text('Sincerely,', margin, yPosition);
  yPosition += lineHeight * 2;

  if (applicantName) {
    doc.setFont('helvetica', 'bold');
    doc.text(applicantName, margin, yPosition);
  }

  // Generate filename
  const safeName = applicantName.replace(/[^a-zA-Z0-9]/g, '_') || 'Cover_Letter';
  const safeCompany = companyName.replace(/[^a-zA-Z0-9]/g, '_') || 'Company';
  const filename = `${safeName}_${safeCompany}_Cover_Letter.pdf`;

  // Download the PDF
  doc.save(filename);
};

export default generateCoverLetterPDF;
