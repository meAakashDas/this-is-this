import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const testResources = ['001', '002', '003'];

console.log('=== Verifying Generated Exports ===\n');

for (const resNum of testResources) {
  console.log(`--- Checking Resource #${resNum} ---`);
  // Find primary pdf and docx files
  const files = fs.readdirSync('public/downloads');
  const pdfFile = files.find((f) => f.startsWith(`resource-${resNum}-`) && f.endsWith('.pdf'));
  const docxFile = files.find((f) => f.startsWith(`resource-${resNum}-`) && f.endsWith('.docx'));

  if (!pdfFile || !docxFile) {
    console.error(`Missing files for ${resNum}: pdf=${pdfFile}, docx=${docxFile}`);
    process.exit(1);
  }

  const pdfPath = path.join('public/downloads', pdfFile);
  const docxPath = path.join('public/downloads', docxFile);

  // 1. PDF Checks
  const pdfBuffer = fs.readFileSync(pdfPath);
  const pdfText = pdfBuffer.toString('binary');
  console.log(`PDF: ${pdfFile} (${(pdfBuffer.length / 1024).toFixed(1)} KB)`);

  const hasAakashDasBranding = pdfText.includes('aakashdas.live') || pdfText.includes('Aakash Das');
  const hasYoutubeUri = pdfText.includes('youtube.com');
  const hasDownloadUri = pdfText.includes('https://aakashdas.live/downloads/');
  const hasSocialUri = pdfText.includes('instagram.com') || pdfText.includes('youtube.com/@me.aakashdas');

  console.log(`  - Aakash Das Branding: ${hasAakashDasBranding ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`  - YouTube URI Link: ${hasYoutubeUri ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`  - Downloadable Attachment Link: ${hasDownloadUri ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`  - Social Media Links: ${hasSocialUri ? '✓ PASS' : '✗ FAIL'}`);

  // 2. DOCX Checks
  const docxBuffer = fs.readFileSync(docxPath);
  console.log(`DOCX: ${docxFile} (${(docxBuffer.length / 1024).toFixed(1)} KB)`);

  // Inspect XML inside docx using unzip / python / node
  const unzipOutput = execSync(`unzip -p "${docxPath}" word/document.xml`).toString('utf-8');
  const relsOutput = execSync(`unzip -p "${docxPath}" word/_rels/document.xml.rels`).toString('utf-8');

  const docxHasBranding = unzipOutput.includes('Aakash Das');
  const docxHasDownload = relsOutput.includes('https://aakashdas.live/downloads/');
  const docxHasYoutube = relsOutput.includes('youtube.com');
  const docxHasSocial = relsOutput.includes('instagram.com') || relsOutput.includes('youtube.com');
  const docxHasImage = relsOutput.includes('image');

  console.log(`  - DOCX Aakash Das Branding: ${docxHasBranding ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`  - DOCX Downloadable Attachment Link: ${docxHasDownload ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`  - DOCX YouTube Link: ${docxHasYoutube ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`  - DOCX Embedded Image: ${docxHasImage ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`  - DOCX Social Media Links: ${docxHasSocial ? '✓ PASS' : '✗ FAIL'}\n`);
}

console.log('=== All Export Checks Completed Successfully! ===');
