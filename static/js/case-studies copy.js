function initializeCaseStudies() {
    console.log('Initializing Case Studies...');

    // Check if #map exists
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        console.error("Map container not found. Ensure #map is present in the loaded partial.");
        return;
    }

    // Initialize the map
    const map = L.map('map').setView([51.505, -0.09], 10);

    // Add basemaps
    const basemaps = {
        Light: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }),
        Dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }),
    };
    basemaps.Dark.addTo(map);
    L.control.layers(basemaps).addTo(map);

    // Fetch GeoJSON and initialize the single carousel
    const polygons = [];
    fetch('static/geojson/merged_case_studies.geojson')
        .then(response => response.json())
        .then(data => {
            if (!data || !data.features || !data.features.length) {
                console.error("GeoJSON data is empty or malformed.");
                return;
            }

            const carouselInner = document.querySelector('#carousel-container .carousel-inner');
            if (!carouselInner) {
                console.error("Carousel container not found.");
                return;
            }

            // Function to update the carousel with a specific category
            const updateCarousel = (category) => {
                // Clear existing content
                carouselInner.innerHTML = '';

                // Filter features by category
                const categoryFeatures = data.features.filter(
                    (f) => f.properties.tags.toLowerCase() === category
                );

                // Group features into rows of 3 cards each
                const groupCards = (features, size) => {
                    const grouped = [];
                    for (let i = 0; i < features.length; i += size) {
                        grouped.push(features.slice(i, i + size));
                    }
                    return grouped;
                };

                const grouped = groupCards(categoryFeatures, 3);

                // Populate carousel with the grouped cards
                grouped.forEach((group, index) => {
                    const isActive = index === 0 ? 'active' : '';
                    const cards = group
                        .map((feature) => {
                            const props = feature.properties;

                            // Add polygon to map
                            const polygon = L.polygon(
                                feature.geometry.coordinates.map((ring) =>
                                    ring.map((coord) => [coord[1], coord[0]])
                                ),
                                {
                                    color: props.primary_color || '#3388ff',
                                    fillColor: props.secondary_color || '#3388ff',
                                    fillOpacity: 0.5,
                                }
                            ).addTo(map);

                            const polygonIndex = polygons.length;
                            polygons.push(polygon);

                            // Create card HTML
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
                        })
                        .join('');

                    carouselInner.insertAdjacentHTML(
                        'beforeend',
                        `
                        <div class="carousel-item ${isActive}">
                            <div class="row">${cards}</div>
                        </div>
                        `
                    );
                });

                console.log(`Carousel updated for category: ${category}`);
            };

            // Default category to display on load
            const defaultCategory = 'major';
            updateCarousel(defaultCategory);

            // Add event listeners to buttons
            const categoryButtons = document.querySelectorAll('.toggle-carousel');
            categoryButtons.forEach((button) => {
                button.addEventListener('click', () => {
                    // Update active button styles
                    categoryButtons.forEach((btn) =>
                        btn.classList.replace('btn-primary', 'btn-secondary')
                    );
                    button.classList.replace('btn-secondary', 'btn-primary');

                    // Update the carousel
                    const targetCategory = button.getAttribute('data-target');
                    updateCarousel(targetCategory);
                });
            });

            // Handle "View on Map" button clicks
            document.addEventListener('click', (event) => {
                if (event.target.classList.contains('view-on-map')) {
                    const index = event.target.getAttribute('data-index');
                    const polygon = polygons[index];

                    if (polygon) {
                        map.fitBounds(polygon.getBounds());
                        polygon.openPopup();
                    }
                }
            });
        })
        .catch((error) => {
            console.error("Error fetching GeoJSON data:", error);
        });
}
