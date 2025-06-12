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

Run the minimal test script (optional):

```bash
npm test
```

## Development

Run both the Express server and Next.js frontend in development mode. Set
`FRONTEND_URL` and `NEXT_PUBLIC_API_URL` to your local addresses. The backend
listens on port **5000** by default and automatically creates an `uploads`
folder for temporary files:

```bash
npm run dev
```

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:5000/api/parse](http://localhost:5000/api/parse)

## Production

Build the Next.js app and start the server. Set `FRONTEND_URL` to your deployed
frontend and `PORT` if needed:

```bash
npm run build
node server.js
```

## Usage

1. Open the frontend in your browser.
2. Select one or more PDF or image files and click **Upload**.
3. The parsed data for each file will be displayed as JSON. The structure of the JSON matches `deposit-masked.json` in this repository.

All processing is done locally using open‑source libraries with no external APIs.

## Environment Variables

- `FRONTEND_URL` – URL allowed by the backend for CORS (e.g. your deployed Vercel app)
- `NEXT_PUBLIC_API_URL` – base URL of the backend API used by the frontend

Set these in Vercel project settings for production and in a `.env.local` file for local development.

## Debugging Uploads

If the page shows "Failed to fetch" when uploading:

1. Open the browser developer tools and check the **Network** tab for the
   `/api/parse` request. Any CORS or network errors will be shown here.
2. Look at the terminal where the Express server is running for error messages
   (for example, file size limits or parsing failures).
3. Ensure the backend is running on **http://localhost:5000** and that the
   React frontend is running on port **3000**.
4. Verify that your uploaded files are valid PDFs or images and not too large
   for the default `multer` configuration.
5. On Vercel, check the "Functions" and "Logs" tabs for any server errors or CORS warnings. Increase the `bodyParser` limit or use a custom server if files are large.

