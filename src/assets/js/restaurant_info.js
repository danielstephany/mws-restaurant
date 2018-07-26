let restaurant;
var map;

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
  handlefetchReviews();
}

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

handlefetchReviews = () => {
  const id = getParameterByName('id');
  DBHelper.fetchReviews(id)
    .then((json) => {
      self.reviews = json;
      fillReviewsHTML();
    }); 
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  image.src = DBHelper.imageUrlForRestaurant(restaurant) + ".jpg";
  image.setAttribute('alt', restaurant.name + "restaurant");

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  const favoritesToggle = document.getElementById('favorite-btn');

  if (restaurant.is_favorite === "true" || restaurant.is_favorite === true){
    favoritesToggle.innerHTML = 'Remove From Favorites'
    favoritesToggle.parentElement.classList.add('active');
  }else {
    favoritesToggle.innerHTML = 'Add To Favorites'
    favoritesToggle.parentElement.classList.remove('active');
  }


  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // add event on favorites button
    setfavoriteEvent();

}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h3');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });

  container.insertBefore(title, ul);
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  li.className = "review-card";

  const article = document.createElement("article");
  li.appendChild(article);

  const header = document.createElement("header");
  article.appendChild(header);

  const name = document.createElement('p');
  name.className = "name";
  name.innerHTML = review.name;
  header.appendChild(name);

  const date = document.createElement('p');
  date.className = "date";
  let time = new Date(review.updatedAt);
  date.innerHTML = time.toLocaleDateString();
  header.appendChild(date);

  const reviewCardContent = document.createElement('div');
  reviewCardContent.className = "review-card__content";
  article.appendChild(reviewCardContent);

  const rating = document.createElement('span');
  rating.className = "rating";
  rating.innerHTML = `Rating: ${review.rating}`;
  reviewCardContent.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  reviewCardContent.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  li.setAttribute("aria-current", "page");
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */


 /**
 * auto adjust header spacing in reviews page
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

class SetHeaderSpacer {
  constructor(){
    this._body = document.querySelector(".inside");
    this._header = document.querySelector(".main-header");
    this.init();
  }

  setSpacer (){
    if (window.innerWidth <= 800 && this._body) {
      const headerHeight = this._header.clientHeight;
      this._body.style.paddingTop = headerHeight + "px";
    }else {
      this._body.style.paddingTop = "0px";
    }
  }
  
  init() {
    if (this._body){
      this.setSpacer();
      window.addEventListener('resize', () => {
        this.setSpacer();
      });
    }
  }
}

const autoSetHeaderSpace = new SetHeaderSpacer;
// autoSetHeaderSpace.init();


(function(){
  const reviewForm = document.getElementById("review-form");
  const reviewName = document.getElementById("name");
  const reviewBody = document.getElementById("review");
  const reviewRating = document.getElementById("rating");
  const id = getParameterByName('id');
  let errorArray = [];
  reviewForm.addEventListener('submit', function(e){
    e.preventDefault();
    let validValues = true;

    let reviewData = {
      restaurant_id: parseInt(id),
      name: reviewName.value,
      rating: parseInt(reviewRating.value),
      comments: reviewBody.value
    }
    
    //remove old errs
    if(errorArray.length !== 0){
      errorArray.forEach((el)=>{
        el.parentElement.classList.remove('error');
        el.parentElement.removeChild(el);
      });
      errorArray = [];
    }

    //check for errors
    if (!reviewName.value){
      createError(reviewName, 'name is required');
      validValues = false;
    }
    if (!reviewBody.value){
      createError(reviewBody, 'review is required');
      validValues = false;
    }
    if (!reviewRating.value){
      createError(reviewRating, 'rating is required');
      validValues = false;
    }

    if (validValues === true){
      DBHelper.postReviewFetch(reviewData)
      .then(json => {
        const newReview = createReviewHTML(json);
        document.getElementById('reviews-list').append(newReview);
      });
      reviewName.value = '';
      reviewBody.value = '';
      reviewRating.value = '';
    }

  });

  function createError(errorEl ,text){
    let errorMsg = document.createElement('span');
    errorMsg.innerHTML = text;
    errorMsg.className = 'error-msg';
    errorMsg.setAttribute('role', "alert");
    errorEl.parentElement.append(errorMsg);
    errorEl.parentElement.classList.add('error');
    errorArray.push(errorMsg);
  }

})();

//handle updating favorites favorites
function setfavoriteEvent(){
  const favoritesToggle = document.getElementById('favorite-btn');
  favoritesToggle.addEventListener('click', function(){
    if (self.restaurant.is_favorite === "true" || self.restaurant.is_favorite === true) {
      console.log('active');
      favoritesToggle.innerHTML = 'Add To Favorites'
      favoritesToggle.parentElement.classList.remove('active');
      self.restaurant.is_favorite = false;
    } else {
      favoritesToggle.innerHTML = 'Remove From Favorites'
      favoritesToggle.parentElement.classList.add('active');
      self.restaurant.is_favorite = true;
    }
    DBHelper.toggleFavorite(self.restaurant.id, self.restaurant)
    .then(res => console.log(res));
  });
  
};