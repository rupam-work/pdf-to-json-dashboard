# PDF to JSON Dashboard

Upload any PDF financial statement (Deposit, Mutual Fund, Equity, ETF) and get an instant JSON output.  
All PDF parsing happens 100% in your browser—no backend required.

## How to use

1. Click “Choose File” and upload your PDF statement.
2. The extracted text will be mapped to a JSON structure and shown on the screen.
3. The logic is demo only—replace the `detectFITypeAndMapToJSON` function in `pages/index.js` with your real Account Aggregator schema mapping.

## Tech Stack

- Next.js 13
- React 18
- pdfjs-dist (browser-based PDF parsing)

## Privacy

Your data never leaves your browser—everything is processed client-side.
