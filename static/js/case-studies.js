let caseStudies = {}; // Global storage for case studies
let allMarkers = []; // Store all map markers

// 📌 Ensure the map initializes correctly
let map;

async function loadCaseStudies() {
    try {
        console.log("📥 Loading case study data...");
        const response = await fetch('static/geojson/merged_case_studies.geojson');
        if (!response.ok) throw new Error("Failed to fetch case studies data.");

        const data = await response.json();
        caseStudies = processGeoJSONData(data); // Process GeoJSON

        console.log("✅ Case studies loaded:", caseStudies);
        
        initializeMap(); // Ensure the map is initialized
        initializeCaseStudies(); // Populate UI
        renderAllCaseStudiesOnMap(); // Add polygons to the map

    } catch (error) {
        console.error("❌ Error loading case studies:", error);
    }
}

// 📌 Process GeoJSON and organize by category
function processGeoJSONData(geojson) {
    let categories = { minor: [], major: [], strategic: [] };

    geojson.features.forEach(feature => {
        const props = feature.properties;
        let category = "unknown";

        if (props.tags) {
            if (Array.isArray(props.tags)) {
                category = props.tags[0].toLowerCase();
            } else if (typeof props.tags === "string") {
                category = props.tags.toLowerCase();
            }
        }

        if (!categories[category]) {
            console.warn(`⚠️ Unrecognized category: ${category}. Skipping:`, props);
            return;
        }

        let geometry = feature.geometry;
        let polygonBounds = null;
        let location = null;

        if (geometry && geometry.type === "Polygon") {
            try {
                location = geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
                polygonBounds = L.polygon(location).getBounds();  
            } catch (error) {
                console.error("❌ Error processing polygon coordinates for:", props.name, error);
                return;
            }
        } else {
            console.error("❌ Missing or invalid geometry for:", props.name);
            return;
        }

        categories[category].push({
            name: props.name || "Unknown Name",
            description: props.description || "No description available.",
            polygon: location,
            bounds: polygonBounds,
            primary_color: props.primary_color || "#cccccc",
            secondary_color: props.secondary_color || "#eeeeee",
            sectors: props.sectors || []
        });
    });

    return categories;
}

// 📌 Initialize case studies and bind filter button events
function initializeCaseStudies() {
    console.log('📝 Initializing Case Studies...');

    if (Object.keys(caseStudies).length === 0) {
        console.error("❌ Error: No case studies found.");
        return;
    }

    updateCaseStudies('major'); // Load default category

    document.querySelectorAll('.filter-btn').forEach((button) => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach((btn) =>
                btn.classList.replace('btn-primary', 'btn-secondary')
            );
            button.classList.replace('btn-secondary', 'btn-primary');

            const category = button.getAttribute('data-category');
            updateCaseStudies(category);
        });
    });

    setTimeout(() => bindViewOnMapButtons(), 500);
}

// 📌 Update displayed case studies
function updateCaseStudies(category) {
    console.log(`🔄 Updating case studies for category: ${category}`);

    const caseStudyContainer = document.getElementById('case-study-container');
    caseStudyContainer.innerHTML = '';

    if (!caseStudies[category] || caseStudies[category].length === 0) {
        caseStudyContainer.innerHTML = `<p class="text-center">No case studies available.</p>`;
        return;
    }

    caseStudies[category].forEach((study, index) => {
        const sectorIconsHTML = generateSectorIcons(study.sectors);

        const card = document.createElement('div');
        card.className = 'flip-card';
        card.innerHTML = `
            <div class="case-study-container py-3">
                <div class="case-study-card">
                    <div class="card-content p-3">
                        <h5 class="text-center card-title mb-3">${study.name}</h5>
                        <div class="sector-icons d-flex justify-content-center mb-3">
                            ${sectorIconsHTML}
                        </div>
                        <p class="text-center card-description">${study.description}</p>
                    </div>
                    <button class="btn btn-primary view-on-map w-100 mt-3" 
                            data-index="${index}" 
                            data-category="${category}">
                        View
                    </button>
                </div>
            </div>
        `;
        caseStudyContainer.appendChild(card);
    });

    initializeAutoScroll(); // Restart auto-scroll after case studies update
}

// 📌 Auto-Scroll Feature for Case Study Cards
let scrollInterval;
const scrollAmount = 300; 
const scrollSpeed = 3000; 

function startAutoScroll() {
    const caseStudyContainer = document.getElementById("case-study-container");
    scrollInterval = setInterval(() => {
        if (caseStudyContainer.scrollLeft + caseStudyContainer.clientWidth >= caseStudyContainer.scrollWidth) {
            caseStudyContainer.scrollTo({ left: 0, behavior: "smooth" });
        } else {
            caseStudyContainer.scrollBy({ left: scrollAmount, behavior: "smooth" });
        }
    }, scrollSpeed);
}

function stopAutoScroll() {
    clearInterval(scrollInterval);
}

function initializeAutoScroll() {
    stopAutoScroll(); 
    if (document.querySelector(".flip-card")) { 
        startAutoScroll();
    }
}

// 📌 Pause auto-scroll on hover
document.getElementById("case-study-container").addEventListener("mouseenter", stopAutoScroll);
document.getElementById("case-study-container").addEventListener("mouseleave", startAutoScroll);

// 📌 Generate sector icons
function generateSectorIcons(sectors) {
    if (!Array.isArray(sectors)) return "";
    return sectors.map(sector => 
        `<img src="static/images/${sector}.svg" class="sector-icon" alt="${sector} icon" onerror="this.style.display='none';">`
    ).join('');
}

// 📌 Initialize Map
function initializeMap() {
    console.log("🗺️ Initializing map...");

    const basemaps = {
        "Light": L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }),
        "Dark": L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }),
    };

    if (!map) {
        map = L.map('map', { zoomControl: true, layers: [basemaps.Light] }).setView([51.505, -0.09], 10);
        L.control.layers(basemaps).addTo(map);
    } else {
        setTimeout(() => map.invalidateSize(), 500);
    }
}

// 📌 Render polygons on the map
function renderAllCaseStudiesOnMap() {
    console.log("🗺️ Rendering case study polygons...");

    allMarkers.forEach(layer => map.removeLayer(layer));
    allMarkers = [];

    let bounds = L.latLngBounds();

    Object.values(caseStudies).flat().forEach((study) => {
        if (!study.polygon) return;

        const polygonLayer = L.polygon(study.polygon, {
            color: study.primary_color,
            fillColor: study.secondary_color,
            fillOpacity: 0.5,
        }).addTo(map).bindPopup(`<b>${study.name}</b><br>${study.description}`);

        bounds.extend(polygonLayer.getBounds());
        allMarkers.push(polygonLayer);
    });

    if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
}

// 📌 Load case studies on DOM ready
document.addEventListener("DOMContentLoaded", loadCaseStudies);
