
/**
 * serviceWorker
 */

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(function (reg) {
      // registration worked
      console.log('Registration succeeded. Scope is ' + reg.scope);
    }).catch(function (error) {
      // registration failed
      console.log('Registration failed with ' + error);
    });
}


const dbPromise = idb.open('restaurant-db', 3, function (upgradeDb) {
  switch (upgradeDb.oldVersion) {
    case 0:
      upgradeDb.createObjectStore('restaurants');
      const restaurantIdStore = upgradeDb.createObjectStore('restaurantId');
      restaurantIdStore.createIndex('id', 'id');

      const restaurantReview = upgradeDb.createObjectStore('reviews');
      restaurantReview.createIndex('restaurant_id', 'restaurant_id');

      upgradeDb.createObjectStore('pendingReviews', { autoIncrement: true });
  }
});


function saveRestaurantData(data){
  dbPromise.then(function (db) {
    const tx = db.transaction('restaurants', "readwrite");
    const restaurantStore = tx.objectStore('restaurants');
    return restaurantStore.put(data, 'restaurants');
  })
}


function savePendingReviews(data) {
  dbPromise.then(function (db) {
    const tx = db.transaction('pendingReviews', "readwrite");
    const pendingReviewsStore = tx.objectStore('pendingReviews');
    return pendingReviewsStore.add(data);
  })
}

function clearPendingReviews() {
  dbPromise.then(function (db) {
    const tx = db.transaction('pendingReviews', "readwrite");
    const pendingReviewsStore = tx.objectStore('pendingReviews');
    return pendingReviewsStore.clear();
  })
}

function saveRestaurantIdData(id, data) {
  dbPromise.then(function (db) {
    const tx = db.transaction('restaurantId', "readwrite");
    const reviewsStore = tx.objectStore('restaurantId');
    reviewsStore.put(data, id);
    reviewsStore.index('id').openCursor(null, "prev").then(function (cursor) {
      return cursor.advance(10);
    }).then(function deleteRest(cursor) {
      if (!cursor) return;
      cursor.delete();
      return cursor.continue().then(deleteRest);
    });
  });
}

function saveReview(data) {
  dbPromise.then(function (db) {
    const tx = db.transaction('reviews', "readwrite");
    const restaurantIdStore = tx.objectStore('reviews');
    restaurantIdStore.put(data, data.id);
    restaurantIdStore.index('restaurant_id').openCursor(null, "prev").then(function (cursor) {
        return cursor.advance(30);
    }).then(function deleteRest(cursor) {
      if (!cursor) return;
      cursor.delete();
      return cursor.continue().then(deleteRest);
    });
  });
}

(function(){
  //add event listener to post pending reviews
  window.addEventListener('online', function (e) {
    dbPromise.then(function (db) {
      const tx = db.transaction('pendingReviews', "readwrite");
      const restaurantIdStore = tx.objectStore('pendingReviews');
      return restaurantIdStore.getAll();
    }).then(function (val) {
      if (val) {
        val.forEach((data) => {
          handlePost(data);
        });
      }
      // clear pending reveiws after submition
      clearPendingReviews();
    });
  });

  function handlePost(data){
    fetch('http://localhost:1337/reviews/', {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      mode: "cors",
      body: JSON.stringify(data)
    })
      .then(res => res.json())
      .then(json => {
        console.log(json);
        return
      })
      .catch(e => console.log(e));
  }
})();





/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  /**
   * Fetch all restaurants. 
   */
  static fetchRestaurants(callback) {

    dbPromise.then(function (db) {
      const tx = db.transaction('restaurants', "readwrite");
      const restaurantStore = tx.objectStore('restaurants');
      return restaurantStore.get('restaurants');
    }).then(function (val) {
      if(val){
        callback(null, val);
      }

      fetch(DBHelper.DATABASE_URL)
        .then(res => res.json())
        .then((json) => {
          const restaurants = json;
          saveRestaurantData(restaurants);
          if (!val) {
            callback(null, restaurants);
          }
        }).catch((e) => {
          const error = (`Request failed. Returned status of ${e}`);
          callback(error, null);
        });
    });
    
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    dbPromise.then(function (db) {
      const tx = db.transaction('restaurantId', "readwrite");
      const restaurantIdStore = tx.objectStore('restaurantId');
      return restaurantIdStore.get(id);
    }).then(function (val) {
      if(val){
        callback(null, val);
      }

      fetch(`${DBHelper.DATABASE_URL}/${id}`)
        .then(res => res.json())
        .then((json) => {
          const restaurants = json;
          
          if (val === undefined) {
            saveRestaurantIdData(id, restaurants);
            callback(null, restaurants);
          }
        }).catch((e) => {
          const error = (`Request failed. Returned status of ${e}`);
          callback(error, null);
        });
    });
  }

  //fetch store
  static fetchReviews(id){
    return new Promise((resolve, reject)=>{
      if (!window.navigator.onLine) {
        dbPromise.then(function (db) {
          const tx = db.transaction('reviews', "readwrite");
          const restaurantStore = tx.objectStore('reviews').index('restaurant_id');
          return restaurantStore.getAll(parseInt(id))
        }).then(function (val) {
          return resolve(val);
        });
      }else {
        handleFetch(resolve, id);
      }

      function handleFetch(resolve, id){
        fetch(`http://localhost:1337/reviews/?restaurant_id=${id}`)
          .then(res => res.json())
          .then(json => {
            if (json.length) {
              console.log(json);
              json.forEach(item => { saveReview(item) });
              return resolve(json);
            }
          })
          .catch(e => { console.log(e) });
      }
      
    });
  }


  static postReviewFetch(data) {
    return new Promise((resolve, reject)=>{
      if (!window.navigator.onLine) {
        //save pending reviews
        savePendingReviews(data);
        // add pending data to view
        data.updatedAt = Date.now();
        resolve(data);
      }
      else {
        fetch('http://localhost:1337/reviews/', {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          mode: "cors",
          body: JSON.stringify(data)
        })
          .then(res => res.json())
          .then(json => {
            return resolve(json);
          })
          .catch(e => console.log(e));
      }

    });
}

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`assets/img/${restaurant.photograph}`);
  }
 
  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  }

}
