# PDF to JSON Dashboard

This project lets you upload Indian FI statements (Deposit, Mutual Fund, Equities) as PDF files or screenshots and returns a JSON in AA schema.

## Quick Start

1. Clone the repo, `npm install`
2. Copy `.env.example` to `.env` and add your `PDF_CO_API_KEY`
3. Run locally: `npm run dev`
4. Deploy on Vercel: Just push, no config needed!

Requires Node.js 18+.  Mapping rules live under `/mappers` and can be adjusted for your statement formats.

## Structure

- `/mappers`: Modular mapping logic for each FI type (customize here for your PDFs)
- `/pages/api/parse.js`: Backend API
- `/pages/index.js`: Upload UI

## Supported FI Types

- Deposit (Bank)
- Mutual Funds
- Equities

## Contribute

Feel free to fork and adapt for new FI types or mapping rules!  See [LICENSE](LICENSE) for terms.
