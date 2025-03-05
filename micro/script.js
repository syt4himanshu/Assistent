// API Key for OpenWeatherMap
const apiKey = "df85a80f1d7f77cf5a8760777bc1f64c";

// DOM Elements
const cropType = document.getElementById('crop-type');
const locationInput = document.getElementById('location-input');
const searchBtn = document.getElementById('search-btn');
const suggestionsContainer = document.getElementById('suggestions');
const weatherInfo = document.getElementById('weather-info');
const errorMessage = document.getElementById('error-message');
const loading = document.getElementById('loading');

// Weather Info Elements
const weatherIcon = document.getElementById('weather-icon');
const temperature = document.getElementById('temperature');
const description = document.getElementById('description');
const location_name = document.getElementById('location');
const feelsLike = document.getElementById('feels-like');
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('wind-speed');
const adviceContent = document.getElementById('advice-content');

// Typing timer for suggestions
let typingTimer;
const doneTypingInterval = 500; // Time in ms (0.5 seconds)

// Event Listeners
searchBtn.addEventListener('click', () => getWeatherForFarming());
locationInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        getWeatherForFarming();
    }
});

// Auto-suggest functionality
locationInput.addEventListener('input', function() {
    clearTimeout(typingTimer);
    if (locationInput.value) {
        typingTimer = setTimeout(getSuggestions, doneTypingInterval);
    } else {
        suggestionsContainer.style.display = 'none';
    }
});

// Close suggestions when clicking outside
document.addEventListener('click', function(e) {
    if (!suggestionsContainer.contains(e.target) && e.target !== locationInput) {
        suggestionsContainer.style.display = 'none';
    }
});

