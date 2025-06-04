# PDF to JSON Dashboard

This project lets you upload Indian FI statements (Deposit, Mutual Fund, Equities) as PDF files or screenshots and returns a JSON in AA schema.

## Quick Start

1. Clone the repo, `npm install`
2. Run locally: `npm run dev`
3. Deploy on Vercel: Just push, no config needed!

> **Note:**  
> The PDF.co API key is hardcoded in `/pages/api/parse.js`.  
> For security, switch to environment variables if open-sourcing.

## Structure

- `/mappers`: Modular mapping logic for each FI type
- `/pages/api/parse.js`: Backend API
- `/pages/index.js`: Upload UI

## Supported FI Types

- Deposit (Bank)
- Mutual Funds
- Equities

## Contribute

Feel free to fork and adapt for new FI types or mapping rules!
