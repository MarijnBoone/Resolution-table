// Systems Configuration
const SYSTEMS = {
    "CoreTOM": {
        name: "CoreTOM",
        FOD: 6,         // Focal Object Distance [mm]
        SPOT_SIZE: 3,   // Spot size [um]
        SAFETY: 0.5,    // Safety range [mm]
        MIN_SDD: 370,
        MAX_SDD: 970,
        MIN_SOD: 7,
        MAX_SOD: 730,
        detectors: {
            "3K": {
                name: "3K (2856 x 2856)",
                pixelH: 2856,
                pixelV: 2856,
                sizeH: 428.4,
                sizeV: 428.4,
                pixelSize: 0.15,
                tilingFactor: 1.55 // Default tiling factor
            },
            "2K": {
                name: "2K (1920 x 1896)",
                pixelH: 1920,
                pixelV: 1896,
                sizeH: 288.0,
                sizeV: 284.4,
                pixelSize: 0.15,
                tilingFactor: 1.82
            },
            "1.5K": {
                name: "1.5K (1440 x 1416)",
                pixelH: 1440,
                pixelV: 1416,
                sizeH: 216.0,
                sizeV: 212.4,
                pixelSize: 0.15,
                tilingFactor: 1.98
            }
        }
    }
    // Future systems can be added here
};

// Current State
let currentSystemName = "CoreTOM";
let currentDetectorKey = "3K";
let currentBinning = 1;
let isTilingEnabled = false;
let myChart = null;

// DOM Elements
const elSystemSelect = document.getElementById('systemSelect');
const elDetectorMode = document.getElementById('detectorMode');
const elBinningMode = document.getElementById('binningMode');
const elTilingMode = document.getElementById('tilingMode');
const elSod = document.getElementById('sod');
const elSodVal = document.getElementById('sodValue');
const elSdd = document.getElementById('sdd');
const elSddVal = document.getElementById('sddValue');
const elSddMsg = document.getElementById('sddConstraintMsg');

const elDisplayMaxDia = document.getElementById('resMaxDiameter');
const elDisplayVoxel = document.getElementById('resVoxelSize');
const elDisplayFOV = document.getElementById('resFOV');
const elDisplayMag = document.getElementById('resMag');
const elDisplayRawData = document.getElementById('resRawData');

const elTableMin = document.getElementById('tableMinSOD');
const elTableMax = document.getElementById('tableMaxSOD');
const elTableStep = document.getElementById('tableStepSOD');
const elBtnGenerate = document.getElementById('btnGenerate');
const elTableBody = document.querySelector('#resolutionTable tbody');

const elBtnViewTable = document.getElementById('btnViewTable');
const elBtnViewGraph = document.getElementById('btnViewGraph');
const elBtnExportCSV = document.getElementById('btnExportCSV');
const elTableView = document.getElementById('tableView');
const elGraphView = document.getElementById('graphView');

// Settings Modal Elements
const modal = document.getElementById("settingsModal");
const btnSettings = document.getElementById("btnSettings");
const spanClose = document.getElementsByClassName("close")[0];
const elBtnSaveSettings = document.getElementById("btnSaveSettings");

const inpSetFOD = document.getElementById("setFOD");
const inpSetSpot = document.getElementById("setSpotSize");
const inpSetSafety = document.getElementById("setSafety");
const inpSetMinSDD = document.getElementById("setMinSDD");
const inpSetMaxSDD = document.getElementById("setMaxSDD");
const inpSetMinSOD = document.getElementById("setMinSOD");
const inpSetMaxSOD = document.getElementById("setMaxSOD");
const elDetectorSettingsContainer = document.getElementById("detectorSettingsContainer");

// Initialization
function init() {
    console.log("Initializing App...");
    populateSystemSelect();
    updateDetectorOptions(); // triggers updateCalculations via chain? No, we call manually
    setupEventListeners();

    // Set Initial Slider Values based on default system
    const sys = SYSTEMS[currentSystemName];
    elSod.min = sys.MIN_SOD;
    elSod.max = sys.MAX_SOD;
    elSod.value = 100;

    elSdd.min = sys.MIN_SDD;
    elSdd.max = sys.MAX_SDD;
    elSdd.value = sys.MAX_SDD;

    updateUI();
}

function populateSystemSelect() {
    elSystemSelect.innerHTML = '';
    Object.keys(SYSTEMS).forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = SYSTEMS[key].name;
        elSystemSelect.appendChild(option);
    });
    elSystemSelect.value = currentSystemName;
}

