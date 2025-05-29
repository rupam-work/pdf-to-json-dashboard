import mapDeposit from '../../mappers/depositMapper';
import mapMutualFunds from '../../mappers/mutualFundsMapper';
import mapEquities from '../../mappers/equitiesMapper';

export const config = { api: { bodyParser: false } };

// PDF.co API Key is hardcoded for zero-config Vercel deploy
const PDF_API_KEY = "rupam@onemoney.in_QnyHofU5rttFSoCCV7fJZGshsXCIBAH1lRBtl92hfdEVVqVtMRrZyLT8MDQ6RzUI";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const Busboy = (await import("busboy")).default;
  let fileBuffer = Buffer.alloc(0);

  try {
    await new Promise((resolve, reject) => {
      const bb = new Busboy({ headers: req.headers });
      bb.on("file", (_, file) => {
        file.on("data", (data) => { fileBuffer = Buffer.concat([fileBuffer, data]); });
      });
      bb.on("finish", resolve);
      bb.on("error", reject);
      req.pipe(bb);
    });
  } catch (e) {
    return res.status(400).json({ error: "File upload failed" });
  }
  if (!fileBuffer.length) return res.status(400).json({ error: "No PDF uploaded" });

  let text;
  try {
    const pdfResponse = await fetch("https://api.pdf.co/v1/pdf/convert/to/text", {
      method: "POST",
      headers: { "x-api-key": PDF_API_KEY, "Content-Type": "application/pdf" },
      body: fileBuffer,
    });
    const data = await pdfResponse.json();
    if (!data || data.error || !data.body) {
      return res.status(500).json({ error: "PDF parse failed: " + (data && data.message ? data.message : "Unknown error") });
    }
    text = data.body;
  } catch (err) {
    return res.status(500).json({ error: "API request failed: " + err.message });
  }

  let fiType = "DEPOSIT";
  if (/mutual\s*fund/i.test(text)) fiType = "MUTUAL_FUNDS";
  else if (/equities?|demat|depository/i.test(text)) fiType = "EQUITIES";

  let result;
  try {
    if (fiType === "DEPOSIT") result = mapDeposit(text);
    else if (fiType === "MUTUAL_FUNDS") result = mapMutualFunds(text);
    else if (fiType === "EQUITIES") result = mapEquities(text);
    else result = { error: "Unrecognized FI type or mapping not implemented." };
  } catch (err) {
    return res.status(500).json({ error: "Mapping logic failed: " + err.message });
  }

  return res.status(200).json(result);
}
