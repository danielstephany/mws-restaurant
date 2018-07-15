
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
  }
});


function saveRestaurantData(data){
  dbPromise.then(function (db) {
    const tx = db.transaction('restaurants', "readwrite");
    const restaurantStore = tx.objectStore('restaurants');
    return restaurantStore.put(data, 'restaurants');
  })
}


function saveRestaurantIdData(id, data) {
  dbPromise.then(function (db) {
    const tx = db.transaction('restaurantId', "readwrite");
    const restaurantIdStore = tx.objectStore('restaurantId');
    restaurantIdStore.put(data, id);
    restaurantIdStore.index('id').openCursor(null, "prev").then(function (cursor) {
      return cursor.advance(10);
    }).then(function deleteRest(cursor) {
      if (!cursor) return;
      cursor.delete();
      return cursor.continue().then(deleteRest);
    });
  });
}


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
