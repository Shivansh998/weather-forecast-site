// OpenWeather API details 
const apiKey = 'f6ff4b780c6abb94bd0203e84293886f'; 
const apiUrl = 'https://api.openweathermap.org/data/2.5/';

// HTML elements for user interaction
const searchButton = document.getElementById('searchButton');
const recentCitiesDropdown = document.getElementById('recentCities');

// Load recent searches and validate API key when the page loads
document.addEventListener('DOMContentLoaded', () => {
    testApiKey(); // Test if the provided API key is valid
    loadRecentCities(); // Load previously searched cities from local storage
});

// Event listener for searching weather by city
searchButton.addEventListener('click', () => {
    const city = document.getElementById('city').value; // Get city from input field
    if (city) {
        fetchWeather(city); // Fetch weather for the entered city
        saveRecentCity(city); // Save the searched city in local storage
    } else {
        alert('Please enter a city name!'); // Alert if no city name is entered
    }
});

// Event listener for getting weather of current location
document.getElementById('currentLocationButton').addEventListener('click', () => {
    if (navigator.geolocation) {
        // Check and handle location permissions
        navigator.permissions.query({ name: 'geolocation' }).then(result => {
            if (result.state === 'granted' || result.state === 'prompt') {
                getLocation(); // If granted or prompt, fetch location
            } else if (result.state === 'denied') {
                alert('Location access has been denied. Please enable it in your browser settings.');
            }
        }).catch(() => {
            alert('Unable to verify geolocation permissions.');
        });
    } else {
        alert('Geolocation is not supported by this browser.');
    }
});

// Function to get user's current location
function getLocation() {
    navigator.geolocation.getCurrentPosition(
        position => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            fetchWeatherByCoords(lat, lon); // Fetch weather by coordinates (lat, lon)
        },
        error => {
            handleGeolocationError(error); // Handle errors related to geolocation
        },
        {
            enableHighAccuracy: true, // Use high accuracy for location
            timeout: 10000, // Timeout if it takes too long (10 seconds)
            maximumAge: 0 // Don't use cached location
        }
    );
}

// Handle geolocation errors
function handleGeolocationError(error) {
    switch (error.code) {
        case error.PERMISSION_DENIED:
            alert('Permission denied. Please allow location access in your browser settings.');
            break;
        case error.POSITION_UNAVAILABLE:
            alert('Location information is unavailable. Retrying...');
            retryLocationFetch(); // Retry fetching location if unavailable
            break;
        case error.TIMEOUT:
            alert('The request to get your location timed out. Please try again.');
            break;
        default:
            alert('An unknown error occurred while trying to retrieve your location.');
            break;
    }
}

