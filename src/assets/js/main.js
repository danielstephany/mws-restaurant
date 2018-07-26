let restaurants,
  neighborhoods,
  cuisines
var map
var markers = []

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  fetchNeighborhoods();
  fetchCuisines();
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
}



/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  })
}

updateRestaurants();

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
}

/**
 * Create restaurant HTML.
 */

// observer for lazy loading
const observer = new IntersectionObserver(function (entries, observer){
  entries.forEach((item)=>{
    if(item.isIntersecting){
      item.target.childNodes[0].style.backgroundImage = item.target.childNodes[0].dataset.url;
    }
  });
});

createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');

  const imgContainer = document.createElement("div");
  imgContainer.className = "image-container"
  imgContainer.setAttribute("data-url", "url(" + DBHelper.imageUrlForRestaurant(restaurant) + ".jpg)");
  // imgContainer.style.backgroundImage = "url("+DBHelper.imageUrlForRestaurant(restaurant) +".jpg)";
  imgContainer.setAttribute("role", "img");
  imgContainer.setAttribute("aria-label", restaurant.name);
  li.append(imgContainer);

  const details = document.createElement("div");
  details.className = "details"

  const name = document.createElement('h2');
  name.innerHTML = restaurant.name;
  details.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  details.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  details.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  more.setAttribute("aria-label", "view details for " + restaurant.name);
  details.append(more)
  li.append(details);

  observer.observe(li);

  return li
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  let latlng = [];
  restaurants.forEach(restaurant => {
    latlng.push( restaurant.latlng.lat +',' + restaurant.latlng.lng);
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
  const mapImg = document.getElementById('mapImg');
  latlng = latlng.join('|');
  let mapstring = `https://maps.googleapis.com/maps/api/staticmap?center=40.722216,-73.987501&zoom=12&size=640x640&maptype=roadmap\&markers=size:mid%7Ccolor:red%7C${latlng}&key=AIzaSyCjj9kjRPGwZDo-MmRAf_g9KRtIBkyyjbY`
  mapImg.setAttribute('src', mapstring);
}

//toggle to interactive map
(function(){
  const mapImg = document.getElementById('mapImg');
  const map = document.getElementById('map');
  mapImg.addEventListener('click', function(){
    mapImg.style.display = 'none';
    map.style.display = 'block';
  });
})();