// Get location suggestions based on input
function getSuggestions() {
    const query = locationInput.value.trim();
    if (query.length < 2) return;
    
    fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${apiKey}`)
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                displaySuggestions(data);
            } else {
                suggestionsContainer.style.display = 'none';
            }
        })
        .catch(error => {
            console.error("Error fetching suggestions:", error);
            suggestionsContainer.style.display = 'none';
        });
}

// Display location suggestions
function displaySuggestions(locations) {
    suggestionsContainer.innerHTML = '';
    
    locations.forEach(loc => {
        const cityName = loc.name;
        const countryCode = loc.country;
        const stateName = loc.state ? `, ${loc.state}` : '';
        
        const suggestionItem = document.createElement('div');
        suggestionItem.className = 'suggestion-item';
        suggestionItem.textContent = `${cityName}${stateName}, ${countryCode}`;
        
        suggestionItem.addEventListener('click', () => {
            locationInput.value = cityName;
            suggestionsContainer.style.display = 'none';
            getWeatherForFarming();
        });
        
        suggestionsContainer.appendChild(suggestionItem);
    });
    
    suggestionsContainer.style.display = 'block';
}

// Main function to get weather data for farming
function getWeatherForFarming() {
    const locationValue = locationInput.value.trim();
    const selectedCrop = cropType.value;
    
    if (!locationValue) {
        showError("Please enter your location");
        return;
    }
    
    // Show loading spinner
    loading.style.display = 'block';
    weatherInfo.style.display = 'none';
    errorMessage.style.display = 'none';
    suggestionsContainer.style.display = 'none';
    
    // Make API call to get weather data
    fetch(`https://api.openweathermap.org/data/2.5/weather?q=${locationValue}&appid=${apiKey}&units=metric`)
        .then(response => {
            if (!response.ok) {
                throw new Error(response.status === 404 ? 
                    "Location not found. Please check spelling and try again." : 
                    "Failed to fetch weather data. Please try again later.");
            }
            return response.json();
        })
        .then(data => {
            // Once we have weather data, get forecast data for better recommendations
            return fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${locationValue}&appid=${apiKey}&units=metric`)
                .then(forecastResponse => {
                    if (!forecastResponse.ok) {
                        throw new Error("Failed to fetch forecast data");
                    }
                    return forecastResponse.json();
                })
                .then(forecastData => {
                    // Display weather with both current and forecast data
                    displayWeatherData(data, forecastData, selectedCrop);
                });
        })
        .catch(error => {
            showError(error.message);
        })
        .finally(() => {
            loading.style.display = 'none';
        });
}

// Display weather data and farming advice
function displayWeatherData(data, forecastData, cropType) {
    // Set weather icon
    const iconCode = data.weather[0].icon;
    weatherIcon.innerHTML = `<img src="https://openweathermap.org/img/wn/${iconCode}@2x.png" alt="${data.weather[0].description}">`;
    
    // Set temperature and description
    temperature.textContent = `${Math.round(data.main.temp)}°C`;
    description.textContent = data.weather[0].description;
    location_name.textContent = `${data.name}, ${data.sys.country}`;
    
    // Set additional weather details
    feelsLike.textContent = `${Math.round(data.main.feels_like)}°C`;
    humidity.textContent = `${data.main.humidity}%`;
    windSpeed.textContent = `${data.wind.speed} m/s`;
    
    // Generate farming advice based on crop type and weather
    const advice = generateFarmingAdvice(data, forecastData, cropType);
    adviceContent.innerHTML = advice;
    
    // Show weather info
    weatherInfo.style.display = 'block';
}

// Generate farming advice based on weather conditions and crop type
function generateFarmingAdvice(currentWeather, forecastData, cropType) {
    let advice = "";
    const temp = currentWeather.main.temp;
    const humidity = currentWeather.main.humidity;
    const windSpeed = currentWeather.wind.speed;
    const weatherCondition = currentWeather.weather[0].main.toLowerCase();
    
    // Get next 5 days forecast summary
    const nextDaysForecast = getNextDaysForecast(forecastData);
    const willRain = nextDaysForecast.willRain;
    const avgTemp = nextDaysForecast.avgTemp;
    
    // General advice based on current weather
    advice += `<p><strong>Current Conditions:</strong> ${temp}°C with ${currentWeather.weather[0].description}.</p>`;
    
    // Crop-specific advice
    advice += `<p><strong>For your ${cropType} crop:</strong></p>`;
    
    // Temperature advice
    if (temp > 30) {
        advice += `<p>🌡️ <strong>High Temperature Alert:</strong> Current temperature is high. Consider additional irrigation to prevent heat stress.</p>`;
    } else if (temp < 10) {
        advice += `<p>🌡️ <strong>Low Temperature Alert:</strong> Protect sensitive crops from cold damage.</p>`;
    } else {
        advice += `<p>🌡️ <strong>Temperature:</strong> Current temperature is within acceptable range for most crops.</p>`;
    }
    
    // Weather condition specific advice
    if (weatherCondition.includes("rain") || weatherCondition.includes("drizzle")) {
        advice += `<p>🌧️ <strong>Rainy Conditions:</strong> Hold off on irrigation. Consider delaying fertilizer application to prevent runoff.</p>`;
    } else if (weatherCondition.includes("clear")) {
        advice += `<p>☀️ <strong>Clear Weather:</strong> Good conditions for field work. Ensure adequate irrigation if needed.</p>`;
    } else if (weatherCondition.includes("cloud")) {
        advice += `<p>☁️ <strong>Cloudy Conditions:</strong> Moderate evaporation rate. Adjust irrigation accordingly.</p>`;
    }
    
    // Humidity advice
    if (humidity > 80) {
        advice += `<p>💧 <strong>High Humidity:</strong> Watch for fungal disease development. Ensure proper ventilation in greenhouses.</p>`;
    } else if (humidity < 40) {
        advice += `<p>💧 <strong>Low Humidity:</strong> Increase irrigation frequency to prevent water stress.</p>`;
    }
    
    // Wind advice
    if (windSpeed > 8) {
        advice += `<p>💨 <strong>High Wind Alert:</strong> Avoid spraying pesticides or herbicides. Provide wind protection for young plants.</p>`;
    }
    
    // Forecast-based advice
    advice += `<p><strong>5-Day Forecast:</strong> Average temperature will be around ${avgTemp.toFixed(1)}°C.`;
    if (willRain) {
        advice += ` Expect rainfall in the coming days. Plan field operations accordingly.</p>`;
    } else {
        advice += ` No significant rainfall expected. Plan irrigation accordingly.</p>`;
    }
    
    // Crop-specific recommendations
    switch (cropType) {
        case "wheat":
            advice += wheat_specific_advice(temp, humidity, willRain);
            break;
        case "rice":
            advice += rice_specific_advice(temp, humidity, willRain);
            break;
        case "corn":
            advice += corn_specific_advice(temp, humidity, willRain);
            break;
        case "soybeans":
            advice += soybean_specific_advice(temp, humidity, willRain);
            break;
        case "cotton":
            advice += cotton_specific_advice(temp, humidity, willRain);
            break;
        case "vegetables":
            advice += vegetable_specific_advice(temp, humidity, willRain);
            break;
        case "fruits":
            advice += fruit_specific_advice(temp, humidity, willRain);
            break;
        default:
            advice += `<p><strong>General Farm Management:</strong> Adjust irrigation based on weather conditions and crop needs.</p>`;
    }
    
    return advice;
}

// Process forecast data to get a summary for the next few days
function getNextDaysForecast(forecastData) {
    let willRain = false;
    let tempSum = 0;
    let count = 0;
    
    // Process the forecast data (every 3 hours for 5 days)
    for (let i = 0; i < forecastData.list.length && i < 15; i++) { // First ~48 hours (15 * 3h)
        const forecast = forecastData.list[i];
        
        // Check for rain
        if (forecast.weather[0].main.toLowerCase().includes("rain")) {
            willRain = true;
        }
        
        // Sum temperatures for average
        tempSum += forecast.main.temp;
        count++;
    }
    
    return {
        willRain: willRain,
        avgTemp: tempSum / count
    };
}

// Crop-specific advice functions
function wheat_specific_advice(temp, humidity, willRain) {
    let advice = "";
    
    if (temp > 25) {
        advice += `<p><strong>Wheat Care:</strong> High temperatures can affect grain filling. Ensure adequate irrigation.</p>`;
    } else if (temp < 5) {
        advice += `<p><strong>Wheat Care:</strong> Cold temperatures may slow growth. Watch for frost damage on young plants.</p>`;
    }
    
    if (humidity > 75 && temp > 15) {
        advice += `<p><strong>Disease Alert:</strong> Conditions are favorable for rust and powdery mildew. Consider preventative fungicide application.</p>`;
    }
    
    return advice;
}

function rice_specific_advice(temp, humidity, willRain) {
    let advice = "";
    
    if (temp > 30) {
        advice += `<p><strong>Rice Care:</strong> High temperatures could affect pollination. Maintain adequate water levels.</p>`;
    }
    
    if (humidity > 80 && temp > 25) {
        advice += `<p><strong>Disease Alert:</strong> Conditions are favorable for blast and sheath blight. Monitor closely.</p>`;
    }
    
    if (!willRain) {
        advice += `<p><strong>Irrigation:</strong> Maintain proper water depth in paddy fields.</p>`;
    }
    
    return advice;
}

function corn_specific_advice(temp, humidity, willRain) {
    let advice = "";
    
    if (temp > 35) {
        advice += `<p><strong>Corn Care:</strong> Extreme heat can affect pollination. Consider temporary shade or increased irrigation.</p>`;
    }
    
    if (humidity > 80 && temp > 25) {
        advice += `<p><strong>Disease Alert:</strong> Conditions are favorable for leaf blight. Monitor crop health.</p>`;
    }
    
    if (!willRain && temp > 25) {
        advice += `<p><strong>Irrigation:</strong> Corn requires additional water during tasseling and silking stages in hot weather.</p>`;
    }
    
    return advice;
}

function soybean_specific_advice(temp, humidity, willRain) {
    let advice = "";
    
    if (temp > 30) {
        advice += `<p><strong>Soybean Care:</strong> High temperatures may affect pod development. Ensure adequate soil moisture.</p>`;
    }
    
    if (humidity > 75) {
        advice += `<p><strong>Disease Alert:</strong> Watch for white mold in dense canopies under humid conditions.</p>`;
    }
    
    return advice;
}

function cotton_specific_advice(temp, humidity, willRain) {
    let advice = "";
    
    if (temp > 35) {
        advice += `<p><strong>Cotton Care:</strong> Extreme heat can affect boll development. Monitor irrigation needs.</p>`;
    }
    
    if (humidity > 70 && willRain) {
        advice += `<p><strong>Disease Alert:</strong> Conditions are favorable for boll rot. Consider preventative measures.</p>`;
    }
    
    return advice;
}

function vegetable_specific_advice(temp, humidity, willRain) {
    let advice = "";
    
    if (temp > 32) {
        advice += `<p><strong>Vegetable Care:</strong> High temperatures can stress most vegetables. Consider shade cloth or increased watering frequency.</p>`;
    }
    
    if (humidity > 80 && temp > 20) {
        advice += `<p><strong>Disease Alert:</strong> High humidity favors fungal diseases in vegetables. Ensure good air circulation and consider preventative fungicide.</p>`;
    }
    
    if (willRain) {
        advice += `<p><strong>Rain Alert:</strong> Heavy rain can damage tender vegetables. Consider protective measures.</p>`;
    }
    
    return advice;
}

function fruit_specific_advice(temp, humidity, willRain) {
    let advice = "";
    
    if (temp < 0) {
        advice += `<p><strong>Frost Alert:</strong> Freezing temperatures can damage fruit trees. Consider frost protection methods.</p>`;
    }
    
    if (humidity > 80 && temp > 20) {
        advice += `<p><strong>Disease Alert:</strong> Conditions are favorable for fungal diseases in fruit crops. Monitor closely.</p>`;
    }
    
    if (willRain && temp > 15) {
        advice += `<p><strong>Pest Alert:</strong> Warm, wet conditions can increase insect activity. Monitor for pests after rain.</p>`;
    }
    
    return advice;
}

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    weatherInfo.style.display = 'none';
    loading.style.display = 'none';
}

// Check if there's a default location in URL parameters
window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const defaultLocation = urlParams.get('location');
    const defaultCrop = urlParams.get('crop');
    
    if (defaultCrop && document.querySelector(`option[value="${defaultCrop}"]`)) {
        cropType.value = defaultCrop;
    }
    
    if (defaultLocation) {
        locationInput.value = defaultLocation;
        getWeatherForFarming();
    }
};