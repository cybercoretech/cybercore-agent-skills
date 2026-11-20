# Libraries and Snippets

Use packages the project already has, or ask before installing. Install into a project virtual environment, not system-wide.

Never name your own script after the library (`docx.py`, `pptx.py`, `openpyxl.py`): Python then imports your file instead of the package and fails with a confusing import error.

| Format | Python package | Install name |
|---|---|---|
| Word | `docx` | `python-docx` |
| Excel | `openpyxl` | `openpyxl` |
| PowerPoint | `pptx` | `python-pptx` |
| PDF (read, merge, split) | `pypdf` | `pypdf` |
| PDF (text and tables) | `pdfplumber` | `pdfplumber` |

## Word: from a template, with styles

```python
from docx import Document

doc = Document("template.docx")          # or Document() for the default template
doc.add_heading("Quarterly report", level=1)
doc.add_paragraph("Revenue grew 12% on the previous quarter.", style="Normal")
doc.add_paragraph("North region", style="List Bullet")

table = doc.add_table(rows=1, cols=2)
table.style = "Table Grid"               # use a style that exists in the template
header = table.rows[0].cells
header[0].text, header[1].text = "Region", "Revenue"
for region, revenue in [("North", "1,200"), ("South", "950")]:
    cells = table.add_row().cells
    cells[0].text, cells[1].text = region, revenue

doc.core_properties.title = "Quarterly report"
doc.core_properties.author = "Finance team"   # the default template sets "python-docx"
doc.save("out/report.docx")              # never the template or original path
```

Replacing placeholders in an existing document: placeholder text can be split across several runs inside a paragraph. Check `paragraph.text` for the marker, then rebuild the runs, and search the saved output for leftover markers.

## Excel: keep formulas

```python
from openpyxl import Workbook, load_workbook

wb = Workbook()
ws = wb.active
ws.title = "Budget"
ws.append(["Item", "Cost"])
ws.append(["Hosting", 120])
ws.append(["Domains", 30])
ws["A4"], ws["B4"] = "Total", "=SUM(B2:B3)"   # a formula, stored as text starting with "="
ws["B2"].number_format = ws["B3"].number_format = ws["B4"].number_format = "#,##0.00"
ws.freeze_panes = "A2"
wb.save("out/budget.xlsx")
```

Reading versus editing:

- `load_workbook(path)` loads formulas; edit and save with this.
- `load_workbook(path, data_only=True)` loads the values cached by the last application that calculated the file. Use it only for reading. **Saving a workbook opened with `data_only=True` replaces formulas with values.**
- openpyxl does not calculate formulas. A file written by openpyxl has no cached values until Excel or LibreOffice recalculates it, so `data_only=True` returns `None` for those cells.

Recalculate headlessly by converting through LibreOffice (writes a recalculated copy):

```sh
soffice --headless --calc --convert-to xlsx --outdir out/recalculated out/budget.xlsx
```

Then read `out/recalculated/budget.xlsx` with `data_only=True` and check for error strings such as `#REF!` or `#DIV/0!`.

## PowerPoint: use layouts

```python
from pptx import Presentation

prs = Presentation("template.pptx")      # or Presentation()
title_layout = prs.slide_layouts[0]      # check layout names in your template
content_layout = prs.slide_layouts[1]

slide = prs.slides.add_slide(title_layout)
slide.shapes.title.text = "Q3 results"
slide.placeholders[1].text = "Prepared for the board"

slide = prs.slides.add_slide(content_layout)
slide.shapes.title.text = "Highlights"
body = slide.placeholders[1].text_frame
body.text = "Revenue up 12%"
body.add_paragraph().text = "Two new regions"

prs.save("out/deck.pptx")
```

List a template's layouts with `[(i, l.name) for i, l in enumerate(prs.slide_layouts)]` before choosing.

## PDF: read, merge, split

```python
from pypdf import PdfReader, PdfWriter

reader = PdfReader("in.pdf")
print(len(reader.pages), reader.metadata)

writer = PdfWriter()
for page in reader.pages[:3]:            # first three pages
    writer.add_page(page)
writer.write("out/first-three.pdf")
```

Tables with pdfplumber:

```python
import pdfplumber

with pdfplumber.open("in.pdf") as pdf:
    for page in pdf.pages:
        for table in page.extract_tables():
            print(table)                 # list of rows; check headers and merged cells by eye
```

If `page.extract_text()` returns nothing on pages that clearly contain text, the PDF is scanned; it needs OCR, which is a separate step to agree with the user.
