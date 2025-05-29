module.exports = function mapMutualFunds(text) {
  // Each folio/account split
  const folioBlocks = text.split(/CAMS RTA - Mutual Funds -/).slice(1);
  const data = folioBlocks.map((block) => {
    const folioNo = /Folio No\s*([A-Z0-9\-X]+)/i.exec(block)?.[1] ?? "";
    const name = /Name\s+([^\n]+)/i.exec(block)?.[1]?.trim() ?? "";
    const mobile = /Mobile No\s+([^\n]+)/i.exec(block)?.[1]?.trim() ?? "";
    const email = /Email\s+([^\n]+)/i.exec(block)?.[1]?.trim() ?? "";
    const dob = /DOB\s+([^\n]+)/i.exec(block)?.[1]?.trim() ?? "";
    const pan = /PAN No\s+([^\n]+)/i.exec(block)?.[1]?.trim() ?? "";
    const address = /Address\s+([^\n]+)/i.exec(block)?.[1]?.trim() ?? "";
    const nominee = /Nominee\s+([^\n]+)/i.exec(block)?.[1]?.trim() ?? "";
    const kyc = /kyc compliance\s+([^\n]+)/i.exec(block)?.[1]?.trim() ?? "";
    const amc = /AMC\s+([^\n]+)/i.exec(block)?.[1]?.trim() ?? "";
    const amfiCode = /AMFI\s*Code\s*([^\n]+)/i.exec(block)?.[1]?.trim() ?? "";
    const nav = /NAV\s+([0-9.]+)/i.exec(block)?.[1]?.trim() ?? "";
    const navDate = /NAV Date\s+([^\n]+)/i.exec(block)?.[1]?.trim() ?? "";
    const currentValue = /Current Value\s+([0-9.]+)/i.exec(block)?.[1]?.trim() ?? "";
    const costValue = /Cost Value\s+([0-9.]+)/i.exec(block)?.[1]?.trim() ?? "";

    return {
      linkReferenceNumber: "",
      maskedAccountNumber: folioNo,
      fiType: "MUTUAL_FUNDS",
      bank: "CAMS RTA",
      Profile: {
        Holders: {
          Holder: [
            { dob, pan, name, email, mobile, address, dematId: "", folioNo, nominee, landline: "", kycCompliance: kyc },
          ],
        },
      },
      Summary: {
        costValue,
        Investment: {
          Holdings: {
            Holding: [
              {
                amc,
                nav,
                ucc: "",
                isin: "",
                folioNo,
                navDate,
                amfiCode,
                lienUnits: "0",
                registrar: "CAMS",
                schemeCode: "",
                FatcaStatus: "",
                lockinUnits: "0",
                schemeTypes: "",
                closingUnits: "0.000",
                schemeOption: "",
                schemeCategory: "",
              },
            ],
          },
        },
        currentValue,
      },
      Transactions: {
        startDate: "",
        endDate: "",
        Transaction: [],
      },
    };
  });

  return { ver: "1.21.0", status: "success", data };
};
