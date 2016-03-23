var genericError = function(event) {
  console.error("There was a problem ", event.srcElement.error);
};
var genericComplete = function(event) {
  console.log("complete", event);
};

var genericSuccess = function(event) {
  console.log("sucess", event);
};

/**
 * Create a database
 */
var db;
var currentTeamId = localStorage.getItem("currentTeamId") || Date.now();
var revisionNumber = localStorage.getItem(currentTeamId + "_db_rev") || 3;

// Could create a databse for each team for two way sync and collaboration
var openRequest = window.indexedDB.open(currentTeamId, revisionNumber);
openRequest.onerror = genericError;
openRequest.onsuccess = function(event) {
  db = event.target.result;
  localStorage.setItem("revisionNumber", revisionNumber);
  localStorage.setItem("currentTeamId", currentTeamId);
};

/**
 * Indexing
 */
openRequest.onupgradeneeded = function(event) {
  var db = event.target.result;

  // We will store the state of team's projects as workspaces
  var workspaceStore = db.createObjectStore("workspaces", {
    keyPath: "_id"
  });
  workspaceStore.createIndex("title", "title", {
    unique: false
  });
  workspaceStore.createIndex("dateUpdated", "dateUpdated", {
    unique: false
  });
  // can index inside the object as long as its a path
  workspaceStore.createIndex("mediaId", "media.id", {
    unique: false
  });
  // Wont work: http://stackoverflow.com/questions/20899744/how-to-create-index-on-array-element-in-indexeddb
  workspaceStore.createIndex("collaborators", "collaborators.roles", {
    unique: false,
    multiEntry: true
  });

  // We could also store collaborator details
  var userStore = db.createObjectStore("users", {
    keyPath: "_id"
  });
  userStore.createIndex("fullName", "fullName", {
    unique: false
  });
};

// Arrays of objects are not indexable :(
// http://stackoverflow.com/questions/20899744/how-to-create-index-on-array-element-in-indexeddb
var doc = {
  _id: "abc-123",
  _rev: "1-987-efg",
  dateUpdated: Date.now(),
  title: "Thailand Hiking Promotion Mock-up: Green",
  media: [{
    id: "131080025",
    description: "Hikers with backpacks trekking in the mountains. Thailand",
    type: "image"
  }],
  collaborators: [{
    id: 123,
    roles: ["commenter"]
  }, {
    id: 456,
    roles: ["commenter", "translator-fr"]
  }]
};

// Indexable
doc = {
  _id: "abc-123",
  _rev: "1-987-efg",
  dateUpdated: Date.now(),
  title: "Thailand Hiking Promotion Mock-up: Green",
  media: {
    id: "131080025",
    description: "Hikers with backpacks trekking in the mountains. Thailand",
    type: "image"
  },
  collaborators: [123, 456]
};

// Indexable
var doc2 = {
  _id: "efg-456",
  _rev: "1-734-hjk",
  dateUpdated: Date.now(),
  title: "Thailand Hiking Promotion Mock-up: Dry",
  media: {
    id: "375204436",
    description: "Chiang Mai, Thailand - February 3, 2016: Tourist go up the stair to see the view of canyon hill in Mae Wang national park for travelling attraction in Chiang Mai, Thailand on February 3, 2016",
    type: "image"
  },
  collaborators: [123, 456]
};

/**
 * Create a document
 */
var transaction = db.transaction(["workspaces"], "readwrite");
transaction.onerror = genericError;
transaction.oncomplete = genericComplete;

var request = transaction.objectStore("workspaces")
  .add(doc);

request.onerror = genericError;
request.onsuccess = genericSuccess;

/**
 * Read a document
 */
var transaction = db.transaction(["workspaces"], "readwrite");
transaction.onerror = genericError;
transaction.oncomplete = genericComplete;

var request = transaction.objectStore("workspaces")
  .get(doc._id);

request.onerror = genericError;
request.onsuccess = function(event) {
  if (!event.target.result) {
    console.log("document " + doc._id + " was not in the database, I can add it in this transaction.");
    transaction.objectStore("workspaces")
      .add(doc);
    return;
  }
  console.log("opened", event.target.result);
  doc = event.target.result;
};

/**
 * Update a document
 */
doc._rev = "2-xyz-945";
var transaction = db.transaction(["workspaces"], "readwrite");
transaction.onerror = genericError;
transaction.oncomplete = genericComplete;

var request = transaction.objectStore("workspaces")
  .put(doc);

request.onerror = genericError;
request.onsuccess = genericSuccess;

/**
 * Delete a document
 */
var transaction = db.transaction(["workspaces"], "readwrite");
transaction.onerror = genericError;
transaction.onsuccess = genericSuccess;

var request = transaction.objectStore("workspaces")
  .delete(doc._id);

request.onerror = genericError;
request.onsuccess = genericSuccess;

/**
 * Query workspaces edited between two dates, sorted by most recent
 */
var boundKeyRange = IDBKeyRange.bound(Date.now() - 2 * 24 * 60 * 60 * 1000, Date.now(), false, true);

var transaction = db.transaction(["workspaces"]);
transaction.onerror = genericError;
transaction.oncomplete = genericComplete;

var index = transaction.objectStore("workspaces")
  .index("dateUpdated");

index.count().onsuccess = function() {
  console.log("Items found: " + countRequest.result);
};

index.openCursor(boundKeyRange, "prev").onsuccess = function(event) {
  var cursor = event.target.result;
  if (cursor) {
    console.log(" Indexed on: " + new Date(cursor.key) + ", Title: " + cursor.value.title + ", media: ", cursor.value.media);
    cursor.continue();
  }
};

/**
 * Query workspaces by title regex isnt possible, but can kind of use search by range
 * http://stackoverflow.com/questions/7086180/indexeddb-fuzzy-search
 */
var boundKeyRange = IDBKeyRange.bound("Thailand", "Thailane", true, true);

var transaction = db.transaction(["workspaces"]);
transaction.onerror = genericError;
transaction.oncomplete = genericComplete;
var index = transaction.objectStore("workspaces")
  .index("title");

index.openCursor(boundKeyRange).onsuccess = function(event) {
  var cursor = event.target.result;
  if (cursor) {
    console.log(" Indexed on: " + new Date(cursor.key) + ", Title: " + cursor.value.title + ", media: ", cursor.value.media);
    cursor.continue();
  }
};

/**
 * Loop through all workspaces for only title and primaryKey
 */
var transaction = db.transaction(["workspaces"]);
transaction.onerror = genericError;
transaction.oncomplete = genericComplete;
var index = transaction.objectStore("workspaces")
  .index("title");

// Using a normal cursor to grab whole customer record objects
index.openKeyCursor().onsuccess = function(event) {
  var cursor = event.target.result;
  if (cursor && cursor.key.search(/hike/)) {
    // cursor.key is a name, like "Bill", and cursor.value is the whole object.
    console.log("Hiking workspace: " + cursor.key + ", id: " + cursor.primaryKey);
    window.cursor = cursor;
    cursor.continue();
  }
};
