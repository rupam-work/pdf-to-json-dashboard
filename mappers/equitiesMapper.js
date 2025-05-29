const mapEquities = (text) => {
  const dematBlocks = text.split(/Central Depository Services Limited - Equities -/).slice(1);
  const data = dematBlocks.map((block) => {
    const maskedAccountNumber = block.match(/([X|\d]{12,})/)?.[1] ?? "";
    const name = /Name\s+([^\n]+)/i.exec(block)?.[1]?.trim() ?? "";
    const mobile = /Mobile No\s+([^\n]+)/i.exec(block)?.[1]?.trim() ?? "";
    const email = /Email\s+([^\n]+)/i.exec(block)?.[1]?.trim() ?? "";
    const dob = /DOB\s+([^\n]+)/i.exec(block)?.[1]?.trim() ?? "";
    const pan = /PAN No\s+([^\n]+)/i.exec(block)?.[1]?.trim() ?? "";
    const address = /Address\s+([^\n]+)/i.exec(block)?.[1]?.trim() ?? "";
    const nominee = /Nominee\s+([^\n]+)/i.exec(block)?.[1]?.trim() ?? "";
    const dematId = /Demat Id\s+([^\n]+)/i.exec(block)?.[1]?.trim() ?? "";
    const currentValue = /Current Value\s+([0-9.]+)/i.exec(block)?.[1]?.trim() ?? "";

    return {
      linkReferenceNumber: "",
      maskedAccountNumber,
      fiType: "EQUITIES",
      bank: "Central Depository Services Limited",
      Profile: {
        Holders: {
          Holder: [
            { dob, pan, name, email, mobile, address, dematId, nominee, landline: "" },
          ],
        },
      },
      Summary: {
        Investment: {
          Holdings: {
            type: "DEMAT",
            Holding: [],
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

export default mapEquities;
