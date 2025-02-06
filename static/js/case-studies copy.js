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

        // ✅ Ensure tags exist and categorize properly
        let category = "unknown";
        if (props.tags) {
            if (Array.isArray(props.tags)) {
                category = props.tags[0].toLowerCase();
            } else if (typeof props.tags === "string") {
                category = props.tags.toLowerCase();
            }
        }

        // ✅ Skip invalid categories
        if (!categories[category]) {
            console.warn(`⚠️ Unrecognized category: ${category}. Skipping:`, props);
            return;
        }

        // ✅ Extract Polygon Coordinates
        let geometry = feature.geometry;
        let polygonBounds = null;
        let location = null;

        if (geometry && geometry.type === "Polygon") {
            try {
                location = geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
                polygonBounds = L.polygon(location).getBounds();  // Get bounding box correctly
            } catch (error) {
                console.error("❌ Error processing polygon coordinates for:", props.name, error);
                return;
            }
        } else {
            console.error("❌ Missing or invalid geometry for:", props.name);
            return;
        }

        // ✅ Store processed case study data
        categories[category].push({
            name: props.name || "Unknown Name",
            description: props.description || "No description available.",
            status: props.status || "Unknown",
            date_added: props.date_added || "Unknown Date",
            primary_color: props.primary_color || "#cccccc",
            secondary_color: props.secondary_color || "#eeeeee",
            polygon: location, // Store polygon
            bounds: polygonBounds, // Store map bounds
            sectors: props.sectors || []
        });
    });

    return categories;
}

// Initialize case studies and bind filter button events
function initializeCaseStudies() {
    console.log('📝 Initializing Case Studies...');

    if (Object.keys(caseStudies).length === 0) {
        console.error("❌ Error: No case studies found.");
        return;
    }

    // Load default category (Major)
    updateCaseStudies('major');

    // Event listener for filter buttons
    document.querySelectorAll('.filter-btn').forEach((button) => {
        button.addEventListener('click', () => {
            // Update button styles
            document.querySelectorAll('.filter-btn').forEach((btn) =>
                btn.classList.replace('btn-primary', 'btn-secondary')
            );
            button.classList.replace('btn-secondary', 'btn-primary');

            // Get selected category and update the cards
            const category = button.getAttribute('data-category');
            updateCaseStudies(category);
        });
    });

    // Bind map view buttons (after cards are rendered)
    setTimeout(() => bindViewOnMapButtons(), 500);
}

// 📌 Update case studies dynamically based on category selection
// Update displayed case studies based on the selected category
function updateCaseStudies(category) {
    console.log(`🔄 Updating case studies for category: ${category}`);

    const caseStudyContainer = document.getElementById('case-study-container');
    caseStudyContainer.innerHTML = '';

    if (!caseStudies[category] || caseStudies[category].length === 0) {
        console.warn(`⚠️ No case studies found for category: ${category}`);
        caseStudyContainer.innerHTML = `<p class="text-center">No case studies available.</p>`;
        return;
    }

    // Render cards for the selected category
    caseStudies[category].forEach((study, index) => {
        const sectorIconsHTML = generateSectorIcons(study.sectors);

        const card = document.createElement('div');
        card.className = 'flip-card';
        card.innerHTML = `
            <div class="flip-card-inner">
                <!-- Front Side -->
                <div class="flip-card-front" style="background-color: ${study.primary_color || '#fff'};">
                    <div class="card-content p-3">
                        <!-- Project Name at the Top -->
                        <h5 class="text-center card-title mb-3">${study.name}</h5>

                        <!-- Sector Icons Next -->
                        <div class="sector-icons d-flex justify-content-center mb-3">
                            ${sectorIconsHTML}
                        </div>

                        <!-- Description Below Icons -->
                        <p class="text-center card-description">${study.description}</p>
                    </div>
                </div>

                <!-- Back Side -->
                <div class="flip-card-back p-3">
                    <!-- Custom Fields Instead of Status/Date -->
                    <p><strong>Custom Field 1:</strong> ${study.custom_field_1 || 'N/A'}</p>
                    <p><strong>Custom Field 2:</strong> ${study.custom_field_2 || 'N/A'}</p>

                    <!-- View on Map Button -->
                    <button class="btn btn-primary view-on-map w-100 mt-3" 
                            data-index="${index}" 
                            data-category="${category}">
                        View on Map
                    </button>
                </div>
            </div>
        `;
        caseStudyContainer.appendChild(card);
    });
}

