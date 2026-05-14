function importExcelData() {
  const fileInput = document.getElementById("excel-import");

  if (!fileInput.files.length) {
    showToast("Please select an Excel file.", "warning");
    return;
  }

  const file = fileInput.files[0];

  const reader = new FileReader();

  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);

    const workbook = XLSX.read(data, {
      type: "array",
    });

    const sheetName =
      workbook.SheetNames.find(
        (name) => name.trim().toUpperCase() !== "SHEET1",
      ) || workbook.SheetNames[0];

    console.log("Selected Sheet:", sheetName);
    console.log(workbook.SheetNames);

    const worksheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: "",
    });

    console.log(rows);

    processImportedRows(rows, sheetName);
  };

  reader.readAsArrayBuffer(file);
}

function processImportedRows(rows, sheetName) {
  let householdNumber = 0;

  const detectedPurok = String(sheetName || "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  // Create purok if missing
  if (
    !db.puroks.some((p) => String(p).trim().toUpperCase() === detectedPurok)
  ) {
    db.puroks.push(detectedPurok);

    saveDB();

    buildSidebar();

    rebuildPurokSelect();
  }

  // Find actual header row dynamically
  let headerRowIndex = rows.findIndex((row) =>
    row.some((cell) =>
      String(cell || "")
        .toUpperCase()
        .includes("LAST NAME"),
    ),
  );

  if (headerRowIndex === -1) {
    showToast("Unable to detect Excel headers.", "danger");
    return;
  }

  const headers = rows[headerRowIndex].map((h) =>
    String(h || "")
      .replace(/\u00A0/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase(),
  );

  console.log("Detected Headers:", headers);

  function getColIndex(possibleNames) {
    if (!Array.isArray(possibleNames)) {
      possibleNames = [possibleNames];
    }

    return headers.findIndex((h) =>
      possibleNames.some((name) => h.includes(name.toUpperCase())),
    );
  }

  // Data rows start AFTER header row
  rows.slice(headerRowIndex + 1).forEach((row) => {
    const lastName = String(row[getColIndex("LAST NAME")] || "").trim();

    const firstName = String(row[getColIndex("FIRST NAME")] || "").trim();

    if (!lastName && !firstName) {
      return;
    }

    // Skip totals/summaries
    const lnameUpper = lastName.toUpperCase();

    if (
      lnameUpper.includes("TOTAL") ||
      lnameUpper.includes("SUMMARY") ||
      lnameUpper.includes("AGE")
    ) {
      return;
    }

    // HEAD detection
    let role = "Member";

    const headValue = String(row[getColIndex(["HEAD", "HH HEAD"])] || "")
      .trim()
      .toUpperCase();

    if (headValue === "HEAD") {
      householdNumber++;

      role = "Head";
    }

    // Gender
    let gender = "";

    const rawGender = String(row[getColIndex(["SEX", "GENDER"])] || "")
      .trim()
      .toUpperCase();

    if (rawGender === "M") {
      gender = "Male";
    } else if (rawGender === "F") {
      gender = "Female";
    } else {
      gender = rawGender;
    }

    const employedIndex = getColIndex([
      "EMPLOYED",
      "EMPLOYMENT",
      "TYPE OF EMPLOYMENT",
      "WORK",
    ]);

    const employedCell = String(employedIndex >= 0 ? row[employedIndex] : "")
      .trim()
      .toUpperCase();
    const occupation = String(row[getColIndex("OCCUPATION")] || "").trim();

    const isEmployed =
      occupation !== "" ||
      employedCell.includes("PRIVATE") ||
      employedCell.includes("PUBLIC") ||
      employedCell.includes("SELF") ||
      employedCell.includes("EMPLOYED");

    const isUnemployed = !isEmployed || employedCell.includes("UNEMPLOYED");

    const resident = {
      id: genId(),

      lastName: lastName,

      firstName: firstName,

      middleName: String(row[getColIndex("MIDDLE NAME")] || "").trim(),

      ext: String(row[getColIndex(["EXT", "EXTENSION"])] || "").trim(),

      placeOfBirth: String(row[getColIndex("PLACE OF BIRTH")] || "").trim(),

      birthdate: formatExcelDate(
        row[getColIndex(["BIRTHDATE", "DATE OF BIRTH"])],
      ),

      age: Number(row[getColIndex("AGE")]) || 0,

      gender: gender,

      citizenship: "Filipino",

      civilStatus: String(row[getColIndex("CIVIL STATUS")] || "Single").trim(),

      occupation: String(row[getColIndex("OCCUPATION")] || "").trim(),

      purok: detectedPurok,

      household: householdNumber,

      role: role,

      employed: String(row[getColIndex("OCCUPATION")] || "").trim() !== "",

      unemployed: String(row[getColIndex("OCCUPATION")] || "").trim() === "",

      seniorCitizen: yesNo(row[getColIndex(["SENIOR"])]),

      ofw: yesNo(row[getColIndex(["OFW"])]),

      pwd: yesNo(row[getColIndex(["PWD", "PERSON WITH DISABILITY"])]),

      soloParent: yesNo(row[getColIndex(["SOLO"])]),

      osy: yesNo(row[getColIndex(["OSY", "OUT OF SCHOOL YOUTH"])]),

      osc: yesNo(row[getColIndex(["OSC", "OUT OF SCHOOL CHILDREN"])]),

      student: yesNo(row[getColIndex(["STUDENT"])]),

      ip: yesNo(row[getColIndex(["IP", "INDIGENOUS"])]),

      fourPs: yesNo(row[getColIndex(["4PS", "PANTAWID"])]),
    };

    db.residents.push(resident);
  });

  saveDB();

  buildSidebar();

  renderDashboard();

  showToast("Excel masterlist imported successfully.");
}

function yesNo(value) {
  const v = String(value || "")
    .trim()
    .toUpperCase();

  return (
    v === "YES" ||
    v === "Y" ||
    v === "TRUE" ||
    v === "1" ||
    v === "✓" ||
    v === "/" ||
    v === "CHECK" ||
    v === "CHECKED"
  );
}

function formatExcelDate(value) {
  if (!value) {
    return "";
  }

  if (String(value).includes("-")) {
    return value;
  }

  const excelDate = Number(value);

  if (!isNaN(excelDate)) {
    const date = new Date((excelDate - 25569) * 86400 * 1000);

    return date.toISOString().split("T")[0];
  }

  return "";
}
