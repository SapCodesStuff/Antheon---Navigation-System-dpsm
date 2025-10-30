DROP TABLE IF EXISTS user;

CREATE TABLE user (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL
);

DROP TABLE IF EXISTS location;

CREATE TABLE location (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author_id INTEGER NOT NULL,
  location_x REAL NOT NULL,
  location_y REAL NOT NULL,
  name TEXT NOT NULL,
  FOREIGN KEY (author_id) REFERENCES user (id)
);
