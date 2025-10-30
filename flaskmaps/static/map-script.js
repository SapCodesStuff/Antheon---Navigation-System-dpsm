// ==================== THEME MANAGEMENT ====================
        
        // Get saved theme or default to dark
        let currentTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', currentTheme);
        
        // Initialize map with appropriate tiles based on theme
        let tileLayer;
        const map = L.map('map').setView([0, 0], 13);
        
        // Function to update map tiles based on theme
        function updateMapTiles() {
            if (tileLayer) {
                map.removeLayer(tileLayer);
            }
            
            if (currentTheme === 'dark') {
                tileLayer = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                    subdomains: 'abcd',
                    maxZoom: 19
                }).addTo(map);
            } else {
                tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                    maxZoom: 19
                }).addTo(map);
            }
        }
        
        // Initialize map tiles
        updateMapTiles();
        
        // Update theme toggle button icon
        function updateThemeIcon() {
            const themeToggle = document.getElementById('theme-toggle');
            themeToggle.innerHTML = currentTheme === 'dark' ? '☀️' : '🌙';
        }
        
        updateThemeIcon();
        
        // Theme toggle button event listener
        document.getElementById('theme-toggle').addEventListener('click', () => {
            currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', currentTheme);
            localStorage.setItem('theme', currentTheme);
            updateThemeIcon();
            updateMapTiles();
        });

        // ==================== MAP AND LOCATION VARIABLES ====================
        
        let currentMarker = null;
        let routingControl = null;
        let watchId = null;
        let startLocation = null;
        let endLocation = null;
        let mapClickMode = null; // 'start' or 'end' or null

        // ==================== GEOLOCATION FUNCTIONS ====================
        
        // Get user's current location
        function getLocation() {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(showPosition, showError);
                watchId = navigator.geolocation.watchPosition(updatePosition, showError, { enableHighAccuracy: true });
            } else {
                document.getElementById('status').textContent = 'Geolocation is not supported by this browser.';
            }
        }

        // Show initial position
        function showPosition(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            map.setView([lat, lng], 13);
            if (currentMarker) {
                map.removeLayer(currentMarker);
            }
            currentMarker = L.marker([lat, lng]).addTo(map).bindPopup('You are here').openPopup();
            document.getElementById('status').textContent = `📍 Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        }

        // Update position continuously
        function updatePosition(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            if (currentMarker) {
                currentMarker.setLatLng([lat, lng]);
            }
            document.getElementById('status').textContent = `📍 Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        }

        // Handle geolocation errors
        function showError(error) {
            document.getElementById('status').textContent = `❌ Error: ${error.message}`;
        }

        // ==================== USE CURRENT LOCATION BUTTONS ====================
        
        // Set start location to current position
        document.getElementById('start-current-btn').addEventListener('click', () => {
            if (currentMarker) {
                const lat = currentMarker.getLatLng().lat;
                const lng = currentMarker.getLatLng().lng;
                startLocation = { lat, lng };
                document.getElementById('start-input').value = `Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
                hideSuggestions('start');
            }
        });

        // Set end location to current position
        document.getElementById('end-current-btn').addEventListener('click', () => {
            if (currentMarker) {
                const lat = currentMarker.getLatLng().lat;
                const lng = currentMarker.getLatLng().lng;
                endLocation = { lat, lng };
                document.getElementById('end-input').value = `Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
                hideSuggestions('end');
            }
        });

        // ==================== MAP CLICK MODE BUTTONS ====================
        
        // Enable map click mode for start location
        document.getElementById('set-start-map').addEventListener('click', function() {
            if (mapClickMode === 'start') {
                // Deactivate if already active
                mapClickMode = null;
                this.classList.remove('active');
                document.getElementById('set-end-map').classList.remove('active');
                map.getDiv().style.cursor = '';
                document.getElementById('status').textContent = 'Map click mode disabled';
            } else {
                // Activate start mode
                mapClickMode = 'start';
                this.classList.add('active');
                document.getElementById('set-end-map').classList.remove('active');
                map.getDiv().style.cursor = 'crosshair';
                document.getElementById('status').textContent = '📍 Click on map to set START location';
            }
        });

        // Enable map click mode for end location
        document.getElementById('set-end-map').addEventListener('click', function() {
            if (mapClickMode === 'end') {
                // Deactivate if already active
                mapClickMode = null;
                this.classList.remove('active');
                document.getElementById('set-start-map').classList.remove('active');
                map.getDiv().style.cursor = '';
                document.getElementById('status').textContent = 'Map click mode disabled';
            } else {
                // Activate end mode
                mapClickMode = 'end';
                this.classList.add('active');
                document.getElementById('set-start-map').classList.remove('active');
                map.getDiv().style.cursor = 'crosshair';
                document.getElementById('status').textContent = '📍 Click on map to set END location';
            }
        });

        // ==================== AUTOSUGGEST FUNCTIONALITY ====================
        
        // Start input autosuggest
        document.getElementById('start-input').addEventListener('input', (e) => {
            const query = e.target.value.trim();
            if (query.length > 2) {
                fetchSuggestions(query, 'start');
            } else {
                hideSuggestions('start');
            }
        });

        // End input autosuggest
        document.getElementById('end-input').addEventListener('input', (e) => {
            const query = e.target.value.trim();
            if (query.length > 2) {
                fetchSuggestions(query, 'end');
            } else {
                hideSuggestions('end');
            }
        });

        // Fetch location suggestions from Nominatim API
        function fetchSuggestions(query, type) {
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`)
                .then(response => response.json())
                .then(data => {
                    displaySuggestions(data, type);
                });
        }

        // Display suggestions dropdown
        function displaySuggestions(data, type) {
            const suggestionsDiv = document.getElementById(`${type}-suggestions`);
            suggestionsDiv.innerHTML = '';
            if (data.length > 0) {
                data.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'suggestion-item';
                    div.textContent = item.display_name;
                    div.addEventListener('click', () => {
                        selectSuggestion(item, type);
                    });
                    suggestionsDiv.appendChild(div);
                });
                suggestionsDiv.style.display = 'block';
            } else {
                suggestionsDiv.style.display = 'none';
            }
        }

        // Select a suggestion from dropdown
        function selectSuggestion(item, type) {
            const lat = parseFloat(item.lat);
            const lng = parseFloat(item.lon);
            if (type === 'start') {
                startLocation = { lat, lng };
                document.getElementById('start-input').value = item.display_name;
            } else {
                endLocation = { lat, lng };
                document.getElementById('end-input').value = item.display_name;
            }
            hideSuggestions(type);
        }

        // Hide suggestions dropdown
        function hideSuggestions(type) {
            document.getElementById(`${type}-suggestions`).style.display = 'none';
        }

        // Hide suggestions on blur with delay for click event
        document.getElementById('start-input').addEventListener('blur', () => {
            setTimeout(() => hideSuggestions('start'), 150);
        });
        document.getElementById('end-input').addEventListener('blur', () => {
            setTimeout(() => hideSuggestions('end'), 150);
        });

        // ==================== POI (POINT OF INTEREST) FUNCTIONALITY ====================
        
        // Add click listeners to all POI buttons
        document.querySelectorAll('.poi-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                findNearbyPOI(type);
            });
        });

        // Find nearby POI using Overpass API
        function findNearbyPOI(type) {
            if (!currentMarker) return;
            const lat = currentMarker.getLatLng().lat;
            const lng = currentMarker.getLatLng().lng;
            let query = '';
            
            // Build Overpass query based on POI type
            if (type === 'hospital') {
                query = '[out:json];node(around:5000,' + lat + ',' + lng + ')[amenity=hospital];out;';
            } else if (type === 'atm') {
                query = '[out:json];node(around:5000,' + lat + ',' + lng + ')[amenity=atm];out;';
            } else if (type === 'fuel') {
                query = '[out:json];node(around:5000,' + lat + ',' + lng + ')[amenity=fuel];out;';
            }
            
            // Fetch POI data from Overpass API
            fetch('https://overpass-api.de/api/interpreter', {
                method: 'POST',
                body: query
            })
            .then(response => response.json())
            .then(data => {
                if (data.elements.length > 0) {
                    const poi = data.elements[0];
                    endLocation = { lat: poi.lat, lng: poi.lon };
                    document.getElementById('end-input').value = `${type.charAt(0).toUpperCase() + type.slice(1)} (${poi.lat.toFixed(4)}, ${poi.lon.toFixed(4)})`;
                    hideSuggestions('end');
                } else {
                    alert('No nearby ' + type + ' found');
                }
            });
        }

        // ==================== MAP CLICK HANDLER ====================
        
        // Handle map clicks for manual location selection
        map.on('click', (e) => {
            if (mapClickMode === 'start') {
                // Set start location from map click
                startLocation = { lat: e.latlng.lat, lng: e.latlng.lng };
                document.getElementById('start-input').value = `Map Click (${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)})`;
                hideSuggestions('start');
                
                // Deactivate map click mode
                mapClickMode = null;
                document.getElementById('set-start-map').classList.remove('active');
                map.getDiv().style.cursor = '';
                document.getElementById('status').textContent = `✅ START location set: ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`;
                
            } else if (mapClickMode === 'end') {
                // Set end location from map click
                endLocation = { lat: e.latlng.lat, lng: e.latlng.lng };
                document.getElementById('end-input').value = `Map Click (${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)})`;
                hideSuggestions('end');
                
                // Deactivate map click mode
                mapClickMode = null;
                document.getElementById('set-end-map').classList.remove('active');
                map.getDiv().style.cursor = '';
                document.getElementById('status').textContent = `✅ END location set: ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`;
            }
        });

        // ==================== ROUTE CALCULATION ====================
        
        // Calculate route button click handler
        document.getElementById('calc-btn').addEventListener('click', calculateRoute);

        // Calculate and display route
        function calculateRoute() {
            if (!startLocation || !endLocation) {
                alert('Please set both start and end locations.');
                return;
            }
            
            const mode = document.getElementById('mode-select').value;
            
            // Remove existing route if any
            if (routingControl) {
                map.removeControl(routingControl);
            }
            
            // Create new routing control with selected waypoints
            routingControl = L.Routing.control({
                waypoints: [
                    L.latLng(startLocation.lat, startLocation.lng),
                    L.latLng(endLocation.lat, endLocation.lng)
                ],
                router: L.Routing.osrmv1({
                    profile: mode
                }),
                routeWhileDragging: true,
                lineOptions: {
                    styles: [{color: '#dc2626', opacity: 0.8, weight: 6}]
                },
                createMarker: function(i, wp, nWps) {
                    return L.marker(wp.latLng, {
                        draggable: true
                    });
                }
            }).addTo(map);

            // Display route information when route is found
            routingControl.on('routesfound', function(e) {
                const routes = e.routes;
                const summary = routes[0].summary;
                const distanceKm = (summary.totalDistance / 1000).toFixed(2);
                const timeMin = Math.round(summary.totalTime / 60);
                const routeInfo = document.getElementById('route-info');
                routeInfo.textContent = `📏 Distance: ${distanceKm} km | ⏱️ Time: ${timeMin} minutes (${mode})`;
                routeInfo.classList.add('active');
            });
        }

        // ==================== INITIALIZE APP ====================
        
        // Start location tracking on page load
        getLocation();