function updateDetectorOptions() {
    elDetectorMode.innerHTML = '';
    const detectors = SYSTEMS[currentSystemName].detectors;
    Object.keys(detectors).forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = detectors[key].name;
        elDetectorMode.appendChild(option);
    });
    // Restore selection if possible, else pick first
    if (detectors[currentDetectorKey]) {
        elDetectorMode.value = currentDetectorKey;
    } else {
        currentDetectorKey = Object.keys(detectors)[0];
        elDetectorMode.value = currentDetectorKey;
    }
}

function setupEventListeners() {
    elSystemSelect.addEventListener('change', (e) => {
        currentSystemName = e.target.value;
        updateDetectorOptions();
        updateSystemBounds();
        updateUI();
    });

    elDetectorMode.addEventListener('change', (e) => {
        currentDetectorKey = e.target.value;
        updateUI();
    });

    elBinningMode.addEventListener('change', (e) => {
        currentBinning = parseInt(e.target.value);
        updateUI();
    });

    elTilingMode.addEventListener('change', (e) => {
        isTilingEnabled = e.target.checked;
        updateUI();
    });

    elSod.addEventListener('input', (e) => {
        elSodVal.textContent = e.target.value;
        updateUI();
    });

    elSdd.addEventListener('input', (e) => {
        elSddVal.textContent = e.target.value;
        updateUI();
    });

    elBtnGenerate.addEventListener('click', generateTable);

    // Modal Events
    btnSettings.onclick = openSettings;
    spanClose.onclick = () => modal.style.display = "none";
    window.onclick = (event) => {
        if (event.target == modal) modal.style.display = "none";
    }
    elBtnSaveSettings.onclick = saveSettings;

    elBtnViewTable.addEventListener('click', () => switchView('table'));
    elBtnViewGraph.addEventListener('click', () => switchView('graph'));
    elBtnExportCSV.addEventListener('click', exportCSV);
}

function updateSystemBounds() {
    const sys = SYSTEMS[currentSystemName];
    elSod.min = sys.MIN_SOD;
    elSod.max = sys.MAX_SOD;
    elSdd.min = sys.MIN_SDD;
    elSdd.max = sys.MAX_SDD;
    // Ensure values are within new bounds
    if (parseFloat(elSod.value) < sys.MIN_SOD) elSod.value = sys.MIN_SOD;
    if (parseFloat(elSod.value) > sys.MAX_SOD) elSod.value = sys.MAX_SOD;
    if (parseFloat(elSdd.value) < sys.MIN_SDD) elSdd.value = sys.MIN_SDD;
    if (parseFloat(elSdd.value) > sys.MAX_SDD) elSdd.value = sys.MAX_SDD;

    // Update defaults for table gen?
    elTableMin.value = sys.MIN_SOD;
    elTableMax.value = Math.min(300, sys.MAX_SOD);
}

function openSettings() {
    const sys = SYSTEMS[currentSystemName];
    inpSetFOD.value = sys.FOD;
    inpSetSpot.value = sys.SPOT_SIZE;
    inpSetSafety.value = sys.SAFETY;
    inpSetMinSDD.value = sys.MIN_SDD;
    inpSetMaxSDD.value = sys.MAX_SDD;
    inpSetMinSOD.value = sys.MIN_SOD;
    inpSetMaxSOD.value = sys.MAX_SOD;

    // Populate Dynamic Detector Settings
    elDetectorSettingsContainer.innerHTML = '';
    Object.keys(sys.detectors).forEach(key => {
        const det = sys.detectors[key];
        const div = document.createElement('div');
        div.className = 'form-row';
        div.innerHTML = `
            <div class="form-group half">
                <label>${det.name} - Size H (mm)</label>
                <input type="number" step="0.1" class="inp-det-size" data-key="${key}" value="${det.sizeH}">
            </div>
            <div class="form-group half">
                <label>${det.name} - Tiling Factor</label>
                <input type="number" step="0.01" class="inp-det-tile" data-key="${key}" value="${det.tilingFactor || 1}">
            </div>
        `;
        elDetectorSettingsContainer.appendChild(div);
    });

    modal.style.display = "block";
}

function saveSettings() {
    const sys = SYSTEMS[currentSystemName];
    sys.FOD = parseFloat(inpSetFOD.value);
    sys.SPOT_SIZE = parseFloat(inpSetSpot.value);
    sys.SAFETY = parseFloat(inpSetSafety.value);
    sys.MIN_SDD = parseFloat(inpSetMinSDD.value);
    sys.MAX_SDD = parseFloat(inpSetMaxSDD.value);
    sys.MIN_SOD = parseFloat(inpSetMinSOD.value);
    sys.MAX_SOD = parseFloat(inpSetMaxSOD.value);

    // Save Dynamic Detector Settings
    const sizeInputs = elDetectorSettingsContainer.querySelectorAll('.inp-det-size');
    const tileInputs = elDetectorSettingsContainer.querySelectorAll('.inp-det-tile');

    sizeInputs.forEach(inp => {
        const key = inp.dataset.key;
        if (sys.detectors[key]) {
            sys.detectors[key].sizeH = parseFloat(inp.value);
            sys.detectors[key].sizeV = parseFloat(inp.value); // Assuming square for now or maintain aspect? User request only mentioned "size" implicitly. Let's assume square or user edits H.
            // Actually user said "Size for each detector mode", let's update H and V same or just H?
            // "The with of the dector horizontally willt therefore change..."
            // Let's stick to sizeH and sizeV being same for now as they were in config.
            sys.detectors[key].sizeV = parseFloat(inp.value);
        }
    });

    tileInputs.forEach(inp => {
        const key = inp.dataset.key;
        if (sys.detectors[key]) {
            sys.detectors[key].tilingFactor = parseFloat(inp.value);
        }
    });

    modal.style.display = "none";
    updateSystemBounds();
    updateUI();
}