// 📌 Generate sector icons from array
function generateSectorIcons(sectors) {
    if (!Array.isArray(sectors)) {
        console.error("❌ Invalid sector data:", sectors);
        return "";
    }

    return sectors.map(sector => 
        `<img src="static/images/${sector}.svg" class="sector-icon" alt="${sector} icon" onerror="this.style.display='none';">`
    ).join('');
}

// 📌 Initialize Leaflet Map with multiple basemaps
function initializeMap() {
    console.log("🗺️ Initializing map with basemaps...");

    // Define basemap layers
    const basemaps = {
        "Light": L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.carto.com">CARTO</a>'
        }),
        "Dark": L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.carto.com">CARTO</a>'
        }),
        "Satellite": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 20,
            attribution: '&copy; <a href="https://www.esri.com">ESRI</a>'
        }),
    };

    // Initialize the map with the default layer (Light theme)
    if (!map) {
        map = L.map('map', { zoomControl: true, layers: [basemaps.Light] }).setView([51.505, -0.09], 10);

        // Add layer control for switching basemaps
        L.control.layers(basemaps).addTo(map);
    } else {
        console.log("🔄 Map already exists. Refreshing...");
        setTimeout(() => map.invalidateSize(), 500); // Fix blank map issue
    }
}


// 📌 Render all polygons on the map
function renderAllCaseStudiesOnMap() {
    console.log("🗺️ Rendering all case study polygons...");

    // Clear old markers
    allMarkers.forEach(layer => map.removeLayer(layer));
    allMarkers = [];

    let bounds = L.latLngBounds(); // Accumulate bounds

    Object.values(caseStudies).flat().forEach((study) => {
        if (!study.polygon || study.polygon.length === 0) {
            console.error(`❌ Invalid polygon for: ${study.name}`, study.polygon);
            return;
        }

        // ✅ Draw polygon on map
        const polygonLayer = L.polygon(study.polygon, {
            color: study.primary_color || "#3388ff",
            fillColor: study.secondary_color || "#3388ff",
            fillOpacity: 0.5,
        }).addTo(map)
          .bindPopup(`<b>${study.name}</b><br>${study.description}`);

        bounds.extend(polygonLayer.getBounds());
        allMarkers.push(polygonLayer);
    });

    if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [20, 20] });
    }

    console.log(`✅ ${allMarkers.length} polygons added to the map.`);
}

// 📌 Handle "View on Map" button clicks
// Bind "View on Map" button events after the cards are rendered
function bindViewOnMapButtons() {
    console.log("🔄 Binding 'View on Map' buttons...");

    document.addEventListener('click', (event) => {
        if (event.target.classList.contains('view-on-map')) {
            const index = event.target.getAttribute('data-index');
            const category = event.target.getAttribute('data-category');
    
            if (!caseStudies[category] || !caseStudies[category][index]) {
                console.error("❌ Error: Case study not found.");
                return;
            }
    
            const selectedStudy = caseStudies[category][index];
    
            if (selectedStudy.bounds) {
                map.fitBounds(selectedStudy.bounds, { padding: [20, 20] });  // Adjust padding if needed
            } else {
                console.warn(`⚠️ No bounds available for: ${selectedStudy.name}`);
            }
        }
    });

    console.log("✅ 'View on Map' buttons ready.");
}

// 📌 Load case studies once the DOM is ready
document.addEventListener("DOMContentLoaded", loadCaseStudies);
