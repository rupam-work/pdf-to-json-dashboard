# PDF/Image Text Extractor

This project provides a simple full‑stack application for extracting text from uploaded PDF or image files and mapping that text into a structured JSON format. It uses **Next.js** for the frontend and an **Express** server for the backend. PDFs are processed with `pdf-parse`; if no text is found, each page is converted to an image with `pdf-poppler` and OCR is performed using `tesseract.js`.

## Prerequisites

- Node.js 18+
- `poppler-utils` installed on your system (for `pdftoppm`). On Ubuntu you can run:
  ```bash
  sudo apt-get install poppler-utils
  ```

## Setup

```bash
npm install
```

## Development

Run both the Express server and Next.js frontend in development mode:

```bash
npm run dev
```

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:3001/api/upload](http://localhost:3001/api/upload)

## Production

Build the Next.js app and start the server:

```bash
npm run build
node server/index.js
```

## Usage

1. Open the frontend in your browser.
2. Select one or more PDF or image files and click **Upload**.
3. The parsed data for each file will be displayed as JSON. The structure of the JSON matches `deposit-masked.json` in this repository.

All processing is done locally using open‑source libraries with no external APIs.