/**
 * Core Calculation Logic
 */
function calculateMetrics(sod, sdd, systemName, detKey, binning) {
    const sys = SYSTEMS[systemName];
    const det = sys.detectors[detKey];

    // Effective Pixel Size based on Binning
    // Bin 1: 0.15, Bin 2: 0.3, Bin 3: 0.45
    const effPixelSize = det.pixelSize * binning;

    // Max Diameter = 2*(SOD-FOD) - 2*safety constant
    let maxDiameter = 2 * (sod - sys.FOD) - 2 * sys.SAFETY;
    if (maxDiameter < 0) maxDiameter = 0;

    // Magnification = SDD / SOD
    const mag = sod > 0 ? (sdd / sod) : 0;

    // Voxel Size (um) = 1000 * (pixel size / magnification)
    let voxelSize = 0;
    if (mag > 0) {
        voxelSize = 1000 * (effPixelSize / mag);
    }

    // FOV (mm) = 2 * SOD * sin(atan((Detector Size H / 2) / SDD))
    // Note: Detector Size doesn't change with binning (physical size is same)
    // FOV (mm) = 2 * SOD * sin(atan((Detector Size H / 2) / SDD))
    // If Tiling Enabled: Detector Size H * Tiling Factor
    let effectiveSizeH = det.sizeH;
    if (isTilingEnabled && det.tilingFactor) {
        effectiveSizeH = det.sizeH * det.tilingFactor;
    }

    const halfDet = effectiveSizeH / 2;
    // RAW Data Size Calculation
    // Number of projections = effective horizontal pixels * 1.5
    // Detector Size (pixels) = effective horizontal pixels * vertical pixels
    // Raw Data (bytes) = Detector Size * Number of Projections * 2 (16-bit)

    // effectivePixelH was not calculated above, let's do it now.
    // effectiveSizeH is in mm. We need pixels.
    // effectivePixelH = effectiveSizeH / pixelSize? No, simpler to use pixel count.

    let effectivePixelH = det.pixelH;
    if (isTilingEnabled && det.tilingFactor) {
        effectivePixelH = Math.round(det.pixelH * det.tilingFactor);
    }

    // Apply Binning
    effectivePixelH = Math.round(effectivePixelH / binning);
    const effectivePixelV = Math.round(det.pixelV / binning);

    const numProjections = Math.round(effectivePixelH * 1.5);
    const detectorPixels = effectivePixelH * effectivePixelV;
    const rawSizeBytes = detectorPixels * numProjections * 2;

    const angle = Math.atan(halfDet / sdd);
    const fov = 2 * sod * Math.sin(angle);

    return {
        maxDiameter,
        voxelSize,
        fov,
        mag,
        rawSizeBytes
    };
}

function updateUI() {
    let sod = parseFloat(elSod.value);
    let sdd = parseFloat(elSdd.value);
    const sys = SYSTEMS[currentSystemName];

    elSodVal.textContent = sod;
    elSddVal.textContent = sdd;

    // 1. Calculate Max Diameter first as it determines constraint
    let maxDiameterPre = 2 * (sod - sys.FOD) - 2 * sys.SAFETY;
    if (maxDiameterPre < 0) maxDiameterPre = 0;

    // 2. Enforce SDD Constraint
    // SDD >= SOD + (MaxDiameter / 2)
    const minSddConstraint = sod + (maxDiameterPre / 2);
    const effectiveMinSdd = Math.max(sys.MIN_SDD, minSddConstraint);

    // Update SDD Slider Min only if constraint is higher than hardware min?
    // Actually standard input range behavior is simple min/max.
    // If we dynamically change min, the slider moves. 
    // Let's just enforce value.

    let constraintActive = false;
    if (sdd < effectiveMinSdd) {
        sdd = effectiveMinSdd;
        elSdd.value = sdd;
        elSddVal.textContent = Math.round(sdd);
        constraintActive = true;
    }

    elSddMsg.style.display = constraintActive ? 'block' : 'none';

    // 3. Compute Final Metrics
    const metrics = calculateMetrics(sod, sdd, currentSystemName, currentDetectorKey, currentBinning);

    // 4. Update Display
    elDisplayMaxDia.textContent = metrics.maxDiameter.toFixed(2);
    elDisplayVoxel.textContent = metrics.voxelSize.toFixed(2);
    elDisplayFOV.textContent = metrics.fov.toFixed(2);

    elDisplayMag.textContent = metrics.mag.toFixed(2);

    // Format RAW Data to GB (GiB)
    const sizeInGB = metrics.rawSizeBytes / (1024 * 1024 * 1024);
    elDisplayRawData.textContent = sizeInGB.toFixed(2);
}

