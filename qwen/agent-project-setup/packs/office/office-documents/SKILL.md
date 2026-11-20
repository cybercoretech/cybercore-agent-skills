---
name: office-documents
description: Create, edit, convert and extract content from office documents (Word .docx, Excel .xlsx, PowerPoint .pptx and PDF) with scripts and local tools, while keeping originals safe and checking the result visually. Covers styles and templates instead of hand formatting, keeping spreadsheet formulas intact and recalculated, tables and charts, slide layouts, PDF text, table and form handling, conversions with LibreOffice or pandoc, metadata clean-up before sharing, and accessible structure. Use when asked to make a report, letter, spreadsheet, budget, slide deck or PDF; to fill, merge, split or convert documents; to pull text or tables out of them; or to batch-edit many files.
metadata:
  version: "1"
---

# Office Documents

You produce and change office documents that open cleanly, look right, and keep the content and formulas the user depends on. Generating a file is easy; making one that renders correctly, keeps its formulas, and does not destroy the original takes care.

## Scope

- Creating Word, Excel, PowerPoint and PDF files from scripts or templates
- Editing existing documents without breaking their structure
- Converting between formats and to PDF
- Extracting text, tables and form data
- Checking output by rendering it and looking at it
- Cleaning metadata before documents are shared

## Safety Rules (Non-Negotiable)

**STOP AND REPORT before any of these:**

- Overwriting or modifying an original document in place. Work on a copy and write output to a new file unless the user says otherwise.
- Enabling or running macros (`.docm`, `.xlsm`, `.pptm`, embedded scripts) from any document
- Uploading documents to online converters or third-party services; convert locally
- Removing tracked changes, comments or revision history from contracts, legal or regulated documents without explicit approval
- Filling in, signing or submitting legal, financial or government forms on someone's behalf as if they had approved the content
- Bypassing passwords, encryption or editing restrictions on documents
- Sharing documents that contain personal or confidential data outside the places the user named

## Workflow

1. **Clarify the output:** format, audience, page or slide size, branding or template to follow, and how it will be used (printed, emailed, edited further, read on a phone).
2. **Work on copies.** Keep the original untouched; write results to a new path.
3. **Use templates and styles.** Start from the organisation's template when there is one. Apply named styles (Heading 1, Normal, table styles, slide layouts) rather than hand-setting fonts and sizes on each element, so the document stays consistent and editable.
4. **Generate or edit with the right tool** (`references/libraries.md`): `python-docx` for Word, `openpyxl` for Excel, `python-pptx` for PowerPoint, `pypdf` or `pdfplumber` for PDF, LibreOffice or pandoc for conversions. Use what is already installed or declared by the project; ask before installing packages.
5. **Render and look.** Convert the output to PDF and then to images, and inspect them (`references/verification.md`). A document that was saved without errors can still have overflowing tables, missing fonts, or broken layouts.
6. **Check the content:** totals and formulas, every placeholder replaced, numbering and cross-references, dates and names.
7. **Clean before sharing:** remove author names, comments, hidden sheets or slides, and file paths that should not leave the organisation, when the user wants a clean copy.
8. **Report** the output path, what was created or changed, and what you checked.

## Format essentials

**Word (.docx)**
- Headings with heading styles, so the navigation pane and table of contents work
- Real lists and tables, not spaces and tabs for alignment
- Images with alternative text; page size and margins set for the target (A4 or Letter)

**Excel (.xlsx)**
- Keep formulas as formulas; never replace them with their current values unless asked
- Values computed by a script are not recalculated by `openpyxl`; recalculate in LibreOffice or Excel before trusting cached results (`references/libraries.md`)
- Check for error values (`#REF!`, `#DIV/0!`, `#NAME?`, `#VALUE!`) after changes
- Number formats for money, dates and percentages; freeze header rows; one table per sheet where possible

**PowerPoint (.pptx)**
- Build slides from the template's layouts and placeholders, not free-floating text boxes
- Keep text within placeholders; check for overflow in the render
- One idea per slide; charts and images with alternative text

**PDF**
- Extract text with `pdftotext` or `pdfplumber`; tables with `pdfplumber`; check scanned pages (no text layer) and say OCR is needed rather than guessing
- Merge, split and rotate with `pypdf` or `qpdf`
- Produce PDFs by converting a well-structured source document, so headings and reading order carry over

## Accessible documents

Use real headings, list and table structure, alternative text for images, sufficient contrast, readable font sizes, and a meaningful title in document properties. Exported PDFs should keep the structure (convert from a structured source rather than printing an image).

## Common failure modes

| Failure | Better |
|---|---|
| Saving over the user's original | New output file; original untouched |
| Hard-coding fonts on every paragraph | Named styles from the template |
| Loading a workbook with cached values only, then saving | Formulas lost; load normally to edit, use cached values only for reading |
| Trusting totals computed in a script that never recalculated | Recalculate, then check |
| "Saved successfully" without looking | Render to images and inspect |
| Converting with an online service | Local LibreOffice or pandoc |
| Placeholders like `{{name}}` left in the output | Search the output for leftover markers |
| Guessing text from a scanned PDF | Detect missing text layers; say OCR is required |

## Verification

- [ ] The original document is unchanged; output is a new file at a reported path
- [ ] The output opens and was rendered to images and inspected at full page
- [ ] Styles and template layouts were used; no leftover placeholders
- [ ] Spreadsheet formulas are intact, recalculated, and free of error values
- [ ] Text, totals, names and dates were checked against the source
- [ ] No macros were run; nothing was uploaded to external services
- [ ] Metadata, comments and hidden content were handled as the user wanted before sharing
