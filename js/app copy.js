// Main script for dynamic loading and interaction

// Utility function to load partials
function loadPartial(url, callback) {
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load ${url}: ${response.statusText}`);
            }
            return response.text();
        })
        .then(data => {
            // Inject the content into the dynamic-content container
            const contentContainer = document.getElementById('dynamic-content');
            if (contentContainer) {
                contentContainer.innerHTML = data;

                // If a callback is provided, run it after the content loads
                if (callback) {
                    callback();
                }
            } else {
                console.error('Dynamic content container (#dynamic-content) not found.');
            }
        })
        .catch(error => {
            console.error(`Error loading partial: ${error}`);
        });
}

// Function to dynamically load the header
function loadHeader() {
    fetch('../project/partials/header.html')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load header: ${response.statusText}`);
            }
            return response.text();
        })
        .then(data => {
            // Inject the header into the header container
            const headerContainer = document.getElementById('header');
            if (headerContainer) {
                headerContainer.innerHTML = data;

                // Attach event listeners to dynamically loaded header links
                const caseStudiesLink = document.querySelector('#case-studies-link');
                if (caseStudiesLink) {
                    caseStudiesLink.addEventListener('click', (event) => {
                        event.preventDefault(); // Prevent default link behavior
                        loadPartial('partials/case-studies.html', initializeCaseStudies);
                    });
                } else {
                    console.warn('Case Studies link (#case-studies-link) not found in header.');
                }
            } else {
                console.error('Header container (#header) not found.');
            }
        })
        .catch(error => {
            console.error(`Error loading header: ${error}`);
        });
}

// Case Studies Initialization
function initializeCaseStudies() {
    console.log('Initializing Case Studies...');

    // Initialize the map
    const map = L.map('map').setView([51.505, -0.09], 10);

    const basemaps = {
        Light: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }),
        Dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }),
    };
    basemaps.Dark.addTo(map);
    L.control.layers(basemaps).addTo(map);

    // Fetch GeoJSON and initialize carousels
    const polygons = [];
    fetch('../project/static/geojson/merged_case_studies.geojson')
        .then(response => response.json())
        .then(data => {
            const carousels = {
                minor: document.querySelector('#carousel-container-minor'),
                major: document.querySelector('#carousel-container-major'),
                strategic: document.querySelector('#carousel-container-strategic'),
            };

            const groupCards = (features, size) => {
                const grouped = [];
                for (let i = 0; i < features.length; i += size) {
                    grouped.push(features.slice(i, i + size));
                }
                return grouped;
            };

            for (const category of Object.keys(carousels)) {
                const categoryFeatures = data.features.filter(f => f.properties.tags.toLowerCase() === category);
                const grouped = groupCards(categoryFeatures, 3);

                grouped.forEach((group, index) => {
                    const isActive = index === 0 ? 'active' : '';
                    const cards = group.map(feature => {
                        const props = feature.properties;

                        const polygon = L.polygon(feature.geometry.coordinates.map(ring => ring.map(coord => [coord[1], coord[0]])), {
                            color: props.primary_color || '#3388ff',
                            fillColor: props.secondary_color || '#3388ff',
                            fillOpacity: 0.5,
                        }).addTo(map);

                        const polygonIndex = polygons.length;
                        polygons.push(polygon);

                        return `
                            <div class="col-md-4">
                                <div class="flip-card">
                                    <div class="flip-card-inner">
                                        <div class="flip-card-front" style="background-color: ${props.primary_color || '#fff'}; color: #000;">
                                            <h5>${props.name}</h5>
                                            <p>${props.description}</p>
                                        </div>
                                        <div class="flip-card-back">
                                            <p>Status: ${props.status}</p>
                                            <p>Date Added: ${props.date_added}</p>
                                            <button class="btn btn-primary view-on-map" data-index="${polygonIndex}">View on Map</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('');

                    carousels[category].querySelector('.carousel-inner').insertAdjacentHTML('beforeend', `
                        <div class="carousel-item ${isActive}">
                            <div class="row">${cards}</div>
                        </div>
                    `);
                });
            }

            document.addEventListener('click', event => {
                if (event.target.classList.contains('view-on-map')) {
                    const index = event.target.getAttribute('data-index');
                    const polygon = polygons[index];

                    if (polygon) {
                        map.fitBounds(polygon.getBounds());
                        polygon.openPopup();
                    }
                }
            });
        });
}

// Document Ready Logic
document.addEventListener('DOMContentLoaded', () => {
    loadHeader(); // Load the header
    loadPartial('../project/partials/about.html'); // Load About as default content
});
