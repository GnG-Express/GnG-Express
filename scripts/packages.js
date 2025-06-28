const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzvbwoZ-VRj-I-3WgO2VNMzF2i4DXhdjA7nLp0Cp1LaCLRKqsMwFQ4kiT7L_4NuwVOVCg/exec";

// Fallback packages data
const fallbackPackages = [
  { Package: "1", Price: "220", Stock: "In Stock" },
  { Package: "2", Price: "440", Stock: "In Stock" },
  { Package: "5", Price: "1100", Stock: "In Stock" },
  { Package: "10", Price: "2200", Stock: "In Stock" },
  { Package: "20", Price: "4400", Stock: "In Stock" },
  { Package: "50", Price: "11000", Stock: "In Stock" }
];

// Fetch packages from Google Sheets, fallback to hardcoded if needed
async function fetchPackagesForModal() {
  try {
    const res = await fetch(`${GOOGLE_SCRIPT_URL}?type=getAll`);
    const data = await res.json();
    let pkgs = [];
    if (Array.isArray(data.packages)) {
      if (data.packages.length > 0 && typeof data.packages[0] === 'object' && !Array.isArray(data.packages[0])) {
        pkgs = data.packages.filter(pkg => pkg.Package && String(pkg.Package).trim() !== "");
      } else if (Array.isArray(data.packages[0])) {
        const headers = data.packages[0];
        pkgs = data.packages.slice(1).map(row => {
          const obj = {};
          headers.forEach((h, i) => obj[h] = row[i]);
          return obj;
        }).filter(pkg => pkg.Package && String(pkg.Package).trim() !== "");
      }
    }
    if (!pkgs.length) pkgs = [...fallbackPackages];
    return pkgs;
  } catch (e) {
    return [...fallbackPackages];
  }
}