// Retry fetching location after failure
function retryLocationFetch() {
    setTimeout(() => {
        navigator.geolocation.getCurrentPosition(
            position => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                fetchWeatherByCoords(lat, lon); // Fetch weather by coordinates after retry
            },
            error => {
                alert('Failed to retrieve location on retry.');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    }, 5000); // Retry after 5 seconds
}

// Save the searched city in local storage
function saveRecentCity(city) {
    let recentCities = JSON.parse(localStorage.getItem('recentCities')) || [];
    if (!recentCities.includes(city)) {
        recentCities.push(city);
        if (recentCities.length > 5) {
            recentCities.shift(); // Keep only the last 5 searches
        }
        localStorage.setItem('recentCities', JSON.stringify(recentCities));
        loadRecentCities(); // Update the dropdown with recent cities
    }
}

// Load recent cities from local storage into the dropdown
function loadRecentCities() {
    const recentCities = JSON.parse(localStorage.getItem('recentCities')) || [];
    recentCitiesDropdown.innerHTML = recentCities.length 
        ? recentCities.map(city => `<option value="${city}">${city}</option>`).join('') 
        : '<option value="">No Recent Searches</option>'; // Display 'No Recent Searches' if none
}

// Event listener for selecting a city from recent searches
recentCitiesDropdown.addEventListener('change', () => {
    const city = recentCitiesDropdown.value; // Get selected city from dropdown
    if (city) {
        fetchWeather(city); // Fetch weather for the selected city
    }
});

// Fetch weather data for a specific city
async function fetchWeather(city) {
    try {
        const response = await fetch(`${apiUrl}weather?q=${city}&appid=${apiKey}&units=metric`);
        const data = await response.json();
        if (data.cod === 200) {
            updateWeatherUI(data); // Update UI with the current weather data
            await fetch5DayForecast(data.coord.lat, data.coord.lon); // Fetch 5-day forecast
        } else if (data.cod === '404') {
            alert('City not found. Please enter a valid city name.');
        } else {
            throw new Error(data.message || 'Failed to fetch weather data');
        }
    } catch (error) {
        console.error('Error fetching weather data:', error);
        alert('Error fetching weather data: ' + error.message);
    }
}

// Fetch weather data by geographic coordinates (latitude and longitude)
async function fetchWeatherByCoords(lat, lon) {
    try {
        const response = await fetch(`${apiUrl}weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`);
        const data = await response.json();
        if (data.cod === 200) {
            updateWeatherUI(data); // Update UI with current weather data
            await fetch5DayForecast(lat, lon); // Fetch 5-day forecast
        } else {
            throw new Error(data.message || 'Failed to fetch weather data');
        }
    } catch (error) {
        console.error('Error fetching weather data:', error);
        alert('Error fetching weather data: ' + error.message);
    }
}

// Update UI with current weather data
function updateWeatherUI(data) {
    const weatherIcon = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
    const currentDate = new Date().toLocaleDateString(); // Format current date
    const weatherHtml = `
        <div class="weather-info">
            <h2>${data.name} (${currentDate})</h2>
            <img src="${weatherIcon}" alt="${data.weather[0].description}" class="weather-icon">
            <div class="weather-details">
                <p><i class="fas fa-thermometer-half"></i> Temperature: ${Math.round(data.main.temp)}°C</p>
                <p><i class="fas fa-wind"></i> Wind: ${Math.round(data.wind.speed * 3.6)} km/h</p>
                <p><i class="fas fa-tint"></i> Humidity: ${data.main.humidity}%</p>
                <p>Weather: ${data.weather[0].description}</p>
            </div>
        </div>
    `;
    document.getElementById('weatherResult').innerHTML = weatherHtml; // Update weather result section
}

// Fetch 5-day weather forecast
async function fetch5DayForecast(lat, lon) {
    try {
        const response = await fetch(`${apiUrl}forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`);
        const data = await response.json();
        if (data.cod === '200') {
            updateForecastUI(data); // Update UI with 5-day forecast data
        } else {
            throw new Error(data.message || 'Failed to fetch forecast data');
        }
    } catch (error) {
        console.error('Error fetching 5-day forecast data:', error);
        alert('Error fetching 5-day forecast data: ' + error.message);
    }
}

// Update UI with 5-day forecast data
function updateForecastUI(data) {
    const forecastContainer = document.getElementById('forecastContainer');
    forecastContainer.innerHTML = ''; // Clear previous forecast
    
    // Get unique dates and their first forecast of each day (limit to 5 days)
    const dailyForecasts = data.list.reduce((acc, curr) => {
        const date = curr.dt_txt.split(' ')[0];
        if (!acc[date] && acc.size < 5) {
            acc.set(date, curr); // Only get the first forecast of each day
        }
        return acc;
    }, new Map());

    dailyForecasts.forEach((day) => {
        const date = new Date(day.dt_txt).toLocaleDateString(); // Format date
        const forecastHtml = `
            <div class="forecast-item">
                <h3>${date}</h3>
                <img src="https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png" 
                     alt="${day.weather[0].description}" 
                     class="forecast-icon">
                <p>Temp: ${Math.round(day.main.temp)}°C</p>
                <p>Wind: ${Math.round(day.wind.speed * 3.6)} km/h</p>
                <p>Humidity: ${day.main.humidity}%</p>
                <p>${day.weather[0].description}</p>
            </div>
        `;
        forecastContainer.innerHTML += forecastHtml; // Append each forecast
    });
}

// Test the API key to ensure it's valid
async function testApiKey() {
    try {
        const response = await fetch(`${apiUrl}weather?q=London&appid=${apiKey}&units=metric`);
        const data = await response.json();
        if (data.cod === 401) {
            throw new Error('Invalid API key');
        }
        console.log('API key is valid');
    } catch (error) {
        console.error('API key validation failed:', error);
        alert('Please ensure you have entered a valid API key');
    }
}