function generateTable() {
    const minSod = parseFloat(elTableMin.value);
    const maxSod = parseFloat(elTableMax.value);
    const step = parseFloat(elTableStep.value);
    const sys = SYSTEMS[currentSystemName];

    let targetSdd = parseFloat(elSdd.value);

    const chartData = [];

    elTableBody.innerHTML = '';

    for (let s = minSod; s <= maxSod; s += step) {
        let rowMaxDia = 2 * (s - sys.FOD) - 2 * sys.SAFETY;
        if (rowMaxDia < 0) rowMaxDia = 0;

        let rowMinSdd = s + (rowMaxDia / 2);
        let rowSdd = Math.max(targetSdd, rowMinSdd);
        if (rowSdd > sys.MAX_SDD) rowSdd = sys.MAX_SDD;

        const m = calculateMetrics(s, rowSdd, currentSystemName, currentDetectorKey, currentBinning);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${s}</td>
            <td>${m.maxDiameter.toFixed(2)}</td>
            <td>${m.voxelSize.toFixed(2)}</td>
            <td>${m.fov.toFixed(2)}</td>
        `;
        elTableBody.appendChild(row);

        chartData.push({
            x: m.maxDiameter,
            y: m.voxelSize,
            sod: s, // Extra data for tooltip
            fov: m.fov
        });
    }

    renderChart(chartData);
}

function renderChart(data) {
    if (typeof Chart === 'undefined') {
        console.error("Chart.js library not loaded.");
        alert("Graph cannot be plotted because the Chart.js library is not loaded. Please check your internet connection.");
        return;
    }

    const canvas = document.getElementById('resolutionChart');
    if (!canvas) {
        console.error("Canvas element #resolutionChart not found!");
        return;
    }
    const ctx = canvas.getContext('2d');

    if (myChart) {
        console.log("Destroying existing chart instance.");
        myChart.destroy();
    }

    try {
        console.log("Creating new Chart instance...");
        myChart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Voxel Size (µm) vs Max Diameter (mm)',
                    data: data,
                    backgroundColor: '#58a6ff',
                    borderColor: '#58a6ff',
                    showLine: true,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: 'Maximum Diameter (mm)',
                            color: '#8b949e'
                        },
                        grid: { color: '#30363d' },
                        ticks: { color: '#8b949e' }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Voxel Size (µm)',
                            color: '#8b949e'
                        },
                        grid: { color: '#30363d' },
                        ticks: { color: '#8b949e' }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: '#f0f6fc' }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const pt = context.raw;
                                return `MaxDia: ${pt.x.toFixed(2)} mm, Voxel: ${pt.y.toFixed(2)} µm (SOD: ${pt.sod})`;
                            }
                        }
                    }
                }
            }
        });
        console.log("Chart created successfully.");
    } catch (err) {
        console.error("Error creating chart:", err);
        alert("An error occurred while creating the graph. Check console for details.");
    }
}

function switchView(viewName) {
    if (viewName === 'table') {
        elTableView.style.display = 'block';
        elGraphView.style.display = 'none';
        elBtnViewTable.classList.add('active');
        elBtnViewGraph.classList.remove('active');
    } else if (viewName === 'graph') {
        elTableView.style.display = 'none';
        elGraphView.style.display = 'block';
        elBtnViewTable.classList.remove('active');
        elBtnViewGraph.classList.add('active');
    }
}

function exportCSV() {
    const rows = [];
    // Header
    rows.push(["SOD (mm)", "Maximum diameter (mm)", "Voxel size (µm)", "FOV (mm)"]);

    // Scrape table data matching the current generation
    // Alternatively, regenerate data. Scraping is robust to visual state.
    const trs = elTableBody.querySelectorAll('tr');
    trs.forEach(tr => {
        const cells = tr.querySelectorAll('td');
        const rowData = Array.from(cells).map(td => td.textContent);
        rows.push(rowData);
    });

    let csvContent = "data:text/csv;charset=utf-8,"
        + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "resolution_table.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Start
init();
